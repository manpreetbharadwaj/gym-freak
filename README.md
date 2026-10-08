# Gym Freak

Standalone Expo SDK 57 / React Native app for gym training, built on the **shared HealthyMe backend** (`healthyMe-Backend`, Gym module) and managed from the **HealthyMe Admin Panel**. There is no separate Gym Freak backend or admin.

## Run

```bash
npm install
cp .env.example .env.local     # EXPO_PUBLIC_GYM_DATA_MODE=api + EXPO_PUBLIC_API_URL (git-ignored)
```

Native development builds (expo-dev-client; `ios/` and `android/` are generated and git-ignored):

```bash
npx expo prebuild
npm run ios                    # expo run:ios  (needs Xcode + CocoaPods)
npm run android                # expo run:android (needs JDK 17 + Android SDK)
npx expo start --dev-client    # Metro for the dev build
npx expo run:ios --configuration Release   # self-contained build, used for the Maestro journey
```

Without `EXPO_PUBLIC_GYM_DATA_MODE=api` the app runs on an offline mock repository (UI work and demos only).

Local backend with demo content (from `healthyMe-Backend`, Postgres on `127.0.0.1:55432`):

```bash
npx prisma migrate deploy
SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… SEED_GYM_DEMO=true npx prisma db seed
npm run start:dev
```

## End-to-end test

`.maestro/full-journey.yaml` taps through a fresh install against the real API: intro → language → onboarding → sign-up → plan → trial start → workout (sets, add exercise, finish) → progress → logout → login → history still present.

```bash
maestro test -e EMAIL=e2e+$(date +%s)@gymfreak.local .maestro/full-journey.yaml
```

## Flow

Splash → intro → language → onboarding (10 steps, saved as a local draft) → sign up / sign in → plan built (draft saved to HealthyMe) → trial / Pro → app. Returning users go straight to the app. Deep links `gymfreak://verify-email?code=…` and `gymfreak://reset-password?token=…` complete the email flows.

## Structure

```
src/
  api/            HTTP client (bearer auth, single-flight refresh, typed errors) + HealthyMe wire contracts
  services/
    repositories/ AuthRepository + GymRepository interfaces and the HealthyMe API implementation
    mock/         offline catalog, mock repository and its derivations (mock mode only)
    storage/      namespaced AsyncStorage (`gymfreak.*`) and device-only state
    notifications.ts, purchases.ts   local reminders / rest cues, push + billing seams
  store/          session provider (restore, sign in/out, expiry)
  hooks/          React Query hooks: caching, pagination, optimistic favorites
  features/       splash, intro, language, onboarding, auth, home, stories, workouts,
                  exercises, player, progress, profile, subscription
  components/     design system (primitives, layout, cards, inputs, feedback, media, pickers)
  navigation/     first-run gate, root stack, floating capsule tab bar, deep links
  i18n/           English source + 11 full translations (`xx.ts` + `app/xx.ts`); `languages.ts` registry
  theme/          colours, gradients, scenes, type, radii, shadows
  types/          domain types used by every screen
```

Screens only see domain types; `services/repositories/apiRepository.ts` is the single place that maps HealthyMe payloads.

## Backend-driven behaviour

Everything below comes from HealthyMe and is managed in the admin panel ("Gym / Training"); the client derives nothing.

- Catalog with localized content and streamed media (`/v1/exercises`, `/v1/workouts`, `/v1/stories`; relative media URLs resolved against `EXPO_PUBLIC_API_URL`). Videos stream with disk caching, a poster while loading and retry on failure.
- Plan and week: `/v1/me/gym/training-plan` (auto or coach-assigned, time-zone aware). Recommendations: `/v1/me/gym/recommendations`.
- Progress, streaks, calendars, records, achievements: `/v1/me/gym/progress`; new unlocks come back from session completion.
- Stories feed and server-side views: `/v1/me/gym/stories`, `/v1/me/gym/stories/:id/view`; CTAs open deep links.
- Sessions: start/resume (with a resume-or-discard prompt for an unfinished workout), set sync with retry, **replace exercise** and **add exercise** for the current session only.
- Trial and paywall: `/v1/me/gym/access` + `POST /v1/me/gym/trial/start` (length, paywall and billing come from admin settings). Purchase buttons only appear when the server reports billing enabled; nothing is simulated.
- Notifications: category preferences on the server; the installation registers its push token, time zone and locale (`PUT /v1/me/gym/devices`) and is unregistered on logout. The daily reminder is scheduled locally only when the server can't push to the device. Taps route `gymfreak://workout/<id>`, `story/<id>`, `achievements`, `upgrade`, `plan`, `home`.
- Age is sent as `ageYears` (no invented date of birth). Audio cues are the only device-only preference.

## Languages

12 languages, each covering every screen (English source in `src/i18n/en.ts`; first-run strings in `src/i18n/xx.ts`, app screens in `src/i18n/app/xx.ts`). Arabic switches the layout to right-to-left (the app reloads once when the direction changes). Content text (exercise names, stories, …) is localized by the backend from `Accept-Language`.

## First-run visual system

The redesign keeps the original gate, four intro pages, ten onboarding steps (including optional gender), all five auth modes, and plan-save/retry behavior. Navigation, API, repository, session, translation, and persistence modules are unchanged. Shared token and primitive styling also gives existing app consumers the same colors, corners, and quieter press feedback.

- Tokens: `src/components/firstRun.tsx` — first-run-only near-black surfaces, crisp white type, purple/violet/blue/cyan accents, 14–24px card corners, and 220–400ms motion.
- Shared UI: `src/components/firstRun.tsx` (`FirstRunBackground`, `PremiumScreenHeader`, `PremiumCTA`, `PremiumSelectableSurface`, `PremiumProgress`, `PremiumBackButton`, `AnimatedCard`).
- Existing primitives reused: `GradientButton`, `SelectableSurface`, `CheckBadge`, `SegmentedProgress`, `PressableScale`, `LogoMark`, `Txt`.
- Photography: `src/components/AssetImage.tsx` uses installed `expo-image`, bounded sizing, downscaling, caching, and reduced-motion-aware crossfades. Bundled images need no network prefetch.
- Forms and flags: `src/components/AuthInput.tsx`, `src/components/CountryFlag.tsx`. All 12 flags are SVGs, not emoji glyphs.
- Wheels/rulers keep their snapping and ranges; screen-reader increment/decrement actions are also available.

### Artwork and replacement paths

The supplied reference found in this workspace is **`src/assets/images/Modern Fitness App Asset Pack.png`**. The requested `a_wide_high_quality_composite_asset_pack_ui_m.png` filename was absent. The existing sheet is retained untouched and is never required into the app bundle or used as a screen background.

`src/assets/image-manifest.json` lists **every exact expected file path** and crop rectangle. `src/assets/images/index.ts` provides typed static Metro references. Directories: `onboarding/`, `goals/`, `levels/`, `locations/`, `equipment/`, `auth/`, `backgrounds/`; vector artwork lives in `src/assets/icons/`.

The current 32 entries total about **521 KiB**: 30 individual crops from the generated reference and 2 valid neutral PNG placeholders. The crops are preview-quality references, not final high-resolution or rights-cleared photography. Replace them before production, especially the full-screen splash. No crops were upscaled.

Completely missing artwork:

- `src/assets/images/onboarding/weekly-trophy.png` — supply a realistic trophy photograph or a realistic product render. Until then the badge uses a small outline vector.
- `src/assets/images/equipment/resistance-bands.png` — the reference tile depicts rolled mats, so it is deliberately **not** used as bands. A clean closed-loop band SVG is used instead.

Replace a reference crop at its existing path to update the app without editing screens. For those two neutral placeholders, also set the corresponding key to `true` in `suppliedReplacements` in `src/assets/images/index.ts`. Restart Metro if it retains old asset dimensions. `locations/both` is composed from gym/home images. Extra kettlebell, treadmill, bike and exercise-ball entries are available without introducing unsupported onboarding answer values.

Suggested replacement sizes: splash 1080×1920 JPEG; intro heroes roughly 900×1100 JPEG; goal/level thumbnails 300–400px; equipment 512px isolated PNG; locations/auth at least 800px wide. Keep crops suitable for `cover`; equipment uses `contain`. The back-squat reference intentionally does not display the unrelated translated “Goblet squat” demo label.

Rebuild missing reference files locally (never overwrites replacements; uses Expo's already-installed image dependency):

```bash
node scripts/extract-reference-assets.cjs
npm run typecheck
npm test
```

### Redesign regression journeys

Use a **disposable** iOS simulator and a test-only backend account. `redesign-onboarding.yaml` clears the selected app's local state; never point it at a personal device/session. Supply test credentials externally; do not commit passwords or native driver logs. Maestro 2.11 requires `SCREENSHOTS` to be a relative subfolder within its run output, not an absolute path.

```bash
maestro --device "$QA_SIMULATOR_ID" test -e SCREENSHOTS=shots .maestro/redesign-onboarding.yaml
maestro --device "$QA_SIMULATOR_ID" test -e EMAIL="$TEST_EMAIL" -e PASSWORD="$TEST_PASSWORD" -e SCREENSHOTS=shots .maestro/redesign-auth.yaml
```

The first journey covers all intro pages, language search, required selections, back navigation, equipment toggles, every metric/gender step, and draft resumption. The auth journey covers required/email/mismatch errors, registration, verification deferral, plan saving, logout, reset-link request, login, and session restoration. The original `.maestro/full-journey.yaml` remains available for workout-domain regression checks.
