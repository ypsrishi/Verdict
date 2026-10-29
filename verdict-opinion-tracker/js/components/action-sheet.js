/* ============================= GENERIC ACTION SHEET =============================
   A tappable list of contextual actions for a single record (candidate, party,
   constituency...). Actions carry live closures, so they're stashed on APP rather than
   serialised into onclick attributes. */
function openActionSheet({title, sub, actions}){
  closeActionSheet(); closeFormSheet();
  APP.actionSheetActions = actions;
  const shellEl = document.getElementById('shell');
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'actionSheet';
  ov.onclick = (e)=>{ if(e.target===ov) closeActionSheet(); };
  ov.innerHTML = `<div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div><h3 style="font-size:16.5px;">${title}</h3>${sub?`<p class="tiny muted" style="margin-top:2px;">${sub}</p>`:''}</div><button class="icon-btn" onclick="closeActionSheet()">${IC.x(16)}</button></div>
    <div class="sheet-body">
      ${actions.map((a,i)=>`<div class="list-row" style="cursor:pointer;" onclick="runActionSheetAction(${i})"><div class="avatar sm" style="${a.danger?'background:var(--stamp-soft); color:var(--stamp);':''}">${a.icon||IC.chev(15)}</div><div style="flex:1;"><p class="small semi" style="${a.danger?'color:var(--stamp);':''}">${a.label}</p>${a.sub?`<p class="tiny muted" style="margin-top:2px;">${a.sub}</p>`:''}</div></div>`).join('')}
    </div>
  </div>`;
  shellEl.appendChild(ov);
}
function runActionSheetAction(i){
  const a = APP.actionSheetActions && APP.actionSheetActions[i];
  closeActionSheet();
  if(a && a.onClick) a.onClick();
}
function closeActionSheet(){ document.getElementById('actionSheet')?.remove(); }
