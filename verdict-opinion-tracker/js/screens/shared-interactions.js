/* ============================= SHARED INTERACTIONS ============================= */
function copyLink(btn,url){
  navigator.clipboard?.writeText('https://'+url).catch(()=>{});
  const old = btn.innerHTML;
  btn.innerHTML = IC.check(14);
  toast('Link copied to clipboard');
  setTimeout(()=>btn.innerHTML=old, 1200);
}
function toggleSwitch(el){
  const on = el.dataset.on === 'true';
  el.dataset.on = (!on).toString();
  el.style.background = !on ? 'var(--ink-900)' : 'var(--paper-dim)';
  el.querySelector('.knob').style.left = !on ? '19px' : '3px';
  toast('Preference updated');
}
function confirmLogout(dest){
  openDialog({
    icon: IC.logout(20), iconBg:'var(--stamp-soft)', iconColor:'var(--stamp)',
    title:'Log out of Verdict?',
    body:'You will need to sign in again next time. Everything you saved stays safe.',
    confirmLabel:'Log out', cancelLabel:'Stay signed in', danger:true,
    onConfirm: async ()=>{
      try{ await Sync.saveNow(); } catch(_){}
      try{ if(dest.startsWith('/admin')) await Api.adminLogout(); else await Api.leave(); }catch(_){}
      SessionStore.clear(); navReplace(dest);
    }
  });
}
