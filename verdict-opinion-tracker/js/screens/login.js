/* ============================= AUTH: LOGIN SCREEN LOGIC ============================= */
function initLoginScreen(){
  const input = document.getElementById('emailInput');
  const instInput = document.getElementById('instituteInput');
  if(!input) return;
  if(instInput && APP.instCode) instInput.value = APP.instCode;
  input.value = APP.emailDraft || '';
  hideLoginBanner();
  updateContinueGate();

  input.addEventListener('input', (e)=>{
    const email = e.target.value.trim();
    APP.emailDraft = email;
    if(APP.emailTouched) validateAndShowEmail(); else clearEmailError();
    hideLoginBanner();
    updateContinueGate();
  });
  input.addEventListener('blur', ()=>{
    APP.emailTouched = true;
    validateAndShowEmail();
  });

  if(instInput){
    instInput.addEventListener('input', ()=>{
      if(APP.instituteTouched) validateAndShowInstitute();
      hideLoginBanner();
      updateContinueGate();
    });
    instInput.addEventListener('blur', ()=>{
      APP.instituteTouched = true;
      instInput.value = instInput.value.trim();
      validateAndShowInstitute();
    });
  }
  input.focus();
}
function updateContinueGate(){
  const btn = document.getElementById('continueBtn'); if(!btn) return;
  const emailOk = AuthService.validateEmail(APP.emailDraft).valid;
  const instInput = document.getElementById('instituteInput');
  const instOk = instInput ? validateInstituteCode(instInput.value).valid : false;
  btn.disabled = !(emailOk && instOk);
}
function validateAndShowEmail(){
  const res = AuthService.validateEmail(APP.emailDraft);
  const err = document.getElementById('emailError'), input = document.getElementById('emailInput');
  if(!res.valid && APP.emailDraft){
    if(err){ err.textContent = res.reason; err.style.display='block'; }
    if(input) input.classList.add('error');
    return false;
  }
  clearEmailError();
  return res.valid;
}
function clearEmailError(){
  const err = document.getElementById('emailError'), input = document.getElementById('emailInput');
  if(err) err.style.display = 'none';
  if(input) input.classList.remove('error');
}
function validateAndShowInstitute(){
  const el = document.getElementById('instituteInput');
  const res = validateInstituteCode(el ? el.value : '');
  const err = document.getElementById('instituteError');
  if(!res.valid){
    if(err){ err.textContent = res.reason; err.style.display='block'; }
    el?.classList.add('error');
    return false;
  }
  if(err) err.style.display = 'none';
  el?.classList.remove('error');
  return true;
}
function showLoginBanner(msg){ const b=document.getElementById('loginBanner'), t=document.getElementById('loginBannerText'); if(b&&t){ t.textContent=msg; b.style.display='block'; } }
function hideLoginBanner(){ const b=document.getElementById('loginBanner'); if(b) b.style.display='none'; }
function shakeEl(id){ const el=document.getElementById(id); if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'), 460); }

async function handleContinue(){
  APP.emailTouched = true; APP.instituteTouched = true;
  const emailOk = validateAndShowEmail();
  const instOk = validateAndShowInstitute();
  if(!emailOk) shakeEl('emailFieldWrap');
  if(!instOk) shakeEl('instituteFieldWrap');
  if(!emailOk || !instOk) return;

  hideLoginBanner();
  setLoginLoading(true);
  try{
    const email = AuthService.validateEmail(APP.emailDraft).value;
    const code = validateInstituteCode(document.getElementById('instituteInput').value).value;

    const found = await Api.checkCode(code);
    APP.instCode = code;
    APP.instName = found.inst.name;

    const res = await AuthService.requestOtp(email);
    SessionStore.setStep('otp', email);
    APP.otpMeta = res;
    setLoginLoading(false);
    nav('/otp');
  }catch(err){
    setLoginLoading(false);
    if(err.code==='REJECTED' && !err.field){
      const ie = document.getElementById('instituteError');
      if(ie){ ie.textContent = err.message; ie.style.display='block'; }
      document.getElementById('instituteInput')?.classList.add('error');
      shakeEl('instituteFieldWrap');
    } else if(err.code==='INVALID_EMAIL'){
      const errEl=document.getElementById('emailError');
      if(errEl){ errEl.textContent=err.message; errEl.style.display='block'; }
      document.getElementById('emailInput')?.classList.add('error');
      shakeEl('emailFieldWrap');
    } else {
      showLoginBanner(err.message || 'Something went wrong. Please try again.');
      shakeEl('loginBanner');
    }
  }
}
function setLoginLoading(loading){
  const btn=document.getElementById('continueBtn'), input=document.getElementById('emailInput'), inst=document.getElementById('instituteInput');
  if(!btn) return;
  if(input) input.disabled = loading;
  if(inst) inst.disabled = loading;
  if(loading){ btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Sending code...`; }
  else{ updateContinueGate(); btn.innerHTML = 'Continue'; }
}
function changeNumber(){
  SessionStore.setStep('idle');
  clearOtpTimers();
  closeOtpPopdown(true);
  nav('/login');
}
