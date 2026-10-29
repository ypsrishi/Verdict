/* ============================= DATA =============================
   The app now launches EMPTY. Everything below is filled in by the administrator (surveys,
   constituencies, parties, candidates, announcements...) and by participants (responses,
   applications). Shared data lives on the server (storage/data/store.json, see js/core/api.js);
   only `DB.user` (the signed-in participant's own profile) is kept in this browser. */
const SHARED_KEYS = ['surveys','constituencies','parties','participants','announcements','notifications','adminNotifications','activity','links','applications'];
const blankUser = () => ({ name:'', email:'', rawEmail:'', role:'Verified Participant', constituency:'', responded:[] });
const DB = {
  user: blankUser(),
  surveys: [],
  constituencies: {},      // surveyId -> [ {id,name,count,eligible} ]
  parties: [],
  participants: [],
  announcements: [],
  notifications: [],
  adminNotifications: [],
  activity: [],
  links: [],
  applications: [],
};
/* "My" application — the latest application whose ownerEmail is the signed-in participant. */
let MY_APPLICATION_ID = null;
const findSurvey = id => DB.surveys.find(s=>s.id===id);
const findConst = id => Object.values(DB.constituencies).flat().find(c=>c.id===id);
const constSurveyId = cid => Object.keys(DB.constituencies).find(k=>DB.constituencies[k].some(c=>c.id===cid));
const findParticipant = id => DB.participants.find(p=>p.id===id);
const findParty = id => DB.parties.find(p=>p.id===id);
const pillClass = st => ({Active:'active',Upcoming:'upcoming',Closed:'closed',Verified:'verified',Pending:'pending',Approved:'verified','Needs Changes':'info',Rejected:'rejected',Draft:'info',Paused:'pending'}[st]||'upcoming');
const findApplication = id => DB.applications.find(a=>a.id===id);
const initials = name => name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
const shade = (hex,amt)=>{ const n=parseInt(hex.slice(1),16); let r=(n>>16)+amt, g=(n>>8&0xff)+amt, b=(n&0xff)+amt; r=Math.min(255,Math.max(0,r)); g=Math.min(255,Math.max(0,g)); b=Math.min(255,Math.max(0,b)); return '#'+(r<<16|g<<8|b).toString(16).padStart(6,'0'); };

/* ---------- small shared helpers ---------- */
const todayStr = () => new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
function timeAgo(at, fallback){
  if(!at) return fallback || '';
  const s = Math.max(0, Math.floor((Date.now()-at)/1000));
  if(s < 45) return 'Just now';
  if(s < 3600) return Math.floor(s/60)+'m ago';
  if(s < 86400) return Math.floor(s/3600)+'h ago';
  if(s < 86400*30) return Math.floor(s/86400)+'d ago';
  return new Date(at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
const pctOf = (a,b) => (b>0 ? Math.min(100, Math.round(a/b*100)) : 0);
const userInitials = () => DB.user.name ? initials(DB.user.name) : '';
const greeting = () => { const h = new Date().getHours(); return h<12 ? 'Good morning' : (h<17 ? 'Good afternoon' : 'Good evening'); };
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const firstSurvey = () => DB.surveys[0] || null;
const openSurveys = () => DB.surveys.filter(s=>s.status!=='Closed' && s.status!=='Draft');
function ctxSurveyId(){ return (APP.ctxSurvey && findSurvey(APP.ctxSurvey)) ? APP.ctxSurvey : (DB.surveys[0] ? DB.surveys[0].id : null); }
/* Share of votes inside each constituency — mirrors the server so the UI updates instantly. */
function recomputeShares(constId){
  const grp = DB.participants.filter(p=>p.constId===constId);
  const total = grp.reduce((n,p)=>n+(p.votes||0),0);
  grp.forEach(p=>{ p.share = total>0 ? Math.round((p.votes||0)/total*100) : 0; });
}
const findMyApplication = () => {
  const em = (typeof SessionStore!=='undefined' && SessionStore.get().email) || DB.user.rawEmail;
  const mine = DB.applications.filter(a=>a.ownerEmail && a.ownerEmail===em);
  return mine[mine.length-1] || null;
};
/* Which surveys this person already voted in — answered by the server (Python /api/ballot 'status'), see js/privacy/ballot-client.js */
const hasResponded = sid => (APP.votedSurveys||[]).includes(sid);
