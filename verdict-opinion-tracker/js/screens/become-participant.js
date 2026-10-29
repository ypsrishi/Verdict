/* ============================= BECOME A PARTICIPANT (multi-step wizard) =============================
   Profile -> Become a Participant -> Constituency -> Personal Details -> Participant Details ->
   Party Details -> Photo -> Public Information -> Private Verification Information -> Submit ->
   Application Status.
   All in-progress answers live in APP.bpDraft (reset when the intro screen loads fresh) so no
   field is duplicated between steps — every step reads from and writes back to the same object. */
const BP_STEPS = ['constituency','personal','participant','party','photo','public','private','review'];
const BP_TITLES = { constituency:'Constituency', personal:'Personal Details', participant:'Participant Details', party:'Party Details', photo:'Photo', public:'Public Information', private:'Private Verification Information', review:'Submit Application' };
function freshBpDraft(){
  return {
    surveyId: (openSurveys()[0]||{}).id || '', constId: (((DB.constituencies[(openSurveys()[0]||{}).id]||[]).find(c=>c.eligible))||{}).id || '',
    fullName: DB.user.name || '', dob:'',
    year:'', tagline:'',
    partyId:undefined, // undefined = not chosen yet, null = independent, else party id
    useVerifiedPhoto:true,
    manifesto:'',
    idType:'College ID Card', idNumber:'', address:'', email:'',
  };
}
function screenBecomeParticipant(){
  APP.bpDraft = freshBpDraft();
  return shell({ top:Header({back:true, title:'Become a Participant'}), body:`
    <p class="small muted" style="line-height:1.5; margin-bottom:18px;">Apply to stand as a candidate in your constituency. You'll fill this in across a few short steps, and the administrator reviews everything before it goes live.</p>
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start; margin-bottom:10px;">${IC.flag(18)}<p class="tiny muted">Choose your survey &amp; constituency, add your personal and candidate details, then submit for review.</p></div>
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start;">${IC.shield(18)}<p class="tiny muted">Verification details (ID, address) are only ever visible to your administrator — never on your public candidate profile.</p></div>
    <div class="cta-area">
      <button class="btn btn-primary" ${openSurveys().length?'':'disabled'} onclick="nav('/become-participant/constituency')">Get started ${IC.chev(16)}</button>
      ${openSurveys().length?'':'<p class="tiny muted" style="text-align:center;">There is no open survey to apply for yet.</p>'}
    </div>
  `});
}
function bpChrome(step, bodyHtml){
  const idx = BP_STEPS.indexOf(step);
  const dots = BP_STEPS.map((s,i)=>`<div class="step-dot ${i<idx?'done':(i===idx?'now':'')}"></div>`).join('');
  return shell({ top:Header({back:true, title:'Become a Participant'}), body:`
    <div class="eyebrow">Step ${idx+1} of ${BP_STEPS.length} · ${BP_TITLES[step]}</div>
    <div class="step-dots" style="margin-top:10px; margin-bottom:6px;">${dots}</div>
    ${bodyHtml}
  `});
}
function bpBack(step){
  const idx = BP_STEPS.indexOf(step);
  nav(idx<=0 ? '/become-participant' : '/become-participant/'+BP_STEPS[idx-1]);
}
function bpGoto(step){ nav('/become-participant/'+step); }
function ensureBpDraft(){ if(!APP.bpDraft) APP.bpDraft = freshBpDraft(); return APP.bpDraft; }

function screenBpConstituency(){
  const d = ensureBpDraft();
  const surveys = openSurveys();
  const cons = (DB.constituencies[d.surveyId]||[]).filter(c=>c.eligible);
  return bpChrome('constituency', `
    <div class="field"><label>Survey</label>
      <select class="input" id="bpSurvey" onchange="APP.bpDraft.surveyId=this.value; APP.bpDraft.constId=(DB.constituencies[this.value]||[]).find(c=>c.eligible)?.id; navReplace('/become-participant/constituency')">
        ${surveys.map(s=>`<option value="${s.id}" ${s.id===d.surveyId?'selected':''}>${s.title}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Constituency</label>
      <select class="input" id="bpConst">
        ${cons.map(c=>`<option value="${c.id}" ${c.id===d.constId?'selected':''}>${c.name}</option>`).join('')}
      </select>
      ${!cons.length?'<p class="error-text">No open constituencies for this survey right now.</p>':''}
    </div>
    <div class="cta-area">
      <button class="btn btn-primary" ${!cons.length?'disabled':''} onclick="APP.bpDraft.constId=document.getElementById('bpConst').value; bpGoto('personal')">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpPersonal(){
  const d = ensureBpDraft();
  return bpChrome('personal', `
    <div class="field"><label>Full name</label><input class="input" id="bpName" value="${esc(d.fullName)}"></div>
    <div class="field"><label>Email address</label><input class="input" value="${maskEmail(SessionStore.get().email||DB.user.email)}" disabled></div>
    <div class="field"><label>Date of birth</label><input class="input" type="date" id="bpDob" value="${d.dob}"></div>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('personal')">Back</button>
      <button class="btn btn-primary" onclick="
        const n=document.getElementById('bpName').value.trim();
        if(!n){ toast('Enter your full name'); return; }
        APP.bpDraft.fullName=n; APP.bpDraft.dob=document.getElementById('bpDob').value;
        bpGoto('participant');
      ">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpParticipant(){
  const d = ensureBpDraft();
  return bpChrome('participant', `
    <div class="field"><label>Year / role</label><input class="input" id="bpYear" placeholder="e.g. Final Year, Computer Engineering" value="${d.year}"></div>
    <div class="field"><label>Campaign tagline</label><input class="input" id="bpTagline" maxlength="90" placeholder="One line voters will see on your card" value="${d.tagline}">
      <p class="helper">Shown on your candidate card in the participant list.</p>
    </div>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('participant')">Back</button>
      <button class="btn btn-primary" onclick="
        const y=document.getElementById('bpYear').value.trim(), t=document.getElementById('bpTagline').value.trim();
        if(!y||!t){ toast('Fill in both fields to continue'); return; }
        APP.bpDraft.year=y; APP.bpDraft.tagline=t;
        bpGoto('party');
      ">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpParty(){
  const d = ensureBpDraft();
  const rowFor = (id,name,symbolHtml,logoHtml)=>{
    const isSel = d.partyId===id;
    return `<label class="card" style="display:flex; align-items:center; gap:12px; margin-bottom:0; cursor:pointer; ${isSel?'border-color:var(--ink-900); background:var(--paper-soft);':''}" onclick="APP.bpDraft.partyId=${id===null?'null':`'${id}'`}; navReplace('/become-participant/party')">
      ${symbolHtml}${logoHtml}
      <span style="flex:1;" class="small semi">${name}</span>
      <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isSel?'var(--ink-900)':'var(--line)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        ${isSel?`<div style="width:10px; height:10px; border-radius:50%; background:var(--ink-900);"></div>`:''}
      </div>
    </label>`;
  };
  return bpChrome('party', `
    <p class="tiny muted" style="margin-bottom:12px;">Select the party or group you're representing, or run as an independent.</p>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${DB.parties.filter(p=>p.active!==false).map(p=>rowFor(p.id, p.name, PartySymbol(p,22), PartyLogo(p,22))).join('')}
      ${rowFor(null, 'Independent', `<span class="party-symbol" style="background:var(--ink-500);">${IC.user(13)}</span>`, '')}
    </div>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('party')">Back</button>
      <button class="btn btn-primary" ${d.partyId===undefined?'disabled':''} onclick="bpGoto('photo')">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpPhoto(){
  const d = ensureBpDraft();
  const party = d.partyId===undefined ? null : (d.partyId?findParty(d.partyId):null);
  return bpChrome('photo', `
    <div style="display:flex; flex-direction:column; align-items:center; padding:12px 0 8px;">
      ${PhotoAvatar(d.fullName||DB.user.name, party, 'lg')}
      <p class="small semi" style="margin-top:14px;">Use your verified profile photo</p>
      <p class="tiny muted" style="margin-top:4px; text-align:center; max-width:260px; line-height:1.5;">This reuses the photo captured during your identity verification, so it's already confirmed to be you.</p>
    </div>
    <button class="btn btn-secondary" style="margin-top:8px;" onclick="pickPhotoUpload()">${IC.camera(17)} Upload a different photo</button>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('photo')">Back</button>
      <button class="btn btn-primary" onclick="bpGoto('public')">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpPublic(){
  const d = ensureBpDraft();
  return bpChrome('public', `
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start; margin-bottom:14px;">${IC.info(18)}<p class="tiny muted">This is your campaign statement. It will be shown publicly on your candidate profile alongside your tagline.</p></div>
    <div class="field"><label>Public campaign statement</label><textarea class="input" id="bpManifesto" style="min-height:130px;" placeholder="Share your motivation and what you'd like to change...">${d.manifesto}</textarea></div>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('public')">Back</button>
      <button class="btn btn-primary" onclick="
        const m=document.getElementById('bpManifesto').value.trim();
        if(m.length<10){ toast('Add a few sentences about your campaign'); return; }
        APP.bpDraft.manifesto=m;
        bpGoto('private');
      ">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpPrivate(){
  const d = ensureBpDraft();
  const idOptions = ['College ID Card','Employee ID','Society Membership Card','Government-issued ID'];
  return bpChrome('private', `
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start; margin-bottom:14px;">${IC.shield(18)}<p class="tiny muted">Private verification information — only visible to your administrator. This will never appear on your public candidate profile.</p></div>
    <div class="field"><label>ID type</label><select class="input" id="bpIdType">${idOptions.map(o=>`<option ${o===d.idType?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="field"><label>ID number</label><input class="input" id="bpIdNumber" placeholder="e.g. RIT-CE-1420" value="${d.idNumber}"></div>
    <div class="field"><label>Address</label><textarea class="input" id="bpAddress" placeholder="Used only for verification">${d.address}</textarea></div>
    <div class="field"><label>Contact email</label><input class="input" type="email" id="bpEmail" placeholder="you@example.com" value="${d.email}"></div>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('private')">Back</button>
      <button class="btn btn-primary" onclick="
        const idn=document.getElementById('bpIdNumber').value.trim(), addr=document.getElementById('bpAddress').value.trim(), em=document.getElementById('bpEmail').value.trim();
        if(!idn||!addr||!em){ toast('Fill in all verification fields to continue'); return; }
        APP.bpDraft.idType=document.getElementById('bpIdType').value; APP.bpDraft.idNumber=idn; APP.bpDraft.address=addr; APP.bpDraft.email=em;
        bpGoto('review');
      ">Continue ${IC.chev(16)}</button>
    </div>
  `);
}

function screenBpReview(){
  const d = ensureBpDraft();
  const survey = findSurvey(d.surveyId);
  const cons = findConst(d.constId);
  const party = d.partyId ? findParty(d.partyId) : null;
  return bpChrome('review', `
    <div class="section-title" style="margin-top:0;"><h3>Public profile preview</h3></div>
    <p class="tiny muted" style="margin-top:-8px; margin-bottom:12px;">This is what voters will see if your application is approved.</p>
    <div class="card">
      <div class="card-row">
        ${PhotoAvatar(d.fullName, party, 'md')}
        <div style="flex:1;">
          <h4 style="font-size:15.5px;">${d.fullName}</h4>
          <p class="tiny muted" style="margin-top:2px;">${cons?cons.name:''}</p>
          <div style="margin-top:8px; display:flex; align-items:center; gap:7px;">
            ${party?PartySymbol(party,20):''}${party?PartyLogo(party,20):''}
            <span class="small semi">${party?party.name:'Independent candidate'}</span>
          </div>
          <p class="small" style="margin-top:10px; line-height:1.4;">${d.tagline}</p>
        </div>
      </div>
      <div class="divider"></div>
      <p class="small" style="line-height:1.6;">${d.manifesto}</p>
    </div>
    <div class="section-title"><h3>Verification details (admin only)</h3></div>
    <div class="card soft">
      <div style="display:flex; justify-content:space-between;"><span class="tiny muted">Survey</span><span class="tiny semi">${survey?survey.title:''}</span></div>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between;"><span class="tiny muted">Date of birth</span><span class="tiny semi">${d.dob||'—'}</span></div>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between;"><span class="tiny muted">${d.idType}</span><span class="tiny semi">${d.idNumber}</span></div>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between;"><span class="tiny muted">Contact email</span><span class="tiny semi">${d.email}</span></div>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between; gap:10px;"><span class="tiny muted">Address</span><span class="tiny semi" style="text-align:right;">${d.address}</span></div>
    </div>
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start;">${IC.info(18)}<p class="tiny muted">Applications are reviewed within 3–5 working days. You'll be notified once a decision is made.</p></div>
    <div class="cta-area">
      <button class="btn btn-secondary" onclick="bpBack('review')">Back</button>
      <button class="btn btn-primary" onclick="submitBpApplication()">${stampSVG(17,'#fff')} Submit application</button>
    </div>
  `);
}

function submitBpApplication(){
  const d = ensureBpDraft();
  const survey = findSurvey(d.surveyId);
  const cons = findConst(d.constId);
  const newId = 'ap'+(DB.applications.length+1)+'_'+Date.now().toString().slice(-4);
  DB.applications.push({
    id:newId, name:d.fullName, survey: survey?survey.title:'', surveyId:d.surveyId,
    constituency: cons?cons.name:'', constId:d.constId, partyId: d.partyId||null,
    status:'Pending', date:todayStr(), at:Date.now(), ownerEmail:SessionStore.get().email,
    public:{ year:d.year, tagline:d.tagline, manifesto:d.manifesto },
    private:{ fullName:d.fullName, dob:d.dob, idType:d.idType, idNumber:d.idNumber, address:d.address, email:d.email },
  });
  MY_APPLICATION_ID = newId;
  if(!DB.user.name) DB.user.name = d.fullName;
  APP.bpDraft = null;
  pushAdminNotification('New participant application', `${d.fullName} applied to run in ${cons?cons.name:'a constituency'} for ${survey?survey.title:'a survey'}.`, 'flag');
  toast('Application submitted');
  setTimeout(()=>navReplace('/participant-status'), 300);
}

/* Resume an existing application from "Needs Changes" — prefills the wizard draft from the
   application's stored fields and jumps back to the flagged step (or straight to review). */
function resumeApplication(appId){
  const app = findApplication(appId);
  if(!app) return;
  APP.bpDraft = {
    surveyId: app.surveyId, constId: app.constId,
    fullName: app.name, dob: app.private.dob,
    year: app.public.year, tagline: app.public.tagline,
    partyId: app.partyId, useVerifiedPhoto:true,
    manifesto: app.public.manifesto,
    idType: app.private.idType, idNumber: app.private.idNumber, address: app.private.address, email: app.private.email,
  };
  APP.resumeAppId = appId;
  nav('/become-participant/'+(app.resumeStep||'review'));
}
