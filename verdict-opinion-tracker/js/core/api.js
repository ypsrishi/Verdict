/* ============================= API + AUTO-SAVE =============================
   Talks to the Python /api/store endpoint. Responsibilities:
     Api   – thin fetch wrapper (accounts, institution codes, sessions)
     Ctx   – who is signed in on this page: { role:'admin'|'participant'|null, admin, inst }
     Sync  – loads the shared data into DB on every page and AUTO-SAVES every change back to
             the server (storage/data/store.json), so nothing the admin enters is ever lost.  */
const API_URL = '/api/store';
const Api = (()=>{
  async function call(action, payload={}){
    let r;
    try{
      r = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(Object.assign({action}, payload)) });
    }catch(e){ throw { code:'NETWORK', message:'Cannot reach the server. Start the app with PHP (see README) and try again.' }; }
    let j; try{ j = await r.json(); }catch(_){ throw { code:'NETWORK', message:'The server did not answer correctly. Make sure PHP is running (see README).' }; }
    if(!j.ok) throw { code: r.status===401 ? 'AUTH' : 'REJECTED', message:j.error||'Request failed', field:j.field, expired:j.expired };
    return j;
  }
  return {
    call,
    bootstrap: scope => call('bootstrap', {scope}),
    adminRegister: p => call('admin_register', p),
    adminLogin: (email,password) => call('admin_login', {email,password}),
    adminLogout: () => call('admin_logout'),
    checkCode: code => call('check_code', {code}),
    join: (code,email) => call('join', {code,email}),
    leave: () => call('leave'),
    updateInstitution: (name,code) => call('update_institution', {name,code}),
  };
})();

const Ctx = { scope:'participant', role:null, admin:null, inst:null, offline:false };
const scopeForPath = p => String(p||'').startsWith('/admin') ? 'admin' : 'participant';

const Sync = (()=>{
  let baseJson = '{}';       // what the server is known to have from us
  let timer = null, chain = Promise.resolve(), saving = 0, lastError = null;
  const snapshot = () => { const o = {}; SHARED_KEYS.forEach(k=>{ o[k] = DB[k]; }); return o; };
  const cleanSnapshot = () => JSON.stringify(snapshot());
  const pendingKey = () => 'pending.'+Ctx.scope;

  function adopt(db){
    SHARED_KEYS.forEach(k=>{ DB[k] = db[k] !== undefined ? db[k] : (k==='constituencies' ? {} : []); });
    if(Array.isArray(DB.constituencies)) DB.constituencies = {};   // PHP encodes {} as [] when empty
    applyLocalNotificationState();
    baseJson = cleanSnapshot();
  }
  /* Participants keep "read" state for broadcast notifications in their own browser. */
  function applyLocalNotificationState(){
    if(Ctx.role !== 'participant') return;
    const seen = new Set(AppStorage.read('readNotifs') || []);
    DB.notifications.forEach(n=>{ n.read = seen.has(n.id); });
  }
  const dirty = () => Ctx.role && cleanSnapshot() !== baseJson;

  async function boot(path){
    Ctx.scope = scopeForPath(path);
    try{
      const r = await Api.bootstrap(Ctx.scope);
      Ctx.offline = false;
      Ctx.role = r.role; Ctx.admin = r.admin; Ctx.inst = r.inst;
      if(r.role && r.db){
        adopt(r.db);
        // changes made just before the last page was left but never confirmed by the server
        const pend = AppStorage.read(pendingKey());
        if(pend && pend.code === r.inst.code){
          SHARED_KEYS.forEach(k=>{ if(pend.db[k] !== undefined) DB[k] = pend.db[k]; });
          baseJson = JSON.stringify(pend.base);
          await saveNow();
        }
        AppStorage.remove(pendingKey());
        if(Ctx.role==='participant') DB.user.constituency = DB.user.constituency || '';
      }
    }catch(e){
      Ctx.offline = true; lastError = e;
    }
  }

  function schedule(){ if(!Ctx.role) return; clearTimeout(timer); timer = setTimeout(()=>{ saveNow(); }, 350); }

  function saveNow(){
    clearTimeout(timer);
    if(!Ctx.role || !dirty()) return chain;
    chain = chain.then(async ()=>{
      if(!dirty()) return;
      const sentJson = cleanSnapshot();
      saving++;
      try{
        await Api.call('save', { scope:Ctx.scope, db:JSON.parse(sentJson), base:JSON.parse(baseJson) });
        baseJson = sentJson;           // server now has everything we sent
        AppStorage.remove(pendingKey());
        lastError = null;
        showSaved();
      }catch(e){
        lastError = e;
        if(e.expired || e.code==='AUTH'){ Ctx.role = null; showSessionExpired(); }
        else if(e.code==='NETWORK'){ showSaveProblem(); setTimeout(schedule, 4000); }
      }finally{ saving--; }
    });
    return chain;
  }
  /* Called when leaving the page: remember unsaved data locally, then try to push it. */
  function stash(){
    if(!Ctx.role || !dirty()) return;
    AppStorage.write(pendingKey(), { code:Ctx.inst && Ctx.inst.code, db:snapshot(), base:JSON.parse(baseJson) });
    saveNow();
  }
  function showSaved(){
    const el = document.getElementById('saveDot'); if(!el) return;
    el.classList.add('on'); clearTimeout(showSaved.t); showSaved.t = setTimeout(()=>el.classList.remove('on'), 1200);
  }
  function showSaveProblem(){ try{ toast('Could not save — will retry. Check your connection.'); }catch(_){} }
  function showSessionExpired(){
    try{ toast('Your session expired. Please sign in again.'); }catch(_){}
    setTimeout(()=>{ if(Ctx.scope==='admin') navReplace('/admin/login'); else { SessionStore.clear(); navReplace('/welcome'); } }, 900);
  }
  /* Pull other people's changes when the tab comes back to the front (only if we have nothing unsaved). */
  async function refresh(){
    if(!Ctx.role || dirty() || saving) return;
    if(document.querySelector('.overlay,.dialog-overlay')) return;
    const p = parseHash().path;
    if(['/login','/otp','/admin/login','/become-participant'].some(x=>p.startsWith(x))) return;
    try{
      const r = await Api.bootstrap(Ctx.scope);
      if(r.role && r.db){ adopt(r.db); render(); }
    }catch(_){}
  }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') refresh(); });
  setInterval(()=>{ if(Ctx.role && dirty() && !saving) saveNow(); }, 2500);   // safety net: anything changed is saved within seconds
  /* Save anything pending, then pull the latest numbers (used right after an anonymous vote is counted). */
  async function reload(){
    await saveNow();
    const r = await Api.bootstrap(Ctx.scope);
    if(r.role && r.db) adopt(r.db);
  }
  return { boot, reload, schedule, saveNow, stash, dirty, adopt, get error(){ return lastError; } };
})();
