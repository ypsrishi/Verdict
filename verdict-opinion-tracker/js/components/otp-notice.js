/* ============================= TOP POP-DOWN EMAIL OTP NOTICE ============================= */
let otpPopdownTimer = null;
function showOtpPopdown(email){
  closeOtpPopdown(true);
  const shellEl = document.getElementById('shell');
  if(!shellEl) return;
  const el = document.createElement('div');
  el.className = 'otp-popdown'; el.id = 'otpPopdown';
  el.innerHTML = `<div class="otp-popdown-icon">${IC.check(16)}</div>
    <div style="flex:1; min-width:0;">
      <p class="small semi" style="color:#fff;">Verification code sent</p>
      <p class="tiny" style="color:#B9C2D8; margin-top:4px;">Check ${maskEmail(email)} for your 6-digit code.</p>
    </div>
    <button class="icon-btn" style="background:rgba(255,255,255,.14); border:none; color:#fff;" onclick="closeOtpPopdown()">${IC.x(14)}</button>`;
  shellEl.appendChild(el);
  clearTimeout(otpPopdownTimer);
  otpPopdownTimer = setTimeout(()=>closeOtpPopdown(), 7000);
}
function closeOtpPopdown(instant){
  const el = document.getElementById('otpPopdown'); if(!el) return;
  clearTimeout(otpPopdownTimer);
  if(instant){ el.remove(); return; }
  el.classList.add('leaving');
  setTimeout(()=>el.remove(), 260);
}
