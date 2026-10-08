import { mergeTranslations, type Translation } from './types';
import { deApp } from './app/de';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/de.ts`. */
const firstRun: Translation = {
  common: { next: 'Weiter', back: 'Zurück', skip: 'Überspringen', done: 'Fertig', continue: 'Weiter', save: 'Speichern', cancel: 'Abbrechen', search: 'Suchen', close: 'Schließen', seeAll: 'Alle ansehen', min: 'Min.', reps: 'Wdh.', sec: 'Sek.', sets: 'Sätze', edit: 'Bearbeiten', on: 'An', off: 'Aus' },
  splash: { tagline: 'Besser trainieren. Stärker bewegen.' },
  intro: {
    slides: [
      { tag: 'Persönlich', title: 'Training, das zu dir passt', body: 'Deine Ziele, Erfahrung und dein Alltag formen jedes Workout.' },
      { tag: 'Angeleitet', title: 'Jede Bewegung klar sehen', body: 'Klare Demos mit den Hinweisen, auf die es ankommt.' },
      { tag: 'Fortschritt', title: 'Fortschritt, den du wirklich siehst', body: 'Serien, Statistiken und Bestleistungen an einem Ort.' },
      { tag: 'Dranbleiben', title: 'Kleine Erfolge. Jede Woche.', body: 'Wöchentliche Challenges, die dich in Bewegung halten.' },
    ],
    start: 'Los geht’s',
    visual: {
      goal: 'Dein Ziel', goalValue: 'Muskeln aufbauen', schedule: '4 Tage / Woche', level: 'Fortgeschritten',
      exercise: 'Goblet Squat', reps: 'Wdh.', sets: 'Sätze', muscle: 'Muskelgruppe', muscleValue: 'Gesäß · Oberschenkel', technique: 'Technik', techniqueValue: 'Langsam absenken',
      thisWeek: 'Diese Woche', workouts: 'Workouts', minutes: 'Minuten', personalBest: 'Neue Bestleistung',
      challenge: 'Wochen-Challenge', challengeValue: '3 von 4 Workouts', streak: 'Tage-Serie', badge: 'Abzeichen freigeschaltet', badgeValue: 'Frühaufsteher', complete: 'Workout geschafft',
    },
  },
  language: { title: 'Wähle deine Sprache', body: 'Du kannst sie jederzeit ändern.', search: 'Sprache suchen', popular: 'Beliebt', all: 'Alle Sprachen', results: 'Ergebnisse', noResults: 'Keine Sprache passt zu „{query}“.', continueIn: 'Weiter auf {language}' },
  auth: {
    signUpTitle: 'Konto erstellen', signUpBody: 'Speichere deinen Plan und starte noch heute.',
    signInTitle: 'Willkommen zurück', signInBody: 'Mach genau da weiter, wo du aufgehört hast.',
    firstName: 'Vorname', lastName: 'Nachname (optional)', email: 'E-Mail', password: 'Passwort', confirmPassword: 'Passwort bestätigen', passwordHint: 'Mindestens 8 Zeichen',
    signIn: 'Anmelden', signUp: 'Konto erstellen', forgot: 'Passwort vergessen?', noAccount: 'Neu bei Gym Freak?', haveAccount: 'Schon ein Konto?', switchToSignUp: 'Jetzt registrieren', switchToSignIn: 'Anmelden',
    forgotTitle: 'Passwort zurücksetzen', forgotBody: 'Gib deine E-Mail ein und wir schicken dir einen Link.', sendLink: 'Link senden', linkSent: 'Falls ein Konto existiert, ist ein Link unterwegs. Schau in dein Postfach.', backToSignIn: 'Zurück zur Anmeldung',
    resetTitle: 'Neues Passwort wählen', resetBody: 'Mindestens 8 Zeichen.', newPassword: 'Neues Passwort', savePassword: 'Passwort speichern', passwordUpdated: 'Passwort geändert. Melde dich mit dem neuen Passwort an.',
    verifyTitle: 'E-Mail bestätigen', verifyBody: 'Wir haben einen Bestätigungslink an {email} gesendet. Tippe ihn auf diesem Gerät an.', verified: 'E-Mail bestätigt. Alles bereit!', verifyLater: 'Später erledigen', checked: 'Ich habe bestätigt',
    phoneSoon: 'Anmeldung per Telefonnummer folgt bald.', terms: 'Mit dem Fortfahren akzeptierst du unsere AGB und Datenschutzerklärung.',
    errors: { required: 'Bitte fülle alle Felder aus.', email: 'Gib eine gültige E-Mail-Adresse ein.', passwordLength: 'Verwende mindestens 8 Zeichen.', mismatch: 'Die Passwörter stimmen nicht überein.', invalid: 'E-Mail oder Passwort ist falsch.', exists: 'Es gibt bereits ein Konto mit dieser E-Mail. Melde dich an.', network: 'Du scheinst offline zu sein. Prüfe deine Verbindung.', generic: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.', tokenInvalid: 'Dieser Link ist ungültig oder abgelaufen.', rateLimited: 'Zu viele Versuche. Bitte warte eine Minute.' },
  },
  onboarding: {
    stepOf: 'Schritt {current} von {total}',
    goal: {
      title: 'Wofür trainierst du?', subtitle: 'Wähle das Ziel, das dir gerade am wichtigsten ist.', cta: 'Das ist mein Ziel',
      options: {
        'build-muscle': { title: 'Muskeln aufbauen', body: 'Mehr Masse und Kraft.' },
        'lose-fat': { title: 'Fett verlieren', body: 'Definierter, leichter fühlen.' },
        'get-stronger': { title: 'Stärker werden', body: 'Mehr heben, kraftvoll bewegen.' },
        'stay-fit': { title: 'Fit bleiben', body: 'Sich jeden Tag gut fühlen.' },
        'improve-endurance': { title: 'Ausdauer steigern', body: 'Länger durchhalten, schneller erholen.' },
        'improve-mobility': { title: 'Beweglicher werden', body: 'Frei bewegen, ohne Steifheit.' },
      },
    },
    experience: {
      title: 'Wo startest du?', subtitle: 'Keine falschen Antworten. Wir holen dich ab.',
      options: {
        beginner: { title: 'Einsteiger', body: 'Ich lerne noch die Grundlagen.' },
        intermediate: { title: 'Fortgeschritten', body: 'Ich trainiere regelmäßig.' },
        advanced: { title: 'Profi', body: 'Training gehört zu meinem Lifestyle.' },
      },
    },
    location: {
      title: 'Wo trainierst du meistens?', subtitle: 'Wir passen jede Übung an deinen Ort an.',
      options: {
        gym: { title: 'Studio', body: 'Racks, Geräte und freie Gewichte.' },
        home: { title: 'Zuhause', body: 'Dein Raum, dein Zeitplan.' },
        both: { title: 'Beides', body: 'Mal so, mal so.' },
      },
    },
    days: {
      title: 'An wie vielen Tagen kannst du pro Woche trainieren?', subtitle: 'Konstanz schlägt Perfektion.', unit: 'Tage / Woche', cta: 'Meine Woche festlegen',
      weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      feedback: { 2: 'Ein kluger, stetiger Start.', 3: 'Gute Balance.', 4: 'Du baust echte Konstanz auf.', 5: 'Perfekt für schnellere Fortschritte.', 6: 'Athletenmodus. Erholung inklusive.', 7: 'Jeden Tag, mit aktiver Erholung.' },
    },
    duration: {
      title: 'Wie viel Zeit hast du?', subtitle: 'Pro Einheit. Wir nutzen jede Minute.', unit: 'Min.',
      options: { '20-30': 'Kurz & fokussiert', '30-45': 'Der Sweet Spot', '45-60': 'Volle Konzentration', '60-90': 'Komplette Einheit' },
    },
    equipment: {
      title: 'Welche Ausrüstung kannst du nutzen?', subtitle: 'Wähle alles aus, worauf du Zugriff hast.', selected: '{count} ausgewählt',
      options: { dumbbells: 'Kurzhanteln', barbell: 'Langhantel', bench: 'Hantelbank', 'cable-machine': 'Kabelzug', bands: 'Fitnessbänder', 'smith-machine': 'Multipresse', 'pull-up-bar': 'Klimmzugstange', machines: 'Geräte', bodyweight: 'Körpergewicht', 'full-gym': 'Komplettes Studio' },
    },
    age: { title: 'Wie alt bist du?', subtitle: 'Hilft uns, die richtige Intensität zu wählen.', unit: 'Jahre' },
    height: { title: 'Wie groß bist du?', subtitle: 'Damit wir deine Trainingslasten feinjustieren.', unit: 'cm' },
    weight: { title: 'Wie viel wiegst du?', subtitle: 'Nur für dich sichtbar. Immer.', unit: 'kg' },
    gender: {
      title: 'Wie identifizierst du dich?', subtitle: 'Hilft uns, deinen Plan anzupassen.', cta: 'Meinen Plan erstellen',
      options: { woman: 'Frau', man: 'Mann', 'non-binary': 'Nicht-binär', unspecified: 'Keine Angabe' },
    },
    complete: {
      building: 'Dein Plan wird erstellt', checks: ['Ziel wird abgestimmt', 'Zeitplan wird angepasst', 'Übungen werden ausgewählt'],
      title: 'Dein Plan ist bereit', body: 'Abgestimmt auf dein Ziel, deinen Zeitplan und deine Ausrüstung.',
      goal: 'Ziel', schedule: 'Zeitplan', session: 'Einheit', location: 'Ort', perWeek: '{count} Tage / Woche',
      cta: 'Los geht’s', error: 'Dein Plan konnte nicht gespeichert werden. Prüfe deine Verbindung.', retry: 'Erneut versuchen',
    },
  },
  states: { errorTitle: 'Etwas ist schiefgelaufen', network: 'Du scheinst offline zu sein. Prüfe deine Verbindung und versuche es erneut.', generic: 'Das konnten wir gerade nicht laden.', locked: 'Das ist Teil von Gym Freak Pro.', retry: 'Erneut versuchen' },
  catalog: {
    muscles: { chest: 'Brust', back: 'Rücken', shoulders: 'Schultern', biceps: 'Bizeps', triceps: 'Trizeps', legs: 'Beine', glutes: 'Gesäß', core: 'Rumpf', cardio: 'Cardio', mobility: 'Mobilität', 'full-body': 'Ganzkörper' },
    difficulty: { beginner: 'Einsteiger', intermediate: 'Fortgeschritten', advanced: 'Profi' },
    modes: { strength: 'Kraft', bodyweight_reps: 'Körpergewicht', timed: 'Auf Zeit' },
  },
  nav: { Home: 'Start', Workout: 'Training', Explore: 'Entdecken', Progress: 'Fortschritt', Profile: 'Profil' },
  home: {
    goodMorning: 'Guten Morgen', goodAfternoon: 'Guten Tag', goodEvening: 'Guten Abend',
    todaysWorkout: 'Heutiges Training', nextUp: 'Als Nächstes', exercises: '{count} Übungen', start: 'Training starten',
    restDay: 'Ruhetag', restBody: 'Erholung gehört zum Plan. Lust auf Bewegung? Probier eine Mobility-Session.',
    noPlan: 'Dein Plan ist unterwegs', noPlanBody: 'Stöbere in den Workouts und starte, wann du willst.', browse: 'Workouts ansehen',
    stories: 'Diese Woche', recommended: 'Empfohlen für dich',
    thisWeek: 'Diese Woche', workouts: 'Workouts', time: 'Zeit', streak: 'Serie', days: 'Tage',
    trialBanner: 'Noch {days} Tage in deiner Testphase', trialCta: 'Pro ansehen',
  },
  plan: { title: 'Mein Trainingsplan', subtitle: 'Deine Woche, auf dich abgestimmt.', today: 'Heute', upcoming: 'Geplant', completed: 'Erledigt', rest: 'Ruhe', missed: 'Verpasst', restDay: 'Ausruhen & erholen', allWorkouts: 'Alle Workouts', noPlan: 'Noch kein Trainingsplan', noPlanBody: 'Dir wurde noch kein Plan zugewiesen. Wähle ein Workout unten.', day: 'Tag {number}' },
  workout: { overview: 'Überblick', exercises: 'Übungen', equipment: 'Ausrüstung', start: 'Training starten', resume: 'Training fortsetzen', locked: 'Mit Pro freischalten', lockedBody: 'Dieses Workout ist Teil von Gym Freak Pro.', minutes: '{count} Min.', exerciseCount: '{count} Übungen' },
  exercise: {
    target: 'Zielmuskel', secondary: 'Sekundär', equipment: 'Ausrüstung', difficulty: 'Level',
    howTo: 'So geht’s', formTips: 'Technik-Tipps', mistakes: 'Häufige Fehler', breathing: 'Atmung', prescription: 'Sätze & Wiederholungen',
    sets: 'Sätze', reps: 'Wdh.', rest: 'Pause', duration: 'Dauer', favorite: 'Merken', favorited: 'Gemerkt', addToWorkout: 'Zum Workout', replace: 'Übung tauschen', usedIn: 'Enthalten in',
    lockedTitle: 'Pro-Übung', lockedBody: 'Upgrade, um Anleitung und Demo freizuschalten.', addSoon: 'Eigene Workouts folgen bald.', none: 'Keine',
  },
  player: {
    exerciseOf: 'Übung {current} von {total}', setOf: 'Satz {current} / {total}', target: 'Ziel', repsTarget: '{count} Wdh.', secondsTarget: '{count} Sek.',
    completeSet: 'Satz abschließen', skip: 'Überspringen', replace: 'Tauschen', info: 'Info', previous: 'Zurück', next: 'Weiter',
    rest: 'PAUSE', addTime: '+15 Sek.', skipRest: 'Pause überspringen', upNext: 'Als Nächstes', lastSet: 'Letzter Satz!',
    quitTitle: 'Training beenden?', quitBody: 'Erledigte Sätze zählen dann nicht für deinen Fortschritt.', quit: 'Beenden', keepGoing: 'Weitermachen',
    finish: 'Training abschließen', starting: 'Dein Training wird vorbereitet…', replaceTitle: 'Übung tauschen', noAlternatives: 'Keine ähnlichen Übungen verfügbar.',
    speechRestOver: 'Pause vorbei. Nächster Satz.', speechNext: 'Nächste Übung: {name}', speechDone: 'Training geschafft. Starke Leistung!', startTimer: 'Start', pauseTimer: 'Pause', timerDone: 'Fertig',
    saving: 'Training wird gespeichert…', saveFailed: 'Satz konnte nicht gespeichert werden. Wir versuchen es erneut.', restNotification: 'Pause vorbei. Zeit für den nächsten Satz!',
  },
  complete: {
    title: 'Training geschafft', subtitle: 'Starke Leistung!', duration: 'Dauer', exercises: 'Übungen', sets: 'Sätze', calories: 'ca. kcal',
    achievements: 'Erfolge freigeschaltet', share: 'Teilen', done: 'Fertig', shareMessage: 'Gerade {name} bei Gym Freak geschafft: {sets} Sätze in {minutes} Min. 💪',
  },
  progress: {
    title: 'Fortschritt', subtitle: 'Jede Einheit zählt.', weekly: 'Wochenaktivität', monthly: 'Monatsaktivität', streak: 'Trainingsserie', days: 'Tage', day: 'Tag', bestDay: 'Bleib dran!', startStreak: 'Trainiere heute und starte deine Serie.',
    time: 'Trainingszeit', completed: 'Abgeschlossene Workouts', sets: 'Sätze', muscles: 'Verteilung der Muskelgruppen', history: 'Trainingsverlauf', achievements: 'Erfolge',
    noHistory: 'Noch keine Workouts', noHistoryBody: 'Schließe dein erstes Workout ab, um deinen Fortschritt zu sehen.', setsCount: '{count} Sätze', comingSoon: 'Bald verfügbar', future: 'Körpergewicht, Maße, Bestleistungen und Kraftverlauf', unlocked: 'Freigeschaltet', locked: 'Gesperrt',
  },
  explore: {
    title: 'Entdecken', subtitle: 'Die richtige Übung für jeden Muskel.', search: 'Übungen suchen', all: 'Alle', filters: 'Filter', muscle: 'Muskelgruppe', equipment: 'Ausrüstung', difficulty: 'Level', type: 'Trainingsart',
    apply: 'Ergebnisse anzeigen', reset: 'Zurücksetzen', noResults: 'Keine Übungen passen zu diesen Filtern.', results: '{count} Übungen', workouts: 'Workouts', exercises: 'Übungen',
  },
  profile: {
    title: 'Profil', myPreferences: 'Meine Trainingseinstellungen', subscription: 'Mein Abo', achievements: 'Erfolge', favorites: 'Favoriten', history: 'Trainingsverlauf',
    settings: 'Einstellungen', language: 'Sprache', notifications: 'Benachrichtigungen', privacy: 'Datenschutz', terms: 'AGB', help: 'Hilfe', logout: 'Abmelden', logoutConfirm: 'Von Gym Freak abmelden?',
    goal: 'Ziel', experience: 'Erfahrung', days: 'Trainingstage', duration: 'Einheitsdauer', location: 'Ort', equipment: 'Ausrüstung', height: 'Größe', weight: 'Gewicht',
    units: 'Einheiten', metric: 'Metrisch', imperial: 'Imperial', restTimer: 'Pausentimer', audioCues: 'Sprachhinweise', audioCuesBody: 'Gesprochene Hinweise in der Pause',
    version: 'Gym Freak · Version {version}', noFavorites: 'Noch keine Favoriten', noFavoritesBody: 'Tippe bei einer Übung auf das Herz, um sie hier zu speichern.', emailUnverified: 'E-Mail nicht bestätigt', verify: 'Bestätigen',
    perWeek: '{count} Tage / Woche', saved: 'Einstellungen gespeichert',
  },
  notifications: {
    title: 'Benachrichtigungen', master: 'Benachrichtigungen erlauben', masterBody: 'Erinnerungen und Neuigkeiten von Gym Freak',
    workoutReminders: 'Trainingserinnerungen', reminderTime: 'Uhrzeit', streak: 'Serien-Erinnerungen', weeklyChallenge: 'Wochen-Challenge', newContent: 'Neue Workouts & Stories', trialEnding: 'Ende der Testphase', achievements: 'Erfolge',
    denied: 'Benachrichtigungen sind für Gym Freak in den Systemeinstellungen deaktiviert.', openSettings: 'Einstellungen öffnen', reminderTitle: 'Zeit zu trainieren 💪', reminderBody: 'Dein heutiges Workout wartet auf dich.',
  },
  subscription: {
    title: 'Gym Freak Pro', heroTitle: 'Starte deine {days}-tägige Gratis-Testphase', heroBody: 'Alles, was du brauchst, um smarter zu trainieren und stärker zu werden.',
    trialActive: 'Deine Testphase läuft', trialEnds: 'Gratis bis {date}', premiumActive: 'Du hast Pro', premiumUntil: 'Aktiv bis {date}', expired: 'Deine Testphase ist abgelaufen', expiredBody: 'Upgrade, um Premium-Workouts und Pläne zu behalten.', free: 'Kostenloser Plan', freeBody: 'Upgrade jederzeit, um alles freizuschalten.',
    benefits: ['Premium-Workouts', 'Personalisierte Pläne', 'Erweiterte Übungsbibliothek', 'Fortschrittstracking', 'Exklusive Wochen-Inhalte'],
    continue: 'Weiter', upgrade: 'Auf Pro upgraden', continueFree: 'Mit kostenlosem Plan weiter', unavailable: 'In-App-Käufe folgen bald. Du kannst dann direkt hier upgraden.', restore: 'Käufe wiederherstellen', terms: 'Jederzeit kündbar. Abrechnung über App Store oder Google Play.',
  },
  stories: {
    categories: { 'weekly-challenge': 'Challenge', 'coach-tips': 'Coach-Tipps', 'new-workouts': 'Neu', nutrition: 'Ernährung', motivation: 'Motivation', 'bonus-workout': 'Bonus', 'new-exercise': 'Übung' },
    locked: 'Schalte diese Story mit Pro frei.',
  },
  legal: {
    privacyBody: 'Gym Freak speichert deine Trainingsdaten in deinem HealthyMe-Konto. Du kannst jederzeit über die HealthyMe-Datenschutzeinstellungen oder den Support einen Export oder die Löschung anfordern.',
    termsBody: 'Gym Freak bietet allgemeine Fitness-Hinweise und ist keine medizinische Beratung. Sprich vor einem neuen Trainingsprogramm mit einer Ärztin oder einem Arzt und brich jede Übung ab, die Schmerzen verursacht.',
    helpBody: 'Fragen oder Feedback? Erreiche das Team über den HealthyMe-Support, wir melden uns bei dir.',
  },
};

export const de = mergeTranslations(firstRun, deApp, dashboard.de, utilities.de, growth.de, activity.de);
