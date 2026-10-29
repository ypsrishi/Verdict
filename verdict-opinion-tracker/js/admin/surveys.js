/* ============================= ADMIN: SURVEYS CRUD ============================= */
function openCreateSurveyForm(){
  openFormSheet({ title:'Create new survey', submitLabel:'Create survey', fields:[
    {id:'title', label:'Survey title', required:true},
    {id:'org', label:'Organisation', required:true, value:(Ctx.inst?Ctx.inst.name:'')},
    {id:'category', label:'Category', type:'select', options:[{value:'Educational',label:'Educational'},{value:'Corporate',label:'Corporate'},{value:'Housing Society',label:'Housing Society'},{value:'NGO',label:'NGO'}]},
    {id:'start', label:'Opens', placeholder:'e.g. Sep 1, 2026'},
    {id:'end', label:'Closes', placeholder:'e.g. Sep 10, 2026'},
    {id:'eligiblePool', label:'Expected number of participants', inputType:'number', placeholder:'e.g. 500'},
    {id:'desc', label:'Description', type:'textarea'},
  ], onSubmit:(v)=>{
    const id = 's_'+Date.now();
    DB.surveys.push({ id, title:v.title, org:v.org, category:v.category, status:'Draft', start:v.start||'TBD', end:v.end||'TBD', responses:0, eligiblePool:parseInt(v.eligiblePool)||0, constituencies:0, daysLeftText:'Not yet published', desc:v.desc||'', resultsPublished:true, declared:false });
    DB.constituencies[id] = [];
    logActivity('created survey', v.title);
    toast('Draft survey created'); nav('/admin/surveys/'+id);
  }});
}
function openEditSurveyForm(id){
  const s = findSurvey(id); if(!s) return;
  openFormSheet({ title:'Edit survey', submitLabel:'Save changes', fields:[
    {id:'title', label:'Survey title', value:s.title, required:true},
    {id:'org', label:'Organisation', value:s.org, required:true},
    {id:'category', label:'Category', type:'select', value:s.category, options:[{value:'Educational',label:'Educational'},{value:'Corporate',label:'Corporate'},{value:'Housing Society',label:'Housing Society'},{value:'NGO',label:'NGO'}]},
    {id:'start', label:'Opens', value:s.start},
    {id:'end', label:'Closes', value:s.end},
    {id:'eligiblePool', label:'Expected number of participants', inputType:'number', value:s.eligiblePool||''},
    {id:'desc', label:'Description', type:'textarea', value:s.desc},
  ], onSubmit:(v)=>{
    Object.assign(s, { title:v.title, org:v.org, category:v.category, start:v.start, end:v.end, desc:v.desc, eligiblePool:parseInt(v.eligiblePool)||0 });
    logActivity('edited survey', s.title);
    toast('Survey updated'); render();
  }});
}
function setSurveyStatus(id, status){
  const s = findSurvey(id); if(!s) return;
  const prevStatus = s.status;
  s.status = status;
  if(status==='Active') s.daysLeftText = 'Closes ' + s.end;
  if(status==='Paused') s.daysLeftText = 'Paused by administrator';
  if(status==='Closed') s.daysLeftText = 'Closed';
  if(status==='Upcoming') s.daysLeftText = 'Opens ' + s.start;
  if(status==='Active' && prevStatus!=='Active') pushUserNotification('Survey opened', s.title+' is now open for responses.', 'survey');
  if(status==='Closed' && prevStatus==='Active') pushAdminNotification('Result ready for review', s.title+' has closed and is ready to review and declare.', 'chart');
  pushAdminNotification('Survey activity', s.title+' status changed to '+status+'.', 'survey');
  logActivity('set survey status to '+status+' for', s.title);
  toast('Survey '+status.toLowerCase()); render();
}
function notifySurveyClosingSoon(id){
  const s = findSurvey(id); if(!s) return;
  pushUserNotification('Survey closing soon', s.title+' '+s.daysLeftText.toLowerCase()+'. Submit your response before it closes.', 'survey');
  logActivity('sent a closing-soon reminder for', s.title);
  toast('Closing reminder sent to participants'); render();
}
function surveyActionSheet(id){
  const s = findSurvey(id); if(!s) return;
  const actions = [
    {label:'Edit survey', icon:IC.gear(15), onClick:()=>openEditSurveyForm(id)},
    {label:'Preview as participant', icon:IC.survey(15), onClick:()=>nav('/admin/preview/survey/'+id)},
  ];
  if(s.status==='Draft') actions.push({label:'Publish survey', icon:IC.check(15), onClick:()=>setSurveyStatus(id,'Active')}, {label:'Schedule survey', icon:IC.cal(15), onClick:()=>setSurveyStatus(id,'Upcoming')});
  if(s.status==='Upcoming') actions.push({label:'Publish now', icon:IC.check(15), onClick:()=>setSurveyStatus(id,'Active')});
  if(s.status==='Active') actions.push({label:'Notify: closing soon', icon:IC.megaphone(15), onClick:()=>notifySurveyClosingSoon(id)}, {label:'Pause survey', icon:IC.alert(15), onClick:()=>setSurveyStatus(id,'Paused')}, {label:'Close survey', icon:IC.x(15), danger:true, onClick:()=>confirmCloseSurvey(id)});
  if(s.status==='Paused') actions.push({label:'Resume survey', icon:IC.check(15), onClick:()=>setSurveyStatus(id,'Active')}, {label:'Close survey', icon:IC.x(15), danger:true, onClick:()=>confirmCloseSurvey(id)});
  openActionSheet({ title:s.title, sub:s.status, actions });
}
function confirmCloseSurvey(id){
  const s = findSurvey(id); if(!s) return;
  openDialog({ icon:IC.x(20), iconBg:'var(--stamp-soft)', iconColor:'var(--stamp)',
    title:'Close this survey?', body:'Responses will stop being accepted immediately and the survey moves to final results.',
    confirmLabel:'Close survey', cancelLabel:'Cancel', danger:true, onConfirm:()=>setSurveyStatus(id,'Closed') });
}
