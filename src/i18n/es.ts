import { mergeTranslations, type Translation } from './types';
import { esApp } from './app/es';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { support } from './app/support';
import { growth } from './app/growth';
import { activity } from './app/activity';
import { nutrition } from './app/nutrition';
import { sounds } from './app/sounds';
import { socialShare } from './app/socialShare';

/** Splash, intro, language and onboarding. App screens live in `app/es.ts`. */
const firstRun: Translation = {
  common: { next: 'Siguiente', back: 'Atrás', skip: 'Omitir', done: 'Listo', continue: 'Continuar', search: 'Buscar' },
  splash: { tagline: 'Entrena mejor. Muévete más fuerte.' },
  intro: {
    start: '¡Vamos!',
  },
  language: { title: 'Elige tu idioma', body: 'Puedes cambiarlo cuando quieras.', search: 'Buscar idioma', popular: 'Populares', all: 'Todos los idiomas', results: 'Resultados', noResults: 'Ningún idioma coincide con «{query}».', continueIn: 'Continuar en {language}' },
  onboarding: {
    stepOf: 'Paso {current} de {total}',
    goal: {
      title: '¿Para qué entrenas?', subtitle: 'Elige la meta que más te importa ahora.', cta: 'Esa es mi meta',
      options: {
        'build-muscle': { title: 'Ganar músculo', body: 'Más volumen y fuerza.' },
        'lose-fat': { title: 'Perder grasa', body: 'Defínete y siéntete ligero.' },
        'get-stronger': { title: 'Ser más fuerte', body: 'Levanta más, muévete con potencia.' },
        'stay-fit': { title: 'Mantenerme en forma', body: 'Sentirte bien cada día.' },
        'improve-endurance': { title: 'Mejorar resistencia', body: 'Aguanta más, recupérate antes.' },
        'improve-mobility': { title: 'Mejorar movilidad', body: 'Muévete libre, sin rigidez.' },
      },
    },
    experience: {
      title: '¿Desde dónde empiezas?', subtitle: 'No hay respuestas incorrectas. Te acompañamos.',
      options: {
        beginner: { title: 'Principiante', body: 'Todavía estoy aprendiendo lo básico.' },
        intermediate: { title: 'Intermedio', body: 'Entreno con constancia.' },
        advanced: { title: 'Avanzado', body: 'Entrenar ya es parte de mi vida.' },
      },
    },
    location: {
      title: '¿Dónde sueles entrenar?', subtitle: 'Adaptamos cada ejercicio a tu espacio.',
      options: {
        gym: { title: 'Gimnasio', body: 'Racks, máquinas y peso libre.' },
        home: { title: 'Casa', body: 'Tu espacio, tu horario.' },
        both: { title: 'Ambos', body: 'Combínalo cada semana.' },
      },
    },
    days: {
      title: '¿Cuántos días puedes entrenar por semana?', subtitle: 'La constancia gana a la perfección.', unit: 'días / semana', cta: 'Fijar mi semana',
      weekdays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      feedback: { 2: 'Un comienzo inteligente y constante.', 3: 'Gran equilibrio.', 4: 'Estás creando una constancia seria.', 5: 'Perfecto para progresar más rápido.', 6: 'Modo atleta. Recuperación incluida.', 7: 'Cada día, con recuperación activa.' },
    },
    duration: {
      title: '¿Cuánto tiempo tienes?', subtitle: 'Por sesión. Aprovecharemos cada minuto.', unit: 'min',
      options: { '20-30': 'Rápido y enfocado', '30-45': 'El punto ideal', '45-60': 'A fondo', '60-90': 'Sesión completa' },
    },
    equipment: {
      title: '¿Qué equipo puedes usar?', subtitle: 'Selecciona todo lo que tengas a mano.', selected: '{count} seleccionados',
      options: { dumbbells: 'Mancuernas', barbell: 'Barra', bench: 'Banco', 'cable-machine': 'Polea', bands: 'Bandas elásticas', 'smith-machine': 'Máquina Smith', 'pull-up-bar': 'Barra de dominadas', machines: 'Máquinas', bodyweight: 'Peso corporal', 'full-gym': 'Gimnasio completo' },
    },
    age: { title: '¿Cuántos años tienes?', subtitle: 'Nos ayuda a ajustar la intensidad.', unit: 'años' },
    height: { title: '¿Cuánto mides?', subtitle: 'Para afinar tus cargas de entrenamiento.', unit: 'cm' },
    weight: { title: '¿Cuánto pesas?', subtitle: 'Solo lo ves tú. Siempre.', unit: 'kg' },
    gender: {
      title: '¿Cómo te identificas?', subtitle: 'Nos ayuda a personalizar tu plan.', cta: 'Crear mi plan',
      options: { woman: 'Mujer', man: 'Hombre', 'non-binary': 'No binario', unspecified: 'Prefiero no decirlo' },
    },
    complete: {
      building: 'Creando tu plan', checks: ['Ajustando tu meta', 'Encajando tu horario', 'Eligiendo tus ejercicios'],
      title: 'Tu plan está listo', body: 'Hecho a medida de tu meta, horario y equipo.',
      goal: 'Meta', schedule: 'Horario', session: 'Sesión', location: 'Lugar', perWeek: '{count} días / semana',
      cta: '¡Vamos!', error: 'No pudimos guardar tu plan. Revisa tu conexión.', retry: 'Reintentar',
    },
  },
};

export const es = mergeTranslations(firstRun, esApp, dashboard.es, utilities.es, growth.es, activity.es, nutrition.es, sounds.es, support.es, socialShare.es);
