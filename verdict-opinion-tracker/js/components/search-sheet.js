/* ============================= SEARCH SHEET ============================= */
function openSearchSheet(){
  const shellEl = document.getElementById('shell');
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'searchSheet';
  ov.onclick = (e)=>{ if(e.target===ov) closeSheetById('searchSheet'); };
  ov.innerHTML = `<div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h3 style="font-size:16.5px;">Search Verdict</h3><button class="icon-btn" onclick="closeSheetById('searchSheet')">${IC.x(16)}</button></div>
    <div style="padding:0 18px 14px;"><input class="input" placeholder="Try 'Engineering Block' or a candidate name" autofocus></div>
    <div class="sheet-body">
      <div class="sheet-group-title">Recent surveys</div>
      ${DB.surveys.length ? '' : '<p class="tiny muted" style="padding:6px 18px 10px;">Nothing to show yet.</p>'}
      ${DB.surveys.slice(0,3).map(s=>`<div class="list-row" style="cursor:pointer;" onclick="closeSheetById('searchSheet'); nav('/surveys/${s.id}')"><div class="avatar sm">${IC.survey(15)}</div><div style="flex:1;"><p class="small semi">${s.title}</p></div><span class="chev">${IC.chev(15)}</span></div>`).join('')}
      <div class="sheet-group-title">Candidates</div>
      ${DB.participants.slice(0,4).map(p=>`<div class="list-row" style="cursor:pointer;" onclick="closeSheetById('searchSheet'); nav('/participants/${p.id}')"><div class="avatar sm">${initials(p.name)}</div><div style="flex:1;"><p class="small semi">${p.name}</p><p class="tiny muted">${p.constName}</p></div><span class="chev">${IC.chev(15)}</span></div>`).join('')}
    </div>
  </div>`;
  shellEl.appendChild(ov);
}
function closeSheetById(id){ document.getElementById(id)?.remove(); }
