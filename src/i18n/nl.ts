import { mergeTranslations, type Translation } from './types';
import { nlApp } from './app/nl';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/nl.ts`. */
const firstRun: Translation = {
  common: { next: 'Volgende', back: 'Terug', skip: 'Overslaan', done: 'Klaar', continue: 'Doorgaan', search: 'Zoeken' },
  splash: { tagline: 'Train slimmer. Beweeg sterker.' },
  intro: {
    slides: [
      { tag: 'Persoonlijk', title: 'Training rond jou gebouwd', body: 'Je doelen, ervaring en levensstijl bepalen elke workout.' },
      { tag: 'Begeleid', title: 'Zie elke beweging helder', body: 'Duidelijke demo’s met de tips die ertoe doen.' },
      { tag: 'Vooruitgang', title: 'Vooruitgang die je echt ziet', body: 'Reeksen, statistieken en persoonlijke records op één plek.' },
      { tag: 'Volhouden', title: 'Kleine winst. Elke week.', body: 'Wekelijkse challenges die je momentum vasthouden.' },
    ],
    start: 'Aan de slag',
    visual: {
      goal: 'Je doel', goalValue: 'Spieropbouw', schedule: '4 dagen / week', level: 'Gevorderd',
      exercise: 'Goblet squat', reps: 'Herh.', sets: 'Sets', muscle: 'Spiergroep', muscleValue: 'Bilspieren · Quadriceps', technique: 'Techniek', techniqueValue: 'Rustig zakken',
      thisWeek: 'Deze week', workouts: 'Workouts', minutes: 'Minuten', personalBest: 'Nieuw persoonlijk record',
      challenge: 'Weekchallenge', challengeValue: '3 van 4 workouts', streak: 'dagen op rij', badge: 'Badge ontgrendeld', badgeValue: 'Vroege vogel', complete: 'Workout voltooid',
    },
  },
  language: { title: 'Kies je taal', body: 'Je kunt dit altijd wijzigen.', search: 'Taal zoeken', popular: 'Populair', all: 'Alle talen', results: 'Resultaten', noResults: 'Geen taal gevonden voor “{query}”.', continueIn: 'Doorgaan in het {language}' },
  onboarding: {
    stepOf: 'Stap {current} van {total}',
    goal: {
      title: 'Waarvoor train je?', subtitle: 'Kies het doel dat nu het belangrijkst is.', cta: 'Dit is mijn doel',
      options: {
        'build-muscle': { title: 'Spieren opbouwen', body: 'Meer massa en kracht.' },
        'lose-fat': { title: 'Vet verliezen', body: 'Strakker en lichter voelen.' },
        'get-stronger': { title: 'Sterker worden', body: 'Meer tillen, krachtig bewegen.' },
        'stay-fit': { title: 'Fit blijven', body: 'Elke dag lekker in je vel.' },
        'improve-endurance': { title: 'Uithoudingsvermogen', body: 'Langer doorgaan, sneller herstellen.' },
        'improve-mobility': { title: 'Mobiliteit verbeteren', body: 'Vrij bewegen, zonder stijfheid.' },
      },
    },
    experience: {
      title: 'Waar begin je?', subtitle: 'Geen foute antwoorden. We sluiten bij je aan.',
      options: {
        beginner: { title: 'Beginner', body: 'Ik leer nog de basis.' },
        intermediate: { title: 'Gevorderd', body: 'Ik train regelmatig.' },
        advanced: { title: 'Ervaren', body: 'Trainen hoort bij mijn leven.' },
      },
    },
    location: {
      title: 'Waar train je meestal?', subtitle: 'We stemmen elke oefening af op jouw ruimte.',
      options: {
        gym: { title: 'Sportschool', body: 'Racks, machines en vrije gewichten.' },
        home: { title: 'Thuis', body: 'Jouw ruimte, jouw schema.' },
        both: { title: 'Allebei', body: 'Wissel per week af.' },
      },
    },
    days: {
      title: 'Hoeveel dagen per week kun je trainen?', subtitle: 'Volhouden wint van perfectie.', unit: 'dagen / week', cta: 'Mijn week vastleggen',
      weekdays: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
      feedback: { 2: 'Een slimme, rustige start.', 3: 'Mooie balans.', 4: 'Je bouwt echte regelmaat op.', 5: 'Perfect voor snellere vooruitgang.', 6: 'Atleetmodus. Herstel inbegrepen.', 7: 'Elke dag, met actief herstel.' },
    },
    duration: {
      title: 'Hoeveel tijd heb je?', subtitle: 'Per sessie. We laten elke minuut tellen.', unit: 'min',
      options: { '20-30': 'Kort & gericht', '30-45': 'De sweet spot', '45-60': 'Diepgaand', '60-90': 'Volledige sessie' },
    },
    equipment: {
      title: 'Welke materialen kun je gebruiken?', subtitle: 'Selecteer alles waar je toegang toe hebt.', selected: '{count} geselecteerd',
      options: { dumbbells: 'Dumbbells', barbell: 'Halterstang', bench: 'Bank', 'cable-machine': 'Kabelstation', bands: 'Weerstandsbanden', 'smith-machine': 'Smith machine', 'pull-up-bar': 'Optrekstang', machines: 'Machines', bodyweight: 'Lichaamsgewicht', 'full-gym': 'Volledige sportschool' },
    },
    age: { title: 'Hoe oud ben je?', subtitle: 'Zo kiezen we de juiste intensiteit.', unit: 'jaar' },
    height: { title: 'Hoe lang ben je?', subtitle: 'Om je trainingsgewichten af te stemmen.', unit: 'cm' },
    weight: { title: 'Wat is je gewicht?', subtitle: 'Alleen zichtbaar voor jou. Altijd.', unit: 'kg' },
    gender: {
      title: 'Hoe identificeer je jezelf?', subtitle: 'Zo personaliseren we je plan.', cta: 'Maak mijn plan',
      options: { woman: 'Vrouw', man: 'Man', 'non-binary': 'Non-binair', unspecified: 'Zeg ik liever niet' },
    },
    complete: {
      building: 'Je plan wordt gemaakt', checks: ['Je doel afstemmen', 'Je schema inpassen', 'Je oefeningen kiezen'],
      title: 'Je plan is klaar', body: 'Gebouwd rond je doel, schema en materiaal.',
      goal: 'Doel', schedule: 'Schema', session: 'Sessie', location: 'Locatie', perWeek: '{count} dagen / week',
      cta: 'Aan de slag', error: 'We konden je plan niet opslaan. Controleer je verbinding.', retry: 'Opnieuw proberen',
    },
  },
};

export const nl = mergeTranslations(firstRun, nlApp, dashboard.nl, utilities.nl, growth.nl, activity.nl);
