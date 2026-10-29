/* ============================= GENERIC FORM SHEET =============================
   Every admin "Add" / "Edit" flow (participants, parties, constituencies, surveys,
   announcements...) renders through this one bottom-sheet form builder so field styling,
   validation and submit wiring stay consistent instead of being re-implemented per screen. */
function formFieldHtml(f){
  const label = `<label>${f.label}${f.required?' *':''}</label>`;
  if(f.type==='select'){
    return `<div class="field"><label>${f.label}</label><select class="input" id="ff_${f.id}" ${f.onchange?`onchange="${f.onchange}"`:''}>${(f.options||[]).map(o=>`<option value="${o.value}" ${String(o.value)===String(f.value)?'selected':''}>${o.label}</option>`).join('')}</select></div>`;
  }
  if(f.type==='textarea'){
    return `<div class="field">${label}<textarea class="input" id="ff_${f.id}" placeholder="${f.placeholder||''}" style="${f.tall?'min-height:130px;':''}">${f.value||''}</textarea></div>`;
  }
  if(f.type==='color'){
    return `<div class="field">${label}<input class="input" type="color" id="ff_${f.id}" value="${f.value||'#57678C'}" style="height:44px; padding:6px; cursor:pointer;"></div>`;
  }
  if(f.type==='checkbox'){
    const on = f.value===true || f.value==='true';
    return `<div class="field" style="display:flex; align-items:center; justify-content:space-between; gap:12px;"><label style="margin:0;">${f.label}</label><div class="switch" data-on="${on}" id="ffw_${f.id}" style="background:${on?'var(--ink-900)':'var(--paper-dim)'};" onclick="toggleFormSwitch('${f.id}')"><div class="knob" style="left:${on?'19px':'3px'};"></div></div><input type="hidden" id="ff_${f.id}" value="${on}"></div>`;
  }
  return `<div class="field">${label}<input class="input" id="ff_${f.id}" type="${f.inputType||'text'}" placeholder="${f.placeholder||''}" value="${f.value!=null?f.value:''}"></div>`;
}
function toggleFormSwitch(id){
  const wrap = document.getElementById('ffw_'+id), hidden = document.getElementById('ff_'+id);
  const on = wrap.dataset.on === 'true';
  wrap.dataset.on = (!on).toString();
  wrap.style.background = !on ? 'var(--ink-900)' : 'var(--paper-dim)';
  wrap.querySelector('.knob').style.left = !on ? '19px' : '3px';
  hidden.value = (!on).toString();
}
function openFormSheet({title, sub, fields, submitLabel='Save', onSubmit}){
  closeFormSheet(); closeActionSheet();
  const shellEl = document.getElementById('shell');
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'formSheet';
  ov.onclick = (e)=>{ if(e.target===ov) closeFormSheet(); };
  ov.innerHTML = `<div class="sheet" style="max-height:92%;">
    <div class="sheet-handle"></div>
    <div class="sheet-head"><div><h3 style="font-size:16.5px;">${title}</h3>${sub?`<p class="tiny muted" style="margin-top:2px;">${sub}</p>`:''}</div><button class="icon-btn" onclick="closeFormSheet()">${IC.x(16)}</button></div>
    <div class="sheet-body" style="padding:0 18px 20px;">
      ${fields.map(formFieldHtml).join('')}
      <button class="btn btn-primary" style="width:100%; margin-top:6px;" onclick="submitFormSheet()">${submitLabel}</button>
    </div>
  </div>`;
  shellEl.appendChild(ov);
  APP.formSubmit = ()=>{
    const values = {};
    fields.forEach(f=>{ const el = document.getElementById('ff_'+f.id); values[f.id] = el ? el.value : ''; });
    for(const f of fields){
      if(f.required && !String(values[f.id]||'').trim()){ toast('Please fill in "'+f.label+'"'); return; }
    }
    closeFormSheet();
    onSubmit(values);
  };
}
function submitFormSheet(){ if(APP.formSubmit) APP.formSubmit(); }
function closeFormSheet(){ document.getElementById('formSheet')?.remove(); }
