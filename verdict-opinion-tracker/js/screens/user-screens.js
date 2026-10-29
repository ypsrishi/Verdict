function screenHome(){
  const active = DB.surveys.filter(s=>s.status==='Active');
  const primary = active[0] || null;
  const featured = primary ? DB.participants.filter(p=>p.surveyId===primary.id).slice(0,5) : [];
  const resultsSurvey = DB.surveys.find(s=>s.responses>0 && s.resultsPublished!==false) || null;
  const topResults = resultsSurvey ? DB.participants.filter(p=>p.surveyId===resultsSurvey.id).sort((a,b)=>b.share-a.share).slice(0,2) : [];
  const myConst = DB.user.constituency ? Object.values(DB.constituencies).flat().find(c=>c.name===DB.user.constituency) : null;
  const pct = primary ? pctOf(primary.responses, primary.eligiblePool) : 0;
  return shell({ bottomNav:BottomNavUser('home'), top:`
    <div class="topbar"><div class="topbar-row">
      <div class="brand"><div class="brand-mark">${stampSVG(18,'#fff')}</div><div class="brand-name">Verdict</div></div>
      <div style="flex:1;"></div>
      <button class="icon-btn icon-btn-wrap" onclick="nav('/notifications')">${IC.bell()}${DB.notifications.filter(n=>!n.read).length>0?'<span class="badge-dot"></span>':''}</button>
      <button class="avatar round sm" style="border:none; margin-left:2px;" onclick="nav('/profile')">${userInitials() || IC.user(15)}</button>
    </div>
    <div class="search-row"><div class="search-box" onclick="openSearchSheet()">${IC.search(16)} Search surveys, candidates, constituencies</div></div>
    </div>`, body:`
    <p class="tiny muted">${greeting()},</p>
    <h2 style="font-size:21px; margin-top:2px;">${esc(DB.user.name || 'Welcome')}</h2>
    ${APP.instName ? `<p class="tiny muted" style="margin-top:3px;">${esc(APP.instName)}</p>` : ''}

    ${primary ? `
    <div class="section-title" style="margin-top:18px;"><h3>Your active survey</h3><span class="link" onclick="nav('/surveys')">All surveys</span></div>
    <div class="card hero" style="background:linear-gradient(160deg, var(--ink-950), var(--ink-700)); color:#fff; position:relative; overflow:hidden;">
      <div style="position:absolute; right:-24px; top:-24px; opacity:.14;">${stampSVG(140,'#fff')}</div>
      <div style="position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <span class="eyebrow" style="color:#D9C58F;">${esc(primary.category)}</span>
          <span class="pill" style="background:rgba(255,255,255,.16); color:#fff;">${esc(primary.daysLeftText)}</span>
        </div>
        <h2 style="font-size:19px; color:#fff; margin-top:8px; line-height:1.3;">${esc(primary.title)}</h2>
        <p class="tiny" style="color:#B9C2D8; margin-top:4px;">${esc(primary.org)}</p>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span class="tiny" style="color:#C7CEE0;">${primary.responses.toLocaleString()}${primary.eligiblePool?(' of ~'+primary.eligiblePool.toLocaleString()):''} responded</span>
            ${primary.eligiblePool?`<span class="tiny semi" style="color:#fff;">${pct}%</span>`:''}
          </div>
          <div class="progress-track" style="background:rgba(255,255,255,.16);"><div class="progress-fill" style="width:${pct}%; background:#D9C58F;"></div></div>
        </div>
        <button class="btn" style="background:#fff; color:var(--ink-900); margin-top:16px;" onclick="nav('/submit/${primary.id}')">${IC.check(18)} Respond now</button>
      </div>
    </div>` : `
    <div class="section-title" style="margin-top:18px;"><h3>Your active survey</h3></div>
    ${EmptyState({icon:IC.survey(28), title:'No active survey right now', sub:'Your administrator has not opened a survey yet. You will be notified as soon as one opens.', ctaLabel: DB.surveys.length?'See all surveys':'', ctaAction:"nav('/surveys')"})}`}

    ${myConst ? `<div class="card" style="display:flex; align-items:center; gap:12px;">
      <div class="ring-mini">${IC.map(16)}</div>
      <div style="flex:1;">
        <p class="small semi">${esc(myConst.name)}</p>
        <p class="tiny muted" style="margin-top:2px;">Your constituency · ${myConst.count} participants</p>
      </div>
      <button class="icon-btn" onclick="nav('/constituencies/${myConst.id}')">${IC.chev(16)}</button>
    </div>` : ''}

    ${featured.length ? `<div class="section-title"><h3>Featured candidates</h3><span class="link" onclick="nav('/participants${qs({survey:primary.id})}')">See all</span></div>
    <div class="hscroll">${featured.map(ParticipantMiniCard).join('')}</div>` : ''}

    ${resultsSurvey && topResults.length ? `<div class="section-title"><h3>Latest results</h3><span class="link" onclick="nav('/results/${resultsSurvey.id}')">Full results</span></div>
    <div class="card">
      <p class="tiny muted" style="margin-bottom:12px;">${esc(resultsSurvey.title)} · ${resultsSurvey.status==='Closed'?'Final':'Live prediction'}</p>
      ${topResults.map((p,i)=>ResultRow(p,i, findConst(p.constId)?.count||0)).join('')}
      <button class="btn btn-secondary sm" style="width:100%; margin-top:4px;" onclick="nav('/results/${resultsSurvey.id}')">View full breakdown ${IC.chev(14)}</button>
    </div>` : ''}

    <div class="section-title"><h3>Latest announcements</h3><span class="link" onclick="nav('/announcements')">See all</span></div>
    ${DB.announcements.filter(a=>a.published!==false).slice(0,2).map(a=>`
      <div class="card card-tap" onclick="nav('/announcements')">
        <div class="eyebrow">${esc(a.tag)}</div>
        <h4 style="font-size:14.5px; margin-top:6px;">${esc(a.title)}</h4>
        <p class="tiny muted" style="margin-top:4px;">${esc(a.date)}</p>
      </div>`).join('') || `<p class="tiny muted" style="margin-bottom:8px;">No announcements yet.</p>`}

    ${DB.surveys.length ? `<div class="card" style="background:var(--ink-900); color:#fff; margin-top:6px; border:none;">
      <div class="card-row">
        <div style="width:40px; height:40px; border-radius:11px; background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; flex-shrink:0;">${IC.flag(18)}</div>
        <div style="flex:1;">
          <h4 style="font-size:15px; color:#fff;">Want to represent your constituency?</h4>
          <p class="tiny" style="color:#C7CEDD; margin-top:4px;">Apply to become a participant in an upcoming survey.</p>
        </div>
      </div>
      <button class="btn" style="background:#fff; color:var(--ink-900); margin-top:12px;" onclick="nav('/become-participant')">Become a Participant</button>
    </div>` : ''}
  ` });
}

function screenSurveys(hash,q){
  const cat = q.cat || 'All';
  const cats = ['All','Active','Upcoming','Closed'];
  const list = DB.surveys.filter(s=> cat==='All' ? true : s.status===cat);
  return shell({ bottomNav:BottomNavUser('surveys'), top:Header({title:'Surveys', notif:true})+`
    <div class="tabs">${cats.map(c=>`<button class="tab ${c===cat?'active':''}" onclick="nav('/surveys${qs({cat:c})}')">${c}</button>`).join('')}</div>`,
    body:`
    <p class="tiny muted" style="margin-bottom:14px;">${list.length} survey${list.length!==1?'s':''}</p>
    ${list.map(SurveyCard).join('') || EmptyState({icon:IC.survey(28), title:'No surveys here yet', sub:'Try a different filter to see other surveys.', ctaLabel:'Show all surveys', ctaAction:"nav('/surveys')"})}
  `});
}

function screenSurveyDetails(id){
  const s = findSurvey(id);
  if(!s) return notFoundScreen('Survey not found', '/surveys');
  const cons = DB.constituencies[s.id] || [];
  const parts = DB.participants.filter(p=>p.surveyId===s.id).slice(0,3);
  const pct = pctOf(s.responses, s.eligiblePool);
  return shell({ fab:true, top:Header({back:true, title:'Survey', notif:true}), body:`
    <div class="card" style="border:none; background:var(--paper-soft); box-shadow:none;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <span class="eyebrow">${s.category}</span>
        <span class="pill ${pillClass(s.status)}">${s.status}</span>
      </div>
      <h2 style="font-size:20px; margin-top:8px; line-height:1.25;">${s.title}</h2>
      <p class="small muted" style="margin-top:4px;">${s.org}</p>
      <p class="small" style="margin-top:12px; line-height:1.55;">${s.desc}</p>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <div><p class="tiny muted">Opens</p><p class="small semi">${s.start}</p></div>
        <div><p class="tiny muted">Closes</p><p class="small semi">${s.end}</p></div>
        <div><p class="tiny muted">Responses</p><p class="small semi">${s.responses.toLocaleString()}</p></div>
      </div>
      <div class="progress-track"><div class="progress-fill ${s.status==='Closed'?'verify':''}" style="width:${pct}%;"></div></div>
    </div>
    <div class="section-title"><h3>Constituencies</h3><span class="link" onclick="nav('/constituencies${qs({survey:s.id})}')">View all ${cons.length}</span></div>
    <div class="card flush">
      ${cons.slice(0,4).map(c=>`
        <div class="list-row" style="cursor:pointer;" onclick="nav('/constituencies/${c.id}')">
          <div class="avatar sm">${IC.map(15)}</div>
          <div style="flex:1;">
            <p class="small semi">${c.name}</p>
            <p class="tiny muted">${c.count} participants</p>
          </div>
          <span class="pill ${c.eligible?'verified':'closed'}" style="font-size:10.5px;">${c.eligible?'Eligible':'Not eligible'}</span>
        </div>`).join('')}
    </div>
    <div class="section-title"><h3>Candidates</h3><span class="link" onclick="nav('/participants${qs({survey:s.id})}')">View all</span></div>
    <div class="card flush">
      ${parts.map(p=>ParticipantRow(p,false)).join('') || `<p class="tiny muted" style="padding:14px 16px;">Candidates will be listed here once added.</p>`}
    </div>
    <div class="cta-area">
      <button class="btn btn-primary" onclick="confirmGo('/submit/${s.id}')" ${s.status!=='Active'?'disabled':''}>${IC.check(18)} ${s.status==='Active'?'Submit your opinion':(s.status==='Closed'?'Voting closed':'Opens soon')}</button>
      <button class="btn btn-secondary" onclick="nav('/results${s.responses>0?('/'+s.id):''}')">${IC.chart(18)} View results</button>
    </div>
  `});
}
function confirmGo(to){ nav(to); }

function screenConstituencies(hash,q){
  const surveyId = q.survey || ctxSurveyId();
  const s = findSurvey(surveyId);
  const cons = DB.constituencies[surveyId] || [];
  if(!DB.surveys.length) return shell({ bottomNav:BottomNavUser('const'), top:Header({title:'Constituencies', notif:true}), body:EmptyState({icon:IC.map(28), title:'No constituencies yet', sub:'Constituencies appear here once your administrator creates a survey.'}) });
  return shell({ bottomNav:BottomNavUser('const'), top:Header({back:!!q.survey, title:'Constituencies', notif:true})+`
    <div class="tabs">${DB.surveys.map(sv=>`<button class="tab ${sv.id===surveyId?'active':''}" onclick="nav('/constituencies${qs({survey:sv.id})}')">${sv.title.split(' ').slice(0,2).join(' ')}</button>`).join('')}</div>`,
    body:`
    <p class="tiny muted" style="margin-bottom:14px;">${s?s.title:''} · ${cons.length} constituencies</p>
    ${cons.length===0 ? EmptyState({icon:IC.map(28), title:'No constituencies', sub:'None have been added to this survey yet.'}) : ''}
    ${cons.map(c=>`
      <a class="card card-tap" onclick="nav('/constituencies/${c.id}')">
        <div class="card-row">
          <div class="avatar sm">${IC.map(16)}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 style="font-size:15px;">${c.name}</h4>
              <span class="pill ${c.eligible?'verified':'closed'}">${c.eligible?'Eligible':'Not eligible'}</span>
            </div>
            <p class="tiny muted" style="margin-top:4px;">${c.count} verified participants</p>
          </div>
        </div>
      </a>`).join('')}
  `});
}

function screenConstituencyDetails(id){
  const c = findConst(id);
  if(!c) return notFoundScreen('Constituency not found', '/constituencies');
  const surveyId = constSurveyId(c.id);
  const s = findSurvey(surveyId);
  const parts = DB.participants.filter(p=>p.constId===c.id);
  return shell({ top:Header({back:true, title:'Constituency', notif:true}), body:`
    <div class="card soft">
      <div class="card-row">
        <div class="avatar">${IC.map(20)}</div>
        <div style="flex:1;">
          <h2 style="font-size:19px;">${c.name}</h2>
          <p class="tiny muted" style="margin-top:3px;">${s?s.title:''}</p>
        </div>
      </div>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between;">
        <div><p class="tiny muted">Participants</p><p class="small semi">${c.count}</p></div>
        <div><p class="tiny muted">Candidates</p><p class="small semi">${parts.length}</p></div>
        <div><p class="tiny muted">Your status</p><p class="small semi" style="color:${c.eligible?'var(--verify)':'var(--stamp)'}">${c.eligible?'Eligible':'Not eligible'}</p></div>
      </div>
    </div>
    <div class="section-title"><h3>Candidates in this constituency</h3></div>
    <div class="card flush">
      ${parts.map(p=>ParticipantRow(p,false)).join('') || `<p class="tiny muted" style="padding:14px 16px;">No candidates listed for this constituency yet.</p>`}
    </div>
    <div class="cta-area">
      <button class="btn btn-primary" onclick="nav('/submit/${surveyId}')" ${!c.eligible?'disabled':''}>${IC.check(18)} Submit your opinion here</button>
      <button class="btn btn-secondary" onclick="nav('/results/${surveyId}')">${IC.chart(18)} View results</button>
    </div>
  `});
}

function screenParticipants(hash,q){
  const surveyId = q.survey || ctxSurveyId();
  const constId = q.const;
  let parts = DB.participants.filter(p=>p.surveyId===surveyId);
  if(constId) parts = parts.filter(p=>p.constId===constId);
  const s = findSurvey(surveyId);
  return shell({ top:Header({back:true, title:'Candidates', subtitle:s?s.title:'', notif:true, searchRow:true, searchPlaceholder:'Search candidates'}), body:`
    <p class="tiny muted" style="margin-bottom:14px;">${parts.length} candidate${parts.length!==1?'s':''}${constId?(' · '+(findConst(constId)?.name||'')):''}</p>
    ${parts.map(ParticipantFullCard).join('') || EmptyState({icon:IC.users(28), title:'No candidates yet', sub:'Candidates will appear here once the administrator adds them.', ctaLabel:'Back to survey', ctaAction:`nav('/surveys/${surveyId}')`})}
  `});
}

function screenParticipantDetails(id){
  const p = findParticipant(id);
  if(!p) return notFoundScreen('Candidate not found', '/participants');
  const party = findParty(p.partyId);
  const survey = findSurvey(p.surveyId);
  return shell({ top:Header({back:true, title:'Candidate', notif:true}), body:`
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:8px 0 4px;">
      ${PhotoAvatar(p.name, party, 'lg', p.photoColor)}
      <h2 style="font-size:21px; margin-top:14px;">${p.name}</h2>
      <p class="small muted" style="margin-top:3px;">${p.year}</p>
      <div style="margin-top:12px; display:flex; align-items:center; gap:8px;">${party?PartySymbol(party,26):''}${party?PartyLogo(party,26):''}<span class="semi small">${party?party.name:'Independent candidate'}</span></div>
    </div>
    <div class="card soft" style="margin-top:18px;">
      <p class="eyebrow">Running for</p>
      <p class="semi small" style="margin-top:4px;">${p.constName}</p>
    </div>
    <div class="section-title"><h3>Public information</h3></div>
    <div class="card">
      <p class="small semi" style="line-height:1.5;">"${p.tagline}"</p>
      <div class="divider"></div>
      <p class="small" style="line-height:1.6;">${p.manifesto}</p>
    </div>
    ${survey?`<div class="section-title"><h3>Related survey</h3></div>
    <a class="card card-tap" onclick="nav('/surveys/${survey.id}')">
      <div class="card-row">
        <div class="avatar sm">${IC.survey(16)}</div>
        <div style="flex:1;">
          <h4 style="font-size:14.5px;">${survey.title}</h4>
          <p class="tiny muted" style="margin-top:3px;">${survey.org} · <span class="semi" style="color:var(--ink-700)">${survey.status}</span></p>
        </div>
        <span class="chev">${IC.chev(16)}</span>
      </div>
    </a>`:''}
    <div class="cta-area">
      <button class="btn btn-primary" data-no-track onclick="APP.selectedParticipant='${p.id}'; nav('/submit/${p.surveyId}${qs({const:p.constId})}')">${IC.check(18)} Choose this response &amp; continue</button>
      <button class="btn btn-secondary" onclick="nav('/participants${qs({survey:p.surveyId, const:p.constId})}')">View other candidates</button>
    </div>
  `});
}

function screenSubmit(surveyId, q={}){
  const s = findSurvey(surveyId);
  if(!s) return notFoundScreen('Survey not found', '/surveys');
  if(hasResponded(s.id)) return shell({ top:Header({back:true, title:'Submit opinion', subtitle:s.title}), body:EmptyState({icon:stampSVG(28,'var(--verify)'), title:'You have already responded', sub:'Each verified person can respond once per survey. Thank you for taking part.', ctaLabel:'View results', ctaAction:`nav('/results/${s.id}')`}) });
  if(s.status!=='Active') return shell({ top:Header({back:true, title:'Submit opinion', subtitle:s.title}), body:EmptyState({icon:IC.survey(28), title:s.status==='Closed'?'This survey is closed':'This survey is not open yet', sub:'You can respond while the survey is active.', ctaLabel:'Back to survey', ctaAction:`nav('/surveys/${s.id}')`}) });
  const openCons = (DB.constituencies[s.id]||[]).filter(c=>c.eligible);
  const constId = q.const || (openCons[0] && openCons[0].id);
  const parts = DB.participants.filter(p=>p.surveyId===s.id && p.active!==false && (!constId || p.constId===constId));
  const selected = APP.selectedParticipant && parts.find(p=>p.id===APP.selectedParticipant);
  return shell({ top:Header({back:true, title:'Submit opinion', subtitle:s.title}), body:`
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start;">
      ${IC.shield(18)}
      <p class="tiny muted">Your identity has already been verified separately. This submission cannot be traced back to your name or email address.</p>
    </div>
    ${openCons.length>1 ? `<div class="field" style="margin-top:14px;"><label>Your constituency</label><select class="input" onchange="APP.selectedParticipant=null; nav('/submit/${s.id}'+qs({const:this.value}))">${openCons.map(c=>`<option value="${c.id}" ${c.id===constId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>` : ''}
    <div class="section-title"><h3>Select your response</h3></div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${parts.map(p=>{ const party=findParty(p.partyId); const isSel = selected&&selected.id===p.id;
        return `<label class="card" style="display:flex; align-items:center; gap:12px; margin-bottom:0; cursor:pointer; ${isSel?'border-color:var(--ink-900); background:var(--paper-soft);':''}" onclick="APP.selectedParticipant='${p.id}'; nav('/submit/${s.id}${qs({const:constId||''})}')">
          ${PhotoAvatar(p.name, party, 'sm', p.photoColor)}
          <div style="flex:1;">
            <p class="small semi">${p.name}</p>
            <div style="margin-top:3px;">${PartyChip(party)}</div>
          </div>
          <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isSel?'var(--ink-900)':'var(--line)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            ${isSel?`<div style="width:10px; height:10px; border-radius:50%; background:var(--ink-900);"></div>`:''}
          </div>
        </label>`;}).join('') || `<p class="tiny muted">No candidates available for this constituency yet.</p>`}
    </div>
    <div class="cta-area">
      <button class="btn btn-primary" id="submitBtn" ${!selected?'disabled':''} onclick="openSubmitDialog('${s.id}')">Continue ${IC.chev(16)}</button>
      <p class="tiny muted" style="text-align:center;">Your response is not submitted yet — you'll get one more chance to confirm.</p>
    </div>
  `});
}
function openSubmitDialog(surveyId){
  const p = findParticipant(APP.selectedParticipant);
  openDialog({
    icon: stampSVG(22,'var(--verify)'), iconBg:'var(--verify-soft)',
    title:'Confirm your response',
    body: p ? `You are about to submit your response for <b>${p.name}</b>. This cannot be changed once confirmed.` : `You are about to submit your response. This cannot be changed once confirmed.`,
    confirmLabel:'Yes, submit', cancelLabel:'Go back',
    onConfirm: async ()=>{
      if(!p){ toast('Select a candidate first'); return; }
      if(hasResponded(surveyId)){ toast('You have already responded to this survey'); return; }
      /* Anonymous ballot (Python /api/ballot): stored against the random ID, never against name/email.
         Nothing about the choice is saved in the shared data, a notification, or the activity log. */
      try{
        const r = await Ballot.cast(surveyId, p.id);
        APP.lastSubmit = { ref:r.receipt.toUpperCase().replace(/(.{4})(?=.)/g,'$1-'), at:Date.now() };
        APP.votedSurveys = (APP.votedSurveys||[]).concat(surveyId);
        DB.user.constituency = p.constName || DB.user.constituency;
        APP.selectedParticipant = null;
        try{ await Sync.reload(); }catch(_){}
        nav('/success');
      }catch(e){
        if(e.already){ APP.votedSurveys = (APP.votedSurveys||[]).concat(surveyId); toast('You have already responded to this survey'); nav('/surveys/'+surveyId); }
        else toast(e.message || 'Could not record your response');
      }
    }
  });
}

function screenSuccess(){
  return shell({ fab:false, top:'', body:`
    <div class="auth-content" style="justify-content:center;">
      <div class="stamp-wrap">
        <div class="stamp-ring">${stampSVG(44,'var(--verify)')}</div>
        <h1 style="font-size:23px; margin-top:20px;">Response recorded</h1>
        <p class="muted small" style="margin-top:8px; max-width:280px;">Your opinion has been submitted and stored separately from your verified identity. Thank you for participating.</p>
        <div class="card soft" style="margin-top:22px; text-align:left; width:100%;">
          <div style="display:flex; justify-content:space-between;"><span class="tiny muted">Reference ID</span><span class="tiny semi">${esc((APP.lastSubmit||{}).ref||'—')}</span></div>
          <div style="display:flex; justify-content:space-between; margin-top:8px;"><span class="tiny muted">Submitted</span><span class="tiny semi">${APP.lastSubmit?new Date(APP.lastSubmit.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'—'}</span></div>
        </div>
      </div>
      <div style="flex:1;"></div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn btn-primary" onclick="nav('/home')">Back to home</button>
        <button class="btn btn-secondary" onclick="nav('/results')">View live results</button>
      </div>
    </div>` });
}

function screenResults(){
  const withResults = DB.surveys.filter(s=>s.responses>0 && s.resultsPublished!==false);
  return shell({ bottomNav:BottomNavUser('results'), top:Header({title:'Results', notif:true}), body:`
    <p class="tiny muted" style="margin-bottom:14px;">Live and declared opinion/prediction results across your surveys.</p>
    ${withResults.map(s=>`
      <a class="card card-tap" onclick="nav('/results/${s.id}')">
        <div class="card-row">
          <div class="avatar sm">${IC.chart(15)}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h4 style="font-size:15px;">${s.title}</h4>
              <span class="pill ${s.status==='Closed'?'closed':'active'}">${s.declared?'Declared':(s.status==='Closed'?'Final':'Live')}</span>
            </div>
            <p class="tiny muted" style="margin-top:4px;">${s.responses.toLocaleString()} responses counted</p>
          </div>
        </div>
      </a>`).join('') || EmptyState({icon:IC.chart(28), title:'No results yet', sub:'Results will appear here once a survey has responses and the administrator publishes them.'})}
  `});
}

function screenResultsDetail(id){
  const s = findSurvey(id);
  if(!s) return notFoundScreen('Survey not found', '/results');
  const cons = DB.constituencies[s.id] || [];
  const isFinal = s.status==='Closed';
  const anyResults = cons.some(c=>DB.participants.some(p=>p.constId===c.id));
  const leader = s.declared ? overallLeader(s) : null;
  const leaderParty = leader ? findParty(leader.partyId) : null;
  if(s.resultsPublished===false && !s.declared){
    return shell({ top:Header({back:true, title:'Results', subtitle:s.title}), body:
      EmptyState({icon:IC.chart(28), title:'Results not yet published', sub:'The administrator hasn\'t published opinion results for this survey yet. Check back soon.', ctaLabel:'Back to survey', ctaAction:`nav('/surveys/${s.id}')`})
    });
  }
  return shell({ top:Header({back:true, title:'Results', subtitle:s.title}), body:`
    ${s.declared ? `
    <div class="card soft" style="border:1.5px solid var(--verify); margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:8px;">${stampSVG(20,'var(--verify)')}<p class="small semi" style="color:var(--verify); letter-spacing:.03em;">RESULT DECLARED</p></div>
      <p class="tiny muted" style="margin-top:6px;">Declared ${s.declaredAt}</p>
      ${leader ? `
      <div class="divider"></div>
      <div style="display:flex; align-items:center; gap:12px;">
        ${PhotoAvatar(leader.name, leaderParty, 'md', leader.photoColor)}
        <div style="flex:1; min-width:0;">
          <p class="small semi" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${leader.name}</p>
          <div style="display:flex; align-items:center; gap:6px; margin-top:5px;">${leaderParty?PartySymbol(leaderParty,18):''}${leaderParty?PartyLogo(leaderParty,18):''}<span class="tiny muted">${leaderParty?leaderParty.name:'Independent'}</span></div>
        </div>
        <div style="text-align:right; flex-shrink:0;"><p style="font-size:22px; font-weight:700; line-height:1;">${leader.share}%</p><p class="tiny muted" style="margin-top:4px;">${s.responses.toLocaleString()} responses</p></div>
      </div>` : ''}
      <p class="tiny muted" style="margin-top:12px; opacity:.8; line-height:1.5;">This reflects opinion/prediction data collected through Verdict — a survey signal, not an official electoral result.</p>
    </div>` : `
    <div class="card" style="border:none; background:var(--paper-soft); box-shadow:none; display:flex; align-items:center; gap:10px;">
      ${isFinal?stampSVG(20,'var(--verify)'):`<span style="width:9px; height:9px; border-radius:50%; background:var(--gold); flex-shrink:0;"></span>`}
      <p class="small semi">${isFinal?'Closed — awaiting declaration':'Live prediction — updates automatically'}</p>
    </div>`}
    ${anyResults ? cons.map(c=>{
      const parts = DB.participants.filter(p=>p.constId===c.id).sort((a,b)=>b.share-a.share);
      if(!parts.length) return '';
      return `<div class="section-title"><h3>${c.name}</h3></div>
      <div class="card">${parts.map((p,i)=>ResultRow(p,i,c.count)).join('')}</div>`;
    }).join('') : EmptyState({icon:IC.chart(28), title:'No results yet', sub:'Results will appear here as soon as verified responses are counted.', ctaLabel:'Back to survey', ctaAction:`nav('/surveys/${s.id}')`})}
  `});
}

function screenAnnouncements(){
  const list = DB.announcements.filter(a=>a.published!==false);
  return shell({ top:Header({back:true, title:'Announcements', notif:true}), body:`
    ${list.map(a=>`
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="eyebrow">${a.tag}</span>
          <span class="tiny muted">${a.date}</span>
        </div>
        <h4 style="font-size:15px; margin-top:8px; line-height:1.35;">${a.title}</h4>
        <p class="small muted" style="margin-top:6px; line-height:1.5;">${a.body}</p>
        <button class="btn btn-secondary sm" style="margin-top:12px;" onclick="nav('/surveys/${a.survey}')">Open related survey ${IC.chev(14)}</button>
      </div>`).join('') || EmptyState({icon:IC.megaphone(28), title:'No announcements yet', sub:'Check back soon for updates from administrators.'})}
  `});
}

function screenNotifications(){
  const icOf = t => ({check:IC.check, shield:IC.shield, megaphone:IC.megaphone, info:IC.info, chart:IC.chart}[t]||IC.info);
  return shell({ top:Header({back:true, title:'Notifications'})+`<div style="padding:0 16px 12px; display:flex; justify-content:flex-end;"><button class="tiny semi" style="color:var(--ink-700); background:none; border:none;" onclick="markAllNotificationsRead()">Mark all read</button></div>`, body:`
    ${DB.notifications.map(n=>`
      <div class="card" style="display:flex; gap:12px; cursor:pointer; ${!n.read?'background:var(--paper-soft);':''}" onclick="markNotificationRead('${n.id}')">
        <div class="avatar sm" style="background:${n.read?'var(--paper-dim)':'var(--ink-900)'}; color:${n.read?'var(--ink-700)':'#fff'};">${icOf(n.type)(15)}</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; gap:8px;">
            <p class="small semi">${n.title}</p>
            ${!n.read?`<span style="width:7px; height:7px; border-radius:50%; background:var(--stamp); flex-shrink:0; margin-top:5px;"></span>`:''}
          </div>
          <p class="tiny muted" style="margin-top:3px; line-height:1.4;">${n.body}</p>
          <p class="tiny muted" style="margin-top:6px; opacity:.7;">${timeAgo(n.at, n.time)}</p>
        </div>
      </div>`).join('') || EmptyState({icon:IC.bell(28), title:'No notifications yet', sub:'Updates about your surveys and applications will show up here.'})}
  `});
}

function screenProfile(){
  return shell({ bottomNav:BottomNavUser('profile'), top:Header({title:'Profile'}), body:`
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:6px 0 4px;">
      <div class="avatar lg">${userInitials() || IC.user(26)}</div>
      <h2 style="font-size:20px; margin-top:12px;">${esc(DB.user.name || 'Add your name')}</h2>
      <button class="tiny semi" style="background:none; border:none; color:var(--ink-700); margin-top:4px; text-decoration:underline;" onclick="openEditProfileForm()">${DB.user.name?'Edit name':'Tap to add your name'}</button>
      <p class="small muted" style="margin-top:3px;">${DB.user.email}</p>
      <span class="pill verified" style="margin-top:10px;">${stampSVG(12,'var(--verify)')} ${DB.user.role}</span>
    </div>
    <div class="card soft" style="display:flex; gap:10px; align-items:flex-start;">${IC.shield(18)}<div style="flex:1;">
      <p class="tiny muted">Your anonymous voter ID</p><p class="small semi" style="letter-spacing:.06em; margin-top:2px;">${AnonId.short()}</p>
      <p class="tiny muted" style="margin-top:4px; line-height:1.45;">Your vote is stored against this random ID, not your name or number. The administrator cannot see who voted for whom.</p></div></div>
    <div style="display:flex; gap:10px; margin:18px 0;">
      ${StatBox((APP.votedSurveys||[]).length,'Responses')}
      ${StatBox(DB.applications.length,'Applications')}
      ${StatBox(DB.user.constituency ? esc(DB.user.constituency.split(' ')[0]) : '—','Constituency')}
    </div>
    <div class="card flush">
      <div class="list-row" style="cursor:pointer;" onclick="nav('/participant-status')"><div class="avatar sm">${IC.flag(15)}</div><div style="flex:1;"><p class="small semi">Participant application status</p></div><span class="chev">${IC.chev(16)}</span></div>
      <div class="list-row" style="cursor:pointer;" onclick="nav('/become-participant')"><div class="avatar sm">${IC.plus(15)}</div><div style="flex:1;"><p class="small semi">Become a Participant</p></div><span class="chev">${IC.chev(16)}</span></div>
      <div class="list-row" style="cursor:pointer;" onclick="nav('/announcements')"><div class="avatar sm">${IC.megaphone(15)}</div><div style="flex:1;"><p class="small semi">Announcements</p></div><span class="chev">${IC.chev(16)}</span></div>
      <div class="list-row" style="cursor:pointer;" onclick="nav('/notifications')"><div class="avatar sm">${IC.bell(15)}</div><div style="flex:1;"><p class="small semi">Notifications</p></div><span class="chev">${IC.chev(16)}</span></div>
      <div class="list-row" style="cursor:pointer;" onclick="nav('/settings')"><div class="avatar sm">${IC.gear(15)}</div><div style="flex:1;"><p class="small semi">Settings</p></div><span class="chev">${IC.chev(16)}</span></div>
    </div>
    <div class="section-title"><h3>Administration</h3></div>
    <div class="card flush">
      <div class="list-row" style="cursor:pointer;" onclick="nav('/admin/login')"><div class="avatar sm">${IC.shield(15)}</div><div style="flex:1;"><p class="small semi">Switch to administrator sign-in</p></div><span class="chev">${IC.chev(16)}</span></div>
    </div>
    <button class="btn btn-danger-outline" style="margin-top:8px;" onclick="confirmLogout('/welcome')">${IC.logout(17)} Log out</button>
  `});
}

function screenSettings(){
  const rows = (items)=>`<div class="card flush">${items.map(i=>`
    <div class="list-row" ${i.to?`style="cursor:pointer;" onclick="nav('${i.to}')"`:(i.act?`style="cursor:pointer;" onclick="${i.act}"`:'')}>
      <div class="avatar sm">${i.ic(15)}</div>
      <div style="flex:1;"><p class="small semi">${i.label}</p>${i.sub?`<p class="tiny muted" style="margin-top:2px;">${i.sub}</p>`:''}</div>
      ${i.toggle?`<div class="switch" data-on="${i.on}" style="background:${i.on?'var(--ink-900)':'var(--paper-dim)'};" onclick="toggleSwitch(this)"><div class="knob" style="left:${i.on?'19px':'3px'};"></div></div>`:`<span class="chev">${IC.chev(16)}</span>`}
    </div>`).join('')}</div>`;
  return shell({ top:Header({back:true, title:'Settings'}), body:`
    <div class="section-title" style="margin-top:0;"><h3>Account</h3></div>
    ${rows([{ic:IC.user,label:'Personal details',sub:(DB.user.name?esc(DB.user.name)+' · ':'')+DB.user.email,act:'openEditProfileForm()'},{ic:IC.shield,label:'Verification status',sub:'Email verified'}])}
    <div class="section-title"><h3>Notifications</h3></div>
    ${rows([{ic:IC.bell,label:'Push notifications',toggle:true,on:true},{ic:IC.mail,label:'Email digests',toggle:true,on:false}])}
    <div class="section-title"><h3>Support</h3></div>
    ${rows([{ic:IC.info,label:'Help &amp; contact administrator'},{ic:IC.shield,label:'Privacy &amp; data handling'}])}
    <button class="btn btn-danger-outline" style="margin-top:18px;" onclick="confirmLogout('/welcome')">${IC.logout(17)} Log out</button>
  `});
}

function openEditProfileForm(){
  openFormSheet({ title:'Your details', sub:'Shown on your profile and pre-filled when you apply as a participant.', submitLabel:'Save', fields:[
    {id:'name', label:'Full name', value:DB.user.name||'', required:true},
  ], onSubmit:(v)=>{ DB.user.name = v.name.trim(); AppStorage.flush(); toast('Details saved'); render(); }});
}
