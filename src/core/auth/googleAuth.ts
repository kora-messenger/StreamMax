/**
 * Native Google Sign-In (Google SDK v13+ response shape) for StreamMax.
 *
 * Setup (one-time, in Google Cloud Console):
 *   1. OAuth consent screen → External, app "StreamMax".
 *   2. OAuth client ID → Android → package `com.streammax.app`,
 *      SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
 *      (the committed keystore both debug and release builds sign with).
 *   3. OAuth client ID → Web application → GOOGLE_WEB_CLIENT_ID below.
 *
 * The SDK returns a signed ID token; the backend verifies it with Google
 * (audience + email_verified) and creates/loads the account. No emailed
 * code is involved on this path.
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/** Web OAuth client ID from Google Cloud Console (ends in .apps.googleusercontent.com). */
export const GOOGLE_WEB_CLIENT_ID = '463127766110-cugua4mmvf9mrj2mgpdp05iat3f8vr07.apps.googleusercontent.com';

/** OpenID Connect scopes: identity + email + profile basics. */
const SCOPES = ['openid', 'email', 'profile'];

export interface GoogleIdentity {
  ok: boolean;
  idToken?: string;
  email?: string;
  name?: string;
  googleId?: string;
  photo?: string;
  message?: string;
}

let configured = false;

export function isGoogleSdkReady(): boolean {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}

function configure() {
  if (configured || !isGoogleSdkReady()) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID, // required to receive an idToken
    scopes: SCOPES,
    offlineAccess: false,
  });
  configured = true;
}

/** Decode a JWT payload (base64url) — client-side convenience only; the
 *  backend does the real signature/audience verification. */
function decodeJwtPayload(token?: string | null): any {
  try {
    if (!token) return null;
    const part = token.split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const atobFn = (globalThis as any).atob;
    if (typeof atobFn !== 'function') return null;
    const bytes = atobFn(b64);
    const json = decodeURIComponent(
      bytes.split('').map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Pull identity fields out of either the v13+ response or a legacy flat one. */
function readIdentity(result: any): { primaryEmail: string; name: string; googleId: string; photo: string; idToken: string } {
  const data = result?.data ?? result ?? {};
  const profile = data?.user ?? data?.profile ?? {};
  const idToken = data?.idToken ?? data?.id_token ?? result?.idToken ?? result?.id_token ?? '';
  const claims = decodeJwtPayload(idToken) || {};
  return {
    primaryEmail: String(profile?.email || claims.email || ''),
    name: String(profile?.name || claims.name || ''),
    googleId: String(profile?.id || claims.sub || ''),
    photo: String(profile?.photo || claims.picture || ''),
    idToken: String(idToken || ''),
  };
}

/**
 * Open the Google account picker and return the signed ID token plus the
 * account's email / name / Google ID / avatar. Any account on the device can
 * sign in — the backend verifies the token with Google itself.
 * Returns { ok: false } with an empty message when the user cancels.
 */
export async function googleSignInToken(): Promise<GoogleIdentity> {
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const result: any = await GoogleSignin.signIn();

    // v13+: { type: 'success' | 'cancelled', data? }
    if (result?.type === 'cancelled') return { ok: false, message: '' };
    if (result?.type && result.type !== 'success') {
      return { ok: false, message: 'Google sign-in did not complete. Try again.' };
    }

    let ident = readIdentity(result);

    // Graceful recovery: the token is there but the email scope wasn't
    // granted for this account — ask for it once instead of failing.
    if (ident.idToken && !ident.primaryEmail) {
      try {
        const extra: any = await GoogleSignin.addScopes({ scopes: ['email', 'profile'] });
        if (extra?.type && extra.type !== 'success' && extra.type !== 'cancelled') {
          // keep the original identity; nothing else to do
        } else if (extra) {
          const merged = readIdentity(extra);
          if (merged.idToken || merged.primaryEmail) {
            ident = {
              primaryEmail: merged.primaryEmail || ident.primaryEmail,
              name: merged.name || ident.name,
              googleId: merged.googleId || ident.googleId,
              photo: merged.photo || ident.photo,
              idToken: merged.idToken || ident.idToken,
            };
          }
        }
      } catch {
        // fall through to the checks below
      }
    }

    if (!ident.idToken) {
      return { ok: false, message: 'Google did not return a sign-in token. Try again.' };
    }
    if (!ident.primaryEmail) {
      // A Google account without an email claim cannot own a StreamMax
      // account (the account is keyed to the email) — only now do we stop.
      return { ok: false, message: 'Google did not share an email address for that account. Try another account.' };
    }

    return {
      ok: true,
      idToken: ident.idToken,
      email: ident.primaryEmail,
      name: ident.name,
      googleId: ident.googleId,
      photo: ident.photo,
    };
  } catch (err: any) {
    const code = String(err?.code ?? '');
    const raw = String(err?.message || '');
    if (code === '-5' || code === 'SIGN_IN_CANCELLED' || code === '12501' || raw.toLowerCase().includes('cancel')) {
      return { ok: false, message: '' }; // user closed the picker — stay silent
    }
    if (code === '10' || code === 'DEVELOPER_ERROR' || raw.includes('DEVELOPER_ERROR')) {
      return { ok: false, message: 'Google rejected this account (code 10). If the GCP consent screen is still in Testing mode, only registered test users can sign in until you press Publish app.' };
    }
    if (raw.toLowerCase().includes('play services')) {
      return { ok: false, message: 'Google Play services is out of date on this phone. Update it and try again.' };
    }
    if (code === '7' || raw.toLowerCase().includes('network')) {
      return { ok: false, message: 'Google sign-in failed. Check your connection and try again.' };
    }
    return { ok: false, message: `Google sign-in failed (${code || raw.slice(0, 40)}). Try again.` };
  }
}
