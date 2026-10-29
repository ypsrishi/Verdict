/* ============================= APPLICATION STATUS ============================= */
function screenParticipantStatus(m, q){
  const requestedId = (q&&q.id) || null;
  const mine = findMyApplication();
  const app = (requestedId && DB.applications.find(a=>a.id===requestedId && (Ctx.role==='admin' || (mine && a.id===mine.id)))) || mine;
  if(!app) return shell({ top:Header({back:true, title:'Application Status'}), body:EmptyState({icon:IC.flag(28), title:'No applications yet', sub:'Apply to become a participant to see its status here.', ctaLabel:'Become a Participant', ctaAction:`nav('/become-participant')`}) });

  const header = `<div class="card soft">
    <div class="card-row">
      <div class="avatar sm">${IC.flag(15)}</div>
      <div style="flex:1;">
        <p class="small semi">${app.constituency} · ${app.survey}</p>
        <p class="tiny muted" style="margin-top:2px;">Applied ${app.date}</p>
      </div>
      <span class="pill ${pillClass(app.status)}">${app.status}</span>
    </div>
  </div>`;

  let body = '';
  if(app.status==='Pending'){
    body = `<div class="section-title"><h3>Progress</h3></div>
    <div class="card">
      <div class="timeline">
        <div class="tl-item done"><div class="tl-line"></div><div class="tl-dot">${IC.check(11)}</div><p class="small semi">Application submitted</p><p class="tiny muted" style="margin-top:2px;">${app.date}</p></div>
        <div class="tl-item now"><div class="tl-line"></div><div class="tl-dot"></div><p class="small semi">Under administrator review</p><p class="tiny muted" style="margin-top:2px;">Typically takes 3–5 working days</p></div>
        <div class="tl-item"><div class="tl-dot"></div><p class="small semi muted">Decision &amp; candidate listing</p><p class="tiny muted" style="margin-top:2px;">You'll be notified either way</p></div>
      </div>
    </div>
    <button class="btn btn-secondary" style="margin-top:6px;" onclick="nav('/profile')">Back to profile</button>`;
  } else if(app.status==='Needs Changes'){
    body = `<div class="card soft" style="border:1px solid var(--info-soft); background:var(--info-soft); display:flex; gap:10px; align-items:flex-start;">
      ${IC.alert(18)}<p class="tiny" style="color:var(--info); line-height:1.5;">${app.adminNote||'Your administrator has requested changes to this application.'}</p>
    </div>
    <div class="cta-area" style="position:static; margin:18px 0 0; padding:0;">
      <button class="btn btn-primary" onclick="resumeApplication('${app.id}')">Edit &amp; resubmit</button>
      <button class="btn btn-secondary" onclick="nav('/profile')">Back to profile</button>
    </div>`;
  } else if(app.status==='Approved'){
    body = `<div class="stamp-wrap" style="padding-top:6px;">
      <div class="stamp-ring">${stampSVG(36,'var(--verify)')}</div>
      <h2 style="font-size:19px; margin-top:16px;">You're now a candidate</h2>
      <p class="muted small" style="margin-top:6px; max-width:280px;">Your application for ${app.constituency} was approved. You're listed publicly as a candidate in ${app.survey}.</p>
    </div>
    <div class="cta-area" style="position:static; margin:18px 0 0; padding:0;">
      ${app.participantId?`<button class="btn btn-primary" onclick="nav('/participants/${app.participantId}')">View my public profile</button>`:''}
      <button class="btn btn-secondary" onclick="nav('/profile')">Back to profile</button>
    </div>`;
  } else if(app.status==='Rejected'){
    body = `<div class="card soft" style="border:1px solid var(--stamp-soft); background:var(--stamp-soft); display:flex; gap:10px; align-items:flex-start;">
      ${IC.x(18)}<p class="tiny" style="color:var(--stamp); line-height:1.5;">${app.adminNote||'This application was not approved.'}</p>
    </div>
    <div class="cta-area" style="position:static; margin:18px 0 0; padding:0;">
      <button class="btn btn-primary" onclick="nav('/become-participant')">Apply again</button>
      <button class="btn btn-secondary" onclick="nav('/profile')">Back to profile</button>
    </div>`;
  }
  return shell({ top:Header({back:true, title:'Application Status'}), body: header + body });
}

function screenConnectionIssue(){
  return shell({ top:Header({back:true, title:'Connection issue'}), fab:false, body: ErrorState({retryTo:'/home'}) });
}
