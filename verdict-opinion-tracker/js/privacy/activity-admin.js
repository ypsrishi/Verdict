/* ============================= ADMIN SCREEN: USER ACTIVITY (anonymous IDs) =============================
   Lists every random ID with how much it did, and a timeline of the pages / buttons for one ID.
   The admin can NOT see who an ID belongs to, and the voting steps are never part of this log. */
async function activityCall(action, payload={}){
  const r = await fetch('/api/activity', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(Object.assign({action}, payload)) });
  const j = await r.json(); if(!j.ok) throw new Error(j.error || 'Request failed'); return j;
}
function screenAdminUserActivity(q={}){
  const u = q.u || '';
  return shell({ top:AdminHeader(u ? 'ID activity' : 'User activity', u ? AnonId.short(u) : 'Anonymous IDs'), body:`
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start; margin-bottom:12px;">${IC.shield(18)}
      <p class="tiny muted" style="line-height:1.5;">Each participant gets a random ID after verification. Their pages and button clicks are saved against that ID only. The ID cannot be traced to a name or email address, and nothing from the voting steps is recorded.</p></div>
    <div id="uaBody"><p class="tiny muted" style="padding:10px 2px;">Loading…</p></div>
  `});
}
async function initAdminUserActivity(){
  const box = document.getElementById('uaBody'); if(!box) return;
  const u = (parseHash().q || {}).u || new URLSearchParams(location.search).get('u') || '';
  try{
    if(!u){
      const r = await activityCall('summary');
      box.innerHTML = !r.users.length
        ? EmptyState({icon:IC.activity(28), title:'No activity yet', sub:'Activity appears here once participants start using the app.'})
        : `<p class="tiny muted" style="margin-bottom:12px;">${r.users.length} anonymous ID${r.users.length===1?'':'s'} · ${r.totalEvents.toLocaleString()} events</p>` +
          r.users.map(x=>`<div class="card card-tap" style="cursor:pointer;" onclick="nav('/admin/user-activity?u=${x.anonId}')">
            <div class="card-row"><div class="avatar sm">${IC.user(15)}</div>
              <div style="flex:1; min-width:0;"><p class="small semi">${AnonId.short(x.anonId)}</p>
                <p class="tiny muted" style="margin-top:2px;">${x.pages} pages · ${x.clicks} clicks · last seen ${timeAgo(x.last)}</p>
                <p class="tiny muted" style="margin-top:2px; opacity:.75;">Last page: ${esc(x.lastPage)}</p></div>
              <span class="chev">${IC.chev(16)}</span></div></div>`).join('');
    } else {
      const r = await activityCall('events', { anonId:u });
      box.innerHTML = !r.events.length ? EmptyState({icon:IC.activity(28), title:'No events', sub:'Nothing recorded for this ID.'}) :
        `<p class="tiny muted" style="margin-bottom:12px;">${r.total} events (newest first)</p>
         <div class="card"><div class="timeline">${r.events.map((e,i)=>`
           <div class="tl-item"><div class="tl-line" style="${i===r.events.length-1?'display:none;':''}"></div><div class="tl-dot">${IC.activity(11)}</div>
             <p class="small">${describeEvent(e)}</p>
             <p class="tiny muted" style="margin-top:3px;">${new Date(e.t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',second:'2-digit'})}</p>
           </div>`).join('')}</div></div>`;
    }
  }catch(err){ box.innerHTML = EmptyState({icon:IC.wifiOff(28), title:'Could not load', sub:esc(err.message)}); }
}
function describeEvent(e){
  if(e.type==='page_view')   return `Opened <span class="semi">${esc(e.page)}</span>`;
  if(e.type==='tab_hidden')  return `Left the app (tab hidden) on <span class="semi">${esc(e.page)}</span>`;
  if(e.type==='tab_visible') return `Came back to the app on <span class="semi">${esc(e.page)}</span>`;
  const what = e.el==='card' ? 'a card / list item' : (esc(e.label) ? `“${esc(e.label)}” ${esc(e.el)}` : esc(e.el));
  return `Clicked <span class="semi">${what}</span> on ${esc(e.page)}`;
}
