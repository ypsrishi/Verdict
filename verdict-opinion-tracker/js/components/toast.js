/* ============================= TOAST ============================= */
function toast(msg, icon){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const id = 't'+(APP.toastSeq++);
  const el = document.createElement('div');
  el.className = 'toast'; el.id = id;
  el.innerHTML = `<span class="tic">${icon||IC.check(14)}</span><span style="flex:1;">${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{
    el.classList.add('leaving');
    setTimeout(()=>el.remove(), 240);
  }, 2400);
}
