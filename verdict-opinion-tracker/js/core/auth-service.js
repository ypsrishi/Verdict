/* ============================= AUTH: EMAIL OTP SERVICE ============================= */
const AuthService = (() => {
  const OTP_LENGTH = 6;
  const API_URL = '/api/auth';

  async function call(action, payload = {}) {
    let r;
    try {
      r = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'same-origin',
        body: JSON.stringify(Object.assign({action}, payload))
      });
    } catch (_) {
      throw {code:'NETWORK', message:'Cannot reach the email authentication server.'};
    }
    let j;
    try { j = await r.json(); }
    catch (_) { throw {code:'NETWORK', message:'The authentication server did not return a valid response.'}; }
    if (!j.ok) {
      throw {
        code: j.code || (r.status === 429 ? 'RATE_LIMIT' : 'REJECTED'),
        message: j.error || 'Email verification failed.',
        attemptsLeft: j.attemptsLeft,
        retryAfter: j.retryAfter
      };
    }
    return j;
  }

  function validateEmail(email) {
    email = String(email || '').trim();
    if (!email) return {valid:false, reason:'Enter your email address'};
    if (email.length > 190) return {valid:false, reason:'Email address is too long'};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {valid:false, reason:'Enter a valid email address'};
    }
    return {valid:true, value:email.toLowerCase()};
  }

  function requestOtp(email) {
    const v = validateEmail(email);
    if (!v.valid) return Promise.reject({code:'INVALID_EMAIL', message:v.reason});
    return call('request_otp', {email:v.value});
  }

  function resendOtp() {
    return call('resend_otp');
  }

  function verifyOtp(code) {
    return call('verify_otp', {code});
  }

  return {validateEmail, requestOtp, resendOtp, verifyOtp, OTP_LENGTH};
})();
