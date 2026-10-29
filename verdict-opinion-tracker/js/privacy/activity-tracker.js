/* ============================= ACTIVITY TRACKER =============================
   Saves what each RANDOM ID does: which page it opened and which buttons it clicked.
   Events are stored by Python /api/activity -> storage/data/user-activity/<CODE>.jsonl and are shown to the
   admin under  Admin -> Settings -> "User activity (anonymous IDs)".

   WHAT IS RECORDED   page opened (route template, e.g. /participants/:id — never the real id),
                      button / tab / nav / link clicks with their visible label, time.
   WHAT IS NEVER RECORDED
                      email address, name, typed text, input values, IP address, browser details,
                      candidate names, and anything at all on the voting pages (/submit, /success)
                      or on elements marked  data-no-track.
   This keeps a person's activity separate from their vote. */
const Tracker = (()=>{
  const URL_ = '/api/activity';
  const NO_TRACK_PAGES = ['/submit', '/success'];
  let queue = [], timer = null, started = false;

  const page = () => document.body.dataset.route || '/';
  const blockedPage = () => NO_TRACK_PAGES.some(p => page() === p || page().startsWith(p + '/'));
  const clean = s => String(s||'').replace(/\s+/g,' ').trim().slice(0,60);

  function push(ev){
    if(blockedPage()) return;
    queue.push(Object.assign({ t:Date.now(), page:page() }, ev));
    if(queue.length >= 20) flush();
  }
  /* Work out a safe label + kind for whatever was clicked. Cards / rows / labels never expose their
     text (they can contain candidate names) — only real buttons, tabs and nav items do. */
  function describe(target){
    const t = target.closest('[data-no-track]'); if(t) return null;
    const el = target.closest('button, a, .tab, .nav-item, .list-row, .card-tap, label, .switch, select');
    if(!el) return null;
    if(el.matches('.nav-item'))         return { el:'nav',    label: clean(el.querySelector('.lbl')?.textContent) };
    if(el.matches('.tab'))              return { el:'tab',    label: clean(el.textContent) };
    if(el.matches('.switch'))           return { el:'toggle', label: clean(el.getAttribute('aria-label') || 'toggle') };
    if(el.matches('.list-row,.card-tap,label,select,a.card')) return { el:'card', label:'' };
    if(el.matches('button.icon-btn'))   return { el:'icon',   label: clean(el.getAttribute('aria-label') || el.dataset.track || 'icon button') };
    if(el.matches('button'))            return { el:'button', label: clean(el.dataset.track || el.textContent) };
    return { el:'link', label: clean(el.dataset.track || el.textContent) };
  }
  function onClick(e){
    const d = describe(e.target); if(!d) return;
    push({ type:'click', el:d.el, label:d.label });
  }
  function body(){ return JSON.stringify({ action:'log', anonId:AnonId.get(), events:queue.splice(0, 60) }); }
  function flush(){
    if(!queue.length || !AnonId.get()) return;
    try{ fetch(URL_, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', keepalive:true, body:body() }).catch(()=>{}); }catch(_){}
  }
  /* Used just before the page changes: sendBeacon survives navigation. */
  function flushBeacon(){
    if(!queue.length || !AnonId.get()) return;
    try{
      const ok = navigator.sendBeacon && navigator.sendBeacon(URL_, new Blob([body()], { type:'application/json' }));
      if(!ok) flush();
    }catch(_){ flush(); }
  }
  function start(){
    if(started || Ctx.role !== 'participant' || SessionStore.get().step !== 'verified') return;
    AnonId.ensure();
    started = true;
    push({ type:'page_view' });
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', ()=>{
      push({ type: document.visibilityState === 'hidden' ? 'tab_hidden' : 'tab_visible' });
      if(document.visibilityState === 'hidden') flushBeacon();
    });
    window.addEventListener('pagehide', flushBeacon);
    timer = setInterval(flush, 5000);
  }
  return { start, flush, flushBeacon };
})();
