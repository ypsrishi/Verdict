/* ============================= DIALOG ============================= */
function openDialog({icon,iconBg,iconColor,title,body,confirmLabel='Confirm',cancelLabel='Cancel',danger=false,onConfirm}){
  closeDialog();
  APP.dialogConfirm = onConfirm;
  const shellEl = document.getElementById('shell');
  const ov = document.createElement('div');
  ov.className = 'dialog-overlay'; ov.id = 'genericDialog';
  ov.onclick = (e)=>{ if(e.target===ov) closeDialog(); };
  ov.innerHTML = `<div class="dialog">
    ${icon?`<div class="dialog-icon" style="background:${iconBg||'var(--paper-soft)'}; color:${iconColor||'var(--ink-900)'};">${icon}</div>`:''}
    <h3 style="font-size:17px; line-height:1.3;">${title}</h3>
    <p class="small muted" style="margin-top:8px; line-height:1.5;">${body}</p>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn btn-secondary sm" style="flex:1;" onclick="closeDialog()">${cancelLabel}</button>
      <button class="btn ${danger?'btn-danger-outline':'btn-primary'} sm" style="flex:1; ${danger?'background:var(--stamp); color:#fff; border:none;':''}" onclick="runDialogConfirm()">${confirmLabel}</button>
    </div>
  </div>`;
  shellEl.appendChild(ov);
}
function closeDialog(){ document.getElementById('genericDialog')?.remove(); }
function runDialogConfirm(){ const fn = APP.dialogConfirm; closeDialog(); if(fn) fn(); }
