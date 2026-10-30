/**
 * StreamMax authentication service — backed by the StreamMax MongoDB API
 * (Node + MongoDB Atlas, hosted on Render). The interface is unchanged from
 * the device-local era, so no screen code had to change: the same functions
 * with the same signatures now talk to the server.
 *
 * Accounts and codes live in MongoDB; sessions stay on-device (AsyncStorage)
 * with the signed-in user embedded, so resume/getCurrentUser work offline.
 * On first launch the old device-local accounts (if any) are imported into
 * MongoDB once via the `migrate` action.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/* StreamMax backend — domain-swappable: this is the ONLY place the URL lives.
   Render free tier; flip to the .com infrastructure when the domain is bought. */
const API_BASE = 'https://streammax-api.onrender.com';

/** Human-readable device label sent with sign-ins (shown in login-alert emails). */
function deviceDescription(): string {
  return Platform.OS === 'android'
    ? `StreamMax on Android${typeof Platform.Version === 'number' ? ' (API ' + Platform.Version + ')' : ''}`
    : Platform.OS === 'ios'
      ? `StreamMax on iOS${typeof Platform.Version === 'number' ? ' ' + Platform.Version : ''}`
      : `StreamMax on ${Platform.OS || 'web'}`;
}

export type CodeType = 'signup' | 'login' | 'reset' | 'google';
export interface CodeResult { ok: boolean; message?: string; }
export interface AuthUser { id: string; fullName: string; email: string; }
export type Field = 'name' | 'email' | 'password' | 'confirm' | 'code';
export interface AuthResult { ok: boolean; field?: Field; message?: string; user?: AuthUser; }

interface Session { user: AuthUser; token: string; remember: boolean; }

const SESSION_KEY = 'sm.session';
const LEGACY_ACCOUNTS_KEY = 'sm.accounts';

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const randomHex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');

/** One JSON call to the auth API. */
async function callAuth(payload: Record<string, unknown>): Promise<AuthResult & { exists?: boolean }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${API_BASE}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return (await res.json().catch(() => ({}))) as AuthResult;
  } catch {
    return { ok: false, message: 'Could not reach the StreamMax service. Check your connection and try again.' };
  }
}

/* ---------- sessions (device-side, with the user embedded) ---------- */

let memorySession: Session | null = null;

async function openSession(user: AuthUser, remember: boolean) {
  memorySession = { user, token: randomHex(24), remember };
  if (remember) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(memorySession));
  else await AsyncStorage.removeItem(SESSION_KEY);
}

/** Restore a remembered session at launch. Returns the user, or null. */
export async function resumeSession(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    if (!s || !s.user || !s.user.email) { await AsyncStorage.removeItem(SESSION_KEY); return null; }
    memorySession = s;
    return s.user;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/** The currently signed-in user, if any (memory or restored session). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!memorySession) {
    const restored = await resumeSession();
    if (!restored) return null;
  }
  return memorySession!.user;
}

export async function logout() {
  memorySession = null;
  await AsyncStorage.removeItem(SESSION_KEY);
}

/* ---------- registration ---------- */

/** Validate registration input without creating the account (used before emailing the signup code). */
export async function precheckRegister(input: {
  fullName: string; email: string; password: string; confirm: string;
}): Promise<AuthResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, field: 'name', message: 'Please enter your full name' };
  if (!emailOk(email)) return { ok: false, field: 'email', message: 'Enter a valid email address' };
  if (input.password.length < 6) return { ok: false, field: 'password', message: 'Password must be at least 6 characters' };
  if (input.password !== input.confirm) return { ok: false, field: 'confirm', message: 'Passwords do not match' };
  const r = await callAuth({ action: 'precheck', fullName, email, password: input.password, confirm: input.confirm });
  if (!r.ok && !r.message) return { ok: false, field: 'email', message: 'An account with this email already exists' };
  return r;
}

/** Create the account (after the signup code was verified), log it in, remember it. */
export async function register(input: {
  fullName: string; email: string; password: string; confirm: string;
}): Promise<AuthResult> {
  const r = await callAuth({
    action: 'register',
    fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(),
    password: input.password, confirm: input.confirm,
  });
  if (!r.ok) return r;
  if (!r.user) return { ok: false, message: 'Could not create your account' };
  await openSession(r.user, true);
  return { ok: true, user: r.user };
}

/* ---------- login ---------- */

/** Check credentials without opening a session (password step of the two-step login). */
export async function checkPassword(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (!emailOk(e)) return { ok: false, field: 'email', message: 'Enter a valid email address' };
  return callAuth({ action: 'login', email: e, password });
}

/** Validate credentials and open a session (persisted only if remember). */
export async function login(input: { email: string; password: string; remember: boolean }): Promise<AuthResult> {
  const r = await checkPassword(input.email, input.password);
  if (!r.ok) return r;
  if (!r.user) return { ok: false, message: 'Could not sign you in' };
  await openSession(r.user, input.remember);
  return { ok: true, user: r.user };
}

/* ---------- email codes ---------- */

/** Send a real 6-digit code to the user's inbox (10 min expiry, 5 attempts, rate-limited). */
export async function requestCode(email: string, type: CodeType): Promise<CodeResult> {
  const e = email.trim().toLowerCase();
  if (!emailOk(e)) return { ok: false, message: 'Enter a valid email address' };
  const r = await callAuth({ action: 'sendCode', email: e, type });
  return { ok: !!r.ok, message: r.message };
}

/** Check a code the user typed against the backend. */
export async function checkCode(email: string, type: CodeType, code: string): Promise<CodeResult> {
  const e = email.trim().toLowerCase();
  const payload: Record<string, unknown> = { action: 'verifyCode', email: e, type, code: code.trim() };
  if (type === 'login') payload.device = deviceDescription(); // backend emails a new-login alert
  const r = await callAuth(payload);
  return { ok: !!r.ok, message: r.message };
}

/* ---------- Google ---------- */

/**
 * Google direct sign-in (MarketScope AI pattern): the backend verifies the
 * Google ID token with Google itself and returns the confirmed profile;
 * the account is created server-side keyed to that email, and we open the
 * session. No emailed code is involved.
 */
export async function googleTokenLogin(
  idToken: string,
  extra?: { googleId?: string; photo?: string },
): Promise<AuthResult> {
  const r = await callAuth({
    action: 'googleVerify',
    idToken,
    device: deviceDescription(),
    googleId: extra?.googleId || undefined,
    photo: extra?.photo || undefined,
  });
  if (!r.ok) return { ok: false, message: r.message || 'Google could not verify that sign-in. Try again.' };
  if (!r.user) return { ok: false, message: 'Could not sign you in' };
  await openSession(r.user, true);
  return { ok: true, user: r.user };
}

/** Finish a Google email-code sign-in: open the account keyed to the verified email. */
export async function googleVerified(email: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (!emailOk(e)) return { ok: false, field: 'email', message: 'Enter a valid email address' };
  const r = await callAuth({ action: 'googleSession', email: e });
  if (!r.ok) return { ok: false, message: r.message || 'Could not sign you in' };
  if (!r.user) return { ok: false, message: 'Could not sign you in' };
  await openSession(r.user, true);
  return { ok: true, user: r.user };
}

/* ---------- password reset ---------- */

/** Set a new password after the emailed reset code was verified on the Enter Code screen. */
export async function completeReset(input: { email: string; password: string; confirm: string }): Promise<AuthResult> {
  return callAuth({
    action: 'completeReset', email: input.email.trim().toLowerCase(),
    password: input.password, confirm: input.confirm,
  });
}

/** Does an account exist for this email? */
export async function emailExists(email: string): Promise<boolean> {
  const r = await callAuth({ action: 'emailExists', email: email.trim().toLowerCase() });
  return !!r.exists;
}

/* ---------- one-time legacy import ---------- */

/**
 * Import the old device-local accounts (pre-MongoDB versions) into the server
 * once, then remove them from the device. Safe to call on every launch: it
 * no-ops when nothing is left to import. Old accounts keep their legacy
 * password hash; the server upgrades them to scrypt on the next login.
 */
export async function migrateLocalAccounts(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_ACCOUNTS_KEY);
    if (!raw) return;
    const accounts = JSON.parse(raw) as Array<{ fullName: string; email: string; salt: string; hash: string }>;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      await AsyncStorage.removeItem(LEGACY_ACCOUNTS_KEY);
      return;
    }
    await callAuth({
      action: 'migrate',
      accounts: accounts.map(a => ({ fullName: a.fullName, email: String(a.email).toLowerCase(), salt: a.salt, hash: a.hash })),
    });
    await AsyncStorage.removeItem(LEGACY_ACCOUNTS_KEY);
  } catch {
    /* offline or server not deployed yet — retry on a future launch */
  }
}
