/* ============================= ADMIN: PARTICIPANTS CRUD ============================= */
function openAddParticipantForm(prefillSurveyId){
  if(!DB.surveys.length){ toast('Create a survey first'); return; }
  const sid = prefillSurveyId || (DB.surveys[0] && DB.surveys[0].id);
  openFormSheet({ title:'Add candidate', submitLabel:'Add candidate', fields:[
    {id:'name', label:'Full name', required:true},
    {id:'surveyId', label:'Survey', type:'select', options:surveyOptions(), value:sid, onchange:'updateConstOptionsForSurvey(this.value)'},
    {id:'constId', label:'Constituency', type:'select', options:constOptionsFor(sid)},
    {id:'partyId', label:'Party', type:'select', options:partyOptions()},
    {id:'year', label:'Role / year', placeholder:'e.g. Final Year, Computer Engineering'},
    {id:'tagline', label:'Campaign tagline'},
    {id:'manifesto', label:'Manifesto', type:'textarea', tall:true},
  ], onSubmit:(v)=>{
    const cons = findConst(v.constId);
    if(!cons){ toast('Add a constituency to this survey first'); return; }
    const id = 'pt_'+Date.now();
    DB.participants.push({ id, name:v.name, surveyId:v.surveyId, constId:v.constId, constName:cons?cons.name:'', partyId:v.partyId||null, year:v.year, tagline:v.tagline, manifesto:v.manifesto, share:0, votes:0, active:true });
    const party = findParty(v.partyId); if(party) party.members = (party.members||0)+1;
    logActivity('added candidate', v.name);
    toast('Candidate added'); render();
  }});
}
function openEditParticipantForm(id){
  const p = findParticipant(id); if(!p) return;
  openFormSheet({ title:'Edit candidate', submitLabel:'Save changes', fields:[
    {id:'name', label:'Full name', value:p.name, required:true},
    {id:'surveyId', label:'Survey', type:'select', options:surveyOptions(), value:p.surveyId, onchange:'updateConstOptionsForSurvey(this.value)'},
    {id:'constId', label:'Constituency', type:'select', options:constOptionsFor(p.surveyId), value:p.constId},
    {id:'partyId', label:'Party', type:'select', options:partyOptions(), value:p.partyId||''},
    {id:'year', label:'Role / year', value:p.year},
    {id:'tagline', label:'Campaign tagline', value:p.tagline},
    {id:'manifesto', label:'Manifesto', type:'textarea', tall:true, value:p.manifesto},
  ], onSubmit:(v)=>{
    const cons = findConst(v.constId);
    Object.assign(p, { name:v.name, surveyId:v.surveyId, constId:v.constId, constName:cons?cons.name:p.constName, partyId:v.partyId||null, year:v.year, tagline:v.tagline, manifesto:v.manifesto });
    logActivity('edited candidate', p.name);
    toast('Candidate updated'); render();
  }});
}
function openAssignPartyForm(id){
  const p = findParticipant(id); if(!p) return;
  openFormSheet({ title:'Assign party', sub:p.name, submitLabel:'Assign', fields:[
    {id:'partyId', label:'Party', type:'select', options:partyOptions(), value:p.partyId||''},
  ], onSubmit:(v)=>{
    const oldParty = findParty(p.partyId); if(oldParty) oldParty.members = Math.max(0,(oldParty.members||1)-1);
    p.partyId = v.partyId || null;
    const newParty = findParty(p.partyId); if(newParty) newParty.members = (newParty.members||0)+1;
    logActivity('assigned party for', p.name);
    toast('Party assigned'); render();
  }});
}
function openAssignConstituencyForm(id){
  const p = findParticipant(id); if(!p) return;
  openFormSheet({ title:'Assign constituency', sub:p.name, submitLabel:'Assign', fields:[
    {id:'constId', label:'Constituency', type:'select', options:constOptionsFor(p.surveyId), value:p.constId},
  ], onSubmit:(v)=>{
    const c = findConst(v.constId); p.constId = v.constId; p.constName = c?c.name:p.constName;
    logActivity('assigned constituency for', p.name);
    toast('Constituency assigned'); render();
  }});
}
function openChangePhotoForm(id){
  const p = findParticipant(id); if(!p) return;
  const party = findParty(p.partyId);
  openFormSheet({ title:'Change photo', sub:p.name+' — pick an avatar accent colour', submitLabel:'Save photo', fields:[
    {id:'color', label:'Avatar colour', type:'color', value:p.photoColor||(party?party.color:'#57678C')},
  ], onSubmit:(v)=>{ p.photoColor = v.color; toast('Photo updated'); render(); }});
}
function toggleParticipantActive(id){
  const p = findParticipant(id); if(!p) return;
  p.active = p.active===false ? true : false;
  logActivity(p.active?'activated candidate':'deactivated candidate', p.name);
  toast(p.active?'Candidate activated':'Candidate deactivated'); render();
}
function confirmRemoveParticipant(id){
  const p = findParticipant(id); if(!p) return;
  openDialog({ icon:IC.x(20), iconBg:'var(--stamp-soft)', iconColor:'var(--stamp)',
    title:'Remove this candidate?', body:`This removes ${p.name} from the candidate list for this survey. This cannot be undone here.`,
    confirmLabel:'Remove', cancelLabel:'Cancel', danger:true, onConfirm:()=>{
      const idx = DB.participants.findIndex(x=>x.id===id); if(idx>-1) DB.participants.splice(idx,1);
      logActivity('removed candidate', p.name);
      toast('Candidate removed'); render();
    }});
}
function participantActionSheet(id){
  const p = findParticipant(id); if(!p) return;
  const active = p.active !== false;
  openActionSheet({ title:p.name, sub:p.constName, actions:[
    {label:'Edit details', icon:IC.gear(15), onClick:()=>openEditParticipantForm(id)},
    {label:'Assign party', icon:IC.flag(15), onClick:()=>openAssignPartyForm(id)},
    {label:'Assign constituency', icon:IC.map(15), onClick:()=>openAssignConstituencyForm(id)},
    {label:'Change photo', icon:IC.camera(15), onClick:()=>openChangePhotoForm(id)},
    {label: active?'Deactivate candidate':'Activate candidate', icon:IC.shield(15), onClick:()=>toggleParticipantActive(id)},
    {label:'Remove candidate', icon:IC.x(15), danger:true, onClick:()=>confirmRemoveParticipant(id)},
  ]});
}
