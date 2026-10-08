import { mergeTranslations, type Translation } from './types';
import { itApp } from './app/it';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/it.ts`. */
const firstRun: Translation = {
  common: { next: 'Avanti', back: 'Indietro', skip: 'Salta', done: 'Fatto', continue: 'Continua', search: 'Cerca' },
  splash: { tagline: 'Allenati meglio. Muoviti più forte.' },
  intro: {
    slides: [
      { tag: 'Personalizzato', title: 'Allenamento costruito su di te', body: 'I tuoi obiettivi, la tua esperienza e il tuo stile di vita guidano ogni workout.' },
      { tag: 'Guidato', title: 'Ogni movimento, chiaro', body: 'Demo chiare con i consigli che contano davvero.' },
      { tag: 'Progressi', title: 'Progressi che vedi davvero', body: 'Serie, statistiche e record personali in un unico posto.' },
      { tag: 'Costanza', title: 'Piccole vittorie. Ogni settimana.', body: 'Sfide settimanali che tengono vivo il tuo slancio.' },
    ],
    start: 'Andiamo',
    visual: {
      goal: 'Il tuo obiettivo', goalValue: 'Aumentare i muscoli', schedule: '4 giorni / settimana', level: 'Intermedio',
      exercise: 'Goblet squat', reps: 'Rip.', sets: 'Serie', muscle: 'Gruppo muscolare', muscleValue: 'Glutei · Quadricipiti', technique: 'Tecnica', techniqueValue: 'Scendi lentamente',
      thisWeek: 'Questa settimana', workouts: 'Allenamenti', minutes: 'Minuti', personalBest: 'Nuovo record personale',
      challenge: 'Sfida settimanale', challengeValue: '3 di 4 allenamenti', streak: 'giorni di fila', badge: 'Badge sbloccato', badgeValue: 'Mattiniero', complete: 'Allenamento completato',
    },
  },
  language: { title: 'Scegli la tua lingua', body: 'Puoi cambiarla in qualsiasi momento.', search: 'Cerca lingua', popular: 'Popolari', all: 'Tutte le lingue', results: 'Risultati', noResults: 'Nessuna lingua corrisponde a «{query}».', continueIn: 'Continua in {language}' },
  onboarding: {
    stepOf: 'Passo {current} di {total}',
    goal: {
      title: 'Per cosa ti alleni?', subtitle: 'Scegli l’obiettivo più importante per te ora.', cta: 'È il mio obiettivo',
      options: {
        'build-muscle': { title: 'Aumentare i muscoli', body: 'Più massa e forza.' },
        'lose-fat': { title: 'Perdere grasso', body: 'Più definito, più leggero.' },
        'get-stronger': { title: 'Diventare più forte', body: 'Solleva di più, muoviti con potenza.' },
        'stay-fit': { title: 'Restare in forma', body: 'Sentirti bene ogni giorno.' },
        'improve-endurance': { title: 'Migliorare la resistenza', body: 'Dura di più, recupera prima.' },
        'improve-mobility': { title: 'Migliorare la mobilità', body: 'Muoviti libero, senza rigidità.' },
      },
    },
    experience: {
      title: 'Da dove parti?', subtitle: 'Nessuna risposta sbagliata. Ti veniamo incontro.',
      options: {
        beginner: { title: 'Principiante', body: 'Sto ancora imparando le basi.' },
        intermediate: { title: 'Intermedio', body: 'Mi alleno con costanza.' },
        advanced: { title: 'Avanzato', body: 'L’allenamento fa parte del mio stile di vita.' },
      },
    },
    location: {
      title: 'Dove ti alleni di solito?', subtitle: 'Adattiamo ogni esercizio al tuo spazio.',
      options: {
        gym: { title: 'Palestra', body: 'Rack, macchine e pesi liberi.' },
        home: { title: 'Casa', body: 'Il tuo spazio, i tuoi tempi.' },
        both: { title: 'Entrambi', body: 'Alterna di settimana in settimana.' },
      },
    },
    days: {
      title: 'Quanti giorni a settimana puoi allenarti?', subtitle: 'La costanza batte la perfezione.', unit: 'giorni / settimana', cta: 'Imposta la mia settimana',
      weekdays: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
      feedback: { 2: 'Un inizio furbo e costante.', 3: 'Ottimo equilibrio.', 4: 'Stai costruendo una vera costanza.', 5: 'Perfetto per progressi più rapidi.', 6: 'Modalità atleta. Recupero incluso.', 7: 'Ogni giorno, con recupero attivo.' },
    },
    duration: {
      title: 'Quanto tempo hai?', subtitle: 'A sessione. Faremo contare ogni minuto.', unit: 'min',
      options: { '20-30': 'Veloce e mirato', '30-45': 'Il punto giusto', '45-60': 'A fondo', '60-90': 'Sessione completa' },
    },
    equipment: {
      title: 'Che attrezzatura puoi usare?', subtitle: 'Seleziona tutto ciò che hai a disposizione.', selected: '{count} selezionati',
      options: { dumbbells: 'Manubri', barbell: 'Bilanciere', bench: 'Panca', 'cable-machine': 'Cavi', bands: 'Elastici', 'smith-machine': 'Multipower', 'pull-up-bar': 'Sbarra per trazioni', machines: 'Macchine', bodyweight: 'Corpo libero', 'full-gym': 'Palestra completa' },
    },
    age: { title: 'Quanti anni hai?', subtitle: 'Ci aiuta a impostare l’intensità giusta.', unit: 'anni' },
    height: { title: 'Quanto sei alto?', subtitle: 'Per calibrare i tuoi carichi.', unit: 'cm' },
    weight: { title: 'Quanto pesi?', subtitle: 'Lo vedi solo tu. Sempre.', unit: 'kg' },
    gender: {
      title: 'Come ti identifichi?', subtitle: 'Ci aiuta a personalizzare il tuo piano.', cta: 'Crea il mio piano',
      options: { woman: 'Donna', man: 'Uomo', 'non-binary': 'Non binario', unspecified: 'Preferisco non dirlo' },
    },
    complete: {
      building: 'Creazione del tuo piano', checks: ['Allineiamo il tuo obiettivo', 'Organizziamo la settimana', 'Scegliamo gli esercizi'],
      title: 'Il tuo piano è pronto', body: 'Costruito su obiettivo, tempi e attrezzatura.',
      goal: 'Obiettivo', schedule: 'Programma', session: 'Sessione', location: 'Luogo', perWeek: '{count} giorni / settimana',
      cta: 'Andiamo', error: 'Non siamo riusciti a salvare il piano. Controlla la connessione.', retry: 'Riprova',
    },
  },
};

export const it = mergeTranslations(firstRun, itApp, dashboard.it, utilities.it, growth.it, activity.it);
