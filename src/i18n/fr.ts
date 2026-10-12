import { mergeTranslations, type Translation } from './types';
import { frApp } from './app/fr';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { support } from './app/support';
import { growth } from './app/growth';
import { activity } from './app/activity';
import { nutrition } from './app/nutrition';
import { sounds } from './app/sounds';
import { socialShare } from './app/socialShare';

/** Splash, intro, language and onboarding. App screens live in `app/fr.ts`. */
const firstRun: Translation = {
  common: { next: 'Suivant', back: 'Retour', skip: 'Passer', done: 'Terminé', continue: 'Continuer', search: 'Rechercher' },
  splash: { tagline: 'Entraîne-toi mieux. Bouge plus fort.' },
  intro: {
    start: 'C’est parti',
  },
  language: { title: 'Choisis ta langue', body: 'Tu peux la changer à tout moment.', search: 'Rechercher une langue', popular: 'Populaires', all: 'Toutes les langues', results: 'Résultats', noResults: 'Aucune langue ne correspond à « {query} ».', continueIn: 'Continuer en {language}' },
  onboarding: {
    stepOf: 'Étape {current} sur {total}',
    goal: {
      title: 'Pourquoi t’entraînes-tu ?', subtitle: 'Choisis l’objectif qui compte le plus en ce moment.', cta: 'C’est mon objectif',
      options: {
        'build-muscle': { title: 'Prendre du muscle', body: 'Plus de volume et de force.' },
        'lose-fat': { title: 'Perdre du gras', body: 'S’affiner, se sentir léger.' },
        'get-stronger': { title: 'Devenir plus fort', body: 'Soulever plus, bouger avec puissance.' },
        'stay-fit': { title: 'Rester en forme', body: 'Se sentir bien chaque jour.' },
        'improve-endurance': { title: 'Améliorer l’endurance', body: 'Tenir plus longtemps, récupérer vite.' },
        'improve-mobility': { title: 'Gagner en mobilité', body: 'Bouger librement, sans raideur.' },
      },
    },
    experience: {
      title: 'Quel est ton point de départ ?', subtitle: 'Pas de mauvaise réponse. On s’adapte à toi.',
      options: {
        beginner: { title: 'Débutant', body: 'J’apprends encore les bases.' },
        intermediate: { title: 'Intermédiaire', body: 'Je m’entraîne régulièrement.' },
        advanced: { title: 'Avancé', body: 'Le sport fait partie de ma vie.' },
      },
    },
    location: {
      title: 'Où t’entraînes-tu le plus souvent ?', subtitle: 'On adapte chaque exercice à ton espace.',
      options: {
        gym: { title: 'Salle', body: 'Racks, machines et poids libres.' },
        home: { title: 'Maison', body: 'Ton espace, ton rythme.' },
        both: { title: 'Les deux', body: 'Varie d’une semaine à l’autre.' },
      },
    },
    days: {
      title: 'Combien de jours peux-tu t’entraîner par semaine ?', subtitle: 'La régularité bat la perfection.', unit: 'jours / semaine', cta: 'Valider ma semaine',
      weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      feedback: { 2: 'Un départ malin et régulier.', 3: 'Bel équilibre.', 4: 'Tu construis une vraie régularité.', 5: 'Parfait pour progresser plus vite.', 6: 'Mode athlète. Récupération incluse.', 7: 'Chaque jour, avec récupération active.' },
    },
    duration: {
      title: 'Combien de temps as-tu ?', subtitle: 'Par séance. Chaque minute comptera.', unit: 'min',
      options: { '20-30': 'Rapide et ciblé', '30-45': 'Le juste milieu', '45-60': 'En profondeur', '60-90': 'Séance complète' },
    },
    equipment: {
      title: 'Quel matériel peux-tu utiliser ?', subtitle: 'Sélectionne tout ce que tu as à disposition.', selected: '{count} sélectionnés',
      options: { dumbbells: 'Haltères', barbell: 'Barre', bench: 'Banc', 'cable-machine': 'Poulie', bands: 'Élastiques', 'smith-machine': 'Smith machine', 'pull-up-bar': 'Barre de traction', machines: 'Machines', bodyweight: 'Poids du corps', 'full-gym': 'Salle complète' },
    },
    age: { title: 'Quel âge as-tu ?', subtitle: 'Pour régler la bonne intensité.', unit: 'ans' },
    height: { title: 'Combien mesures-tu ?', subtitle: 'Pour affiner tes charges d’entraînement.', unit: 'cm' },
    weight: { title: 'Quel est ton poids ?', subtitle: 'Visible par toi seul. Toujours.', unit: 'kg' },
    gender: {
      title: 'Comment t’identifies-tu ?', subtitle: 'Pour personnaliser ton programme.', cta: 'Créer mon programme',
      options: { woman: 'Femme', man: 'Homme', 'non-binary': 'Non-binaire', unspecified: 'Je préfère ne pas répondre' },
    },
    complete: {
      building: 'Création de ton programme', checks: ['Ton objectif est pris en compte', 'Ton planning est calé', 'Tes exercices sont choisis'],
      title: 'Ton programme est prêt', body: 'Pensé pour ton objectif, ton planning et ton matériel.',
      goal: 'Objectif', schedule: 'Planning', session: 'Séance', location: 'Lieu', perWeek: '{count} jours / semaine',
      cta: 'C’est parti', error: 'Impossible d’enregistrer ton programme. Vérifie ta connexion.', retry: 'Réessayer',
    },
  },
};

export const fr = mergeTranslations(firstRun, frApp, dashboard.fr, utilities.fr, growth.fr, activity.fr, nutrition.fr, sounds.fr, support.fr, socialShare.fr);
