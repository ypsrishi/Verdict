/* ============================= BALLOT CLIENT (anonymous voting) =============================
   Sends the vote to Python /api/ballot. The server stores the choice against the random AnonId and
   remembers "this person has voted" separately as a one-way hash, so the two can't be matched up.
   See Python /api/ballot for the full explanation. */
const Ballot = (()=>{
  const URL_ = '/api/ballot';
  async function call(action, payload={}){
    let r;
    try{ r = await fetch(URL_, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(Object.assign({action}, payload)) }); }
    catch(_){ throw { code:'NETWORK', message:'Cannot reach the server. Check your connection and try again.' }; }
    let j; try{ j = await r.json(); }catch(_){ throw { code:'NETWORK', message:'The server did not answer correctly.' }; }
    if(!j.ok) throw { code:'REJECTED', message:j.error||'Request failed', already:!!j.already };
    return j;
  }
  /* Cast one anonymous vote. Resolves with { receipt }. */
  async function cast(surveyId, candidateId){
    const anonId = AnonId.ensure();
    return call('cast', { surveyId, candidateId, anonId });
  }
  /* Which surveys has THIS person already voted in? (answered by the server from the hash registry) */
  async function loadStatus(){
    try{ const r = await call('status'); APP.votedSurveys = r.voted || []; }
    catch(_){ APP.votedSurveys = APP.votedSurveys || []; }
    return APP.votedSurveys;
  }
  /* Re-read my own ballot using the receipt id (only works together with my own AnonId). */
  async function checkReceipt(receipt){ return call('receipt', { receipt, anonId: AnonId.get() }); }
  return { cast, loadStatus, checkReceipt };
})();
