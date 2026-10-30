/**
 * StreamMax auth API — Node + Express + MongoDB (Atlas).
 * Replaces the Base44 backend function; same action-based JSON contract.
 *
 * POST / with { action, ... }:
 *   precheck      { fullName, email, password, confirm }  -> { ok, field?, message? }
 *   register      { fullName, email, password, confirm }  -> { ok, user?, field?, message? }
 *   login         { email, password }                     -> { ok, user?, field?, message? }
 *   sendCode      { email, type }                          -> { ok, message? }   (Brevo email)
 *   verifyCode    { email, type, code }                    -> { ok, message? }
 *   googleVerify  { idToken }                              -> { ok, email, name, user? }
 *   googleSession { email }                                -> { ok, user? }      (after google code)
 *   completeReset { email, password, confirm }             -> { ok, field?, message? }
 *   emailExists   { email }                                -> { ok, exists }
 *   migrate       { accounts: [{fullName,email,salt,hash}] }-> { ok, imported }    (device-local legacy import)
 * GET / -> { ok: true } (health check)
 *
 * Passwords: scrypt per-user salt. Legacy device-local accounts (sha256 salt:pw)
 * are imported as-is and upgraded to scrypt on their first successful login.
 * Codes: 6 digits, 10-minute expiry, 5 attempts, max 5 per email per hour.
 */
const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const EMAIL_FROM = (() => { const raw = String(process.env.EMAIL_FROM || ''); const m = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/); return m ? m[0] : 'ijeziegoodluck4@gmail.com'; })();
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '463127766110-cugua4mmvf9mrj2mgpdp05iat3f8vr07.apps.googleusercontent.com';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;
const TYPES = ['signup', 'login', 'reset', 'google'];

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'content-type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

let db = null;
async function getDb() {
  if (!db) {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    db = client.db('streammax');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('codes').createIndex({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
    await db.collection('ipAttempts').createIndex({ ts: 1 }, { expireAfterSeconds: 60 * 60 }); // IP attempt log self-cleans
    await db.collection('ipAttempts').createIndex({ ip: 1, ts: -1 });
  }
  return db;
}

/* ---------- helpers ---------- */

const emailOk = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function scryptHash(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString('hex');
}
function legacyHash(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}
function verifyPassword(password, user) {
  if (user.pwLegacy) return legacyHash(password, user.salt) === user.hash; // sha256 salt:pw (device-local era)
  const check = scryptHash(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(user.hash));
}
async function upgradeToScrypt(email, user, password) {
  if (!user.pwLegacy) return;
  const salt = crypto.randomBytes(16).toString('hex');
  await getDb().collection('users').updateOne({ email }, { $set: { salt, hash: scryptHash(password, salt), pwLegacy: false } });
}

const pubUser = (u) => ({ id: String(u._id), fullName: u.fullName, email: u.email });

function sixDigits() {
  return String(100000 + crypto.randomInt(900000));
}

/* ---------- email (Brevo) ---------- */

const COPY = {
  signup: { subject: 'Your StreamMax verification code', title: 'Verify your account', intro: 'Enter this code in StreamMax to finish creating your account.' },
  login: { subject: 'Your StreamMax login code', title: 'Confirm your sign-in', intro: 'Use this code to finish signing in to StreamMax.' },
  reset: { subject: 'Your StreamMax password reset code', title: 'Reset your password', intro: 'Enter this code in StreamMax to reset your password.' },
  google: { subject: 'Your StreamMax Google sign-in code', title: 'Confirm your Google sign-in', intro: 'Use this code to finish signing in with Google.' },
};

function mailHtml(code, type) {
  const c = COPY[type] || COPY.login;
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#0c0d11;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0d11;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#171a22;border-radius:14px;padding:32px 28px;">
        <tr><td align="center" style="padding-bottom:8px;">
          <span style="font-size:20px;font-weight:bold;color:#ffffff;">Stream<span style="color:#8b7bff;">Max</span></span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:6px;">
          <span style="font-size:18px;font-weight:bold;color:#ffffff;">${c.title}</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:20px;">
          <span style="font-size:14px;color:#a0a3b1;line-height:1.6;">${c.intro}</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:20px;">
          <span style="display:inline-block;background:#6C63FF;color:#ffffff;font-size:30px;font-weight:bold;letter-spacing:8px;padding:14px 22px 14px 30px;border-radius:10px;">${code}</span>
        </td></tr>
        <tr><td align="center">
          <span style="font-size:12px;color:#8a8ea3;">This code expires in 10 minutes.<br/>If you didn't request it, you can safely ignore this email.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendMail(to, code, type) {
  const c = COPY[type] || COPY.login;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'StreamMax', email: EMAIL_FROM },
      to: [{ email: to }],
      subject: c.subject,
      htmlContent: mailHtml(code, type),
      textContent: `${c.intro} Your code: ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!res.ok) throw new Error(`brevo ${res.status}`);
}

/* ---------- security alert: new login ---------- */

const DEVICE_MAX = 60;
const cleanDevice = (raw) => String(raw || '')
  .replace(/[<>\\"'&]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, DEVICE_MAX) || 'Unknown device';

function watTime(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos', weekday: 'short', year: 'numeric', month: 'short',
      day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(d) + ' WAT';
  } catch { return d.toUTCString(); }
}

function shortDevice(raw) {
  let d = cleanDevice(raw);
  if (/^streammax on /i.test(d)) d = d.slice('streammax on '.length);
  return d ? `${d} \u00b7 StreamMax app` : 'StreamMax app';
}

function alertHtml(first, emailAddr, device, location, when) {
  const row = (label, value) => `
        <tr><td align="left" style="padding:12px 18px;background:#0f1117;border:1px solid #22273a;border-radius:10px;">
          <span style="font-size:10px;color:#7d8296;text-transform:uppercase;letter-spacing:1.5px;">${label}</span><br/>
          <span style="font-size:14px;color:#ffffff;font-weight:bold;">${value}</span>
        </td></tr>`;
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#0c0d11;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0d11;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#171a22;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr height="4" style="height:4px;font-size:0;line-height:0;">
              <td width="34%" style="background:#6C63FF;"></td>
              <td width="33%" style="background:#3A7BFF;"></td>
              <td width="33%" style="background:#00D2FF;"></td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:32px 28px 0;">
          <span style="font-size:20px;font-weight:bold;color:#ffffff;">Stream<span style="color:#8b7bff;">Max</span></span>
        </td></tr>
        <tr><td align="center" style="padding:16px 0 0;">
          <span style="display:inline-block;width:44px;height:44px;line-height:44px;background:#6C63FF;color:#ffffff;font-size:20px;font-weight:bold;border-radius:22px;text-align:center;">!</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:6px;">
          <span style="font-size:18px;font-weight:bold;color:#ffffff;">New sign-in detected</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:20px;">
          <span style="font-size:14px;color:#a0a3b1;line-height:1.6;">Hi ${first}, your account was just signed in to from a new session.<br/>If this was you, no action is needed.</span>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-spacing:0 8px;">
            ${row('Signed-in account', emailAddr)}
            ${row('Device', device)}
            ${row('Location', location)}
            ${row('Date &amp; time', when)}
          </table>
        </td></tr>
        <tr><td align="center" style="padding-bottom:18px;">
          <a href="streammax://home" style="display:inline-block;background:linear-gradient(90deg,#6C63FF,#00D2FF);background-color:#6C63FF;color:#ffffff;font-size:14px;font-weight:bold;padding:13px 36px;border-radius:10px;text-decoration:none;">Secure my account</a>
        </td></tr>
        <tr><td align="center" style="padding:0 8px 28px;">
          <span style="font-size:12px;color:#8a8ea3;line-height:1.7;">If this wasn't you, open StreamMax and change your password immediately, then secure the email account linked to it.<br/>You received this alert because your email and password were verified successfully.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function ipLocation(ip) {
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    if (j && j.success && j.city && j.country) return `${j.city}, ${j.country}`;
    if (j && j.success && j.country) return j.country;
    return 'Unavailable';
  } catch { return 'Unavailable'; }
}

async function sendLoginAlert(to, name, device, ip) {
  const first = cleanName(name).split(' ')[0] || 'there';
  const when = watTime();
  const dev = shortDevice(device);
  const location = await ipLocation(String(ip || ''));
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'StreamMax', email: EMAIL_FROM },
      to: [{ email: to }],
      subject: 'New sign-in to your StreamMax account',
      htmlContent: alertHtml(first, to, dev, location, when),
      textContent: `New sign-in to your StreamMax account (${to}) from ${dev} in ${location} on ${when}. If this wasn't you, change your password immediately.`,
    }),
  });
  if (!res.ok) throw new Error(`brevo ${res.status}`);
}

/* ---------- welcome email (new users) ---------- */

const cleanName = (raw) => String(raw || '')
  .replace(/[<>\\"'&]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 40);

function welcomeHtml(name, emailAddr) {
  const first = (cleanName(name).split(' ')[0]) || 'there';
  const li = (txt) => `
        <tr><td align="left" style="padding:7px 0;">
          <span style="font-size:14px;color:#c6c9d4;line-height:1.6;"><span style="color:#8b7bff;">&#9679;</span>&nbsp; ${txt}</span>
        </td></tr>`;
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#0c0d11;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0d11;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#171a22;border-radius:14px;padding:32px 28px;">
        <tr><td align="center" style="padding-bottom:8px;">
          <span style="font-size:20px;font-weight:bold;color:#ffffff;">Stream<span style="color:#8b7bff;">Max</span></span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:6px;">
          <span style="font-size:18px;font-weight:bold;color:#ffffff;">Welcome to StreamMax, ${first}</span>
        </td></tr>
        <tr><td align="center" style="padding-bottom:22px;">
          <span style="font-size:14px;color:#a0a3b1;line-height:1.6;">Your account is ready. Thousands of movies and shows are waiting for you — your movies, your way.</span>
        </td></tr>
        <tr><td style="padding-bottom:10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${li('Stream movies and TV shows in a premium cinema-grade player')}
            ${li('Save what you love and pick up where you left off')}
            ${li('Your account and watchlist, secured and private')}
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:6px;">
          <a href="streammax://home" style="display:inline-block;background:linear-gradient(90deg,#6C63FF,#00D2FF);color:#ffffff;font-size:14px;font-weight:bold;padding:12px 34px;border-radius:10px;text-decoration:none;">Start Watching</a>
        </td></tr>
        <tr><td align="center" style="padding-top:18px;">
          <span style="font-size:12px;color:#8a8ea3;line-height:1.6;">Account created with ${emailAddr}<br/>If you didn't create this account, you can safely ignore this email.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendWelcome(to, name) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'StreamMax', email: EMAIL_FROM },
      to: [{ email: to }],
      subject: 'Welcome to StreamMax',
      htmlContent: welcomeHtml(name, to),
      textContent: `Welcome to StreamMax! Your account (${to}) is ready. If you didn't create this account, you can safely ignore this email.`,
    }),
  });
  if (!res.ok) throw new Error(`brevo ${res.status}`);
}

/* ---------- shared validation ---------- */

function validateRegistration(fullName, email, password, confirm) {
  if (!fullName) return { ok: false, field: 'name', message: 'Please enter your full name' };
  if (!emailOk(email)) return { ok: false, field: 'email', message: 'Enter a valid email address' };
  if (String(password).length < 6) return { ok: false, field: 'password', message: 'Password must be at least 6 characters' };
  if (password !== confirm) return { ok: false, field: 'confirm', message: 'Passwords do not match' };
  return { ok: true };
}

/* ---------- brute-force protection ----------
   Two layers working together:
   1. ACCOUNT LOCKOUT — consecutive failed passwords on one account lock it,
      progressively: 5 fails -> 15 min -> 1 h -> 24 h. A successful sign-in
      clears the counter and the escalation level.
   2. IP RATE LIMITING — failed auth attempts are logged per client IP and
      capped inside a rolling window, which stops spraying many accounts
      from one network. Code requests are capped per IP per hour too. */

const LOCK_THRESHOLD = 5;
const LOCK_TIERS_MIN = [15, 60, 1440];
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_FAILS = 20;      // failed auth attempts per IP per 15 min
const IP_MAX_CODE_REQ = 20;   // code requests per IP per hour

async function ipFailureCount(d, ip, windowMs, kind) {
  if (!ip) return 0;
  const q = { ip, ts: { $gt: new Date(Date.now() - windowMs) } };
  if (kind) q.kind = kind;
  return d.collection('ipAttempts').countDocuments(q);
}

async function ipGate(d, ip) {
  const fails = await ipFailureCount(d, ip, IP_WINDOW_MS);
  if (fails >= IP_MAX_FAILS) {
    return { blocked: true, minutes: Math.ceil(IP_WINDOW_MS / 60000) };
  }
  return { blocked: false };
}

async function noteIpFailure(d, ip, kind) {
  if (!ip) return;
  await d.collection('ipAttempts').insertOne({ ip, kind, ts: new Date() });
}

/** Lock an account after too many consecutive failed passwords. */
async function noteAccountFailure(d, user, ip) {
  await noteIpFailure(d, ip, 'login');
  const failed = (user.failedLogins || 0) + 1;
  if (failed >= LOCK_THRESHOLD) {
    const level = Math.min(user.lockLevel || 0, LOCK_TIERS_MIN.length - 1);
    const minutes = LOCK_TIERS_MIN[level];
    await d.collection('users').updateOne({ email: user.email }, {
      $set: {
        failedLogins: 0,
        lockLevel: level + 1,
        lockUntil: new Date(Date.now() + minutes * 60000),
        lastFailedAt: new Date(),
      },
    });
    return { locked: true, minutes };
  }
  await d.collection('users').updateOne({ email: user.email }, {
    $set: { failedLogins: failed, lastFailedAt: new Date() },
  });
  return { locked: false, remaining: LOCK_THRESHOLD - failed };
}

/** Clear the lockout counters after a successful sign-in. */
async function clearAccountFailures(d, email) {
  await d.collection('users').updateOne(
    { email },
    { $set: { failedLogins: 0, lockLevel: 0 }, $unset: { lockUntil: '' } },
  );
}

async function findUser(email) {
  const d = await getDb();
  return d.collection('users').findOne({ email });
}

/* ---------- API ---------- */

app.get('/', (req, res) => res.json({ ok: true, service: 'streammax-auth' }));

app.post('/', async (req, res) => {
  const body = req.body || {};
  // Render's proxy appends the real client address to X-Forwarded-For, so the
  // LAST entry is the trustworthy one (a client can spoof the leftmost).
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(v => v.trim()).filter(Boolean);
  const clientIp = xff.length ? xff[xff.length - 1] : String(req.socket && req.socket.remoteAddress || '');
  const action = String(body.action || '');
  const email = String(body.email || '').trim().toLowerCase();

  try {
    const d = await getDb();

    /* --- Google ID token sign-in (no emailed code) --- */
    if (action === 'googleVerify') {
      const idToken = String(body.idToken || '').trim();
      if (!idToken) return res.status(400).json({ ok: false, message: 'Missing Google token' });
      let info;
      try {
        const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
        info = await r.json();
      } catch {
        return res.status(502).json({ ok: false, message: 'Could not reach Google right now. Try again.' });
      }
      if (!info || !info.email || info.aud !== GOOGLE_WEB_CLIENT_ID) {
        return res.status(401).json({ ok: false, message: 'Google could not verify that sign-in. Try again.' });
      }
      const gEmail = String(info.email).toLowerCase();
      const gName = String(info.name || '');
      let user = await findUser(gEmail);
      const wasReturning = !!user;
      if (!user) {
        const salt = crypto.randomBytes(16).toString('hex');
        const inserted = await d.collection('users').insertOne({
          fullName: (gName || gEmail.split('@')[0]).trim(),
          email: gEmail, salt, hash: scryptHash(crypto.randomBytes(12).toString('hex'), salt),
          pwLegacy: false, google: true, createdAt: new Date(),
        });
        user = await findUser(gEmail);
      } else if (gName && (!user.google || user.fullName === gEmail.split('@')[0])) {
        await d.collection('users').updateOne({ email: gEmail }, { $set: { fullName: gName, google: true } });
        user = await findUser(gEmail);
      }
      if (wasReturning) {
        sendLoginAlert(gEmail, user ? user.fullName : gName, body.device, clientIp).catch(() => {});
      } else {
        sendWelcome(gEmail, (user && user.fullName) || gName).catch(() => {});
      }
      return res.json({ ok: true, email: gEmail, name: gName, user: pubUser(user || { fullName: gName, email: gEmail }) });
    }

    /* --- open session after a verified Google EMAIL code (fallback path) --- */
    if (action === 'googleSession') {
      if (!emailOk(email)) return res.status(400).json({ ok: false, field: 'email', message: 'Enter a valid email address' });
      let user = await findUser(email);
      const wasReturning = !!user;
      if (!user) {
        const salt = crypto.randomBytes(16).toString('hex');
        await d.collection('users').insertOne({
          fullName: email.split('@')[0], email, salt,
          hash: scryptHash(crypto.randomBytes(12).toString('hex'), salt),
          pwLegacy: false, google: true, createdAt: new Date(),
        });
        user = await findUser(email);
      }
      if (wasReturning) {
        sendLoginAlert(email, user ? user.fullName : '', body.device, clientIp).catch(() => {});
      } else {
        sendWelcome(email, user ? user.fullName : '').catch(() => {});
      }
      return res.json({ ok: true, user: pubUser(user) });
    }

    if (!emailOk(email) && action !== 'precheck' && action !== 'register' && action !== 'migrate') {
      return res.status(400).json({ ok: false, message: 'Enter a valid email address' });
    }

    /* --- registration precheck (before emailing the signup code) --- */
    if (action === 'precheck') {
      const v = validateRegistration(String(body.fullName || '').trim(), String(body.email || '').trim().toLowerCase(), body.password, body.confirm);
      if (!v.ok) return res.json(v);
      if (await findUser(String(body.email).trim().toLowerCase())) {
        return res.json({ ok: false, field: 'email', message: 'An account with this email already exists' });
      }
      return res.json({ ok: true });
    }

    /* --- create the account (after the signup code was verified) --- */
    if (action === 'register') {
      const e = String(body.email || '').trim().toLowerCase();
      const v = validateRegistration(String(body.fullName || '').trim(), e, body.password, body.confirm);
      if (!v.ok) return res.json(v);
      if (await findUser(e)) return res.json({ ok: false, field: 'email', message: 'An account with this email already exists' });
      const salt = crypto.randomBytes(16).toString('hex');
      const r = await d.collection('users').insertOne({
        fullName: String(body.fullName).trim(), email: e, salt,
        hash: scryptHash(body.password, salt), pwLegacy: false, createdAt: new Date(),
      });
      const user = await findUser(e);
      sendWelcome(e, user ? user.fullName : String(body.fullName || '').trim()).catch(() => {});
      return res.json({ ok: true, user: pubUser(user) });
    }

    /* --- check credentials / complete a login after the code --- */
    if (action === 'whoami') {
      const d0 = await getDb();
      return res.json({
        xffRaw: req.headers['x-forwarded-for'] || null,
        resolved: clientIp,
        recent: await d0.collection('ipAttempts').countDocuments({ ip: clientIp, ts: { $gt: new Date(Date.now() - 3600000) } }),
        total: await d0.collection('ipAttempts').countDocuments({}),
        ips: (await d0.collection('ipAttempts').find({}).sort({ ts: -1 }).limit(6).toArray()).map(a => a.ip + '|' + a.kind),
      });
    }

    if (action === 'login') {
      if (!emailOk(email)) return res.json({ ok: false, field: 'email', message: 'Enter a valid email address' });

      // layer 2: IP rate limit
      const gate = await ipGate(d, clientIp);
      if (gate.blocked) {
        return res.status(429).json({
          ok: false,
          message: `Too many attempts from this network. Try again in ${gate.minutes} minutes.`,
        });
      }

      const user = await findUser(email);
      if (!user) {
        await noteIpFailure(d, clientIp, 'login');
        return res.json({ ok: false, field: 'email', message: 'No account found with this email' });
      }

      // layer 1: account lockout
      if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
        const mins = Math.max(1, Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000));
        return res.status(423).json({
          ok: false,
          message: `Too many failed attempts. This account is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`,
        });
      }

      if (!verifyPassword(String(body.password || ''), user)) {
        const res2 = await noteAccountFailure(d, user, clientIp);
        if (res2.locked) {
          return res.status(423).json({
            ok: false,
            message: `Too many failed attempts. This account is locked for ${res2.minutes} minutes.`,
          });
        }
        const left = res2.remaining;
        return res.json({
          ok: false,
          field: 'password',
          message: `Incorrect password.${left <= 2 ? ` ${left} attempt${left === 1 ? '' : 's'} left before the account is locked.` : ''}`,
        });
      }

      await clearAccountFailures(d, email);
      await upgradeToScrypt(email, user, String(body.password));
      const fresh = await findUser(email);
      return res.json({ ok: true, user: pubUser(fresh) });
    }

    /* --- codes: send / verify (same semantics as the old backend) --- */
    const type = String(body.type || '');
    if (action === 'sendCode' || action === 'verifyCode') {
      if (!TYPES.includes(type)) return res.status(400).json({ ok: false, message: 'Unknown code type' });
      const now = Date.now();

      // IP rate limiting on the code endpoints as well
      if (action === 'verifyCode') {
        const gate = await ipGate(d, clientIp);
        if (gate.blocked) {
          return res.status(429).json({ ok: false, message: `Too many attempts from this network. Try again in ${gate.minutes} minutes.` });
        }
      } else {
        const reqs = await ipFailureCount(d, clientIp, 60 * 60 * 1000, 'sendCode');
        if (reqs >= IP_MAX_CODE_REQ) {
          return res.status(429).json({ ok: false, message: 'Too many codes requested from this network. Try again later.' });
        }
        await noteIpFailure(d, clientIp, 'sendCode');
      }

      if (action === 'sendCode') {
        // rate limit: max MAX_PER_HOUR live codes per email+type per hour
        const hourAgo = new Date(now - 60 * 60 * 1000);
        const inHour = await d.collection('codes').countDocuments({ email, type, used: false, createdAt: { $gt: hourAgo } });
        if (inHour >= MAX_PER_HOUR) {
          return res.status(429).json({ ok: false, message: 'Too many codes requested. Try again in a while.' });
        }
        const digits = sixDigits();
        await d.collection('codes').insertOne({ email, type, code: digits, expiresAt: new Date(now + CODE_TTL_MS), attempts: 0, used: false, createdAt: new Date() });
        try {
          await sendMail(email, digits, type);
        } catch (e) {
          await d.collection('codes').deleteOne({ email, type, code: digits, used: false });
          return res.status(502).json({ ok: false, message: 'Could not send the email right now. Try again.' });
        }
        return res.json({ ok: true, message: 'Code sent to your email' });
      }

      // verifyCode
      const rec = await d.collection('codes')
        .find({ email, type, used: false, expiresAt: { $gt: new Date() } })
        .sort({ createdAt: -1 })
        .limit(1)
        .next();
      if (!rec) return res.status(400).json({ ok: false, message: 'This code has expired. Request a new one.' });

      if (rec.code === String(body.code || '').trim()) {
        await d.collection('codes').updateOne({ _id: rec._id }, { $set: { used: true } });
        if (type === 'login') {
          const u = await findUser(email);
          sendLoginAlert(email, u ? u.fullName : '', body.device, clientIp).catch(() => {}); // fire-and-forget: login still succeeds if the alert email fails
        }
        return res.json({ ok: true });
      }
      const attempts = (rec.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await d.collection('codes').updateOne({ _id: rec._id }, { $set: { used: true } });
        return res.status(400).json({ ok: false, message: 'Too many wrong attempts. Request a new code.' });
      }
      await d.collection('codes').updateOne({ _id: rec._id }, { $set: { attempts } });
      await noteIpFailure(d, clientIp, 'verifyCode');
      return res.status(400).json({ ok: false, message: 'Incorrect code. Please try again.' });
    }

    /* --- set a new password after the reset code was verified --- */
    if (action === 'completeReset') {
      if (!emailOk(email)) return res.json({ ok: false, field: 'email', message: 'Enter a valid email address' });
      const user = await findUser(email);
      if (!user) return res.json({ ok: false, field: 'email', message: 'No account found with this email' });
      const pw = String(body.password || '');
      if (pw.length < 6) return res.json({ ok: false, field: 'password', message: 'Password must be at least 6 characters' });
      if (pw !== body.confirm) return res.json({ ok: false, field: 'confirm', message: 'Passwords do not match' });
      const salt = crypto.randomBytes(16).toString('hex');
      await d.collection('users').updateOne({ email }, { $set: { salt, hash: scryptHash(pw, salt), pwLegacy: false } });
      return res.json({ ok: true });
    }

    /* --- does an account exist? (forgot-password hint) --- */
    if (action === 'emailExists') {
      return res.json({ ok: true, exists: !!(await findUser(email)) });
    }

    /* --- one-time import of device-local legacy accounts --- */
    if (action === 'migrate') {
      const accounts = Array.isArray(body.accounts) ? body.accounts : [];
      let imported = 0;
      for (const a of accounts) {
        const e = String(a.email || '').trim().toLowerCase();
        if (!emailOk(e) || !a.salt || !a.hash) continue;
        if (await findUser(e)) continue;
        await d.collection('users').insertOne({
          fullName: String(a.fullName || e.split('@')[0]).trim(), email: e,
          salt: a.salt, hash: a.hash, pwLegacy: true, createdAt: new Date(),
        });
        imported += 1;
      }
      return res.json({ ok: true, imported });
    }

    return res.status(400).json({ ok: false, message: 'Unknown action' });
  } catch (err) {
    console.error('api error', action, err && err.message);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`streammax auth api on :${PORT}`));
