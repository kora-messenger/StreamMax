<div align="center">

<img src="src/assets/img/logo.png" width="140" alt="StreamMax logo" />

# StreamMax

**Your Movies. Your Way.**

A modern movie and TV streaming platform for Android and iOS.

React Native · TypeScript · Dark Cinematic UI

[![Build](https://img.shields.io/badge/build-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/kora-messenger/StreamMax/actions)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-6C63FF)]()
[![License](https://img.shields.io/badge/license-Proprietary-00D2FF)]()

</div>

---

## Overview

StreamMax is a full-featured streaming app built with React Native. It delivers a premium, cinema-grade experience: a dark, immersive interface, a purple-to-blue brand gradient, and a neon play-button-and-film-strip logo. Discovery, search and playback are designed to feel instant and personal.

## Features

### Authentication
- Real device-local accounts: salted SHA-256 password hashing (js-sha256), per-field validation with red error states and an inline error banner — no plaintext passwords ever stored (AsyncStorage)
- Create Account: name/email/password/confirm validation, duplicate-email protection, auto sign-in on success
- Login: credential checks with field-specific errors ("No account found with this email", "Incorrect password"), Remember me checkbox (session persists across app restarts only when checked); the Remember me / Forgot password? row is anchored to the real bottom of the field stack with a clean 34px gap (no more 'pushed up against the Password field' drift on different screen sizes)
- Forgot password: dedicated designed flow — Forgot Password screen uses the login poster collage at the top (same asset, fading to black before the content): back arrow, StreamMax logo lockup over the poster (centered at 17.6% height, matching the mock), "Forgot Password?" centered split title (white + blue-to-purple gradient), two-line centered subtitle ("No worries! Enter your email address and we'll send you a 6-digit code to reset your password."), tall dark-navy email field with blue border and mail icon, gradient "Send Reset Code" pill button with arrow, "Remember your password? Sign In" footer; Enter Reset Code screen (lockup header, message-bubble-with-padlock icon in the gradient ring, six rounded code boxes with a glowing gradient border on the active box, driven by a hidden number-pad input so the STANDARD OS KEYBOARD provides the digits (custom in-app keypad removed 2026-10-24 at Ijezie's request); the code AUTO-VERIFIES the moment the sixth digit is typed (no Next button), a countdown caption under the boxes shows the 01:23 resend timer and becomes a 'Resend code' link when it hits zero, and a 'Verifying…' label appears during the check), then a Reset Password screen (flat deep-navy background with a designed top aurora: indigo corner glow + sweeping blue ribbon; padlock in a glowing blue-violet ring, "Reset Password" split gradient title, three-line instruction, two password fields with eye toggles, a live 4-item requirements checklist (8 characters / a letter / a number / a symbol) with blue checks, gradient "Reset Password" button, "Back to Login" footer, and the login bottom wave glow) — six-digit codes are REAL emails now — the StreamMax backend is a standalone Node + MongoDB Atlas service (backend/ folder in this repo, hosted free on Render at https://streammax-api.onrender.com) that generates and emails a StreamMax-branded code via Brevo (dark card, gradient code, expiry line), sent from ijeziegoodluck4@gmail.com until a StreamMax domain is bought (Brevo requires that address to be validated as a sender in its dashboard). MongoDB is the single source of truth for accounts and codes: scrypt password hashes (legacy device-local accounts are imported once via the migrate action and upgraded to scrypt on their next login), 24h TTL index on code documents; codes expire in 10 minutes, invalidate after 5 wrong attempts, and are rate-limited to 5 per email per hour. Brute-force protection (2026-10-30): account lockout after 5 consecutive failed passwords (15 min, escalating to 1 h then 24 h, reset on a successful sign-in, HTTP 423 with the remaining time) combined with per-IP rate limiting (20 failed auth attempts per 15-minute rolling window, 20 code requests per IP per hour, wrong codes count too, HTTP 429), with the client IP taken from the last X-Forwarded-For entry so it cannot be spoofed. Beyond codes the backend sends two more transactional emails (fire-and-forget, so a delivery hiccup never blocks sign-in): a "New login to your account" security alert after every successful login (password+code flow, or a returning Google sign-in) showing the device label and the sign-in time in WAT, and a "Welcome to StreamMax" email for brand-new users (register, first Google sign-in, or the Google email-code fallback) with a first-name greeting, feature highlights, and the account email; both use the same dark StreamMax card template as the code emails (the app passes a Platform-based device description with login verifications); the welcome email's "Start Watching" button deep-links into the app via the registered streammax:// scheme (Android intent filter in the manifest; swap to a verified https App Link once the .com domain is live for full email-client reliability). Every flow is verified by inbox code: Create Account (details → emailed signup code → account created), Login (password → emailed login code → session), Forgot Password (emailed reset code → New Password), and Continue with Google — the MarketScope AI pattern: the native Google SDK picker (@react-native-google-signin/google-signin) returns a signed ID token, the StreamMax backend verifies it directly with Google (action googleVerify, audience checked against the Web client ID) and creates the MongoDB account server-side and the session opens instantly for any picked account (while the picker and verification run, the Google button's logo swaps for a spinner and the button dims and ignores taps, like MarketScope AI) — no emailed code (the emailed-code path remains only as fallback if the SDK is ever unconfigured). Continue with Apple shows a brief loading state then an 'Apple sign-in is coming soon' toast — not yet implemented. Setup: Android OAuth client for com.streammax.app (the app's applicationId) with SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25 plus a Web OAuth client ID pasted into src/core/auth/googleAuth.ts (GOOGLE_WEB_CLIENT_ID). Google Sign-In FIXED 2026-10-30: @react-native-google-signin v16 returns { type: "success", data: { user, idToken } }, but the old code read the pre-v13 flat shape (result.user / result.idToken), so every picked account looked email-less ("That Google account has no email"). googleAuth.ts now requests scopes openid+email+profile in configure(), reads the v13+ payload (with a legacy-shape fallback), decodes the ID token claims as a secondary source for email/name/sub/picture, calls addScopes for the email scope once if an account somehow lacks it, returns googleId and photo, and treats cancellation silently; the backend googleVerify re-checks tokeninfo (aud, iss, email_verified) and stores googleId/avatarUrl. No emailed code is involved on the Google path. The Web client ID is configured (src/core/auth/googleAuth.ts), so the Google button opens the native account picker; if it is ever removed, the button falls back to emailing a code to the typed address. Backend migration 2026-10-24: accounts and codes moved OFF Base44 onto MongoDB Atlas — the backend URL lives in one constant in authService.ts (API_BASE) so it can be swapped when StreamMax moves to its own .com; sessions stay on-device (AsyncStorage) with the signed-in user embedded so resume/getCurrentUser work offline; old device-local accounts are imported to MongoDB once on the splash screen (migrateLocalAccounts) so no existing account is lost; deploy notes for Atlas + Render are in backend/README.md; Welcome, Login, Create Account and Enter Code were REBUILT on professional flex layouts (2026-10-23): content flows top-to-bottom with a fixed spacing rhythm — Login and Create Account sit in a ScrollView with KeyboardAvoidingView so the keyboard can never bury or clip anything, Welcome uses flex spacer ratios instead of absolute screen percentages (nothing can overlap or drift by device), and Enter Code centers its header/boxes in flexible space above the custom keypad. All auth screens keep professional absolute app sizes — 16sp input text, 15-17sp body/labels, 32sp headings, 50dp fields, 48-52dp buttons — with StreamMax's design language (pure black, gradient headings, hero art fading to black, pill CTAs); Forgot Password and New Password still use the earlier percentage layout; input fields across all auth screens share one focus tracker so only the field the OS actually has focused shows the active gradient border (no more stuck glow when hopping between fields); toast messaging is app-wide: a ToastProvider wraps the navigator and any screen can trigger the Veltravia-style dark pill toast (white text for both error and info) that slides in at the top below the status bar and auto-dismisses — used on Home (sign-out confirmation) and every auth screen
- Session routing: splash resumes a remembered session straight to Home; account avatar in the Home top bar shows the signed-in initial and signs out (confirm dialog)
- Auth service is an isolated layer (`src/core/auth/authService.ts`) so storage can later be swapped for a remote backend without touching screens
- Splash screen with deep navy radial backdrop, faint poster art in the corners and two sweeping translucent film-strip ribbons with sprocket holes
- Android 12+ device splash (SplashScreen API): neon logo icon on the deep navy backdrop, matching icon background inside the system container and a 200 ms icon animation, followed by the in-app cinematic splash
- Welcome onboarding (refined 2026-10-30): top hero (welcome_hero.png) fading into #03051A, neon play logo, wordmark where "Stream" is solid white and "Max" carries a true cyan→blue→purple gradient on the LETTERS (SVG gradient text, no box or badge behind it, same size/weight/baseline, centered), tagline, description, four gradient feature icons with hairline separators, and the purple-to-blue Get Started pill. Layout is responsive: a flexGrow ScrollView pins the CTA near the bottom on tall screens and only scrolls when the content is taller than the screen, so the button is never clipped; bottom padding honors the safe-area inset for gesture and 3-button navigation. Compact sizing below 740dp height; verified by layout math to fit without scrolling from 780dp tall up and scroll safely below that
- Auth CTA buttons (Log In, Create Account, Send Reset Code, Reset Password) all switch to a "Loading" label with counting dots (Loading. -> Loading.. -> Loading...) while a request runs, disabled until it finishes; Enter Code shows the same animated dots on "Verifying" during auto-verification. Google sign-in keeps its in-icon spinner. Enter Code (REBUILT for reliable tapping, 2026-10-24): standard OS number-pad keyboard only (no custom keypad); the six boxes are display-only and a single transparent TextInput overlays the entire box row, so tapping any box taps the input directly and the OS keyboard always opens (no programmatic focus() that silently fails after the keyboard is dismissed); auto-verify on the sixth digit, 01:23 resend countdown, errors as a dark top pill toast (UPGRADED: kind-aware icon — warning triangle for errors, check-circle for info — in a tinted ring, accent-tinted border and glow, spring slide-in with overshoot, and a thin time bar that drains over the toast lifetime; red accent for errors, cyan for info)
- Create Account and Login with corner hero art, brand lockup, gradient title accent, gradient-focused first field and full-width gradient CTA. Create Account uses a compact vertical chain: the CTA sits directly under the field stack, social buttons follow sequentially, and the sign-in row + legal footer are anchored from the screen bottom so they never clip.
- Google and Apple sign-in options
- Remember me and forgot-password flows

### Discovery
- Home screen with auto-rotating full-bleed hero banners with baked key-art titles, a tappable heading-less card strip of the banner titles (poster, name, year, download button), then Trending, Popular and New Releases — every banner and card opens the Movie View screen
- Rotating search pill with trending placeholders and gradient "Search" text; the far-right slot is reserved for future ad placements
- Category tabs: Football, Trending, Movie, Nollywood
- Horizontal title rows with one-tap download buttons

### Search
- Full search screen with recent and trending searches
- Movie / Series / Short TV / Music / Community tabs
- Ranked results list and community discovery

## Screens
### Me (profile) — bottom-bar tab
- MovieBox-style profile screen on a dark purple→black gradient (#1e0d35 → #0d0b10): avatar in a purple gradient ring with initial (camera edit button placeholder), name + email from the signed-in local account, purple "Premium" crown pill, gear (top right), and a stats row (Watch History / Favorites / Downloads — counts wired to real data later).
- Three grouped rounded (#1a1b26, radius 16) settings containers: Account / Subscription / Privacy & Security, Notifications / Appearance / Downloads / Language (value: English), Help & Support / About (value: v1.0.0) — colored icon tiles, secondary descriptions, chevrons; rows pop the dark pill toast until their screens exist.
- Purple "Log Out" button with confirm dialog; logs out of the local session and returns to Welcome.
- Me tab routes from Home and Dramas; Log Out/Sign-out flows share the app-wide toast.

### Settings (opened from the gear on the Me screen)
- Layout measured from the MovieBox settings recording: centered "Settings" header with back chevron, then two rounded dark groups under the labels "Your app and preferences" and "More info and support".
- Group 1: Notifications >, Language >, Watch Options (value Download/Stream, picker) >, Family Mode (switch + helper text), Download in background (switch; in MovieBox this raises the real Android battery-optimization system prompt — that prompt will be triggered via a native module once real background downloads exist, no app-made replica), Auto activate Miniplayer (switch + helper, on by default), Privacy Settings >.
- Group 2: Check update (toast: latest version), Privacy Policy and Terms of Service (both open the in-app browser), Log out (confirm, clears session, back to Welcome).
- Switches are StreamMax-branded (cyan→purple gradient track when on, grey when off) and persist locally via AsyncStorage (`streammax.settings.v1`). Rows without a destination yet show the dark pill toast.

### About us (opened from the About row on the Me screen)
- MovieBox-clone layout: top bar with back chevron and centered bold "About us", StreamMax logo with the version number (v1.0.0) vertically centered in the body, and the footer disclaimer pinned to the bottom — "By continuing, you agree to our Terms of Service and Privacy Policy." with both links in the StreamMax purple accent (placeholder toasts until the documents exist).

### In-app browser (ChatGPT-style, for Terms of Service / Privacy Policy)
- White chrome cloned from the OpenAI/ChatGPT in-app browser: X to close, down-chevron (placeholder toast), centered URL text ("streammax.app"), line-art share icon (opens the system share sheet), vertical ellipsis (placeholder toast), faint #D3D3D3 divider under the bar.
- Content renders in a white WebView. Until the real .com URLs exist, Terms of Service and Privacy Policy load as locally rendered white document pages (bold centered title, "Updated:" stamp, left-aligned body) — swap the local HTML for live URLs later via the `url` param.
- Opened from Settings > Privacy Policy / Terms of Service and the About us footer links.

### DramaPlayer (opened from any Dramas card)
MovieBox-style full-screen short-drama player, now matching the episode-feed recording:
- Vertical episode paging: swiping up/down moves between episodes (EP01..EPn); the top EP label, subtitle, description and the EP01/EP67 pill track the active episode. Locked episodes keep the top bar, right icon column, bottom meta, episode pill and utility row visible over a dimmed frame.
- Premium is NOT live yet: every episode plays for everyone. Planned rules (documented in code for when Premium launches): only the first 10 episodes free, downloading a drama requires Premium, watching complete episodes requires Premium, owner gets a permanent override.

MovieBox-style full-screen short-drama player measured from the reference screenshots. Interaction per Ijezie:
- Every overlay — top back/EP bar, centered subtitle, right icon column (download, bookmark with count, share), bottom meta (thumbnail, title, description with a More/Less pill), the EP01/EP67 episode-selector pill, and the utility row (gold Premium Pro pill, speed dial opening a semi-transparent black rounded popup above the trigger with 0.5x–2x and the active speed highlighted in #00f2fe, HD 480P badge) — auto-hides after 3 seconds while playing.
- Tap with overlays hidden brings everything back; tap while visible pauses (and resumes) the video, and while paused the overlays stay on screen. Paused state shows a translucent center play button.
- The thin seek line at the very bottom edge is the only way to forward/scrub the video (thickens with a larger handle while dragging). No double-tap or hold gestures in this player.
- Bookmark toggles green with an incremented count; download/share and the episode selector are wired as visual placeholders pending the real drama backend. Episode counts are placeholder data.


### Dramas (bottom-bar tab, replaces the old direct-to-search routing)
- Inline search bar at the top: dark rounded pill (#1A1B24, 42dp) with magnifier icon, live filter across every drama on the screen (hero + all shelves, deduped) matching title or genre; typing swaps the feed for a results grid with a result count (or "No results"), a ✕ clears the field and restores the normal layout.
MovieBox-style short-drama screen built from the reference recording, with the premium banner and error state explicitly excluded per Ijezie:
- Snap hero carousel of tall portrait poster cards (62% screen width, 1.45 ratio) with neighbor cards peeking at the sides; each card carries a brand-gradient circular play button at the bottom-right and a title/meta/episode overlay.
- Latest / Hottest / All chip row: dark rounded pills with small brand-gradient icon badges; Latest/Hottest/All swaps the New Arrivals shelf data.
- Home screen loading state: same network-driven skeleton (NetInfo) — the full-height hero banner placeholder plus the poster-card rows pulse while loading, and offline keeps them loading indefinitely.
- Dramas loading state: pulsing dark skeleton placeholders (hero cards, chip pills, shelf posters with title/meta bars) shown while the drama feed loads; the load is network-driven via NetInfo: while the device is offline the skeleton stays up indefinitely (no error screen), and as soon as connectivity returns the feed fetches and the skeleton swaps out for the real layout (~1.2s placeholder fetch; swap in the real drama API call).
- Content shelves — New Arrivals, Top Searches, Asian Land — horizontal poster rows (104px cards) with two-line titles and episode counts.
- All content is placeholder (mock titles with episode counts); tapping a card opens the existing MovieView screen.
- The bar's Home button pops back to Home.



| Screen | Purpose |
| --- | --- |
| Splash | Cinematic backdrop, sweeping film-strip ribbons, brand lockup and gradient spinner |
| Welcome | Onboarding and sign-up entry point |
| Create Account | New user registration |
| Login | Darkened character collage, brand lockup, gradient title accent, both fields gradient-bordered, corner glow backdrop |
| Home | Banners, categories and title rows |
| Search | Discovery, trending and community |
| Adaptive launcher icon | Transparent logo foreground on a dark gradient background, masked by Android into the device shape — no black square on the home screen (legacy rounded/circle PNGs included for older devices) |
| Movie View | Placeholder player (play/pause, progress, HD notice, fullscreen), meta line, action chips, resource block with episode grid, For you grid + Comments, floating Download button, download sheet with quality chips and episode checkboxes |

## Design system

| Token | Value |
| --- | --- |
| Background | `#050507` |
| Splash navy | `#0a1122` |
| Brand gradient | `#6C63FF` → `#00D2FF` |
| Accent wordmark | `#00D2FF` → `#B300FF` |
| Typography | System sans-serif, 800-weight display |

All icons are professional SVG. No emoji in the UI. Hero artwork fades into the background with custom gradients. The brand lockup uses an alpha-keyed neon logo with its own glow.

## Video player
Rebuilt to mirror MovieBox's real player behavior (measured frame by frame from a screen recording):
- **Inline player**: a pinned 16:9 slot directly under the status bar at the top of the movie page; the page (title, resources, episodes, For you / Comments) scrolls underneath it. Real playback via `react-native-video` (native Media3/ExoPlayer, HLS and MP4).
- **Portrait controls**: back arrow (top-left), Help "?" (top-right), bottom row = pause/play, thin white seek bar with dot, `00:25/43:43` time, mini-window icon, fullscreen icon. Controls auto-hide after ~3s; single tap shows/hides them.
- **Gestures**: double-tap left/right = seek -10s/+10s with a dim circle ripple labelled "10 seconds"; vertical swipe on the left half = brightness, right half = volume, each with a centered dark HUD pill and a level bar that fades out ~0.7s after release. Works whether the controls are showing or hidden (blocked only in Lock mode).
- **Two-stage volume (MovieBox-verified from its APK + recordings)**: the pill's speaker icon swaps in quantized bands like MovieBox's `ls_ic_player_feedback_volume_0/33/66/100` drawables (mute / one wave / two waves / three waves). The bar is two ranges: 0–100% fills white left-to-right; swiping past the top switches to a boost range where the track turns full white and a green segment (#0FA64C, sampled from the reference) grows to 100% = 200%. Swiping back down shrinks green, then white. Brightness mirrors it with a 3-band sun icon (33/66/100) and a white bar.
- **Fullscreen (landscape)**: tapping the fullscreen icon takes over the screen in landscape with: back arrow + episode title (top-left), Help and Setting (top-right), "Tap to Lock" chip (left-middle), rewind-10 / pause / forward-10 (center), current time + seek bar + total time, then pause, next-episode, and right-aligned **Fit / Language / 1x / Rotate**. Rotate returns to portrait.
- **Lock mode (MovieBox Layer 2C)**: "Tap to Lock" (plain white icon + text, no pill) hides every control and blocks all gestures. The "Tap to Unlock" prompt appears mid-left when the screen is tapped and auto-hides after ~3s exactly like the other controls — tap the screen to bring it back; tapping the prompt itself unlocks.
- **Pre-roll ad (free tier)**: black stage with an "AD" tag, countdown + gold "Go ad-free >" (top-right) and "Tap and skip the ad" (bottom-right); playback starts when it ends. Ad content is a placeholder slot until an ad network is connected.
- **Sheets**: playback speed (0.5x-2x), Language (subtitle tracks from the stream), Setting.
- Until per-title stream URLs are in the catalog it plays a public test HLS stream that includes real subtitle tracks.

- **Volume boost is real, not cosmetic**: the player library is patched via `patch-package` (see `patches/react-native-video+6.19.3.patch`, auto-applied by the `postinstall` script).
  - **Android**: values above 100% attach a system `LoudnessEnhancer` DSP to ExoPlayer's audio session and drive up to +6 dB gain (200% = +6 dB); the base player volume stays capped at 1.0 and mute resets gain to 0.
  - **iOS**: values above 100% are applied as software gain on the audio track via `AVAudioMix` (capped at 2.0). Progressive/MP4 playback amplifies fully; HLS assets may not expose audio tracks, in which case boost safely no-ops.

- **Bottom button bar (MovieBox-style)**: a floating rounded bar (radius 22, dark glass `rgba(13,15,23,0.97)` with a subtle border) hovering 10dp above the gesture area, on Home and Search. Four evenly spaced items — Home, Dramas, Downloads, Me — with 22dp icons and 10sp labels; the active item's label renders as a cyan-to-purple gradient (`#00d2ff` → `#9d50bb`) with a white icon, inactive items slate grey (`#7A8296`). Home and Search route between screens; Downloads/Mine are placeholders until their screens exist. The Me icon is the MovieBox-style person glyph measured from the reference: a large circle head floating above a wide horizontal oval body; untapped both shapes are stroked light grey, tapped both fill with the StreamMax gradient (cyan top to purple bottom).

The Dramas icon matches the tab family: a rounded screen with a play triangle inside — untapped a light-grey outline with a stroked triangle, tapped the screen fills with the StreamMax gradient and the triangle goes solid dark (mirroring the Downloads square). It replaces the stock magnifier while the tab still routes to the search screen.

The Downloads icon is the MovieBox-style three-state rounded square: untapped it is a light-grey outline square with a down-arrow stroke and a brand-gradient pill badge at the top-right corner showing the paused-download count (the total of downloads paused and not yet completed); tapped the square fills with the StreamMax gradient (cyan `#00d2ff` to purple `#9d50bb`) with a solid dark arrow; when a download is interrupted because the network went offline, or the user is offline and resumes, the badge swaps to a red circle (`#E34338`) with a white exclamation mark. Both values are plumbed as `downloadsCount` / `downloadsWarning` props on the bar, ready to wire to the real download engine.

The Home icon is the MovieBox-style two-state house measured from the reference: untapped it is a rounded-pentagon outline with a center door stroke in light grey (`#C1C4CC`); tapped the pentagon fills with the StreamMax gradient (cyan `#00d2ff` bottom-left to purple `#9d50bb` top-right) with a door cutout in the bar's background color, and its label turns white bold. Inactive items across the bar are light grey, active labels white.

## Tech stack

- **React Native 0.87** with React 19 and TypeScript
- **React Navigation** (native stack)
- **react-native-svg** for the icon and gradient-text system
- **react-native-linear-gradient** for surfaces and buttons
- **react-native-safe-area-context** for edge-to-edge layouts

## Project structure

```
src/
├── assets/       Logo, hero artwork, poster art
├── components/   Buttons, input fields, SVG icon set
├── data/         Mock catalog, categories, search data
├── navigation/   Stack navigator
├── screens/      Splash, Welcome, CreateAccount, Login, Home, Search, MovieView
└── theme/        Colors, gradients, radius tokens
```

## Getting started

```bash
npm install
npm run android   # or: npm run ios
```

Requires Node 22+ and JDK 21.

## Building the APK

Every push to `main` triggers a release build via GitHub Actions. Grab the `streammax-release-apk` artifact from the [Actions tab](https://github.com/kora-messenger/StreamMax/actions).

## Roadmap

- [ ] Title details screen
- [ ] Video player
- [ ] Downloads and offline playback
- [ ] Profile and account management
- [ ] Payments and premium plans
- [ ] Real catalog backend

## Status

Core experience implemented with mock data. Backend, playback and payments are in development.

---

© 2026 StreamMax. All rights reserved.
