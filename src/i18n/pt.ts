import { mergeTranslations, type Translation } from './types';
import { ptApp } from './app/pt';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { support } from './app/support';
import { growth } from './app/growth';
import { activity } from './app/activity';
import { nutrition } from './app/nutrition';
import { sounds } from './app/sounds';
import { socialShare } from './app/socialShare';

/** Splash, intro, language and onboarding. App screens live in `app/pt.ts`. */
const firstRun: Translation = {
  common: { next: 'Seguinte', back: 'Voltar', skip: 'Saltar', done: 'Concluído', continue: 'Continuar', search: 'Pesquisar' },
  splash: { tagline: 'Treina melhor. Move-te mais forte.' },
  intro: {
    start: 'Vamos lá',
  },
  language: { title: 'Escolhe o teu idioma', body: 'Podes mudá-lo quando quiseres.', search: 'Pesquisar idioma', popular: 'Populares', all: 'Todos os idiomas', results: 'Resultados', noResults: 'Nenhum idioma corresponde a “{query}”.', continueIn: 'Continuar em {language}' },
  onboarding: {
    stepOf: 'Passo {current} de {total}',
    goal: {
      title: 'Para que estás a treinar?', subtitle: 'Escolhe o objetivo mais importante agora.', cta: 'É o meu objetivo',
      options: {
        'build-muscle': { title: 'Ganhar músculo', body: 'Mais volume e força.' },
        'lose-fat': { title: 'Perder gordura', body: 'Mais definido, mais leve.' },
        'get-stronger': { title: 'Ficar mais forte', body: 'Levanta mais, move-te com potência.' },
        'stay-fit': { title: 'Manter a forma', body: 'Sentir-te bem todos os dias.' },
        'improve-endurance': { title: 'Melhorar a resistência', body: 'Aguenta mais, recupera mais rápido.' },
        'improve-mobility': { title: 'Melhorar a mobilidade', body: 'Move-te livre, sem rigidez.' },
      },
    },
    experience: {
      title: 'De onde estás a partir?', subtitle: 'Não há respostas erradas. Adaptamo-nos a ti.',
      options: {
        beginner: { title: 'Iniciante', body: 'Ainda estou a aprender o básico.' },
        intermediate: { title: 'Intermédio', body: 'Treino com regularidade.' },
        advanced: { title: 'Avançado', body: 'O treino já faz parte da minha vida.' },
      },
    },
    location: {
      title: 'Onde costumas treinar?', subtitle: 'Adaptamos cada exercício ao teu espaço.',
      options: {
        gym: { title: 'Ginásio', body: 'Racks, máquinas e pesos livres.' },
        home: { title: 'Casa', body: 'O teu espaço, o teu horário.' },
        both: { title: 'Ambos', body: 'Alterna de semana para semana.' },
      },
    },
    days: {
      title: 'Quantos dias podes treinar por semana?', subtitle: 'A consistência vence a perfeição.', unit: 'dias / semana', cta: 'Definir a minha semana',
      weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      feedback: { 2: 'Um começo inteligente e estável.', 3: 'Ótimo equilíbrio.', 4: 'Estás a criar consistência a sério.', 5: 'Perfeito para progredir mais rápido.', 6: 'Modo atleta. Recuperação incluída.', 7: 'Todos os dias, com recuperação ativa.' },
    },
    duration: {
      title: 'Quanto tempo tens?', subtitle: 'Por sessão. Vamos aproveitar cada minuto.', unit: 'min',
      options: { '20-30': 'Rápido e focado', '30-45': 'O ponto ideal', '45-60': 'A fundo', '60-90': 'Sessão completa' },
    },
    equipment: {
      title: 'Que equipamento podes usar?', subtitle: 'Seleciona tudo o que tens disponível.', selected: '{count} selecionados',
      options: { dumbbells: 'Halteres', barbell: 'Barra', bench: 'Banco', 'cable-machine': 'Polia', bands: 'Elásticos', 'smith-machine': 'Máquina Smith', 'pull-up-bar': 'Barra de elevações', machines: 'Máquinas', bodyweight: 'Peso corporal', 'full-gym': 'Ginásio completo' },
    },
    age: { title: 'Que idade tens?', subtitle: 'Ajuda-nos a definir a intensidade certa.', unit: 'anos' },
    height: { title: 'Qual é a tua altura?', subtitle: 'Para afinar as tuas cargas de treino.', unit: 'cm' },
    weight: { title: 'Qual é o teu peso?', subtitle: 'Só tu o vês. Sempre.', unit: 'kg' },
    gender: {
      title: 'Como te identificas?', subtitle: 'Ajuda-nos a personalizar o teu plano.', cta: 'Criar o meu plano',
      options: { woman: 'Mulher', man: 'Homem', 'non-binary': 'Não binário', unspecified: 'Prefiro não dizer' },
    },
    complete: {
      building: 'A criar o teu plano', checks: ['A ajustar o teu objetivo', 'A encaixar o teu horário', 'A escolher os teus exercícios'],
      title: 'O teu plano está pronto', body: 'Feito à medida do teu objetivo, horário e equipamento.',
      goal: 'Objetivo', schedule: 'Horário', session: 'Sessão', location: 'Local', perWeek: '{count} dias / semana',
      cta: 'Vamos lá', error: 'Não conseguimos guardar o teu plano. Verifica a ligação.', retry: 'Tentar novamente',
    },
  },
};

export const pt = mergeTranslations(firstRun, ptApp, dashboard.pt, utilities.pt, growth.pt, activity.pt, nutrition.pt, sounds.pt, support.pt, socialShare.pt);
