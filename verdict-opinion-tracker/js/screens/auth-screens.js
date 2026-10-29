/* ============================= USER SCREENS ============================= */
function screenWelcome(){
  return shell({ fab:false, top:'', body:`
    <div class="auth-content" style="padding-top:8px;">
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:22px;">
        <div class="brand-mark" style="width:64px; height:64px; border-radius:18px;">${stampSVG(30,'#fff')}</div>
        <div>
          <div class="eyebrow" style="margin-bottom:8px;">Opinion Tracking &amp; Prediction</div>
          <h1 style="font-size:30px; line-height:1.15;">Verified opinions,<br>counted honestly.</h1>
          <p class="muted" style="margin-top:12px; font-size:14.5px; line-height:1.5;">Register once, verify who you are, and respond to surveys run by your institution, workplace or society.</p>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn btn-primary" onclick="nav('/login')">Continue with email</button>
        <button class="btn btn-secondary" onclick="nav('/admin/login')">Sign in as administrator</button>
        <p class="tiny muted" style="text-align:center; margin-top:6px;">By continuing you agree that one verified identity may submit one response per survey.</p>
      </div>
    </div>` });
}
function screenLogin(){
  return shell({ fab:false, top:Header({back:true}), body:`
    <div class="auth-content" style="padding-top:0;">
      <div class="auth-hero">
        <div class="eyebrow">Step 1 of 2</div>
        <h1 style="font-size:24px; margin-top:8px;">What's your email address?</h1>
        <p class="muted small" style="margin-top:8px;">We'll send a one-time code to your email to verify it's really you.</p>
      </div>
      <div class="step-dots"><div class="step-dot now"></div><div class="step-dot"></div></div>
      <div class="card soft" id="loginBanner" style="display:none; margin-bottom:2px; border:1px solid var(--stamp-soft); background:var(--stamp-soft);">
        <div class="card-row">${IC.alert(18)}<p class="tiny" id="loginBannerText" style="color:var(--stamp); line-height:1.4;"></p></div>
      </div>
      <div class="field" id="emailFieldWrap">
        <label>Email address</label>
        <input class="input" id="emailInput" type="email" inputmode="email" placeholder="you@example.com" autocomplete="email">
        <p class="error-text" id="emailError" style="display:none;"></p>
      </div>
      <div class="field" id="instituteFieldWrap">
        <label>Institution or organisation code</label>
        <input class="input" id="instituteInput" placeholder="e.g. RIDGEVIEW26" autocapitalize="characters" autocomplete="off">
        <p class="helper">Given to you by your institution or organisation's administrator.</p>
        <p class="error-text" id="instituteError" style="display:none;"></p>
      </div>
      <div style="flex:1;"></div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn btn-primary" id="continueBtn" onclick="handleContinue()" disabled>Continue</button>
        <p class="tiny muted" style="text-align:center;">Trouble signing in? <span class="semi" style="color:var(--ink-900)">Contact your administrator</span></p>
      </div>
    </div>` });
}
function screenOtp(){
  const email = SessionStore.get().email || APP.emailDraft;
  return shell({ fab:false, top:Header({back:true}), body:`
    <div class="auth-content" style="padding-top:0;">
      <div class="auth-hero">
        <div class="eyebrow">Step 2 of 2</div>
        <h1 style="font-size:24px; margin-top:8px;">Enter the 6-digit code</h1>
        <p class="muted small" style="margin-top:8px;">Sent to <span class="semi" style="color:var(--ink-900);">${maskEmail(email)}</span>. Check your inbox for the code.</p>
      </div>
      <div class="step-dots"><div class="step-dot done"></div><div class="step-dot now"></div></div>
      <div id="otpInteractive">${otpInteractiveHtml()}</div>
      <div style="flex:1;"></div>
      <button class="btn btn-primary" id="verifyBtn" onclick="attemptVerify()" disabled>Verify code</button>
      <button class="tiny semi" style="background:none; border:none; padding:12px 0 0; color:var(--ink-700);" onclick="changeNumber()">Change email</button>
    </div>` });
}
function screenVerificationSuccess(){
  const email = SessionStore.get().email;
  return shell({ fab:false, top:'', body:`
    <div class="auth-content" style="justify-content:center;">
      <div class="stamp-wrap">
        <div class="stamp-ring">${stampSVG(44,'var(--verify)')}</div>
        <h1 style="font-size:23px; margin-top:20px;">Verification complete</h1>
        <p class="muted small" style="margin-top:8px; max-width:280px;">Your identity has been confirmed${email?' for '+maskEmail(email):''}. You're ready to explore Verdict.</p>
        <div class="card soft" style="margin-top:20px; text-align:left; width:100%;">
          <div style="display:flex; justify-content:space-between; align-items:center;"><span class="small semi">Email verification</span><span class="pill verified">${IC.check(12)} Complete</span></div>
        </div>
        <div class="card soft" style="margin-top:10px; text-align:left; width:100%;">
          <p class="tiny muted">Your anonymous voter ID</p>
          <p class="small semi" style="letter-spacing:.06em; margin-top:2px;">${AnonId.short(AnonId.ensure())}</p>
          <p class="tiny muted" style="margin-top:4px; line-height:1.45;">Your vote is saved against this random ID — not your name or number — so nobody can tell who voted for whom.</p>
        </div>
      </div>
      <div style="flex:1;"></div>
      <button class="btn btn-primary" onclick="clearTimeout(APP.vsTimer); navReplace('/home')">Continue to Home</button>
    </div>` });
}
