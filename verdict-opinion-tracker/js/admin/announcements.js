/* ============================= ADMIN: ANNOUNCEMENTS CRUD ============================= */
function openAddAnnouncementForm(){
  if(!DB.surveys.length){ toast('Create a survey first'); return; }
  openFormSheet({ title:'New announcement', submitLabel:'Publish announcement', fields:[
    {id:'tag', label:'Category', type:'select', options:[{value:'Survey Update',label:'Survey Update'},{value:'Reminder',label:'Reminder'},{value:'Result',label:'Result'},{value:'New Survey',label:'New Survey'}]},
    {id:'title', label:'Headline', required:true},
    {id:'survey', label:'Related survey', type:'select', options:surveyOptions()},
    {id:'body', label:'Message', type:'textarea', required:true},
    {id:'published', label:'Publish immediately', type:'checkbox', value:true},
  ], onSubmit:(v)=>{
    const id = 'a_'+Date.now();
    const published = v.published==='true';
    DB.announcements.unshift({ id, tag:v.tag, title:v.title, date:todayStr(), body:v.body, survey:v.survey, published });
    if(published) pushUserNotification('New announcement posted', v.title, 'megaphone');
    logActivity(published?'posted announcement':'saved a draft announcement', v.title);
    toast(published?'Announcement published':'Draft saved'); render();
  }});
}
function openEditAnnouncementForm(id){
  const a = DB.announcements.find(x=>x.id===id); if(!a) return;
  openFormSheet({ title:'Edit announcement', submitLabel:'Save changes', fields:[
    {id:'tag', label:'Category', type:'select', value:a.tag, options:[{value:'Survey Update',label:'Survey Update'},{value:'Reminder',label:'Reminder'},{value:'Result',label:'Result'},{value:'New Survey',label:'New Survey'}]},
    {id:'title', label:'Headline', value:a.title, required:true},
    {id:'survey', label:'Related survey', type:'select', value:a.survey, options:surveyOptions()},
    {id:'body', label:'Message', type:'textarea', value:a.body, required:true},
    {id:'published', label:'Published', type:'checkbox', value:a.published!==false},
  ], onSubmit:(v)=>{
    const wasPublished = a.published!==false, nowPublished = v.published==='true';
    Object.assign(a, { tag:v.tag, title:v.title, survey:v.survey, body:v.body, published:nowPublished });
    if(!wasPublished && nowPublished) pushUserNotification('New announcement posted', a.title, 'megaphone');
    logActivity('edited announcement', a.title);
    toast('Announcement updated'); render();
  }});
}
function toggleAnnouncementPublished(id){
  const a = DB.announcements.find(x=>x.id===id); if(!a) return;
  const wasPublished = a.published!==false;
  a.published = !wasPublished;
  if(a.published) pushUserNotification('New announcement posted', a.title, 'megaphone');
  logActivity(a.published?'published announcement':'unpublished announcement', a.title);
  toast(a.published?'Announcement published':'Announcement unpublished'); render();
}
function deleteAnnouncement(id){
  const a = DB.announcements.find(x=>x.id===id); if(!a) return;
  openDialog({ icon:IC.x(20), iconBg:'var(--stamp-soft)', iconColor:'var(--stamp)', title:'Delete this announcement?', body:'It will no longer be visible to participants.', confirmLabel:'Delete', danger:true, onConfirm:()=>{
    const idx = DB.announcements.findIndex(x=>x.id===id); if(idx>-1) DB.announcements.splice(idx,1);
    logActivity('deleted announcement', a.title);
    toast('Announcement deleted'); render();
  }});
}
function announcementActionSheet(id){
  const a = DB.announcements.find(x=>x.id===id); if(!a) return;
  const published = a.published!==false;
  openActionSheet({ title:a.title, sub:a.tag+(published?'':' · Draft'), actions:[
    {label:'Edit announcement', icon:IC.gear(15), onClick:()=>openEditAnnouncementForm(id)},
    {label: published?'Unpublish':'Publish', icon:IC.megaphone(15), onClick:()=>toggleAnnouncementPublished(id)},
    {label:'Delete announcement', icon:IC.x(15), danger:true, onClick:()=>deleteAnnouncement(id)},
  ]});
}
