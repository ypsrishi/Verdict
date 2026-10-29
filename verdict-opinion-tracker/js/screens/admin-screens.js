/* ============================= ADMIN SCREENS ============================= */
function suggestInstCode(org){
  const base = String(org||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10);
  return base.length >= 2 ? base + String(new Date().getFullYear()).slice(-2) : '';
}
function screenAdminLogin(){
  const signup = (APP.adminMode === 'signup');
  const field = (id,label,attrs,help='') => `<div class="field" id="aw_${id}"><label>${label}</label><input class="input" id="${id}" ${attrs}>${help?`<p class="helper">${help}</p>`:''}<p class="error-text" id="${id}Err" style="display:none;"></p></div>`;
  return shell({ fab:false, top:Header({back:true}), body:`
    <div class="auth-content" style="padding-top:0;">
      <div style="text-align:center; margin:4px 0 18px;">
        <div class="brand-mark" style="width:56px; height:56px; border-radius:16px; margin:0 auto 14px;">${IC.shield(26)}</div>
        <h1 style="font-size:22px;">${signup?'Create administrator account':'Administrator sign-in'}</h1>
        <p class="muted small" style="margin-top:6px;">${signup?'Set up your institution or organisation. You will get a code to share with your participants.':'Manage surveys, constituencies and results.'}</p>
      </div>
      <div class="tabs" style="margin-bottom:16px;">
        <button class="tab ${signup?'':'active'}" onclick="setAdminMode('signin')">Sign in</button>
        <button class="tab ${signup?'active':''}" onclick="setAdminMode('signup')">Create account</button>
      </div>
      <div class="card soft" id="adminBanner" style="display:none; margin-bottom:12px; border:1px solid var(--stamp-soft); background:var(--stamp-soft);"><p class="tiny" id="adminBannerText" style="color:var(--stamp); line-height:1.4;"></p></div>
      ${signup ? `
        ${field('adName','Your name','placeholder="e.g. R. Sathe" autocomplete="name"')}
        ${field('adOrg','Institution or organisation name','placeholder="e.g. Ridgeview Institute of Technology" oninput="onAdminOrgInput()"')}
        ${field('adCode','Institution or organisation code','placeholder="e.g. RIDGEVIEW26" autocapitalize="characters" autocomplete="off" oninput="APP.adCodeTouched=true"','Participants type this code to log in. 4–15 letters or numbers. You can change it later in Settings.')}
        ${field('adEmail','Work email','type="email" placeholder="you@institution.edu" autocomplete="email"')}
        ${field('adPass','Password','type="password" placeholder="At least 8 characters" autocomplete="new-password"')}
      ` : `
        ${field('adEmail','Work email','type="email" placeholder="you@institution.edu" autocomplete="email"')}
        ${field('adPass','Password','type="password" placeholder="Your password" autocomplete="current-password"')}
      `}
      <button class="btn btn-primary" id="adminSubmit" onclick="${signup?'submitAdminSignUp()':'submitAdminSignIn()'}">${signup?'Create account':'Sign in'}</button>
      <p class="tiny muted" style="text-align:center; margin-top:14px;">Not an administrator? <span class="semi" style="color:var(--ink-900); cursor:pointer;" onclick="nav('/welcome')">Go to participant sign-in</span></p>
    </div>` });
}
function setAdminMode(m){ APP.adminMode = m; APP.adCodeTouched = false; render(); }
function onAdminOrgInput(){
  if(APP.adCodeTouched) return;
  const c = document.getElementById('adCode'); const o = document.getElementById('adOrg');
  if(c && o) c.value = suggestInstCode(o.value);
}
function adminFieldError(id, msg){
  const e = document.getElementById(id+'Err'), i = document.getElementById(id);
  if(e){ e.textContent = msg; e.style.display = msg ? 'block' : 'none'; }
  if(i) i.classList.toggle('error', !!msg);
}
function adminBanner(msg){ const b=document.getElementById('adminBanner'), t=document.getElementById('adminBannerText'); if(b&&t){ t.textContent=msg; b.style.display=msg?'block':'none'; } }
function setAdminBusy(busy, label){ const b=document.getElementById('adminSubmit'); if(!b) return; b.disabled = busy; b.innerHTML = busy ? '<span class="spinner"></span> Please wait...' : label; }
const val = id => (document.getElementById(id)?.value || '').trim();
async function submitAdminSignIn(){
  ['adEmail','adPass'].forEach(i=>adminFieldError(i,'')); adminBanner('');
  const email = val('adEmail'), pass = document.getElementById('adPass').value;
  let bad = false;
  if(!/^\S+@\S+\.\S+$/.test(email)){ adminFieldError('adEmail','Enter a valid email address'); bad = true; }
  if(!pass){ adminFieldError('adPass','Enter your password'); bad = true; }
  if(bad) return;
  setAdminBusy(true);
  try{ await Api.adminLogin(email, pass); await navReplace('/admin/dashboard'); }
  catch(e){ setAdminBusy(false,'Sign in'); adminBanner(e.message); }
}
async function submitAdminSignUp(){
  ['adName','adOrg','adCode','adEmail','adPass'].forEach(i=>adminFieldError(i,'')); adminBanner('');
  const name = val('adName'), orgName = val('adOrg'), email = val('adEmail'), password = document.getElementById('adPass').value;
  const codeCheck = validateInstituteCode(document.getElementById('adCode').value);
  let bad = false;
  if(!name){ adminFieldError('adName','Enter your name'); bad = true; }
  if(!orgName){ adminFieldError('adOrg','Enter your institution or organisation name'); bad = true; }
  if(!codeCheck.valid){ adminFieldError('adCode', codeCheck.reason); bad = true; }
  if(!/^\S+@\S+\.\S+$/.test(email)){ adminFieldError('adEmail','Enter a valid email address'); bad = true; }
  if(password.length < 8){ adminFieldError('adPass','Password must be at least 8 characters'); bad = true; }
  if(bad) return;
  setAdminBusy(true);
  try{
    await Api.adminRegister({ name, email, password, orgName, code:codeCheck.value });
    APP.pendingToast = 'Account created. Your institution code is '+codeCheck.value;
    await navReplace('/admin/dashboard');
  }catch(e){
    setAdminBusy(false,'Create account');
    if(e.field && document.getElementById(e.field)) adminFieldError(e.field, e.message); else adminBanner(e.message);
  }
}
function AdminHeader(title,sub){ return Header({back:true, title, subtitle:sub, notif:true, notifTo:'/admin/notifications'}); }
/* Single source of truth for every dashboard number so the stat boxes, "needs attention"
   card and per-screen counts can never drift out of sync with DB.* — they all read through
   this one computed snapshot rather than hard-coded figures. */
function adminStats(){
  const activeSurveys = DB.surveys.filter(s=>s.status==='Active').length;
  const totalParticipants = DB.participants.filter(p=>p.active!==false).length;
  const totalConstituencies = Object.values(DB.constituencies).flat().length;
  const pendingApplications = DB.applications.filter(a=>a.status==='Pending').length;
  const totalResponses = DB.surveys.reduce((sum,s)=>sum+s.responses,0);
  const totalPool = DB.surveys.reduce((sum,s)=>sum+s.eligiblePool,0);
  const participationRate = totalPool ? Math.round(totalResponses/totalPool*100) : 0;
  return { activeSurveys, totalParticipants, totalConstituencies, pendingApplications, totalResponses, participationRate, totalSurveys:DB.surveys.length };
}
function screenAdminDashboard(){
  const st = adminStats();
  const oldestPending = DB.applications.filter(a=>a.status==='Pending').sort((a,b)=>(a.at||0)-(b.at||0))[0];
  return shell({ bottomNav:BottomNavAdmin('dash'), top:`
    <div class="topbar"><div class="topbar-row">
      <div class="brand"><div class="brand-mark">${stampSVG(18,'#fff')}</div><div class="brand-name">Verdict Admin</div></div>
      <div style="flex:1;"></div>
      <button class="icon-btn icon-btn-wrap" onclick="nav('/admin/notifications')">${IC.bell(18)}${DB.adminNotifications.filter(n=>!n.read).length>0?'<span class="badge-dot"></span>':''}</button>
      <button class="icon-btn icon-btn-wrap" onclick="nav('/admin/activity')">${IC.activity(18)}</button>
      <button class="icon-btn" onclick="nav('/admin/settings')">${IC.gear(18)}</button>
    </div></div>`, body:`
    <p class="tiny muted" style="margin-bottom:4px;">${esc(Ctx.inst?Ctx.inst.name:'')}</p>
    <h2 style="font-size:20px; margin-bottom:16px;">Welcome, ${esc(Ctx.admin?Ctx.admin.name:'Administrator')}</h2>
    ${InstCodeCard()}
    ${DB.surveys.length===0 ? GettingStartedCard() : ''}
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      ${StatBox(st.activeSurveys,'Active surveys')}
      ${StatBox(st.totalParticipants.toLocaleString(),'Participants')}
      ${StatBox(st.totalConstituencies,'Constituencies')}
    </div>
    <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
      ${StatBox(st.pendingApplications,'Pending apps')}
      ${StatBox(st.totalResponses.toLocaleString(),'Responses')}
      ${StatBox(st.participationRate+'%','Participation')}
    </div>
    ${st.pendingApplications>0?`
    <div class="section-title"><h3>Needs attention</h3></div>
    <a class="card card-tap" onclick="nav('/admin/applications')">
      <div class="card-row">
        <div class="avatar sm" style="background:var(--gold);">${IC.flag(15)}</div>
        <div style="flex:1;">
          <p class="small semi">${st.pendingApplications} participant application${st.pendingApplications===1?'':'s'} pending review</p>
          <p class="tiny muted" style="margin-top:2px;">${oldestPending?'Oldest submitted '+oldestPending.date:''}</p>
        </div>
        <span class="chev">${IC.chev(16)}</span>
      </div>
    </a>`:''}
    <div class="section-title"><h3>Quick actions</h3></div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <button class="btn btn-secondary" onclick="openAddParticipantForm()">${IC.users(16)} Add participant</button>
      <button class="btn btn-secondary" onclick="openAddPartyForm()">${IC.flag(16)} Add party</button>
      <button class="btn btn-secondary" onclick="openAddConstituencyForm()">${IC.map(16)} Add constituency</button>
      <button class="btn btn-secondary" onclick="openCreateSurveyForm()">${IC.survey(16)} Create survey</button>
      <button class="btn btn-secondary" onclick="nav('/admin/applications')">${IC.shield(16)} Review applications</button>
      <button class="btn btn-secondary" onclick="nav('/admin/results')">${IC.chart(16)} View results</button>
    </div>
    <div class="section-title"><h3>Your surveys</h3><span class="link" onclick="nav('/admin/surveys')">See all</span></div>
    ${DB.surveys.slice(0,3).map(s=>`
      <a class="card card-tap" onclick="nav('/admin/surveys/${s.id}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1; min-width:0;">
            <h4 style="font-size:14.5px;">${s.title}</h4>
            <p class="tiny muted" style="margin-top:4px;">${s.responses.toLocaleString()} responses · ${s.constituencies} constituencies</p>
          </div>
          <span class="pill ${pillClass(s.status)}">${s.status}</span>
        </div>
      </a>`).join('')}
  `});
}
function screenAdminSurveys(q={}){
  const filter = q.f || 'All';
  const tabs = ['All','Active','Upcoming','Closed','Draft'];
  const list = filter==='All' ? DB.surveys : DB.surveys.filter(s=>s.status===filter);
  return shell({ bottomNav:BottomNavAdmin('surveys'), top:AdminHeader('Surveys')+`<div class="tabs">${tabs.map(c=>`<button class="tab ${filter===c?'active':''}" onclick="navReplace('/admin/surveys${qs({f:c})}')">${c}</button>`).join('')}</div>`, body:`
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openCreateSurveyForm()">${IC.plus(17)} Create new survey</button>
    ${list.map(s=>`
      <div class="card">
        <div class="card-tap" onclick="nav('/admin/surveys/${s.id}')" style="display:flex; justify-content:space-between; align-items:flex-start; cursor:pointer;">
          <div style="flex:1; min-width:0;">
            <h4 style="font-size:15px;">${s.title}</h4>
            <p class="tiny muted" style="margin-top:4px;">${s.org}</p>
          </div>
          <span class="pill ${pillClass(s.status)}">${s.status}</span>
        </div>
        <div class="divider" style="margin:12px 0 10px;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="tiny muted">${s.constituencies} constituencies</span>
          <span class="tiny muted">${s.responses.toLocaleString()} responses</span>
          <span class="tiny semi">${s.end}</span>
        </div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn btn-secondary sm" style="flex:1;" onclick="nav('/admin/surveys/${s.id}')">Manage</button>
          <button class="btn btn-secondary sm" style="flex:1;" onclick="surveyActionSheet('${s.id}')">Actions ${IC.chev(13)}</button>
        </div>
      </div>`).join('') || EmptyState({icon:IC.survey(28), title:'No surveys here', sub:'Nothing matches this filter yet.'})}
  `});
}
function screenAdminSurveyDetails(id){
  const s = findSurvey(id);
  if(!s) return notFoundScreen('Survey not found', '/admin/surveys', true);
  const cons = DB.constituencies[s.id]||[];
  const parts = DB.participants.filter(p=>p.surveyId===s.id);
  return shell({ top:AdminHeader('Survey details', s.title), body:`
    <div class="card soft">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="eyebrow">${s.category}</span>
        <span class="pill ${pillClass(s.status)}">${s.status}</span>
      </div>
      <h2 style="font-size:19px; margin-top:8px;">${s.title}</h2>
      <p class="small muted" style="margin-top:4px;">${s.org}</p>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between;">
        <div><p class="tiny muted">Opens</p><p class="small semi">${s.start}</p></div>
        <div><p class="tiny muted">Closes</p><p class="small semi">${s.end}</p></div>
        <div><p class="tiny muted">Responses</p><p class="small semi">${s.responses.toLocaleString()}</p></div>
      </div>
    </div>
    <div style="display:flex; gap:8px; margin:14px 0;">
      <button class="btn btn-secondary sm" style="flex:1;" onclick="openEditSurveyForm('${s.id}')">${IC.gear(15)} Edit</button>
      <button class="btn btn-secondary sm" style="flex:1;" onclick="nav('/admin/preview/survey/${s.id}')">${IC.survey(15)} Preview</button>
      <button class="btn btn-primary sm" style="flex:1;" onclick="surveyActionSheet('${s.id}')">Status ${IC.chev(13)}</button>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:14px 0;">
      <button class="btn btn-secondary sm" style="width:100%;" onclick="nav('/admin/constituencies')">${IC.map(15)} Constituencies (${cons.length})</button>
      <button class="btn btn-secondary sm" style="width:100%;" onclick="nav('/admin/participants${qs({survey:s.id})}')">${IC.users(15)} Candidates (${parts.length})</button>
      <button class="btn btn-secondary sm" style="width:100%;" onclick="nav('/admin/results/${s.id}')">${IC.chart(15)} Results</button>
      <button class="btn btn-secondary sm" style="width:100%;" onclick="nav('/admin/links')">${IC.link2(15)} Shareable link</button>
    </div>
    <div class="section-title"><h3>Constituencies</h3><span class="link" onclick="openAddConstituencyForm('${s.id}')">Add</span></div>
    <div class="card flush">
      ${cons.map(c=>`<div class="list-row" style="cursor:pointer;" onclick="constituencyActionSheet('${c.id}')"><div class="avatar sm">${IC.map(15)}</div><div style="flex:1;"><p class="small semi">${c.name}</p><p class="tiny muted">${c.count} participants</p></div><span class="pill ${c.eligible?'verified':'closed'}">${c.eligible?'Open':'Closed'}</span></div>`).join('') || `<p class="tiny muted" style="padding:14px 16px;">No constituencies yet.</p>`}
    </div>
    <div class="section-title"><h3>Candidates</h3><span class="link" onclick="openAddParticipantForm('${s.id}')">Add</span></div>
    <div class="card flush">
      ${parts.map(p=>`<div class="list-row" style="cursor:pointer;" onclick="participantActionSheet('${p.id}')">${PhotoAvatar(p.name, findParty(p.partyId), 'sm', p.photoColor)}<div style="flex:1; min-width:0;"><p class="small semi">${p.name}</p><p class="tiny muted" style="margin-top:2px;">${p.constName}${p.active===false?' · Inactive':''}</p></div><span class="chev">${IC.chev(16)}</span></div>`).join('') || `<p class="tiny muted" style="padding:14px 16px;">No candidates added yet.</p>`}
    </div>
    <button class="btn btn-outline" style="margin-top:6px;" onclick="openAddAnnouncementForm()">${IC.megaphone(16)} Post an announcement</button>
  `});
}
function screenAdminConstituencies(q={}){
  const surveyFilter = q.survey || '';
  const all = Object.entries(DB.constituencies).flatMap(([sid,arr])=>arr.map(c=>({...c, survey:findSurvey(sid)})))
    .filter(c=>!surveyFilter || (c.survey && c.survey.id===surveyFilter));
  return shell({ bottomNav:BottomNavAdmin('people'), top:AdminHeader('Constituencies'), body:`
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openAddConstituencyForm('${surveyFilter||''}')">${IC.plus(17)} Add constituency</button>
    ${all.map(c=>`
      <div class="card card-tap" style="cursor:pointer;" onclick="constituencyActionSheet('${c.id}')">
        <div class="card-row">
          <div class="avatar sm">${IC.map(16)}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <h4 style="font-size:14.5px;">${c.name}</h4>
              <span class="pill ${c.eligible?'verified':'closed'}">${c.eligible?'Open':'Closed'}</span>
            </div>
            <p class="tiny muted" style="margin-top:4px;">${c.survey?c.survey.title:''}</p>
            <p class="tiny muted" style="margin-top:2px;">${c.count} participants</p>
          </div>
          <span class="chev">${IC.chev(16)}</span>
        </div>
      </div>`).join('') || EmptyState({icon:IC.map(28), title:'No constituencies', sub:'Add one to get started.'})}
  `});
}
function screenAdminParticipants(q={}){
  const constFilter = q.const || '';
  const surveyFilter = q.survey || '';
  let list = DB.participants;
  if(constFilter) list = list.filter(p=>p.constId===constFilter);
  if(surveyFilter) list = list.filter(p=>p.surveyId===surveyFilter);
  return shell({ bottomNav:BottomNavAdmin('people'), top:AdminHeader('Participants')+`<div class="tabs"><button class="tab active">All candidates</button><button class="tab" onclick="nav('/admin/applications')">Applications</button><button class="tab" onclick="nav('/admin/parties')">Parties</button></div>`, body:`
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openAddParticipantForm('${surveyFilter||''}')">${IC.plus(17)} Add candidate</button>
    ${(constFilter||surveyFilter)?`<button class="btn btn-secondary sm" style="margin-bottom:14px;" onclick="nav('/admin/participants')">${IC.x(13)} Clear filter</button>`:''}
    ${list.map(p=>{ const party=findParty(p.partyId); const active = p.active!==false; return `
      <div class="card card-tap" style="cursor:pointer;" onclick="participantActionSheet('${p.id}')">
        <div class="card-row">
          ${PhotoAvatar(p.name, party, 'sm', p.photoColor)}
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <h4 style="font-size:14.5px;">${p.name}</h4>
              ${!active?`<span class="pill closed">Inactive</span>`:''}
            </div>
            <p class="tiny muted" style="margin-top:3px;">${p.constName} · ${(findSurvey(p.surveyId)?.title||'').split(' ').slice(0,3).join(' ')}…</p>
          </div>
          ${PartySymbol(party,26)}
        </div>
      </div>`;}).join('') || EmptyState({icon:IC.users(28), title:'No candidates', sub:'Add a candidate to get started.'})}
  `});
}
function screenAdminApplications(){
  return shell({ top:AdminHeader('Participant Applications'), body:`
    <p class="tiny muted" style="margin-bottom:14px;">${DB.applications.filter(a=>a.status==='Pending').length} pending review</p>
    ${DB.applications.map(a=>`
      <div class="card" id="app-${a.id}">
        <div class="card-row card-tap" style="cursor:pointer;" onclick="viewApplicationDetails('${a.id}')">
          <div class="avatar sm">${initials(a.name)}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <h4 style="font-size:14.5px;">${a.name}</h4>
              <span class="pill ${pillClass(a.status)}">${a.status}</span>
            </div>
            <p class="tiny muted" style="margin-top:4px;">${a.constituency} · ${a.survey}</p>
            <p class="tiny muted" style="margin-top:2px; opacity:.75;">Applied ${a.date}</p>
          </div>
          <span class="chev">${IC.chev(16)}</span>
        </div>
        ${a.status==='Pending'||a.status==='Needs Changes'?`<div style="display:flex; gap:8px; margin-top:12px;"><button class="btn btn-secondary sm" style="flex:1;" onclick="reviewApplication('${a.id}','Rejected')">Reject</button><button class="btn btn-secondary sm" style="flex:1;" onclick="reviewApplication('${a.id}','Needs Changes')">Needs changes</button><button class="btn btn-primary sm" style="flex:1;" onclick="reviewApplication('${a.id}','Approved')">Approve</button></div>`:''}
      </div>`).join('') || EmptyState({icon:IC.shield(28), title:'No applications', sub:'New participant applications will appear here.'})}
  `});
}
function viewApplicationDetails(id){
  const a = findApplication(id); if(!a) return;
  openActionSheet({ title:a.name, sub:a.survey+' · '+a.constituency, actions:[
    {label:'Role: '+(a.public.year||'—'), icon:IC.user(15)},
    {label:'Tagline: '+(a.public.tagline||'Not provided'), icon:IC.flag(15)},
    {label:'ID: '+(a.private.idType||'—')+' · '+(a.private.idNumber||'—'), icon:IC.shield(15)},
    {label:'Contact: '+(a.private.email||'—'), icon:IC.mail(15)},
    ...(a.status==='Pending'||a.status==='Needs Changes' ? [
      {label:'Approve application', icon:IC.check(15), onClick:()=>reviewApplication(id,'Approved')},
      {label:'Request changes', icon:IC.alert(15), onClick:()=>reviewApplication(id,'Needs Changes')},
      {label:'Reject application', icon:IC.x(15), danger:true, onClick:()=>reviewApplication(id,'Rejected')},
    ] : [])
  ]});
}
function reviewApplication(id, decision){
  const icon = decision==='Approved'?IC.check(20):(decision==='Needs Changes'?IC.alert(20):IC.x(20));
  const iconBg = decision==='Approved'?'var(--verify-soft)':(decision==='Needs Changes'?'var(--info-soft)':'var(--stamp-soft)');
  openDialog({
    icon, iconBg,
    title: decision+' this application?',
    body: decision==='Approved'
      ? `The applicant will be notified and their candidate profile becomes publicly visible immediately.`
      : `The applicant will be notified of your decision. This action can be reviewed later in the activity log.`,
    confirmLabel: decision, cancelLabel:'Cancel',
    onConfirm: ()=>{ applyApplicationDecision(id, decision); toast('Application '+decision.toLowerCase()); nav('/admin/applications'); }
  });
}
/* Single place that mutates application/participant state so every screen (admin list, user
   status screen, public candidate list) stays in sync off the one DB.applications / DB.participants
   source of truth — nothing is duplicated between them. */
function applyApplicationDecision(id, decision){
  const app = findApplication(id);
  if(!app) return;
  app.status = decision;
  if(decision==='Approved'){
    if(!app.participantId){
      const cons = findConst(app.constId);
      const newPid = 'pt_'+app.id;
      DB.participants.push({
        id:newPid, name:app.name, surveyId:app.surveyId, constId:app.constId, constName: cons?cons.name:app.constituency,
        partyId: app.partyId||null, year: app.public.year, tagline: app.public.tagline, manifesto: app.public.manifesto, share:0, votes:0, active:true,
      });
      app.participantId = newPid;
      const party = findParty(app.partyId); if(party) party.members = (party.members||0)+1;
    }
    pushUserNotification('Application approved', `Your participant application for ${app.constituency} has been approved. Your candidate profile is now public.`, 'check', app.ownerEmail);
  } else if(decision==='Needs Changes'){
    app.adminNote = app.adminNote || 'Please review your public information and resubmit.';
    app.resumeStep = app.resumeStep || 'public';
    pushUserNotification('Application needs changes', `The administrator has requested changes to your application for ${app.constituency}.`, 'info', app.ownerEmail);
  } else if(decision==='Rejected'){
    app.adminNote = app.adminNote || 'This application was not approved for the current cycle.';
    pushUserNotification('Application update', `Your participant application for ${app.constituency} was not approved for this cycle.`, 'info', app.ownerEmail);
  }
}
function screenAdminParties(){
  return shell({ top:AdminHeader('Parties &amp; Groups'), body:`
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openAddPartyForm()">${IC.plus(17)} Add party or group</button>
    ${DB.parties.map(p=>{ const active = p.active!==false; return `
      <div class="card card-tap" style="cursor:pointer; ${active?'':'opacity:.6;'}" onclick="partyActionSheet('${p.id}')">
        <div class="card-row">
          ${PartySymbol(p,40)}
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <div style="display:flex; align-items:center; gap:8px;"><h4 style="font-size:14.5px;">${p.name}</h4>${PartyLogo(p,20)}</div>
              ${!active?`<span class="pill closed">Inactive</span>`:''}
            </div>
            <p class="tiny muted" style="margin-top:3px;">${p.members} candidates listed${p.founded?(' · Est. '+p.founded):''}</p>
          </div>
          <span class="chev">${IC.chev(16)}</span>
        </div>
      </div>`;}).join('') || EmptyState({icon:IC.flag(28), title:'No parties yet', sub:'Add a party or group to get started.'})}
  `});
}
function screenAdminResults(){
  return shell({ bottomNav:BottomNavAdmin('results'), top:AdminHeader('Results'), body:`
    ${DB.surveys.filter(s=>s.responses>0).map(s=>`
      <a class="card card-tap" onclick="nav('/admin/results/${s.id}')">
        <div class="card-row">
          <div class="avatar sm">${IC.chart(15)}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between;">
              <h4 style="font-size:14.5px;">${s.title}</h4>
              <span class="pill ${s.status==='Closed'?'closed':'active'}">${s.declared?'Declared':(s.status==='Closed'?'Awaiting declaration':'Live')}</span>
            </div>
            <p class="tiny muted" style="margin-top:4px;">${s.responses.toLocaleString()} responses counted</p>
          </div>
        </div>
      </a>`).join('') || EmptyState({icon:IC.chart(28), title:'No results yet', sub:'Results appear here once surveys collect responses.'})}
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start; margin-top:6px;">${IC.shield(18)}<p class="tiny muted">Administrators see only aggregated charts. Individual selections are never exposed here. All figures reflect opinion/prediction data, not an official electoral outcome.</p></div>
  `});
}
/* The single leading participant across a whole survey (highest share, any constituency) —
   used only for the big "RESULT DECLARED" summary banner; the constituency-by-constituency
   breakdown below it remains the source of truth for every individual race. */
function overallLeader(s){
  const parts = DB.participants.filter(p=>p.surveyId===s.id);
  if(!parts.length) return null;
  return parts.slice().sort((a,b)=>b.share-a.share)[0];
}
function screenAdminResultsDetail(id){
  const s = findSurvey(id);
  if(!s) return notFoundScreen('Survey not found', '/admin/results', true);
  const cons = DB.constituencies[s.id] || [];
  const isFinal = s.status==='Closed';
  const anyResults = cons.some(c=>DB.participants.some(p=>p.constId===c.id));
  const canTogglePublish = !isFinal && !s.declared;
  const leader = s.declared ? overallLeader(s) : null;
  const leaderParty = leader ? findParty(leader.partyId) : null;
  return shell({ top:AdminHeader('Results', s.title), body:`
    ${s.declared ? `
    <div class="card soft" style="border:1.5px solid var(--verify); margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:8px;">${stampSVG(20,'var(--verify)')}<p class="small semi" style="color:var(--verify); letter-spacing:.03em;">RESULT DECLARED</p></div>
      <p class="tiny muted" style="margin-top:6px;">Declared ${s.declaredAt}</p>
      ${leader ? `
      <div class="divider"></div>
      <div style="display:flex; align-items:center; gap:12px;">
        ${PhotoAvatar(leader.name, leaderParty, 'md', leader.photoColor)}
        <div style="flex:1; min-width:0;">
          <p class="small semi" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${leader.name}</p>
          <div style="display:flex; align-items:center; gap:6px; margin-top:5px;">${leaderParty?PartySymbol(leaderParty,18):''}${leaderParty?PartyLogo(leaderParty,18):''}<span class="tiny muted">${leaderParty?leaderParty.name:'Independent'}</span></div>
        </div>
        <div style="text-align:right; flex-shrink:0;"><p style="font-size:22px; font-weight:700; line-height:1;">${leader.share}%</p><p class="tiny muted" style="margin-top:4px;">${s.responses.toLocaleString()} responses</p></div>
      </div>` : ''}
      <p class="tiny muted" style="margin-top:12px; opacity:.8; line-height:1.5;">This reflects opinion/prediction data collected through Verdict — a survey signal, not an official electoral result.</p>
    </div>` : `
    <div class="card" style="border:none; background:var(--paper-soft); box-shadow:none; display:flex; align-items:center; gap:10px;">
      ${isFinal?stampSVG(20,'var(--verify)'):`<span style="width:9px; height:9px; border-radius:50%; background:var(--gold); flex-shrink:0;"></span>`}
      <p class="small semi">${isFinal?'Closed — ready to review &amp; declare':'Live prediction — updates automatically'}</p>
    </div>`}
    ${canTogglePublish ? `
    <div class="card" style="display:flex; align-items:center; gap:12px; margin-top:12px;">
      <div style="flex:1;"><p class="small semi">Live results visible to participants</p><p class="tiny muted" style="margin-top:3px;">Turn off to hide charts while the survey is still collecting responses.</p></div>
      <div class="switch" data-on="${s.resultsPublished!==false}" style="background:${s.resultsPublished!==false?'var(--ink-900)':'var(--paper-dim)'};" onclick="toggleResultsPublished('${s.id}')"><div class="knob" style="left:${s.resultsPublished!==false?'19px':'3px'};"></div></div>
    </div>` : ''}
    ${isFinal && !s.declared ? `<button class="btn btn-primary" style="margin-top:12px;" onclick="declareResultConfirm('${s.id}')">${IC.check(16)} Review &amp; declare result</button>` : ''}
    <div class="section-title"><h3>Constituency breakdown</h3></div>
    ${anyResults ? cons.map(c=>{
      const parts = DB.participants.filter(p=>p.constId===c.id).sort((a,b)=>b.share-a.share);
      if(!parts.length) return '';
      return `<div class="section-title"><h3>${c.name}</h3></div>
      <div class="card">${parts.map((p,i)=>ResultRow(p,i,c.count)).join('')}</div>`;
    }).join('') : EmptyState({icon:IC.chart(28), title:'No results yet', sub:'Results will appear here as soon as verified responses are counted.'})}
  `});
}
function toggleResultsPublished(id){
  const s = findSurvey(id); if(!s) return;
  s.resultsPublished = s.resultsPublished===false ? true : false;
  logActivity(s.resultsPublished?'published live results for':'unpublished live results for', s.title);
  toast(s.resultsPublished?'Results now visible to participants':'Results hidden from participants'); render();
}
function declareResultConfirm(id){
  const s = findSurvey(id); if(!s) return;
  const leader = overallLeader(s);
  openDialog({ icon:IC.shield(20), iconBg:'var(--gold-soft)', iconColor:'var(--gold-ink)',
    title:'Declare final result?',
    body: leader
      ? `This formally declares <b>${leader.name}</b> as the leading participant at ${leader.share}% and publishes the certified opinion result to all participants. This cannot be undone.`
      : `This publishes the certified opinion result to all participants. This cannot be undone.`,
    confirmLabel:'Declare result', cancelLabel:'Cancel',
    onConfirm:()=>declareResult(id)
  });
}
function declareResult(id){
  const s = findSurvey(id); if(!s) return;
  const leader = overallLeader(s);
  s.declared = true; s.certified = true; s.resultsPublished = true;
  s.declaredAt = new Date().toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' });
  DB.announcements.unshift({ id:'a_'+Date.now(), tag:'Result', title:s.title+' — result declared', date:todayStr(), body:'The opinion result for '+s.title+' has been declared'+(leader?(', with '+leader.name+' leading at '+leader.share+'%'):'')+'. This reflects respondent sentiment, not an official electoral outcome.', survey:s.id, published:true });
  pushUserNotification('Result declared', 'The opinion result for '+s.title+' is now available.', 'chart');
  pushAdminNotification('Result ready', s.title+' result was declared by '+adminName()+'.', 'chart');
  logActivity('declared result for', s.title);
  toast('Result declared'); render();
}
function screenAdminAnnouncements(){
  return shell({ top:AdminHeader('Announcements'), body:`
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openAddAnnouncementForm()">${IC.plus(17)} New announcement</button>
    ${DB.announcements.map(a=>{ const published = a.published!==false; return `
      <div class="card card-tap" style="cursor:pointer;" onclick="announcementActionSheet('${a.id}')">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <span class="eyebrow">${a.tag}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pill ${published?'verified':'upcoming'}">${published?'Published':'Draft'}</span>
            <span class="tiny muted">${a.date}</span>
          </div>
        </div>
        <h4 style="font-size:14.5px; margin-top:8px;">${a.title}</h4>
        <p class="small muted" style="margin-top:6px; line-height:1.5;">${a.body}</p>
      </div>`;}).join('') || EmptyState({icon:IC.megaphone(28), title:'No announcements', sub:'Post an update to keep participants informed.'})}
  `});
}
