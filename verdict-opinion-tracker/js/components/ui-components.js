/* ============================= COMPONENTS ============================= */
function Header(o={}){
  const back = o.back ? `<button class="icon-btn" onclick="goBack()">${IC.back()}</button>` : '';
  const titleBlock = (o.title) ? `<div style="min-width:0;"><div class="topbar-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${o.title}</div>${o.subtitle?`<div class="topbar-sub" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${o.subtitle}</div>`:''}</div>` : '';
  const notifTo = o.notifTo || '/notifications';
  const unread = o.notif ? (notifTo.startsWith('/admin') ? DB.adminNotifications.filter(n=>!n.read).length : DB.notifications.filter(n=>!n.read).length) : 0;
  const notif = o.notif ? `<button class="icon-btn icon-btn-wrap" onclick="nav('${notifTo}')">${IC.bell()}${unread>0?'<span class="badge-dot"></span>':''}</button>` : '';
  const searchRow = o.searchRow ? `<div class="search-row"><div class="search-box" onclick="openSearchSheet()">${IC.search(16)} ${o.searchPlaceholder||'Search'}</div></div>` : '';
  return `<div class="topbar">
    <div class="topbar-row">${back}${titleBlock}<div style="flex:1"></div>${notif}</div>
    ${searchRow}
  </div>`;
}
function BottomNavUser(active){
  const items = [
    {k:'home', l:'Home', ic:IC.home, to:'/home'},
    {k:'surveys', l:'Surveys', ic:IC.survey, to:'/surveys'},
    {k:'const', l:'Groups', ic:IC.map, to:'/constituencies'},
    {k:'results', l:'Results', ic:IC.chart, to:'/results'},
    {k:'profile', l:'Profile', ic:IC.user, to:'/profile'},
  ];
  return `<div class="bottom-nav">${items.map(i=>`<button class="nav-item ${active===i.k?'active':''}" onclick="nav('${i.to}')">${i.ic(21)}<span class="lbl">${i.l}</span></button>`).join('')}</div>`;
}
function BottomNavAdmin(active){
  const items = [
    {k:'dash', l:'Dashboard', ic:IC.grid, to:'/admin/dashboard'},
    {k:'surveys', l:'Surveys', ic:IC.survey, to:'/admin/surveys'},
    {k:'people', l:'People', ic:IC.users, to:'/admin/participants'},
    {k:'results', l:'Results', ic:IC.chart, to:'/admin/results'},
    {k:'more', l:'More', ic:IC.gear, to:'/admin/settings'},
  ];
  return `<div class="bottom-nav">${items.map(i=>`<button class="nav-item ${active===i.k?'active':''}" onclick="nav('${i.to}')">${i.ic(21)}<span class="lbl">${i.l}</span></button>`).join('')}</div>`;
}

function PartyLogo(party,size=22){
  if(!party) return '';
  return `<span class="party-logo" style="width:${size}px;height:${size}px;background:${party.color};">${party.tag}</span>`;
}
function PartySymbol(party,size=22){
  if(!party) return `<span class="party-symbol" style="width:${size}px;height:${size}px;background:var(--ink-500);">${IC.user(Math.round(size*0.55))}</span>`;
  return `<span class="party-symbol" style="width:${size}px;height:${size}px;background:linear-gradient(155deg, ${party.color}, ${shade(party.color,-28)});">${IC[party.sym](Math.round(size*0.55))}</span>`;
}
function PartyChip(party){
  if(!party) return `<span class="party-chip small muted">Independent candidate</span>`;
  return `<span class="party-chip">${PartySymbol(party,20)}<span class="small semi">${party.name}</span></span>`;
}
function PhotoAvatar(name, party, size='lg', overrideColor){
  const cls = size==='lg' ? 'avatar lg photo' : (size==='sm' ? 'avatar sm photo' : 'avatar photo');
  const c1 = overrideColor || (party?party.color:'#15264A'), c2 = shade(c1,-34);
  return `<div class="${cls}" style="background:linear-gradient(155deg, ${c1}, ${c2});">${initials(name)}</div>`;
}

function SurveyCard(s){
  const pct = pctOf(s.responses, s.eligiblePool);
  const ctaLabel = s.status==='Active' ? 'Respond now' : (s.status==='Upcoming' ? 'Preview survey' : 'View results');
  return `<div class="card" style="margin-bottom:12px;">
    <div class="card-tap" onclick="nav('/surveys/${s.id}')">
      <div class="card-row">
        <div class="avatar sm">${IC.survey(16)}</div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
            <h4 style="font-size:15px; line-height:1.3;">${s.title}</h4>
            <span class="pill ${pillClass(s.status)}">${s.status}</span>
          </div>
          <p class="tiny muted" style="margin-top:4px;">${s.org} · ${s.constituencies} constituencies</p>
        </div>
      </div>
      <div class="divider" style="margin:12px 0 10px;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="tiny muted">${s.responses.toLocaleString()}${s.eligiblePool?(' of ~'+s.eligiblePool.toLocaleString()):''} responded</span>
        <span class="tiny semi" style="color:var(--ink-700)">${s.daysLeftText}</span>
      </div>
      <div class="progress-track"><div class="progress-fill ${s.status==='Closed'?'verify':''}" style="width:${pct}%;"></div></div>
    </div>
    <button class="btn btn-secondary sm" style="width:100%; margin-top:12px;" onclick="event.stopPropagation(); nav('${s.status==='Closed'||s.responses>0?'/results/'+s.id:'/surveys/'+s.id}')">${ctaLabel} ${IC.chev(14)}</button>
  </div>`;
}

function ParticipantMiniCard(p){
  const party = findParty(p.partyId);
  return `<a class="card hcard card-tap" style="width:150px; padding:14px; margin-bottom:0;" onclick="nav('/participants/${p.id}')">
    ${PhotoAvatar(p.name, party, 'md', p.photoColor)}
    <p class="small semi" style="margin-top:10px; line-height:1.3;">${p.name}</p>
    <p class="tiny muted" style="margin-top:2px;">${p.constName}</p>
    <div style="margin-top:8px;">${PartyChip(party)}</div>
  </a>`;
}
function ParticipantRow(p, showConst){
  const party = findParty(p.partyId);
  return `<div class="list-row" style="cursor:pointer; align-items:flex-start;" onclick="nav('/participants/${p.id}')">
    ${PhotoAvatar(p.name, party, 'sm', p.photoColor)}
    <div style="flex:1; min-width:0;">
      <p class="small semi">${p.name}</p>
      <p class="tiny muted" style="margin-top:2px;">${showConst?p.constName+' · ':''}${party?party.name:'Independent'}</p>
    </div>
    <span class="chev">${IC.chev(16)}</span>
  </div>`;
}
function ParticipantFullCard(p){
  const party = findParty(p.partyId);
  return `<a class="card card-tap" onclick="nav('/participants/${p.id}')">
    <div class="card-row">
      ${PhotoAvatar(p.name, party, 'md', p.photoColor)}
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h4 style="font-size:15.5px;">${p.name}</h4>
          <span class="chev" style="margin-top:2px;">${IC.chev(16)}</span>
        </div>
        <p class="tiny muted" style="margin-top:2px;">${p.constName}</p>
        <div style="margin-top:8px; display:flex; align-items:center; gap:7px;">
          ${party?PartySymbol(party,20):''}${party?PartyLogo(party,20):''}
          <span class="small semi">${party?party.name:'Independent candidate'}</span>
        </div>
        <p class="small" style="margin-top:10px; line-height:1.4;">${p.tagline}</p>
      </div>
    </div>
  </a>`;
}
function ResultRow(p, i, totalPool){
  const party = findParty(p.partyId);
  const count = (p.votes!=null) ? p.votes : Math.round(p.share/100 * totalPool);
  return `<div class="bar-row" style="align-items:center;">
    ${PhotoAvatar(p.name, party, 'sm', p.photoColor)}
    <div style="flex:1;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; gap:8px;">
        <div style="min-width:0;">
          <span class="tiny semi">${p.name}</span>${i===0?`<span class="pill verified" style="margin-left:6px; padding:2px 7px;">Leading</span>`:''}
          <div style="margin-top:2px;">${PartyChip(party)}</div>
        </div>
        <div style="text-align:right; flex-shrink:0;"><span class="small bold">${p.share}%</span><div class="tiny muted">${count.toLocaleString()} responses</div></div>
      </div>
      <div class="bar-track"><div class="bar-fill ${i===0?'lead':''}" style="width:${p.share}%;"></div></div>
    </div>
  </div>`;
}
function StatBox(num,label){ return `<div class="stat-box"><div class="stat-num">${num}</div><div class="tiny muted">${label}</div></div>`; }
function EmptyState({icon, title, sub, ctaLabel, ctaAction}){
  return `<div class="empty"><div class="ic">${icon}</div><h4 style="margin-top:16px; font-size:15px;">${title}</h4><p class="tiny muted" style="margin-top:6px; max-width:240px; margin-left:auto; margin-right:auto; line-height:1.5;">${sub}</p>${ctaLabel?`<button class="btn btn-secondary sm" style="margin-top:16px;" onclick="${ctaAction}">${ctaLabel}</button>`:''}</div>`;
}
function ErrorState({title='Connection issue', sub="We couldn't load this page. Check your connection and try again.", retryTo='/home'}){
  return `<div class="empty"><div class="ic" style="background:var(--stamp-soft); color:var(--stamp);">${IC.wifiOff(28)}</div><h4 style="margin-top:16px; font-size:15px;">${title}</h4><p class="tiny muted" style="margin-top:6px; line-height:1.5;">${sub}</p><button class="btn btn-primary sm" style="margin-top:16px;" onclick="nav('${retryTo}')">Try again</button></div>`;
}

/* ============================= SHELL / RENDER ============================= */
function shell({top='', body='', bottomNav='', fab=false, greyBg=false}){
  return `${top}<div class="content ${greyBg?'grey':''}">${body}</div>${bottomNav}<div class="toast-wrap" id="toastWrap"></div>`;
}
