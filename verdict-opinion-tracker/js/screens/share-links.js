/* ============================= SHAREABLE LINKS: GENERATION, SHARING, QR ============================= */
function slugify(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,28) || 'link'; }
function linkTypeTargets(type){
  if(type==='survey') return DB.surveys.map(s=>({value:s.id, label:s.title}));
  if(type==='constituency') return Object.entries(DB.constituencies).flatMap(([sid,arr])=>arr.map(c=>({value:c.id, label:c.name+' — '+(findSurvey(sid)?.title||'')})));
  if(type==='participant') return DB.participants.map(p=>({value:p.id, label:p.name}));
  if(type==='results') return DB.surveys.filter(s=>s.responses>0).map(s=>({value:s.id, label:s.title}));
  return [];
}
function updateLinkTargetOptions(type){
  const sel = document.getElementById('ff_targetId'); if(!sel) return;
  sel.innerHTML = linkTypeTargets(type).map(o=>`<option value="${o.value}">${o.label}</option>`).join('');
}
function openGenerateLinkForm(){
  if(!DB.surveys.length){ toast('Create a survey first'); return; }
  openFormSheet({ title:'Generate new link', submitLabel:'Generate link', fields:[
    {id:'type', label:'Link type', type:'select', value:'survey', onchange:'updateLinkTargetOptions(this.value)', options:[
      {value:'survey',label:'Survey'},{value:'constituency',label:'Constituency'},{value:'participant',label:'Participant'},{value:'results',label:'Results'},
    ]},
    {id:'targetId', label:'Target', type:'select', options:linkTypeTargets('survey')},
  ], onSubmit:(v)=>{
    const type = v.type, targetId = v.targetId;
    let label='', path='', responses=0;
    if(type==='survey'){ const s=findSurvey(targetId); label=s?s.title:'Survey'; path='/admin/preview/survey/'+targetId; responses=s?s.responses:0; }
    else if(type==='constituency'){ const c=findConst(targetId); label=c?c.name:'Constituency'; path='/admin/preview/constituency/'+targetId; responses=c?c.count:0; }
    else if(type==='participant'){ const p=findParticipant(targetId); label=p?p.name:'Participant'; path='/admin/preview/participant/'+targetId; }
    else if(type==='results'){ const s=findSurvey(targetId); label=(s?s.title:'Results')+' — Results'; path='/admin/results/'+targetId; responses=s?s.responses:0; }
    const id = 'l_'+Date.now();
    const url = 'opinion.link/'+slugify(label)+'-'+Math.random().toString(36).slice(2,6);
    DB.links.unshift({ id, type, targetId, label, url, path, status:'Active', created:todayStr(), responses });
    logActivity('generated a '+type+' link for', label);
    toast('Link generated'); render();
  }});
}
function linkIcon(type){ return ({survey:IC.survey, constituency:IC.map, participant:IC.user, results:IC.chart})[type] || IC.link2; }
function linkPillClass(status){ return status==='Active' ? 'verified' : (status==='Expired' ? 'closed' : (status==='Disabled' ? 'closed' : 'upcoming')); }
function toggleLinkStatus(id){
  const l = DB.links.find(x=>x.id===id); if(!l) return;
  l.status = l.status==='Active' ? 'Disabled' : 'Active';
  logActivity(l.status==='Active'?'reactivated link for':'disabled link for', l.label);
  toast('Link '+l.status.toLowerCase()); render();
}
function deleteLink(id){
  const l = DB.links.find(x=>x.id===id); if(!l) return;
  openDialog({ icon:IC.x(20), iconBg:'var(--stamp-soft)', iconColor:'var(--stamp)', title:'Delete this link?', body:'This link will stop working immediately and cannot be recovered.', confirmLabel:'Delete', danger:true, onConfirm:()=>{
    const idx = DB.links.findIndex(x=>x.id===id); if(idx>-1) DB.links.splice(idx,1);
    toast('Link deleted'); render();
  }});
}
function linkMoreActions(id){
  const l = DB.links.find(x=>x.id===id); if(!l) return;
  openActionSheet({ title:l.label, sub:l.url, actions:[
    {label: l.status==='Active'?'Disable link':'Reactivate link', icon:IC.shield(15), onClick:()=>toggleLinkStatus(id)},
    {label:'Delete link', icon:IC.x(15), danger:true, onClick:()=>deleteLink(id)},
  ]});
}
function openGeneratedLink(id){
  const l = DB.links.find(x=>x.id===id); if(!l) return;
  nav(l.path || '/admin/dashboard');
}
/* Web Share API when available, falling back to clipboard — mirrors what a real deployment
   would do since not every browser/OS surface supports navigator.share. */
async function shareOrCopyLink(url, title){
  const fullUrl = url.startsWith('http') ? url : 'https://'+url;
  if(navigator.share){
    try{ await navigator.share({ title: title || 'Verdict', url: fullUrl }); return; }
    catch(err){ if(err && err.name==='AbortError') return; }
  }
  try{ await navigator.clipboard.writeText(fullUrl); toast('Link copied to clipboard'); }
  catch(_){ toast('Could not share or copy this link'); }
}
function shareGeneratedLink(id){
  const l = DB.links.find(x=>x.id===id); if(!l) return;
  shareOrCopyLink(l.url, l.label);
}
/* Deterministic pseudo-QR renderer: same URL always produces the same-looking code so it reads
   as a real, stable code in this prototype, without needing an external QR library or network call. */
function strHash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h||1; }
function qrSVG(text, size=190){
  const n = 21, cell = size/n;
  let seed = strHash(text);
  const rand = ()=>{ seed = (seed*1103515245+12345)>>>0; return seed/4294967295; };
  let cells = '';
  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      const inTL = x<7&&y<7, inTR = x>=n-7&&y<7, inBL = x<7&&y>=n-7;
      if(inTL||inTR||inBL) continue;
      if(rand()>0.55) cells += `<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}"/>`;
    }
  }
  const finder = (ox,oy)=>`<g transform="translate(${ox},${oy})">
    <rect x="0" y="0" width="${cell*7}" height="${cell*7}" fill="#0E1830"/>
    <rect x="${cell}" y="${cell}" width="${cell*5}" height="${cell*5}" fill="#fff"/>
    <rect x="${cell*2}" y="${cell*2}" width="${cell*3}" height="${cell*3}" fill="#0E1830"/>
  </g>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="background:#fff; border-radius:12px;">
    <g fill="#0E1830">${cells}</g>${finder(0,0)}${finder((n-7)*cell,0)}${finder(0,(n-7)*cell)}
  </svg>`;
}
function openQrSheet(id){
  const l = DB.links.find(x=>x.id===id); if(!l) return;
  closeFormSheet(); closeActionSheet(); closeQrSheet();
  const shellEl = document.getElementById('shell');
  const ov = document.createElement('div');
  ov.className='overlay'; ov.id='qrSheet';
  ov.onclick=(e)=>{ if(e.target===ov) closeQrSheet(); };
  ov.innerHTML = `<div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h3 style="font-size:16.5px;">Scan to open</h3><button class="icon-btn" onclick="closeQrSheet()">${IC.x(16)}</button></div>
    <div class="sheet-body" style="display:flex; flex-direction:column; align-items:center; padding:0 18px 22px; gap:12px;">
      ${qrSVG('https://'+l.url)}
      <p class="small semi" style="text-align:center;">${l.label}</p>
      <p class="tiny muted" style="text-align:center; word-break:break-all;">${l.url}</p>
      <p class="tiny muted" style="text-align:center; opacity:.7;">Preview code for this prototype — illustrative, not scan-verified.</p>
      <div style="display:flex; gap:10px; width:100%;">
        <button class="btn btn-secondary sm" style="flex:1;" onclick="copyLink(this,'${l.url}')">${IC.copy(14)} Copy link</button>
        <button class="btn btn-primary sm" style="flex:1;" onclick="shareGeneratedLink('${l.id}')">Share</button>
      </div>
    </div>
  </div>`;
  shellEl.appendChild(ov);
}
function closeQrSheet(){ document.getElementById('qrSheet')?.remove(); }
function screenAdminLinks(){
  return shell({ top:AdminHeader('Generated Links'), body:`
    <button class="btn btn-primary" style="margin-bottom:14px;" onclick="openGenerateLinkForm()">${IC.plus(17)} Generate new link</button>
    ${DB.links.map(l=>`
      <div class="card">
        <div class="card-row">
          <div class="avatar sm">${linkIcon(l.type)(15)}</div>
          <div style="flex:1; min-width:0;">
            <p class="small semi" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.label}</p>
            <p class="tiny muted" style="margin-top:2px; text-transform:capitalize;">${l.type} link</p>
          </div>
          <button class="icon-btn" style="width:30px; height:30px;" onclick="linkMoreActions('${l.id}')">${IC.gear(14)}</button>
        </div>
        <div class="card soft" style="display:flex; align-items:center; gap:8px; margin:10px 0 10px; padding:10px 12px;">
          <span class="small" style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink-700);">${l.url}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px;">
          <button class="btn btn-secondary sm" onclick="copyLink(this,'${l.url}')">${IC.copy(14)} Copy</button>
          <button class="btn btn-secondary sm" onclick="shareGeneratedLink('${l.id}')">${IC.link2(14)} Share</button>
          <button class="btn btn-secondary sm" onclick="openGeneratedLink('${l.id}')">${IC.chev(14)} Open</button>
          <button class="btn btn-secondary sm" onclick="openQrSheet('${l.id}')">QR</button>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="pill ${linkPillClass(l.status)}">${l.status}</span>
          <span class="tiny muted">${l.type==='survey'||l.type==='results'?(l.responses||0).toLocaleString()+' responses · ':''}since ${l.created}</span>
        </div>
      </div>`).join('') || EmptyState({icon:IC.link2(28), title:'No links yet', sub:'Generate a link to share with participants.'})}
  `});
}
function screenAdminNotifications(){
  const icOf = t => ({check:IC.check, shield:IC.shield, megaphone:IC.megaphone, info:IC.info, chart:IC.chart, flag:IC.flag, survey:IC.survey}[t]||IC.info);
  return shell({ top:Header({back:true, title:'Admin Notifications'})+`<div style="padding:0 16px 12px; display:flex; justify-content:flex-end;"><button class="tiny semi" style="color:var(--ink-700); background:none; border:none;" onclick="markAllAdminNotificationsRead()">Mark all read</button></div>`, body:`
    ${DB.adminNotifications.map(n=>`
      <div class="card" style="display:flex; gap:12px; cursor:pointer; ${!n.read?'background:var(--paper-soft);':''}" onclick="markAdminNotificationRead('${n.id}')">
        <div class="avatar sm" style="background:${n.read?'var(--paper-dim)':'var(--ink-900)'}; color:${n.read?'var(--ink-700)':'#fff'};">${icOf(n.type)(15)}</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; gap:8px;">
            <p class="small semi">${n.title}</p>
            ${!n.read?`<span style="width:7px; height:7px; border-radius:50%; background:var(--stamp); flex-shrink:0; margin-top:5px;"></span>`:''}
          </div>
          <p class="tiny muted" style="margin-top:3px; line-height:1.4;">${n.body}</p>
          <p class="tiny muted" style="margin-top:6px; opacity:.7;">${timeAgo(n.at, n.time)}</p>
        </div>
      </div>`).join('') || EmptyState({icon:IC.bell(28), title:'No notifications', sub:'Important admin activity will show up here.'})}
  `});
}
function screenAdminActivity(){
  return shell({ top:AdminHeader('Activity Log'), body:`
    ${DB.activity.length===0 ? EmptyState({icon:IC.activity(28), title:'No activity yet', sub:'Everything you change will be recorded here.'}) : `<div class="card">
      <div class="timeline">
        ${DB.activity.map((g,i)=>`
          <div class="tl-item"><div class="tl-line" style="${i===DB.activity.length-1?'display:none;':''}"></div><div class="tl-dot">${IC.activity(11)}</div>
            <p class="small"><span class="semi">${g.actor}</span> ${g.action} <span class="semi">${g.target}</span></p>
            <p class="tiny muted" style="margin-top:3px;">${timeAgo(g.at, g.time)}</p>
          </div>`).join('')}
      </div>
    </div>`}
  `});
}
function screenAdminSettings(){
  const rows = (items)=>`<div class="card flush">${items.map(i=>`
    <div class="list-row" ${i.to?`style="cursor:pointer;" onclick="nav('${i.to}')"`:(i.act?`style="cursor:pointer;" onclick="${i.act}"`:'')}>
      <div class="avatar sm">${i.ic(15)}</div>
      <div style="flex:1;"><p class="small semi">${i.label}</p>${i.sub?`<p class="tiny muted" style="margin-top:2px;">${i.sub}</p>`:''}</div>
      ${i.toggle?`<div class="switch" data-on="${i.on}" style="background:${i.on?'var(--ink-900)':'var(--paper-dim)'};" onclick="toggleSwitch(this)"><div class="knob" style="left:${i.on?'19px':'3px'};"></div></div>`:`<span class="chev">${IC.chev(16)}</span>`}
    </div>`).join('')}</div>`;
  return shell({ bottomNav:BottomNavAdmin('more'), top:AdminHeader('Settings'), body:`
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <div class="avatar">${esc(initials(adminName()))}</div>
      <div><p class="small semi">${esc(adminName())}</p><p class="tiny muted">Administrator · ${esc(Ctx.inst?Ctx.inst.name:'')}</p><p class="tiny muted">${esc(Ctx.admin?Ctx.admin.email:'')}</p></div>
    </div>
    <div class="section-title" style="margin-top:0;"><h3>Organisation</h3></div>
    ${InstCodeCard()}
    ${rows([{ic:IC.bldg,label:'Institution profile',sub:'Name and code',act:'openInstitutionForm()'},{ic:IC.users,label:'Admin team &amp; roles'},{ic:IC.shield,label:'Verification thresholds'}])}
    <div class="section-title"><h3>Manage</h3></div>
    ${rows([{ic:IC.survey,label:'Surveys',to:'/admin/surveys'},{ic:IC.map,label:'Constituencies',to:'/admin/constituencies'},{ic:IC.flag,label:'Parties &amp; groups',to:'/admin/parties'},{ic:IC.link2,label:'Generated links',to:'/admin/links'},{ic:IC.bell,label:'Notifications',to:'/admin/notifications'},{ic:IC.activity,label:'Activity log',to:'/admin/activity'},{ic:IC.users,label:'User activity (anonymous IDs)',to:'/admin/user-activity'}])}
    <div class="section-title"><h3>Preferences</h3></div>
    ${rows([{ic:IC.bell,label:'Email alerts for new applications',toggle:true,on:true},{ic:IC.megaphone,label:'Auto-notify on results certification',toggle:true,on:false}])}
    <div class="section-title"><h3>App map</h3></div>
    <button class="btn btn-danger-outline" style="margin-top:18px;" onclick="confirmLogout('/admin/login')">${IC.logout(17)} Log out</button>
  `});
}
