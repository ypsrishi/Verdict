/* ============================= NAV HELPERS (multi-page) =============================
   Every screen is its own HTML file in /pages. <body data-route="/surveys/:id"> tells the page
   which screen it is; ids travel as ?id=… in the URL. Screens still call nav('/path') — it is
   translated to the right page file here. */
function pathToUrl(p){
  p = String(p).replace(/^#/, '');
  const [pathname, qstr] = p.split('?');
  for(const [tpl, file] of PAGE_MAP){
    const m = pathname.match(new RegExp('^' + tpl.replace(':id', '([\\w-]+)') + '$'));
    if(m){
      const params = new URLSearchParams(qstr || '');
      if(m[1]) params.set('id', m[1]);
      const s = params.toString();
      return file + '.html' + (s ? '?' + s : '');
    }
  }
  return 'welcome.html';
}
/* Navigation first makes sure every change has reached the server, so the next page never
   loads stale data (max wait 4s so a slow connection can't trap the user). */
async function settle(){
  AppStorage.flush();
  Tracker.flushBeacon();
  try{ await Promise.race([ Sync.saveNow(), new Promise(r=>setTimeout(r,4000)) ]); }catch(_){}
}
async function nav(path){ await settle(); location.href = pathToUrl(path); }
async function navReplace(path){ await settle(); location.replace(pathToUrl(path)); }
function goBack(){ history.back(); }
function parseHash(){
  const tpl = document.body.dataset.route || '/welcome';
  const q = {}; new URLSearchParams(location.search).forEach((v,k)=>{ q[k]=v; });
  let path = tpl;
  if(tpl.includes(':id')){ path = tpl.replace(':id', q.id || ''); delete q.id; }
  return {path, q};
}
function qs(obj){ const s=new URLSearchParams(obj).toString(); return s?('?'+s):''; }

/* ============================= ROUTER ============================= */
const ROUTES = [
  [/^\/welcome$/, ()=>screenWelcome()],
  [/^\/login$/, ()=>screenLogin()],
  [/^\/otp$/, ()=>screenOtp()],
  [/^\/home$/, ()=>screenHome()],
  [/^\/surveys$/, (m,q)=>screenSurveys(null,q)],
  [/^\/surveys\/([\w-]+)$/, (m)=>screenSurveyDetails(m[1])],
  [/^\/constituencies$/, (m,q)=>screenConstituencies(null,q)],
  [/^\/constituencies\/([\w-]+)$/, (m)=>screenConstituencyDetails(m[1])],
  [/^\/participants$/, (m,q)=>screenParticipants(null,q)],
  [/^\/participants\/([\w-]+)$/, (m)=>screenParticipantDetails(m[1])],
  [/^\/submit\/([\w-]+)$/, (m,q)=>screenSubmit(m[1],q)],
  [/^\/success$/, ()=>screenSuccess()],
  [/^\/results$/, ()=>screenResults()],
  [/^\/results\/([\w-]+)$/, (m)=>screenResultsDetail(m[1])],
  [/^\/announcements$/, ()=>screenAnnouncements()],
  [/^\/notifications$/, ()=>screenNotifications()],
  [/^\/profile$/, ()=>screenProfile()],
  [/^\/settings$/, ()=>screenSettings()],
  [/^\/become-participant$/, ()=>screenBecomeParticipant()],
  [/^\/become-participant\/constituency$/, ()=>screenBpConstituency()],
  [/^\/become-participant\/personal$/, ()=>screenBpPersonal()],
  [/^\/become-participant\/participant$/, ()=>screenBpParticipant()],
  [/^\/become-participant\/party$/, ()=>screenBpParty()],
  [/^\/become-participant\/photo$/, ()=>screenBpPhoto()],
  [/^\/become-participant\/public$/, ()=>screenBpPublic()],
  [/^\/become-participant\/private$/, ()=>screenBpPrivate()],
  [/^\/become-participant\/review$/, ()=>screenBpReview()],
  [/^\/participant-status$/, (m,q)=>screenParticipantStatus(m,q)],
  [/^\/verification-success$/, ()=>screenVerificationSuccess()],
  [/^\/connection-issue$/, ()=>screenConnectionIssue()],
  [/^\/admin\/login$/, ()=>screenAdminLogin()],
  [/^\/admin\/dashboard$/, ()=>screenAdminDashboard()],
  [/^\/admin\/surveys$/, (m,q)=>screenAdminSurveys(q)],
  [/^\/admin\/surveys\/([\w-]+)$/, (m)=>screenAdminSurveyDetails(m[1])],
  [/^\/admin\/constituencies$/, (m,q)=>screenAdminConstituencies(q)],
  [/^\/admin\/participants$/, (m,q)=>screenAdminParticipants(q)],
  [/^\/admin\/applications$/, ()=>screenAdminApplications()],
  [/^\/admin\/parties$/, ()=>screenAdminParties()],
  [/^\/admin\/results$/, ()=>screenAdminResults()],
  [/^\/admin\/results\/([\w-]+)$/, (m)=>screenAdminResultsDetail(m[1])],
  [/^\/admin\/preview\/survey\/([\w-]+)$/, (m)=>screenSurveyDetails(m[1])],
  [/^\/admin\/preview\/constituency\/([\w-]+)$/, (m)=>screenConstituencyDetails(m[1])],
  [/^\/admin\/preview\/participant\/([\w-]+)$/, (m)=>screenParticipantDetails(m[1])],
  [/^\/admin\/announcements$/, ()=>screenAdminAnnouncements()],
  [/^\/admin\/links$/, ()=>screenAdminLinks()],
  [/^\/admin\/activity$/, ()=>screenAdminActivity()],
  [/^\/admin\/user-activity$/, (m,q)=>screenAdminUserActivity(q)],
  [/^\/admin\/notifications$/, ()=>screenAdminNotifications()],
  [/^\/admin\/settings$/, ()=>screenAdminSettings()],
];
const NO_SKELETON = new Set(['/welcome','/login','/otp','/success','/verification-success','/admin/login']);
/* Pages that require email verification to be complete. */
const PROTECTED_PREFIXES = ['/home','/surveys','/constituencies','/participants','/submit','/success','/results','/announcements','/notifications','/profile','/settings','/become-participant','/participant-status'];
function isProtected(path){ return PROTECTED_PREFIXES.some(p => path===p || path.startsWith(p+'/')); }

/* Multi-step verification model: idle -> otp -> email_verified -> verified.
   Each gated screen has a minimum required step; entry screens (welcome/login/otp) bounce forward
   once the user has moved past them, so nobody can land back on a stale auth screen mid- or post-flow. */
const STEP_ORDER = ['idle','otp','email_verified','verified'];
const STEP_SCREEN = { idle:'/welcome', otp:'/otp', email_verified:'/verification-success', verified:'/home' };
const GATED_MIN_STEP = { '/otp':'otp', '/verification-success':'email_verified' };
const ENTRY_MAX_STEP = { '/welcome':'idle', '/login':'idle', '/otp':'otp' };
function stepIdx(s){ const i = STEP_ORDER.indexOf(s); return i<0 ? 0 : i; }

function navFor(path){
  if(path.startsWith('/admin')){
    if(path.startsWith('/admin/dashboard')) return BottomNavAdmin('dash');
    if(path.startsWith('/admin/surveys')) return BottomNavAdmin('surveys');
    if(path.startsWith('/admin/participants')||path.startsWith('/admin/constituencies')||path.startsWith('/admin/applications')||path.startsWith('/admin/parties')) return BottomNavAdmin('people');
    if(path.startsWith('/admin/results')) return BottomNavAdmin('results');
    if(path.startsWith('/admin/settings')||path.startsWith('/admin/announcements')||path.startsWith('/admin/links')||path.startsWith('/admin/activity')||path.startsWith('/admin/user-activity')||path.startsWith('/admin/notifications')) return BottomNavAdmin('more');
    return '';
  }
  if(path==='/home') return BottomNavUser('home');
  if(path.startsWith('/surveys')) return BottomNavUser('surveys');
  if(path.startsWith('/constituencies')) return BottomNavUser('const');
  if(path.startsWith('/results')) return BottomNavUser('results');
  if(path==='/profile') return BottomNavUser('profile');
  return '';
}
function skeletonHtml(path){
  const nav = navFor(path);
  return `<div class="topbar"><div class="topbar-row"><div class="sk" style="width:120px;height:20px;"></div><div style="flex:1"></div><div class="sk" style="width:38px;height:38px;border-radius:12px;"></div></div></div>
  <div class="content"><div class="sk sk-line" style="width:55%; height:20px; margin-bottom:16px;"></div><div class="sk sk-card tall"></div>${Array(3).fill('<div class="sk sk-card"></div>').join('')}</div>
  ${nav}`;
}
let navTimer = null;
function paintBackendDown(){
  document.getElementById('shell').innerHTML = shell({ fab:false, top:'', body:`
    <div class="auth-content" style="justify-content:center; text-align:center;">
      <div class="ic" style="margin:0 auto; background:var(--stamp-soft); color:var(--stamp);">${IC.wifiOff(28)}</div>
      <h2 style="font-size:19px; margin-top:16px;">Server not reachable</h2>
      <p class="small muted" style="margin-top:8px; line-height:1.55;">Verdict saves everything on its own server so nothing is lost. Start the app with PHP:</p>
      <div class="card soft" style="margin-top:12px; text-align:left;"><p class="tiny semi" style="font-family:monospace; word-break:break-all;">python -m uvicorn app:app --host 127.0.0.1 --port 8000</p></div>
      <p class="tiny muted" style="margin-top:10px;">then open http://localhost:8000</p>
      <button class="btn btn-primary" style="margin-top:18px;" onclick="location.reload()">Try again</button>
    </div>` });
}
function render(){
  Sync.schedule();
  closeDialog(); closeFormSheet(); closeActionSheet(); closeQrSheet(); closeSheetById('searchSheet'); closeSheetById('countrySheet');
  const {path,q} = parseHash();
  if(path !== '/otp') clearOtpTimers();

  if(Ctx.offline){ paintBackendDown(); return; }

  /* Administrator pages need an admin session (cookie held by the server). */
  if(path.startsWith('/admin')){
    if(path === '/admin/login'){ if(Ctx.role === 'admin'){ navReplace('/admin/dashboard'); return; } }
    else if(Ctx.role !== 'admin'){ navReplace('/admin/login'); return; }
  }

  const step = SessionStore.get().step;
  const idx = stepIdx(step);
  /* Past the OTP step a participant must also hold a server session for their institution. */
  if(!path.startsWith('/admin') && idx >= stepIdx('email_verified') && Ctx.role !== 'participant'){
    SessionStore.clear(); APP.pendingToast = 'Please sign in again'; navReplace('/welcome'); return;
  }

  // Entry screens (welcome/login/otp): bounce forward once the user has moved past them.
  if(ENTRY_MAX_STEP[path] && idx > stepIdx(ENTRY_MAX_STEP[path])){
    navReplace(STEP_SCREEN[step]); return;
  }
  // Gated verification screens: enforce a minimum step, resuming the flow where the user left off.
  if(GATED_MIN_STEP[path] && idx < stepIdx(GATED_MIN_STEP[path])){
    navReplace(STEP_SCREEN[step]); return;
  }
  // Fully protected app pages require the entire verification chain to be complete.
  if(isProtected(path) && step !== 'verified'){
    if(idx > stepIdx('idle')){ navReplace(STEP_SCREEN[step]); return; }
    APP.pendingToast = 'Please sign in to continue';
    navReplace('/welcome');
    return;
  }

  const match = ROUTES.find(([re])=>re.test(path));
  const shellEl = document.getElementById('shell');
  clearTimeout(navTimer);
  if(NO_SKELETON.has(path) || !match){
    paint(match, path, q);
    return;
  }
  shellEl.innerHTML = skeletonHtml(path);
  navTimer = setTimeout(()=>paint(match, path, q), 320);
}
function paint(match, path, q){
  const shellEl = document.getElementById('shell');
  let html = match ? match[1](path.match(match[0]), q) : screenWelcome();
  shellEl.innerHTML = html;
  const c = shellEl.querySelector('.content'); if(c){ c.classList.add('enter'); c.scrollTop = 0; }
  shellEl.scrollTop = 0;
  runScreenInit(path);
  if(APP.pendingToast){ const msg=APP.pendingToast; APP.pendingToast=null; setTimeout(()=>toast(msg, IC.info(14)), 250); }
}
function runScreenInit(path){
  if(path==='/login') initLoginScreen();
  else if(path==='/otp') initOtpScreen();
  else if(path==='/verification-success') initVerificationSuccess();
  else if(path==='/admin/user-activity') initAdminUserActivity();
}
window.addEventListener('DOMContentLoaded', async ()=>{
  AppStorage.restore();
  await Sync.boot(parseHash().path);
  if(Ctx.role === 'participant' && SessionStore.get().step === 'verified') await Ballot.loadStatus();
  render();
  Tracker.start();
});
