/* ============================= SESSION STORE ============================= */
const SessionStore = (()=>{
  const blank = ()=>({ token:null, email:null, step:'idle' });
  const load = ()=>AppStorage.read('session') || blank();
  const save = s=>AppStorage.write('session', s);
  return {
    get(){ const s = load(); return { token:s.token, email:s.email, step:s.step }; },
    setStep(step, email){ const s = load(); s.step = step; if(email) s.email = email; save(s); },
    setToken(token){ const s = load(); s.token = token; save(s); },
    clear(){ save(blank()); },
    isAuthenticated(){ return load().step === 'verified'; },
  };
})();

function maskEmail(email){
  email = String(email || '');
  const at = email.indexOf('@');
  if(at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if(local.length <= 2) return local[0] + '•' + domain;
  return local.slice(0, 2) + '•'.repeat(Math.max(1, local.length - 2)) + domain;
}
function fmtTime(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(s/60), r = s%60;
  return m+':'+String(r).padStart(2,'0');
}
function validateInstituteCode(raw){
  const val = (raw||'').trim();
  if(!val) return {valid:false, reason:'Enter your institution or organisation code'};
  if(!/^[A-Za-z0-9-]{4,15}$/.test(val)) return {valid:false, reason:'Use 4–15 letters or numbers, e.g. RIDGEVIEW26'};
  return {valid:true, value:val.toUpperCase()};
}
