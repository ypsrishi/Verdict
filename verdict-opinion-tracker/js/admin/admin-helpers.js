/* ============================= ADMIN OPTION HELPERS ============================= */
function surveyOptions(){ return DB.surveys.map(s=>({value:s.id, label:s.title})); }
function partyOptions(){ return [{value:'', label:'Independent (no party)'}].concat(DB.parties.map(p=>({value:p.id, label:p.name}))); }
function constOptionsFor(surveyId){ return (DB.constituencies[surveyId]||[]).map(c=>({value:c.id, label:c.name})); }
function updateConstOptionsForSurvey(surveyId){
  const sel = document.getElementById('ff_constId'); if(!sel) return;
  sel.innerHTML = constOptionsFor(surveyId).map(o=>`<option value="${o.value}">${o.label}</option>`).join('');
}

/* ============================= INSTITUTION CODE, ONBOARDING, EMPTY SCREENS ============================= */
function notFoundScreen(title, backTo){
  return shell({ top:Header({back:true, title}), body:EmptyState({icon:IC.survey(28), title, sub:'It may have been removed, or nothing has been added yet.', ctaLabel:'Go back', ctaAction:`nav('${backTo}')`}) });
}
function copyText(text, msg){
  const done = ()=>toast(msg||'Copied');
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(()=>toast('Could not copy')); }
  else { toast('Could not copy'); }
}
function shareInstCode(){
  const code = Ctx.inst.code, name = Ctx.inst.name;
  const msg = `Join ${name} on Verdict.\nOpen the app, choose "Continue with email" and enter this institution code: ${code}`;
  if(navigator.share){ navigator.share({ title:'Join '+name+' on Verdict', text:msg }).catch(()=>{}); }
  else copyText(msg, 'Invitation message copied');
}
function InstCodeCard(){
  if(!Ctx.inst) return '';
  return `<div class="card" style="background:linear-gradient(160deg, var(--ink-950), var(--ink-700)); color:#fff; border:none; margin-bottom:14px;">
    <p class="eyebrow" style="color:#D9C58F;">Institution / organisation code</p>
    <p style="font-family:var(--font-display); font-size:28px; font-weight:700; letter-spacing:.08em; margin-top:8px; color:#fff; word-break:break-all;">${esc(Ctx.inst.code)}</p>
    <p class="tiny" style="color:#B9C2D8; margin-top:6px; line-height:1.45;">Share this code with your participants. They enter it together with their email address to join.</p>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button class="btn sm" style="flex:1; background:#fff; color:var(--ink-900);" onclick="copyText(Ctx.inst.code,'Code copied')">${IC.copy(14)} Copy</button>
      <button class="btn sm" style="flex:1; background:rgba(255,255,255,.16); color:#fff;" onclick="shareInstCode()">${IC.link2(14)} Share</button>
    </div>
  </div>`;
}
function GettingStartedCard(){
  const step = (n,t,sub,act)=>`<div class="list-row" style="cursor:pointer;" onclick="${act}"><div class="avatar sm">${n}</div><div style="flex:1;"><p class="small semi">${t}</p><p class="tiny muted" style="margin-top:2px;">${sub}</p></div><span class="chev">${IC.chev(16)}</span></div>`;
  return `<div class="section-title" style="margin-top:4px;"><h3>Get started</h3></div>
  <div class="card flush">
    ${step(1,'Create your first survey','Title, dates and who it is for','openCreateSurveyForm()')}
    ${step(2,'Add constituencies','Groups participants respond from','openAddConstituencyForm()')}
    ${step(3,'Add candidates or options','People participants can choose between','openAddParticipantForm()')}
    ${step(4,'Share your code','Participants join with the code above','shareInstCode()')}
  </div>`;
}
function openInstitutionForm(){
  if(!Ctx.inst) return;
  openFormSheet({ title:'Institution profile', sub:'Changing the code means participants must use the new one next time.', submitLabel:'Save', fields:[
    {id:'name', label:'Institution or organisation name', value:Ctx.inst.name, required:true},
    {id:'code', label:'Institution or organisation code', value:Ctx.inst.code, required:true, placeholder:'e.g. RIDGEVIEW26'},
  ], onSubmit: async (v)=>{
    const chk = validateInstituteCode(v.code);
    if(!chk.valid){ toast(chk.reason); return; }
    try{
      await Sync.saveNow();
      const r = await Api.updateInstitution(v.name.trim(), chk.value);
      Ctx.inst = r.inst;
      logActivity('updated institution profile', r.inst.name+' ('+r.inst.code+')');
      toast('Institution profile saved'); render();
    }catch(e){ toast(e.message || 'Could not save'); }
  }});
}
