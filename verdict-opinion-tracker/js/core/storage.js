/* ============================= APP STORAGE =============================
   Browser-only persistence (localStorage): the participant's login progress, their own profile
   (DB.user) and small UI drafts. ALL shared app data (surveys, candidates, applications, admin
   accounts, institution codes ...) is stored on the server — see js/core/api.js. */
const AppStorage = (()=>{
  const NS = 'verdict.';
  const APP_KEYS = ['ctxSurvey','selectedParticipant','country','loginDraft','otpMeta','bpDraft','pendingToast','instCode','instName','lastSubmit'];
  const read  = k => { try{ return JSON.parse(localStorage.getItem(NS+k)); }catch(_){ return null; } };
  const write = (k,v) => { try{ localStorage.setItem(NS+k, JSON.stringify(v)); }catch(_){} };
  const remove = k => { try{ localStorage.removeItem(NS+k); }catch(_){} };

  /* Called once before the first render of every page. */
  function restore(){
    const user = read('user'); if(user) DB.user = Object.assign(blankUser(), user);
    const app = read('app');
    if(app) APP_KEYS.forEach(k => { if(app[k] !== undefined) APP[k] = app[k]; });
  }
  /* Called before leaving a page. */
  function flush(){
    write('user', DB.user);
    const app = {}; APP_KEYS.forEach(k => { app[k] = APP[k]; });
    write('app', app);
    if(typeof Sync !== 'undefined') Sync.stash();   // keep unsaved shared changes safe until the server confirms
  }
  function resetAll(){
    try{ Object.keys(localStorage).filter(k=>k.startsWith(NS)).forEach(k=>localStorage.removeItem(k)); }catch(_){}
  }
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') flush(); });
  return { read, write, remove, restore, flush, resetAll };
})();
