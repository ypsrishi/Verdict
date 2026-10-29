/* ============================= ADMIN: CONSTITUENCIES CRUD ============================= */
function openAddConstituencyForm(prefillSurveyId){
  if(!DB.surveys.length){ toast('Create a survey first'); return; }
  const sid = prefillSurveyId || (DB.surveys[0] && DB.surveys[0].id);
  openFormSheet({ title:'Add constituency', submitLabel:'Add constituency', fields:[
    {id:'name', label:'Constituency name', required:true},
    {id:'surveyId', label:'Survey', type:'select', options:surveyOptions(), value:sid},
    {id:'count', label:'Registered participants', inputType:'number', placeholder:'Optional'},
    {id:'eligible', label:'Open for responses', type:'checkbox', value:true},
  ], onSubmit:(v)=>{
    const id = 'c_'+Date.now();
    if(!DB.constituencies[v.surveyId]) DB.constituencies[v.surveyId] = [];
    DB.constituencies[v.surveyId].push({ id, name:v.name, count:parseInt(v.count)||0, eligible:v.eligible==='true' });
    const s = findSurvey(v.surveyId); if(s) s.constituencies = (s.constituencies||0)+1;
    logActivity('created constituency', v.name);
    toast('Constituency added'); render();
  }});
}
function openEditConstituencyForm(id){
  const c = findConst(id); if(!c) return;
  openFormSheet({ title:'Edit constituency', submitLabel:'Save changes', fields:[
    {id:'name', label:'Constituency name', value:c.name, required:true},
    {id:'count', label:'Registered participants', inputType:'number', value:c.count||''},
    {id:'eligible', label:'Open for responses', type:'checkbox', value:c.eligible},
  ], onSubmit:(v)=>{
    c.name = v.name; c.count = parseInt(v.count)||0; c.eligible = v.eligible==='true';
    logActivity('edited constituency', c.name);
    toast('Constituency updated'); render();
  }});
}
function toggleConstituencyActive(id){
  const c = findConst(id); if(!c) return;
  c.eligible = !c.eligible;
  logActivity(c.eligible?'activated constituency':'deactivated constituency', c.name);
  toast(c.eligible?'Constituency activated':'Constituency deactivated'); render();
}
function constituencyActionSheet(id){
  const c = findConst(id); if(!c) return;
  const sid = constSurveyId(id);
  openActionSheet({ title:c.name, sub:c.count+' participants', actions:[
    {label:'Edit constituency', icon:IC.gear(15), onClick:()=>openEditConstituencyForm(id)},
    {label: c.eligible?'Deactivate':'Activate', icon:IC.shield(15), onClick:()=>toggleConstituencyActive(id)},
    {label:'View participants', icon:IC.users(15), onClick:()=>nav('/admin/participants'+qs({const:id}))},
    {label:'View survey', icon:IC.survey(15), onClick:()=>nav('/admin/surveys/'+sid)},
    {label:'View results', icon:IC.chart(15), onClick:()=>nav('/admin/results/'+sid)},
  ]});
}
