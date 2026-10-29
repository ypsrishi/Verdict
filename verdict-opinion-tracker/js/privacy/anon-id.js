/* ============================= ANONYMOUS ID =============================
   After a person finishes verification (email) the browser creates a RANDOM ID
   for them. This ID is what votes and activity are stored against — never the name or email address.

   - It is generated here, in the browser, with crypto.getRandomValues. The server never receives the
     email address together with this ID in anything it saves, so nobody (admin included) can look up
     "which person owns ID X".
   - It lives in this browser (localStorage 'verdict.anonId'). If a DIFFERENT person signs in on the
     same device it is replaced (see js/screens/otp.js -> AnonId.reset()).
   - Shown to the voter as e.g.  VR-3F9A-C21B  (first 8 characters). The full 32-character id is what
     is sent to the server. */
const AnonId = (()=>{
  const KEY = 'anonId';
  const valid = id => typeof id === 'string' && /^[a-f0-9]{32}$/.test(id);
  function make(){
    const a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function get(){ const r = AppStorage.read(KEY); return (r && valid(r.id)) ? r.id : null; }
  /* Create the ID if this person doesn't have one yet. Call after verification. */
  function ensure(){
    let id = get();
    if(!id){ id = make(); AppStorage.write(KEY, { id, created: Date.now() }); }
    return id;
  }
  function reset(){ AppStorage.remove(KEY); }
  /* Friendly short form for screens: VR-3F9A-C21B */
  function short(id){
    id = (id || get() || '').toUpperCase();
    return id ? 'VR-' + id.slice(0,4) + '-' + id.slice(4,8) : '—';
  }
  return { get, ensure, reset, short };
})();
