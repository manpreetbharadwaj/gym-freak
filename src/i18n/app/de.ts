import type { Translation } from '../types';

/** Strings added with the backend-driven features. Merged over `de.ts`. */
export const deApp: Translation = {
  common: { showPassword: 'Passwort anzeigen', hidePassword: 'Passwort ausblenden' },
  home: { unfinished: 'Unvollendetes Training', resume: 'Fortsetzen' },
  plan: { notStarted: 'Vor dem Start', assignedByCoach: 'Von deinem Coach gewählt' },
  player: {
    addExercise: 'Übung hinzufügen', addTitle: 'Zu diesem Training hinzufügen', addHint: 'Nur für die heutige Einheit – dein Plan bleibt gleich.', added: '{name} hinzugefügt', replaced: 'Getauscht gegen {name}', addedBadge: 'Hinzugefügt', swappedBadge: 'Getauscht',
    editFailed: 'Die Änderung konnte nicht gespeichert werden. Prüfe deine Verbindung und versuche es erneut.',
    conflictTitle: 'Du hast ein unvollendetes Training', conflictBody: '„{name}“ wurde {when} gestartet und ist noch nicht beendet.', resumeOther: 'Fortsetzen', discardStart: 'Verwerfen und dieses starten',
  },
  exercise: {
    noActiveWorkout: 'Starte zuerst ein Training – dann kannst du diese Übung zur heutigen Einheit hinzufügen.', addedToSession: 'Nur für diese Einheit zu „{name}“ hinzugefügt.', openWorkout: 'Training öffnen',
  },
  progress: { longest: 'Längste Serie: {count} Tage', records: 'Persönliche Rekorde', recordWeight: '{weight} kg × {reps}', recordReps: '{reps} Wdh.', topExercises: 'Am häufigsten trainiert', sessionsCount: '{count} Trainings', future: 'Körpergewicht, Maße und Kraftentwicklung' },
  notifications: { newContent: 'Neue Trainings', stories: 'Stories & Coach-Tipps', streakBody: 'Motivation, um deine Serie zu halten' },
  subscription: { startTrial: '{days} Tage kostenlos testen', trialNote: 'Keine Zahlung nötig. Ein kostenloser Test pro Konto.', trialFailed: 'Dein Test konnte nicht gestartet werden. Bitte versuche es erneut.', storePrice: 'Preis im {store}', storeCharges: 'Der {store} berechnet {price}.', storeDiscountNote: 'Der {store} berechnet {price}. Dieser Rabatt kann bei Store-Käufen noch nicht angewendet werden.', deviceRegionNote: 'Preise für {country} (laut Region deines Geräts). Den endgültigen Preis bestätigt der Store beim Kauf.', purchasePending: 'Dein Kauf wartet auf Freigabe. Pro wird freigeschaltet, sobald der Store ihn bestätigt.', purchaseUnverified: 'Dein Kauf ist durch, wir konnten ihn aber noch nicht bestätigen. Nutze gleich „Käufe wiederherstellen“.', restored: 'Käufe wiederhergestellt.', nothingToRestore: 'Keine Käufe zum Wiederherstellen auf diesem Konto.' },
};
