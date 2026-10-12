# Gym Freak Complete Functional Audit

Audit date: 2026-10-11 (Asia/Kolkata)  
Scope: React Native mobile app, NestJS backend, PostgreSQL database, and React/Vite Admin Panel  
Repositories:

- Mobile: `/Users/mrbhardwaj/Documents/gymFreak`
- Backend: `/Users/mrbhardwaj/Documents/healthyMe-Backend`
- Admin: `/Users/mrbhardwaj/Documents/healthyMe/admin-panel`

## Audit method and evidence standard

This is an audit of the current local working trees, not of earlier completion reports. `WORKING` is used only where a live runtime action or a sufficiently representative end-to-end read was completed. A passing unit test or the presence of a component, endpoint, or Prisma model alone does not qualify a feature as working.

Evidence collected:

- Physical Android device: Samsung SM-S901E (`RZCWA2A0QYN`), GymFreak package installed and running.
- Physical-device smoke navigation: Home, Explore, Workout, Activity, Progress, and Profile rendered without a fatal crash.
- Android device successfully pinged and opened TCP port 3000 at the configured API host `192.168.1.17`.
- Local backend: `/v1/health` and `/v1/health/ready` returned 200; public catalog endpoints were queried.
- Local Admin: port 5173 served the Vite application; Keychain-backed admin login, `/v1/admin/session`, and `/v1/admin/gym/dashboard` returned 200; unauthenticated session returned 401.
- PostgreSQL 16 container was healthy and bound to `127.0.0.1:55432`.
- Read-only Prisma inspection, `prisma migrate status`, source tracing, route inventory, and Git status review.
- Mobile TypeScript and 91 tests passed; backend lint/build and 83 tests passed; Admin typecheck/lint/build and 200 tests passed.
- Android and iOS native compilation were run separately; final results appear in Platform Differences.
- No database writes, purchases, notifications, policies, account changes, migrations, commits, or pushes were performed.

Limitations:

- A clean-install first-run flow was not executed because that would require clearing app data or using a new isolated account. Those stages are not marked fully working.
- iOS was compiled but no simulator or physical iPhone was booted, so iOS runtime behavior is not verified.
- Real outdoor GPS accuracy, background tracking over an extended period, Health Connect/HealthKit permission flows, store purchases, push delivery, email delivery, and destructive account/privacy operations were not executed.
- Admin mutation flows were not exercised against the database because the task forbids unapproved production-like writes. Existing automated tests use request stubs; they are supporting evidence, not live CRUD proof.

## A. Executive Summary

### Inventory

- Mobile screens/stages discovered: **44** (5 tabs, 33 non-tab stack destinations, and 6 additional first-run stages; Upgrade is counted once).
- Admin concrete routes discovered: **63** (including login and index; excluding two wildcards).
- Backend HTTP handlers discovered: **256**.
- Prisma models discovered: **84**.
- Migration folders: **16**, of which **15 are applied and 1 is pending**.
- Distinct product/infrastructure features in the matrix: **97**.

### Status totals

| Status | Count |
|---|---:|
| WORKING | 17 |
| PARTIALLY WORKING | 52 |
| UI ONLY | 0 |
| STATIC / MOCK | 2 |
| BROKEN | 10 |
| NOT IMPLEMENTED | 2 |
| BLOCKED | 12 |
| NOT VERIFIED | 2 |
| **Total** | **97** |

### Overall assessment

The local platform is a substantial, coherent implementation with healthy core infrastructure, strong automated coverage, a real API-backed Android build, working admin authentication, and a usable exercise catalog. It is **not production-ready**. The release is blocked by a pending database migration that already causes a live Admin API 500, a core catalog with no published workouts or usable published training plans, missing email/push/store infrastructure, no in-app account deletion/export flow, unverified GPS/health/store behavior, and very large uncommitted working trees across all three repositories.

The current local data explains the mobile experience precisely: all three exercises are published, but there are zero workouts, zero workout sessions, zero published plans, zero stories, and zero achievements. The Home and Workout screens therefore show legitimate empty states, but the principal promise—receiving and completing a personalized workout plan—cannot currently complete.

## B. Feature-by-Feature Matrix

Complexity: S = less than one day, M = roughly 1–3 days, L = multi-day/cross-system, XL = release/infrastructure project.

| Feature ID | Module | Screen | Description | Status | Priority | Frontend source | Backend endpoint | Database dependency | Actual test performed | Evidence / failure reason | Required fix | Complexity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ONB-01 | Onboarding | Splash | Native/app splash and handoff | PARTIALLY WORKING | P2 | `SplashScreen.tsx`, `FirstRunGate.tsx` | None | local first-run state | Hot launch on Android; source/test inspection | Current app launches; clean cold-start timing was not re-run | Add cold-install E2E and startup performance assertion | M |
| ONB-02 | Onboarding | Intro | Admin-controlled intro carousel | PARTIALLY WORKING | P1 | `IntroScreen.tsx`, `useOnboardingCards.ts` | `GET /v1/app/onboarding` | `gym_onboarding_cards`, media | Live endpoint 200 with 4 items; 11 network/cache tests included in 91-pass suite | Live content exists; first-install UI path not re-run | Add clean-install Android/iOS E2E | M |
| ONB-03 | Onboarding | Language | 12 languages and RTL selection | PARTIALLY WORKING | P2 | `LanguageScreen.tsx`, `src/i18n/*` | Accept-Language headers | preferences/local state | Translation parity tests passed; English rendered on device | Arabic/RTL and persistence not manually exercised | Device matrix for language/RTL/font/layout | M |
| ONB-04 | Onboarding | Questionnaire | Goal, level, place, equipment, duration, days, body fields | PARTIALLY WORKING | P1 | `OnboardingScreen.tsx`, `steps.tsx` | Profile PATCH endpoints | user/gym profiles | Source/data mapping and storage round-trip tests | No clean isolated completion in this audit | Add E2E with metric/imperial and skip/back cases | M |
| ONB-05 | Onboarding | Plan Ready | Generate/assign a plan matching answers | BROKEN | P0 | `PlanReadyScreen.tsx` | `GET /v1/me/gym/training-plan` | plans, workouts, assignment | Android Home/Workout live; DB and public API read | 20 plans are DRAFT, 0 workouts exist, 0 plans are public; device says “plan is on its way” | Publish a validated plan graph with real workouts/exercises and verify assignment | L |
| ONB-06 | Onboarding | Completion | Persist answers and resume after restart | PARTIALLY WORKING | P1 | `FirstRunGate.tsx`, `localState.ts` | profile PATCH | profiles/local storage | Storage round-trip tests passed; existing signed-in session restored on Android | Fresh-account full journey not run | Automated full first-run/API E2E | M |
| AUTH-01 | Authentication | Sign In | Normal user sign-in and secure token persistence | WORKING | P0 | `AuthFlow.tsx`, `tokenStorage.ts` | `POST /v1/auth/login`, `GET /v1/auth/me` | users, auth sessions | Existing user session restored on physical Android; admin login also 200 | Authenticated app rendered real profile | Add release regression automation | S |
| AUTH-02 | Authentication | Sign Up | Register normal user | PARTIALLY WORKING | P1 | `AuthFlow.tsx` | `POST /v1/auth/register` | users/profiles/sessions | Validation/source and backend tests only | No new isolated user created in audit | Run disposable-account E2E and clean it through supported privacy path | M |
| AUTH-03 | Authentication | Verify Email | Email verification link flow | BLOCKED | P1 | `AuthFlow.tsx`, deep links | `POST /v1/auth/verify-email` | action tokens/users | Configuration presence check | `MAIL_PROVIDER=disabled`; device account visibly “Email not verified” | Configure transactional mail and verify real deep link | L |
| AUTH-04 | Authentication | Forgot/Reset | Password recovery | BLOCKED | P1 | `AuthFlow.tsx` | forgot/reset endpoints | action tokens | Source and env inspection | Endpoint exists but mail delivery is disabled | Configure mail; E2E reset and expiry/reuse cases | L |
| AUTH-05 | Authentication | Session | Access/refresh rotation and expiry handling | PARTIALLY WORKING | P1 | `client.ts`, `session.tsx` | refresh/logout/me | auth sessions | Existing persisted session restored; backend tests pass | Forced expiry/rotation not executed on device | Integration test expired access + rotated refresh + revocation | M |
| AUTH-06 | Authentication | Profile | Sign out | PARTIALLY WORKING | P2 | `ProfileScreen.tsx` | `POST /v1/auth/logout`, device DELETE | sessions/devices | Button and API traced | Not pressed to preserve audit session | Disposable-device E2E | S |
| AUTH-07 | Account | Profile/Legal | In-app data export and account deletion | NOT IMPLEMENTED | P0 | No mobile action | privacy-request endpoints exist outside Gym mobile repo wiring | privacy requests/users | Repository search | Legal text says contact HealthyMe/support; no GymFreak UI or repository method | Add authenticated export/delete request UI, status, confirmation, store-policy copy | L |
| HOME-01 | Home | Home | Real API-backed home shell/navigation | WORKING | P0 | `HomeScreen.tsx` | auth, week, recommendations, progress | profiles/catalog/sessions | Physical Android render and navigation | Real user name, goal and empty-state data rendered | Maintain E2E smoke | S |
| HOME-02 | Home | Home | Steps, distance, calories, minutes, streak | PARTIALLY WORKING | P1 | `HomeScreen.tsx`, health sync | progress/health/activity APIs | activities, health daily, streak | Physical device showed “No data yet”; aggregation tests passed | Legitimate empty state; no connected health data in audited account | Real-device Health Connect/HealthKit sync and cross-check source totals | L |
| HOME-03 | Home | Home | Today/weekly assigned workout | BROKEN | P0 | `HomeScreen.tsx` | training-plan API | plans/workouts/assignments | Physical Android and DB read | No published plan/workouts, so no workout can be assigned | Supply valid published content and verify personalization | L |
| HOME-04 | Home | Home | Admin-managed Quick Start | WORKING | P1 | `HomeScreen.tsx`, query hook | `GET /v1/quick-start` | quick-start/media/catalog | Live API returned 6; section rendered on Android | Server-driven items available | Add tap-target E2E for all target types | M |
| HOME-05 | Home | Home/Story Viewer | Story rail and playback | BROKEN | P1 | `StoryRail.tsx`, `StoryViewerScreen.tsx` | stories/view APIs | stories/views/media | Live API and DB count | 0 stories, so end-to-end viewer is inaccessible from content | Publish licensed story content and test playback/view persistence | M |
| HOME-06 | Home | Home | Personalized recommendations | BROKEN | P1 | `HomeScreen.tsx` | `GET /v1/me/gym/recommendations` | workouts/exercises/profile | Live data inspection | No workouts exist, so recommendation result cannot be useful | Create/publish workout catalog and recommendation acceptance tests | L |
| EXP-01 | Explore | Explore | Published exercise list | WORKING | P0 | `ExploreScreen.tsx` | `GET /v1/exercises` | gym exercises | Physical Android render; live API 200/3 | 3 published exercises returned | Expand production catalog | M |
| EXP-02 | Explore | Explore | Search by exercise name | WORKING | P0 | `ExploreScreen.tsx` | `GET /v1/exercises?search=` | gym exercises | Prior same-worktree physical search plus live catalog verification | All three named records are published; search path is API-backed | Add repeatable Detox/Maestro assertion | M |
| EXP-03 | Explore | Explore | Muscle/equipment/difficulty filters and paging | PARTIALLY WORKING | P1 | `ExploreScreen.tsx`, query hooks | catalog query endpoint | gym exercises | Source tracing and API pagination structure | Filter combinations not manually exercised; only 3 records | API/UI combinatorial tests with populated catalog | M |
| EXP-04 | Explore | Exercise Detail | Coaching, image/video and fallback visual | PARTIALLY WORKING | P1 | `ExerciseDetailScreen.tsx`, media components | exercise detail/media | exercises/media | Read-only record inspection | Bench has primary+thumbnail media; Push-Up and Curl have none and rely on fallback | Verify all media playback/fallback paths on both platforms | M |
| EXP-05 | Explore | Favorites | Favorite/unfavorite and list | PARTIALLY WORKING | P1 | `SettingsScreens.tsx`, query mutation | favorites GET/PUT/POST/DELETE | favorites | API/UI traced, backend tests | No live write performed | Disposable user E2E and idempotency test | M |
| EXP-06 | Explore | Exercise Detail | Exercise link sharing and referral attribution | PARTIALLY WORKING | P1 | `useShareExercise.ts`, deep links | share event/referral/public share page | share events/referrals | Physical Android native share sheet previously opened; deep-link tests pass | Analytics persistence currently blocked by pending migration | Apply migration after backup, then verify event/deep-link attribution | M |
| WORK-01 | Workout | Workout tab | Browse published workouts | BROKEN | P0 | `WorkoutPlanScreen.tsx` | `GET /v1/workouts` | workouts/exercises | Physical Android and live API | 200 with 0 items; DB has 0 workouts | Build and publish real workout catalog | L |
| WORK-02 | Workout | Workout tab | Assigned training plan/calendar | BROKEN | P0 | `WorkoutPlanScreen.tsx` | user training-plan endpoint | plans/plan workouts/user plans | Physical device + DB | 20 plans all DRAFT; no workouts; “No training plan yet” | Validate/import plan relationships, publish, assign | L |
| WORK-03 | Workout | Workout Detail | Workout detail and exercise sequence | BLOCKED | P0 | `WorkoutDetailScreen.tsx` | workout detail | workouts/workout exercises | Route/source exists | No workout ID can be reached from live catalog | Populate catalog, then device E2E | M |
| WORK-04 | Workout | Player | Start, sets, reps, rest, resume | BLOCKED | P0 | `WorkoutPlayerScreen.tsx`, `useWorkoutRunner.ts` | session create/patch/complete | workout sessions/sets | Unit/source/backend tests only | No real workout exists; DB has 0 sessions | Publish workout then complete device session with restart/resume | L |
| WORK-05 | Workout | Player sheets | Replace/add exercises during session | BLOCKED | P1 | `AddExerciseSheet.tsx`, `ReplaceSheet.tsx` | session exercise endpoints | session exercises | Source/API trace | Requires live workout session | E2E within disposable workout session | M |
| WORK-06 | Workout | Complete/History | Completion, achievements and history persistence | BLOCKED | P0 | `WorkoutCompleteScreen.tsx`, History | session complete/progress | sessions, sets, achievements | DB count and source trace | 0 sessions and 0 achievements; cannot execute real journey | Complete seeded/approved real workout and verify all downstream aggregates | L |
| ACT-01 | Activity | Activity tab | Activity dashboard and start chooser | WORKING | P1 | `ActivityScreen.tsx` | activity list/health connections | activities/health | Physical Android rendered and navigated | Live screen showed legitimate zero/current values | Maintain device smoke | S |
| ACT-02 | Activity | Start/Live/Summary | Running GPS/timer/calories/splits | PARTIALLY WORKING | P0 | `tracker.ts`, engine, screens | activity POST/GET | activities/route/splits | Engine tests including noisy GPS, jumps, pause, splits passed | No outdoor physical GPS route completed | Field test distance/pace/background/battery and compare known course | L |
| ACT-03 | Activity | Start/Live/Summary | Walking tracking | PARTIALLY WORKING | P1 | same as above | activity APIs | activity tables | Shared engine tests/source | No physical walking session | Field test | M |
| ACT-04 | Activity | Start/Live/Summary | Hiking/elevation tracking | PARTIALLY WORKING | P1 | same as above | activity APIs | activity/elevation | Elevation/calorie logic inspected | No real elevation course | Field test altitude noise and route gaps | L |
| ACT-05 | Activity | Start/Live/Summary | Trekking tracking | PARTIALLY WORKING | P1 | same as above | activity APIs | activity/elevation | Shared implementation inspected | No long-duration/background test | Extended field test | L |
| ACT-06 | Activity | Start/Live/Summary | Yoga timer/calories without GPS | PARTIALLY WORKING | P1 | activity screens/tracker | activity APIs | activities | Source and calculator tests | No live completed Yoga record in audited session | Complete and verify summary/history | M |
| ACT-07 | Activity | Live | Background/locked-screen recovery | PARTIALLY WORKING | P0 | `tracker.ts`, native config | activity save after finish | local storage + activities | Persistence/recovery code and unit tests | OS kill/lock/Doze behavior not measured | Android/iOS extended background test | L |
| ACT-08 | Health | Connected Health | Android Health Connect read/write/dedupe | NOT VERIFIED | P0 | `healthConnect.ts`, `sync.ts` | health sync/connections | health refs/daily/connections | Adapter compiled; physical device screen reachable | Permission/connect/sync was not authorized in audit | Real device sandbox data test | L |
| ACT-09 | Health | Connected Health | Apple Health read/write/dedupe | NOT VERIFIED | P0 | `appleHealth.ts`, `sync.ts` | same | same | iOS compilation only | No iOS runtime or HealthKit permission test | Physical iPhone test | L |
| ACT-10 | Activity | History/Detail | Server persistence, history, detail, deletion | PARTIALLY WORKING | P1 | history/detail screens | activities endpoints | activities/routes/splits | DB has 3 activities; list/detail code/tests | Audited Android account screen did not prove those exact records | Authenticated API/device reconciliation | M |
| PROG-01 | Progress | Progress | Week/month/streak aggregate | PARTIALLY WORKING | P1 | `ProgressScreen.tsx` | `GET /v1/me/gym/progress` | sessions/activities/streak rule | Physical Android rendered legitimate zeros | No completed workouts to validate aggregation | Populate real session and cross-check DB/API/UI | M |
| PROG-02 | Progress | Progress | Charts and active metrics | PARTIALLY WORKING | P2 | progress/FitnessSections | progress API | same | Rendered on Android | Empty data only; scale/large data not exercised | Golden/data-volume tests | M |
| PROG-03 | Progress | History | Workout history | BLOCKED | P1 | `SettingsScreens.tsx` | sessions/progress | workout sessions | DB count 0 | No workout session can be generated with current catalog | Resolve WORK-01/04 first | M |
| PROG-04 | Progress | Achievements | Earned badges and sharing | BROKEN | P1 | Achievements screen | progress + admin achievements | achievements/user achievements | DB count 0; Admin page exists | No definitions or unlockable content | Define approved rules/content and complete qualifying E2E | L |
| PROF-01 | Profile | Profile | Profile/account/access summary | WORKING | P0 | `ProfileScreen.tsx` | profile/access/nutrition | users/profiles/entitlements | Physical Android profile rendered real account/goal/body data | Values sourced from API | Add UI regression | S |
| PROF-02 | Profile | Training Preferences | Edit goal/level/location/days/equipment | PARTIALLY WORKING | P1 | `SettingsScreens.tsx` | profile PATCH | gym profile | Read path rendered; mutation traced | No write performed | Disposable-account save/reload test | M |
| PROF-03 | Nutrition | Nutrition Goals | Calculated target, inputs, override/history | PARTIALLY WORKING | P1 | `NutritionGoalsScreen.tsx` | nutrition endpoints | nutrition policy/targets/profile | Shared engine parity tests pass | Live writes and medical edge cases not exercised | Clinical/product review plus E2E | L |
| PROF-04 | Nutrition | Body Composition | Manual/Navy/imported body-fat history | PARTIALLY WORKING | P1 | `BodyCompositionScreen.tsx` | body-fat endpoints | body-fat measurements | Validation/engine/source inspection | No live measurement or health import | Disposable data E2E with deletion | M |
| UTIL-01 | Utilities | Water | Local water goal/history/reminders | WORKING | P2 | `WaterIntakeScreen.tsx`, storage | None for intake | device storage | Water/reminder tests passed; screen available | Device-local by design | Add clock/day-boundary device test | S |
| UTIL-02 | Utilities | Stopwatch | Stopwatch, pause, laps, restore | WORKING | P2 | `StopwatchScreen.tsx` | None | device storage | Stopwatch tests passed; screen available | Timestamp-based restore validated in tests | Add UI automation | S |
| UTIL-03 | Notes | Notes & Reminders | Synced notes CRUD | PARTIALLY WORKING | P1 | `NotesRemindersScreen.tsx`, organizer | notes endpoints | notes/categories | DB has 1 note; API/UI traced | No live CRUD in audit | Disposable note create/edit/delete/sync E2E | M |
| UTIL-04 | Reminders | Notes & Reminders | Recurrence, local delivery, completion/snooze | PARTIALLY WORKING | P1 | organizer/reminder schedule | reminder endpoints | reminders/completions/snoozes/schedules | Recurrence tests pass; DB has 0 reminders | Real notification delivery/timezone/DST not tested | Device time/permission/reboot suite | L |
| UTIL-05 | Settings | Units | Metric/imperial/auto conversion | WORKING | P2 | `UnitsScreen.tsx`, `utils/units` | preferences PATCH | gym preferences | Conversion and precedence tests passed; route available | Canonical units preserved | Device save/reload smoke | S |
| UTIL-06 | Settings | Notifications | Per-category preference controls | PARTIALLY WORKING | P1 | Notification Settings | notification preference endpoints | notification prefs/devices | API wiring inspected | Delivery provider absent, so switches cannot prove delivery | Configure sandbox push and test opt-out enforcement | L |
| I18N-01 | Cross-app | All | 12-language translation and Arabic RTL | PARTIALLY WORKING | P1 | `src/i18n/*` | localized catalog via header | translation JSON in records | Every-language key/placeholder tests passed | Only English physically rendered; content translations not comprehensively populated | Locale/RTL device matrix and content fallback audit | L |
| SUB-01 | Subscription | Profile/Upgrade | Server-driven access/free-plan display | WORKING | P1 | `UpgradeScreen.tsx`, Profile | access/plans | entitlements/trial config | Physical profile showed Free plan; API source traced | Correctly reflects disabled billing/trial | Maintain contract tests | S |
| SUB-02 | Subscription | Upgrade | Free trial start | BLOCKED | P1 | `UpgradeScreen.tsx` | trial start | trial config/entitlement | Read-only config query | Trial enabled=false and autoStart=false | Product approval/configuration, then sandbox E2E | M |
| SUB-03 | Subscription | Upgrade | App Store/Play purchase and verification | BLOCKED | P0 | `purchases.ts`, Upgrade | checkout/subscription verify | plans/checkouts/subscriptions | Configuration presence audit | Billing disabled; Apple/Google verification credentials absent | Configure sandbox products/credentials; receipt and fraud tests | XL |
| SUB-04 | Subscription | Upgrade | Restore purchases | BLOCKED | P0 | `purchases.ts` | subscription verify | subscriptions | Source/native compilation only | Store accounts/products and server credentials absent | Sandbox restore on both platforms | L |
| NOTIF-01 | Notifications | Local reminders | Workout/water/personal local notifications | PARTIALLY WORKING | P1 | `notifications.ts`, scheduler | device schedule sync | prefs/schedules | Scheduler tests pass | Permission/delivery/reboot not observed | Device delivery suite | L |
| NOTIF-02 | Notifications | Push | Server campaigns, transactional push, deep links | BLOCKED | P0 | root sync/deep links | devices/notifications/campaign APIs | push devices/outbox/campaigns | Env/config and source inspection | No push provider or Expo access token; sends would queue/skip, not deliver | Configure sandbox Expo push, run opt-in/opt-out/deep-link test | XL |
| UPD-01 | App Updates | Global gate | Version check, optional/mandatory policy evaluation | WORKING | P1 | `AppUpdateGate.tsx`, `appUpdates.ts` | `GET /v1/app/version-check` | app update releases/features | Correct request returned 200 and no update; Admin route built/tested | No release correctly fails open | Maintain endpoint contract test | S |
| UPD-02 | App Updates | Admin/App gate | Draft/publish/rollback/mandatory user experience | PARTIALLY WORKING | P1 | AppUpdatesPage/Gate | Admin app-update CRUD/actions | releases/features/media | Admin tests/build; route registered; DB has 0 releases | No real draft/published policy or store URL was tested, per restriction | Sandbox store URLs and non-mandatory test release | L |
| SUP-01 | Support | Help/Tickets | Create/list/read/reply support requests | PARTIALLY WORKING | P1 | support screens/repository | support ticket/message APIs | tickets/messages/attachments | DB has 2 tickets; backend/Admin tests | No live user create/reply in audit | Disposable ticket E2E incl. attachment and push | M |
| SUP-02 | Support | Feedback | Submit feedback and Admin triage | PARTIALLY WORKING | P2 | `FeedbackScreen.tsx` | feedback APIs | feedback | DB has 1; Admin tests/API trace | No live submission/triage | E2E with cleanup | M |
| SUP-03 | Business | Partner With Us | Submit inquiry and Admin triage | PARTIALLY WORKING | P2 | `PartnerScreen.tsx` | partner APIs | partner inquiries | DB has 1; validation/source/Admin tests | No live submission/status change | E2E with consent and cleanup | M |
| REF-01 | Referrals | Refer & Earn | Code, claim, link attribution and rewards | PARTIALLY WORKING | P1 | `ReferEarnScreen.tsx`, deep links | referral APIs | program/rules/codes/events | Link/unit/backend tests; API wiring traced | Qualification/reward lifecycle not executed | Two-user isolated E2E with approved qualifying event | L |
| SHARE-01 | Sharing | Share Composer | Workout/activity/achievement cards and native share/save | WORKING | P1 | `src/features/sharing/*` | optional analytics | media library/local files | Physical Samsung: save image succeeded and native share sheet opened with generated image; no post sent | Core device share works | Add iOS physical test and accessibility regression | M |
| SHARE-02 | Sharing | Admin analytics | Persist/share funnel analytics | BROKEN | P0 | share tracking/Admin page | share-events + Admin analytics | `gym_share_events` | Authenticated live Admin GET | HTTP 500; Prisma migration `202610140001_gym_social_sharing` is pending | Backup, approve/apply migration, verify old rows and analytics | M |
| ADM-01 | Admin | Login/guard | Admin auth and unauthorized blocking | WORKING | P0 | AuthContext/RequireAuth | login/session | users/sessions | Keychain login 200, session 200, no-token 401 | Correct role boundary observed | Add E2E browser auth test | M |
| ADM-02 | Admin | Shell/routes | Sidebar, nested routes, refresh/deep links | WORKING | P0 | `App.tsx`, `AppShell.tsx` | page-specific | None | Vite deep URL 200; 63 routes registered; routing/tests/build pass | App Updates route and Outlet are present | Add Playwright render assertion for every nav link | M |
| ADM-03 | Admin | Exercises | Exercise list/editor/media/status/import | PARTIALLY WORKING | P0 | Exercises/Editor/import | Admin exercise/media APIs | exercises/media/audit log | 3 real published records; tests/build/API trace | Live mutation/import not executed; 2 exercises lack media | Browser/API E2E with disposable draft and cleanup | L |
| ADM-04 | Admin | Workouts | Workout builder/CRUD/import | PARTIALLY WORKING | P0 | `WorkoutsPage.tsx` | Admin workout CRUD | workouts/relations | Tests/source/API exist | No real records; live builder save not exercised | Approved disposable draft round-trip | L |
| ADM-05 | Admin | Training Plans | Plan builder/CRUD/import | PARTIALLY WORKING | P0 | `PlansPage.tsx` | Admin plan CRUD | plans/relations | 20 real DRAFT rows; import regression tests pass | None is publishable/useful without workouts; browser round-trip not run | Validate relationships and publish only approved content | L |
| ADM-06 | Admin | Import controls | JSON/TXT/CSV/XLSX preview, validation, bulk draft | PARTIALLY WORKING | P1 | `adminImport/*` | module create APIs | per module | Admin 200 tests include import; build passes | Actual browser file-picker round-trip not repeated; bulk writes withheld | Playwright fixtures for every schema/template | L |
| ADM-07 | Admin | Gym Users | Search/detail/plan/access management | PARTIALLY WORKING | P1 | `GymUsersPage.tsx` | Admin user/plan/access APIs | users/plans/entitlements | Dashboard authenticated 200; API/source/tests | Live assignment/access mutation not executed | Disposable user E2E and audit-log assertion | M |
| ADM-08 | Admin | Stories | Story scheduling/media/CRUD/import | PARTIALLY WORKING | P1 | `StoriesPage.tsx` | Admin story CRUD | stories/media/views | Automated tests and routes | 0 real stories; schedule/player integration unproven | Create approved draft fixture, publish in test DB only | L |
| ADM-09 | Admin | Quick Start | CRUD/reorder/targets | PARTIALLY WORKING | P1 | `QuickStartPage.tsx` | Admin quick-start APIs | quick-start/media/catalog | Public API returned 6 and Android section rendered | Admin mutation/reorder not live-tested | Browser reorder + public reflection E2E | M |
| ADM-10 | Admin | Onboarding | Cards/media/localization/reorder/publish | PARTIALLY WORKING | P1 | `OnboardingPage.tsx` | Admin onboarding APIs | cards/media | Public API 4; automated tests pass | Admin mutation and clean-install reflection not run | Browser-to-fresh-install E2E | L |
| ADM-11 | Admin | Media/Content | Media register/upload/confirm and content tiles | PARTIALLY WORKING | P0 | media/content pages/uploader | media/content CRUD | media/assets/content tiles | 30 MediaAsset rows; 28 processed images, 1 processed video, 1 failed image; 74 local files; API content has 7 sections | Failed asset and disk/DB reconciliation need review; live upload withheld | Orphan/failed-media report and disposable upload E2E | L |
| ADM-12 | Admin | Achievements | Definitions/criteria/media/import | PARTIALLY WORKING | P1 | `AchievementsPage.tsx` | Admin achievement CRUD | achievements | Tests/source routes | 0 definitions; no unlock journey | Define approved production achievements and verify triggers | L |
| ADM-13 | Admin | Notifications | Preview/schedule/send/cancel | BLOCKED | P0 | `NotificationsPage.tsx` | notification APIs | notifications/campaigns/devices | UI tests/source/config | No delivery provider/token; real send prohibited | Sandbox push provider and campaign E2E | XL |
| ADM-14 | Admin | Reminder Settings | System categories/default configuration | PARTIALLY WORKING | P2 | `ReminderSettingsPage.tsx` | reminder-settings APIs | categories/config | Tests/source/API route | Live change withheld; user reminder delivery unverified | Browser mutation in isolated DB plus mobile sync | M |
| ADM-15 | Admin | Subscriptions/Settings | Trial/paywall/access settings | PARTIALLY WORKING | P1 | `GymSettingsPage.tsx` | settings/trial APIs | trial config/entitlements | Read-only config returned expected disabled state | Mutation and storefront behavior withheld | Staging-only settings test with rollback | L |
| ADM-16 | Admin | Referrals/Coupons/Plans | Promotion and checkout management | PARTIALLY WORKING | P1 | `PromotionsPage.tsx` | referral/coupon/billing/checkouts APIs | promotion/billing models | Tests/build/API trace | No live financial mutation or checkout; billing disabled | Sandbox pricing/coupon/referral matrix | XL |
| ADM-17 | Admin | Support | Ticket/feedback/partner triage | PARTIALLY WORKING | P1 | `SupportPages.tsx` | support Admin APIs | support tables | Existing records plus 200-test suite | Actual browser reply/status mutation withheld | Browser/API E2E with isolated records | M |
| ADM-18 | Admin | App Updates | Release list/editor/preview/actions | PARTIALLY WORKING | P1 | `AppUpdatesPage.tsx` | app-update Admin API | update release/features | Route registered, build/test pass, public check 200 | DB has 0 policies; no live publish/rollback | Draft-only browser E2E with approved sandbox data | M |
| ADM-19 | Admin | Sharing Analytics | Funnel dashboard | BROKEN | P0 | `ShareAnalyticsPage.tsx` | `GET /v1/admin/gym/share-analytics` | share events | Live authenticated request | HTTP 500 due pending schema migration | Apply migration after backup and rerun | M |
| ADM-20 | Admin | Flags/Audit | Feature flags and audit log | PARTIALLY WORKING | P1 | config pages | feature flags/audit APIs | flags/audit logs | Flags read from DB; Admin tests/build | Live mutation withheld; coverage across all Gym admin mutations not manually reconciled | Audit-log completeness integration suite | M |
| INF-01 | Infrastructure | PostgreSQL | Local DB persistence/health | WORKING | P0 | Compose | health readiness | PostgreSQL | Docker inspect and health endpoint | PostgreSQL 16 healthy; localhost-only port 55432; named volume | Production backup/restore runbook still required | M |
| INF-02 | Infrastructure | Prisma | Schema/migration alignment | BROKEN | P0 | `prisma/schema.prisma`, migrations | all DB APIs | migration history | `prisma migrate status` | 16 migrations found; `202610140001_gym_social_sharing` unapplied; live 500 confirms impact | Backup then `db:deploy` with explicit approval; verify | M |
| INF-03 | Infrastructure | Backend | NestJS API runtime | WORKING | P0 | backend modules | health/ready + APIs | database | Health/readiness 200; lint/build/83 tests | Core server and DB connection healthy | Add deployed-environment smoke/observability | M |
| INF-04 | Infrastructure | Media | Local media persistence and health | PARTIALLY WORKING | P1 | media module/local storage | media endpoints | media assets/files | 74 files/32 MB; DB aggregates above | One failed DB image; file count exceeds MediaAsset count (support/orphans may explain it) | Non-destructive reconciliation and backup policy | M |
| INF-05 | Architecture | Data mode | Offline mock fallback | STATIC / MOCK | P1 | `mockRepository.ts`, repository factory | None | local mock storage | Source/env inspection | Any build missing both API envs silently uses mock data, risking misleading release/demo behavior | Fail closed in release builds; explicit dev-only mock flag/banner | M |
| INF-06 | Legal | Legal screens | Privacy/terms/help content | STATIC / MOCK | P0 | `SettingsScreens.tsx`, i18n copy | None | None | Source and device navigation inventory | Only short bundled paragraphs; not versioned legal documents; deletion is deferred to contact/support | Approved legal URLs/documents, consent/version history, account controls | L |
| INF-07 | Operations | Observability | Crash/error/performance monitoring | NOT IMPLEMENTED | P1 | No Sentry/Crashlytics integration found | logs only | None | Dependency/source scan | No production crash telemetry or alerting identified | Add privacy-reviewed crash/performance monitoring and alerting | L |
| INF-08 | Release | CI/deployment | Reproducible clean CI and production environment | PARTIALLY WORKING | P0 | package/native configs | deployment-specific | all | Local builds/tests and Git inspection | Local checks pass/are running, but 130+47 mobile, 14+31 backend, 13+15 Admin dirty/untracked entries mean current state is not a reproducible commit; production env not verified | Review/split/commit changes, CI clean checkout, staging deploy, release checklist | XL |

## C. Screen Inventory

### Mobile: first-run stages

1. Splash
2. Intro carousel
3. Language selection
4. Onboarding questionnaire
5. Authentication (sign-up, sign-in, forgot, reset, verify modes)
6. Plan Ready
7. Upgrade/offer

### Mobile: main tabs

1. Home
2. Explore
3. Workout / My Training Plan
4. Activity
5. Progress

### Mobile: stack destinations

- Workout Detail
- Exercise Detail
- Workout Player
- Workout Complete
- Story Viewer
- Upgrade
- Training Preferences
- Nutrition Goals
- Body Composition
- Notification Settings
- Language Settings
- Favorites
- Workout History
- Achievements
- Legal (privacy/terms/help parameterized view)
- Water Intake
- Stopwatch
- Notes & Reminders
- Help & Support
- New Support Ticket
- Support Ticket Detail
- Send Feedback
- Partner With Us
- Refer & Earn
- Profile
- Activity Start
- Activity Live
- Activity Summary
- Activity History
- Activity Detail
- Activity Settings
- Connected Health
- Units

No orphaned exported `*Screen` component was found outside the first-run gate or navigator inventory. Some parameterized modes are distinct user journeys but not counted as separate screen components.

### Admin routes

The Admin has 63 concrete routes. GymFreak routes are:

- `/gym`
- `/gym/exercises`, `/gym/exercises/new`, `/gym/exercises/:id`
- `/gym/workouts`, `/gym/workouts/new`, `/gym/workouts/:id`
- `/gym/plans`, `/gym/plans/new`, `/gym/plans/:id`
- `/gym/users`, `/gym/users/:id`
- `/gym/support/tickets`, `/gym/support/tickets/:id`, `/gym/support/feedback`, `/gym/support/partners`, `/gym/support/partners/:id`
- `/gym/stories`, `/gym/stories/new`, `/gym/stories/:id`
- `/gym/quick-start`
- `/gym/app/onboarding`
- `/gym/app/updates`
- `/gym/analytics/sharing`
- `/gym/app/media`
- `/gym/app/nutrition`
- `/gym/app/explore`
- `/gym/app/onboarding-questions`
- `/gym/achievements`
- `/gym/notifications`
- `/gym/reminder-settings`
- `/gym/subscriptions`
- `/gym/settings`
- `/gym/referrals`
- `/gym/coupons`
- `/gym/plans-checkouts`

Shared HealthyMe Admin routes also present are login/dashboard, users, media, feature flags, audit log, Meditation topics/categories/meditations/ambient/breathing, Still Mind subscription/lifecycle, and Diet foods/plans/version editors. They were inventoried but not functionally mutated because the task specifically forbids modifying HealthyMe/LongLivy behavior.

`/gym/app/updates` is registered, lazy-loads `AppUpdatesPage`, is linked in the sidebar, is nested under `RequireAuth` and `AppShell`, and `AppShell` renders `<Outlet />`. The earlier route-not-found defect is not present in the current source.

## D. Broken User Journeys

### D1. New user cannot receive a usable personalized training plan

1. Complete onboarding and save preferences.
2. Backend tries to select/assign published plan content.
3. Database has 20 plans, all DRAFT, and zero workouts.
4. Mobile Home displays “Your plan is on its way”; Workout displays “No training plan yet.”

Impact: the primary GymFreak promise cannot proceed to workout detail/player/completion.

### D2. Workout completion journey is unreachable

1. Open Workout or Explore workout content.
2. Public workout API returns zero items.
3. No workout ID is available for Workout Detail or Player.
4. No session can be started, resumed, completed, or reflected in workout progress/history.

### D3. Share analytics crashes

1. Authenticate as the existing local ADMIN.
2. Request `GET /v1/admin/gym/share-analytics?days=30`.
3. Result is HTTP 500 with a request ID.
4. `prisma migrate status` shows `202610140001_gym_social_sharing` pending.

Impact: share UI can open, but current analytics persistence/reporting is schema-incompatible.

### D4. Email verification/password recovery cannot complete

1. Register or request password recovery.
2. Backend can create the relevant action-token flow.
3. Local environment has `MAIL_PROVIDER=disabled`.
4. User receives no message/link; audited Android profile remains unverified.

### D5. Paid upgrade and restore cannot complete

1. Open Upgrade.
2. Access response has billing disabled.
3. No Apple or Google server-side verification credentials/product environment are configured.
4. Purchase/restore cannot be verified end to end.

### D6. Push notification campaigns cannot deliver

1. Admin composes/previews a campaign.
2. Backend has no configured push provider or Expo token.
3. Delivery job has no real provider.

The audit intentionally did not send a campaign.

### D7. Account deletion/export is not reachable in GymFreak

1. Open Profile and Legal.
2. Legal copy tells the user to use HealthyMe privacy settings or contact support.
3. No GymFreak screen/repository method submits or tracks an export/deletion request.

## E. Static/Mock Data Report

| Source | Finding | Risk |
|---|---|---|
| `src/services/repositories/index.ts` | Defaults to the offline mock repository whenever `EXPO_PUBLIC_GYM_DATA_MODE=api` or the API URL is absent | A misconfigured release can look functional while using fake local catalog/account/session data |
| `src/services/mock/*` | Contains sample account, catalog, sessions, workouts and derived plan data for UI development | Acceptable in explicit development mode; unsafe as silent fallback |
| `SettingsScreens.tsx` + i18n | Privacy, terms and help are short bundled paragraphs | Not adequate as versioned production legal/support content |
| Auth placeholders | “John”, “Doe”, example email and numeric input placeholders | Benign form hints, not displayed business data |
| Empty-state numbers | Home/Progress show 0 or “No data yet” from real API responses | Correct empty states, not fake metrics |

No bundled Home/Explore/Workout content photos are currently shipped; automated tests enforce server-managed content. Many tracked legacy images are deleted in the dirty worktree, so the server-media replacement must be reviewed and committed atomically before release.

## F. Backend Integration Gaps

1. Social-sharing code expects columns that are absent until the pending migration is deployed; the Admin analytics API currently returns 500.
2. No published workout graph exists, so training-plan assignment, recommendations, workout sessions, completion, workout history and achievement triggers are operationally disconnected even though APIs/models exist.
3. Email transport is disabled; verification and recovery are incomplete user journeys.
4. Push transport is absent; notification outbox/campaign infrastructure cannot demonstrate delivery.
5. Apple/Google billing verification is unconfigured; paid subscription APIs cannot be trusted without sandbox receipt tests.
6. Universal/app links are incomplete: Apple team ID, Android signing fingerprints, bundle/package server configuration and store URLs are absent. Public web URL is configured, but association files cannot be production-valid without identifiers.
7. App update API works but has no release rows; mandatory/optional runtime behavior is therefore unproven.
8. One MediaAsset is FAILED and local files outnumber MediaAsset records; a non-destructive reconciliation is needed.
9. No production observability integration was identified.
10. API mode correctly targets the LAN address locally, but release configuration can silently fall back to mocks.

## G. Admin Panel Gaps

1. Sharing Analytics is visibly wired but its live API returns 500 due to schema drift.
2. Workout management has no real records; plan drafts cannot form a usable mobile plan.
3. Twenty Training Plan rows are drafts and no public plan is returned.
4. Stories and achievements have no records, so scheduling/unlock/player functionality is unproven.
5. Notifications UI cannot prove delivery without a provider.
6. App Updates route is fixed and built, but no live policy exercises preview/publish/disable/rollback against the database.
7. Import/export automated tests pass, including shared controls, but browser file-picker/template round-trips were not repeated in this audit.
8. The production build warns that the parent `../tsconfig.json` extends `expo/tsconfig.base`, which cannot be resolved from the Admin build context. It is non-fatal but indicates cross-repository configuration leakage.
9. The generated main Admin bundle is about 411 KB gzip 126 KB; ExcelJS is about 937 KB (gzip 271 KB). Import code is split, but performance should be checked on slower admin machines.
10. Mutating CRUD actions remain PARTIALLY WORKING until a disposable test DB/browser E2E can create, read, update, archive and clean up each entity while confirming audit logs.

## H. Platform Differences

| Area | Android | iOS |
|---|---|---|
| Runtime | Physical Samsung SM-S901E tested | Not booted; runtime NOT VERIFIED |
| Main navigation | Home, Explore, Workout, Activity, Progress and Profile rendered | Source parity only |
| API reachability | Device ping and TCP 3000 to `192.168.1.17` succeeded | Simulator networking not exercised in this audit |
| Native share | Generated image saved and native share sheet opened on Samsung | Compilation/source only |
| Health | Health Connect adapter compiled; permissions/sync not run | HealthKit pod compiled; permissions/sync not run |
| GPS/background | Code and deterministic engine tests pass; no field accuracy test | No runtime test |
| Build | Debug Gradle build run with JDK 17 and explicit Android SDK path | Simulator build run without booting a simulator |
| Notifications | Permission/delivery not exercised | Permission/delivery not exercised |
| Purchases | Play store adapter compiled; no sandbox product/account | StoreKit adapter compiled; no sandbox account/product |

Platform-specific production blockers are Apple associated-domain/team configuration, Android asset-link signing fingerprints, store URLs/products, physical iOS testing, and real permission/background behavior on both OSes.

## I. External Dependencies

| Dependency | Local status | Needed for production verification |
|---|---|---|
| PostgreSQL 16 | Healthy locally, persistent named volume, localhost-only | Managed production DB, backups, restore drill, monitoring |
| Email provider | Disabled | Transactional provider, verified domain/sender, delivery/bounce testing |
| Expo push | Not configured | Access token/provider, sandbox devices, delivery and opt-out tests |
| Apple IAP | Not configured | App Store Connect products, issuer/key/private key, bundle ID, sandbox users |
| Google Play billing | Not configured | Play Console products, service account, package name, license testers |
| Apple universal links | Team ID absent | Valid AASA deployment and signed-app test |
| Android app links | SHA-256 fingerprints absent | Valid assetlinks deployment for debug/release signing |
| Store URLs | Absent | Verified App Store/Play URLs before update policy publication |
| Public share web | `https://gymfreak.app` configured | DNS/TLS/deployed share pages and association-file verification |
| Crash/telemetry | Not identified | Privacy-reviewed SDK, release symbols/maps, alerts |
| Map/location services | Native packages/config present | Physical route tests, permission copy, battery/privacy review |
| OpenAI | Optional AI workflow only; not used in this audit | Not required for runtime catalog consumption |

## J. Production Release Blockers

### P0

1. Apply and verify the pending social-sharing migration; current Admin analytics returns 500.
2. Create/publish a real, reviewed workout catalog and at least one complete training plan; the central workout journey is unreachable.
3. Add in-app account export/deletion request handling appropriate to store/privacy requirements.
4. Establish reproducible source state: the three repositories contain extensive uncommitted/untracked changes (mobile 130 changed/deleted + 47 untracked; backend 14 + 31; Admin 13 + 15).
5. Configure and sandbox-test purchase verification before enabling billing.
6. Configure and test push delivery before relying on reminders/campaigns.
7. Complete real-device GPS/background/health testing on Android and iOS.
8. Replace/approve production legal documents and consent/version handling.

### P1

1. Configure transactional mail and test verification/recovery.
2. Publish story and achievement content or explicitly remove/disable their empty entry points for launch scope.
3. Complete universal/app-link association configuration and deployed-domain checks.
4. Resolve failed/orphan media and define backups/retention.
5. Add production observability and alerting.
6. Verify Admin CRUD/import flows in a disposable environment.
7. Prevent silent mock fallback in release builds.
8. Run a physical iOS release-candidate smoke suite.

## K. Recommended Fix Order

### Phase 1 — P0 release blockers

1. Freeze/review the dirty working trees and create reviewable commits without losing current work.
2. Back up `healthyme_dev`, apply only the committed pending migration with approval, and prove sharing analytics plus backward compatibility.
3. Build a minimal approved catalog graph: exercises → workouts → published training plan → user assignment.
4. Run the full onboarding → assigned plan → workout → completion → progress journey on a disposable user.
5. Implement account export/deletion UI and audited backend interaction.
6. Configure sandbox billing/push and verify both platforms; keep production switches disabled until complete.
7. Run physical GPS/background/health tests and privacy review.

### Phase 2 — P1 core functionality

1. Configure mail and test verification/reset/deep links.
2. Complete stories, achievements and recommendations with approved content.
3. Validate every Admin Gym CRUD/import workflow with cleanup and audit-log assertions.
4. Complete app/universal links and share-web deployment.
5. Resolve media failures/orphans and establish backup/retention.
6. Add crash/performance monitoring and operational alerts.

### Phase 3 — P2 incomplete features

1. Device-test Water, Stopwatch, Notes/Reminders across timezone, reboot and permission changes.
2. Verify all 12 locales, Arabic RTL, long strings and localized backend content.
3. Exercise large catalog/filter/pagination and Admin performance.
4. Add App Update draft/optional policy staging tests without publishing a mandatory production policy.

### Phase 4 — P3 polish

1. Accessibility audit with screen reader, dynamic text and contrast.
2. Slow/offline network and low-memory testing.
3. Startup, image/video and bundle performance budgets.
4. Final release-candidate regression matrix on supported OS/device versions.

## L. Top 20 Critical Findings

1. **P0:** Share Analytics live API returns HTTP 500 because `202610140001_gym_social_sharing` is unapplied.
2. **P0:** There are zero workouts; the workout player and completion loop are operationally unreachable.
3. **P0:** All 20 training plans are DRAFT, so onboarding cannot yield a usable assigned plan.
4. **P0:** GymFreak has no in-app account export/deletion request flow.
5. **P0:** Current code is not reproducible from Git: hundreds of local changes/untracked files span three repositories.
6. **P0:** Paid purchase and restore flows lack Apple/Google server verification configuration and sandbox proof.
7. **P0:** Push notifications lack a provider/token and cannot deliver.
8. **P0:** Real GPS accuracy, long-running background tracking and OS-kill recovery are not field-tested.
9. **P0:** Android Health Connect and iOS HealthKit are not permission/sync tested on real devices.
10. **P0:** Current legal screens are brief static copy, not production legal/privacy/account-management flows.
11. **P1:** Email verification and password recovery cannot deliver because mail is disabled.
12. **P1:** iOS compiles but has no runtime verification in this audit.
13. **P1:** The offline mock repository is the silent default when release environment variables are missing.
14. **P1:** Stories and achievements are empty, leaving visible product areas without end-to-end content.
15. **P1:** Recommendations cannot be useful without workouts.
16. **P1:** Universal/app-link association lacks Apple team ID and Android signing fingerprints.
17. **P1:** One media row is FAILED and 74 local files versus 30 MediaAsset rows require reconciliation.
18. **P1:** No crash/performance monitoring integration was identified.
19. **P1:** Admin tests are strong, but most live mutation paths remain unverified because this audit correctly avoided DB writes.
20. **P2:** Admin build succeeds with a non-fatal unresolved inherited Expo tsconfig warning, indicating configuration coupling.

## Appendix 1 — Current local data snapshot

- Feature flags: `gym_admin_enabled=true`, `gym_user_enabled=true`, `gym_public_enabled=true`, `gym_notes_reminders_enabled=true`.
- Users: 5.
- Exercises: 3, all PUBLISHED.
- Workouts: 0.
- Training plans: 20, all DRAFT; public endpoint returns 0.
- Stories: 0.
- Achievements: 0.
- Workout sessions: 0.
- Activities: 3.
- Notes: 1; reminders: 0.
- Support tickets: 2; feedback: 1; partner inquiries: 1.
- MediaAsset rows: 30 (28 processed images, 1 processed video, 1 failed image).
- Local media files: 74 files, approximately 32 MB.
- App update releases: 0.
- Trial: disabled; auto-start disabled; paywall visible/enabled in configuration; billing disabled.

Published exercise completeness:

- Dumbbell Bench Press: primary and thumbnail media attached; 3 sets, 8–12 reps, 8 instruction steps, 5 safety notes.
- Standard Push-Up: no media; existing fallback is required; 3 sets, 8–12 reps, 6 instruction steps, 3 safety notes.
- Standing Dumbbell Bicep Curl: no media; existing fallback is required; 3 sets, 10–12 reps, 7 instruction steps, 4 safety notes.

## Appendix 2 — Verification commands/results summary

- Mobile: `npm run typecheck` — pass.
- Mobile: `npm test -- --runInBand` — 91/91 pass.
- Backend: lint — pass; TypeScript build — pass; Jest — 83/83 pass.
- Admin: typecheck — pass; lint — pass; Vite production build — pass; Vitest — 200/200 pass.
- PostgreSQL container: healthy, PostgreSQL 16, `127.0.0.1:55432`.
- Backend: health 200; ready 200.
- Admin auth: login 200; session 200; Gym dashboard 200; unauthenticated session 401.
- Public API: exercises 200/3; workouts 200/0; training plans 200/0; stories 200/0; quick start 200/6; onboarding 200/4; content sections 200/7.
- App version check with valid parameters: 200, `updateAvailable=false`.
- Sharing analytics: authenticated 500.
- Prisma: 16 migrations found; one unapplied.
- Admin deep link `/gym/app/updates`: Vite HTML 200; route/component/nav registration confirmed. Actual authenticated browser rendering was not automated in this audit and is therefore not overstated.

## Appendix 3 — Change control

The only source-repository file intentionally created by this audit is this report. No application source, environment variable, database row, migration state, media file, credential, external service, notification, purchase, commit, or remote branch was modified.
