/* ============================= AUTH: OTP SCREEN LOGIC ============================= */
function otpInteractiveHtml(){
  return `<div class="otp-row" id="otpBoxesRow" style="margin:22px 0 6px;">
      ${Array.from({length:6}).map((_,i)=>`<input class="otp-box" id="otp${i}" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i===0?'one-time-code':'off'}">`).join('')}
    </div>
    <p class="error-text" id="otpError" style="min-height:16px; display:none;"></p>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
      <span class="tiny muted" id="otpExpiryText"></span>
      <span class="tiny semi" id="resendAction" style="color:var(--muted);"></span>
    </div>`;
}
let otpTimers = { expiry:null, cooldown:null };
function clearOtpTimers(){ if(otpTimers.expiry) clearInterval(otpTimers.expiry); if(otpTimers.cooldown) clearInterval(otpTimers.cooldown); otpTimers.expiry=null; otpTimers.cooldown=null; }
function initOtpScreen(){
  APP.otpVerifying = false;
  bindOtpBoxes();
  startOtpTimers(APP.otpMeta || {expiresInMs:90000, resendCooldownMs:30000});
  document.getElementById('otp0')?.focus();
  if(APP.otpMeta && APP.otpMeta.code){ showOtpPopdown(SessionStore.get().email); }
}
function bindOtpBoxes(){
  const boxes = [...document.querySelectorAll('.otp-box')];
  boxes.forEach((b,i)=>{
    b.addEventListener('input', (e)=>{
      let v = e.target.value.replace(/\D/g,''); if(v.length>1) v = v.slice(-1);
      e.target.value = v;
      clearOtpError();
      if(v && i<boxes.length-1) boxes[i+1].focus();
      const vb=document.getElementById('verifyBtn'); if(vb) vb.disabled = !boxes.every(bx=>bx.value.length===1) || APP.otpVerifying;
      if(boxes.every(bx=>bx.value.length===1)) attemptVerify();
    });
    b.addEventListener('keydown', (e)=>{
      if(e.key==='Backspace' && !e.target.value && i>0){
        boxes[i-1].focus(); boxes[i-1].value='';
        const vb=document.getElementById('verifyBtn'); if(vb) vb.disabled = true;
      }
    });
    b.addEventListener('paste', (e)=>{
      e.preventDefault();
      const text = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
      if(!text) return;
      text.split('').forEach((ch,idx)=>{ if(boxes[idx]) boxes[idx].value = ch; });
      boxes[Math.min(text.length, boxes.length-1)].focus();
      const vb=document.getElementById('verifyBtn'); if(vb) vb.disabled = !boxes.every(bx=>bx.value.length===1);
      if(text.length===6) attemptVerify();
    });
  });
}
function startOtpTimers(meta){
  clearOtpTimers();
  const expiresAt = Date.now()+meta.expiresInMs, cooldownEnd = Date.now()+meta.resendCooldownMs;
  updateExpiryText(expiresAt);
  updateResendText(cooldownEnd);
  otpTimers.expiry = setInterval(()=>updateExpiryText(expiresAt), 1000);
  otpTimers.cooldown = setInterval(()=>updateResendText(cooldownEnd), 1000);
}
function updateExpiryText(expiresAt){
  const el = document.getElementById('otpExpiryText'); if(!el) return;
  const remaining = expiresAt - Date.now();
  if(remaining <= 0){ if(otpTimers.expiry){ clearInterval(otpTimers.expiry); otpTimers.expiry=null; } if(!APP.otpVerifying) showExpiredState(); return; }
  el.textContent = 'Code expires in ' + fmtTime(remaining);
}
function updateResendText(cooldownEnd){
  const el = document.getElementById('resendAction'); if(!el) return;
  const remaining = cooldownEnd - Date.now();
  if(remaining <= 0){
    if(otpTimers.cooldown){ clearInterval(otpTimers.cooldown); otpTimers.cooldown=null; }
    el.textContent = 'Resend code'; el.style.color='var(--ink-900)'; el.style.cursor='pointer'; el.style.textDecoration='underline';
    el.onclick = ()=>handleResend(el);
  } else {
    el.textContent = 'Resend in ' + fmtTime(remaining); el.style.color='var(--muted)'; el.style.cursor='default'; el.style.textDecoration='none'; el.onclick=null;
  }
}
function showOtpError(msg){
  const err=document.getElementById('otpError'); if(err){ err.textContent=msg; err.style.display='block'; }
  document.querySelectorAll('.otp-box').forEach(b=>b.classList.add('otp-box-error'));
}
function clearOtpError(){
  const err=document.getElementById('otpError'); if(err) err.style.display='none';
  document.querySelectorAll('.otp-box').forEach(b=>b.classList.remove('otp-box-error'));
}
function shakeOtpBoxes(){ shakeEl('otpBoxesRow'); }
function showExpiredState(){
  clearOtpTimers();
  const el = document.getElementById('otpInteractive'); if(!el) return;
  el.innerHTML = `<div style="text-align:center; padding:14px 0 4px;">
    <div class="ic" style="margin:0 auto; background:var(--stamp-soft); color:var(--stamp);">${IC.alert(26)}</div>
    <p class="small semi" style="margin-top:14px;">Code expired</p>
    <p class="tiny muted" style="margin-top:4px;">For your security, codes are only valid for a short time. Request a new one to continue.</p>
  </div>`;
  const vb = document.getElementById('verifyBtn'); if(vb) vb.style.display='none';
  el.insertAdjacentHTML('beforeend', `<button class="btn btn-primary" style="margin-top:16px;" onclick="handleResend(this)">Resend Code</button>`);
}
function showLockedState(){
  clearOtpTimers();
  const el = document.getElementById('otpInteractive'); if(!el) return;
  el.innerHTML = `<div style="text-align:center; padding:14px 0 4px;">
    <div class="ic" style="margin:0 auto; background:var(--stamp-soft); color:var(--stamp);">${IC.shield(26)}</div>
    <p class="small semi" style="margin-top:14px;">Too many incorrect attempts</p>
    <p class="tiny muted" style="margin-top:4px;">For your security, this code has been locked. Request a new one to continue.</p>
  </div>`;
  const vb = document.getElementById('verifyBtn'); if(vb) vb.style.display='none';
  el.insertAdjacentHTML('beforeend', `<button class="btn btn-primary" style="margin-top:16px;" onclick="handleResend(this)">Resend Code</button>`);
}
function handleResend(triggerEl){
  if(triggerEl){ triggerEl.disabled=true; triggerEl.dataset.orig=triggerEl.innerHTML; triggerEl.innerHTML=`<span class="spinner"></span> Sending...`; }
  AuthService.resendOtp().then(res=>{
    APP.otpMeta = res;
    const el = document.getElementById('otpInteractive');
    if(el) el.innerHTML = otpInteractiveHtml();
    APP.otpVerifying = false;
    bindOtpBoxes();
    startOtpTimers(res);
    const vb = document.getElementById('verifyBtn'); if(vb){ vb.style.display=''; vb.disabled=true; vb.innerHTML='Verify code'; }
    document.getElementById('otp0')?.focus();
    showOtpPopdown(SessionStore.get().email);
    toast('New code sent');
  }).catch(err=>{
    if(triggerEl){ triggerEl.disabled=false; triggerEl.innerHTML=triggerEl.dataset.orig; }
    toast(err.message || 'Could not resend code');
  });
}
function setOtpLoading(loading){
  APP.otpVerifying = loading;
  const boxes=[...document.querySelectorAll('.otp-box')];
  boxes.forEach(b=>b.disabled=loading);
  const vb=document.getElementById('verifyBtn');
  if(vb){ vb.disabled = loading || !boxes.every(b=>b.value.length===1); vb.innerHTML = loading ? `<span class="spinner"></span> Verifying...` : 'Verify code'; }
}
function attemptVerify(){
  if(APP.otpVerifying) return;
  const boxes = [...document.querySelectorAll('.otp-box')];
  if(!boxes.length || !boxes.every(b=>b.value.length===1)) return;
  const code = boxes.map(b=>b.value).join('');
  setOtpLoading(true);
  AuthService.verifyOtp(code).then(async res=>{
    /* attach this email to the institution on the server (creates the participant session) */
    try{ await Api.join(APP.instCode, res.email); }
    catch(e){ const er = new Error(e.message); er.code = 'JOIN'; er.msg = e.message; throw er; }
    setOtpLoading(false);
    clearOtpTimers();
    closeOtpPopdown();
    SessionStore.setToken(res.token);
    SessionStore.setStep('email_verified', res.email);
    if(DB.user.rawEmail !== res.email){ DB.user = Object.assign(blankUser(), { rawEmail:res.email }); AnonId.reset(); }   // new person on this device => new random ID
    DB.user.email = res.email;
    boxes.forEach(b=>{ b.classList.remove('otp-box-error'); b.classList.add('otp-box-success'); });
    const err=document.getElementById('otpError'); if(err){ err.style.display='none'; }
    const check = document.getElementById('otpInteractive');
    if(check) check.insertAdjacentHTML('afterbegin', `<p class="small semi" style="color:var(--verify); display:flex; align-items:center; gap:6px; margin-bottom:8px;">${IC.check(15)} OTP Verified</p>`);
    setTimeout(()=>navReplace('/verification-success'), 550);
  }).catch(err=>{
    setOtpLoading(false);
    if(err.code==='JOIN'){ showOtpError(err.msg || 'Could not join this institution. Go back and check the code.'); boxes.forEach(b=>{ b.value=''; }); boxes[0].focus(); }
    else if(err.code==='EXPIRED' || err.code==='NO_SESSION'){ showExpiredState(); }
    else if(err.code==='LOCKED'){ showLockedState(); }
    else{
      shakeOtpBoxes();
      showOtpError(err.attemptsLeft!=null ? `Incorrect verification code. ${err.attemptsLeft} attempt${err.attemptsLeft===1?'':'s'} left.` : 'Incorrect verification code.');
      boxes.forEach(b=>{ b.value=''; });
      boxes[0].focus();
    }
  });
}
function initVerificationSuccess(){
  SessionStore.setStep('verified');
  AnonId.ensure();            // verification finished -> this person gets their random anonymous ID
  clearTimeout(APP.vsTimer);
  APP.vsTimer = setTimeout(()=>{
    if(parseHash().path === '/verification-success') navReplace('/home');
  }, 1800);
}
