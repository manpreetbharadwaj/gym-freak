import { mergeTranslations, type Translation } from './types';
import { koApp } from './app/ko';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { support } from './app/support';
import { growth } from './app/growth';
import { activity } from './app/activity';
import { nutrition } from './app/nutrition';
import { sounds } from './app/sounds';
import { socialShare } from './app/socialShare';

/** Splash, intro, language and onboarding. App screens live in `app/ko.ts`. */
const firstRun: Translation = {
  common: { next: '다음', back: '뒤로', skip: '건너뛰기', done: '완료', continue: '계속', search: '검색' },
  splash: { tagline: '더 잘, 더 강하게.' },
  intro: {
    start: '시작하기',
  },
  language: { title: '언어 선택', body: '언제든지 변경할 수 있어요.', search: '언어 검색', popular: '인기', all: '모든 언어', results: '검색 결과', noResults: '“{query}”와 일치하는 언어가 없어요.', continueIn: '{language}(으)로 계속' },
  onboarding: {
    stepOf: '{total}단계 중 {current}단계',
    goal: {
      title: '무엇을 위해 운동하나요?', subtitle: '지금 가장 중요한 목표를 골라 주세요.', cta: '이게 내 목표예요',
      options: {
        'build-muscle': { title: '근육 키우기', body: '사이즈와 힘을 더하세요.' },
        'lose-fat': { title: '체지방 감량', body: '날렵하고 가볍게.' },
        'get-stronger': { title: '더 강해지기', body: '더 무겁게, 더 힘차게.' },
        'stay-fit': { title: '건강 유지', body: '매일 좋은 컨디션으로.' },
        'improve-endurance': { title: '지구력 향상', body: '더 오래, 더 빠른 회복.' },
        'improve-mobility': { title: '유연성 향상', body: '뻣뻣함 없이 자유롭게.' },
      },
    },
    experience: {
      title: '어디서부터 시작하나요?', subtitle: '정답은 없어요. 지금 수준에 맞춰 드려요.',
      options: {
        beginner: { title: '초급', body: '아직 기본을 배우는 중이에요.' },
        intermediate: { title: '중급', body: '꾸준히 운동하고 있어요.' },
        advanced: { title: '상급', body: '운동은 이미 내 라이프스타일이에요.' },
      },
    },
    location: {
      title: '주로 어디서 운동하나요?', subtitle: '공간에 맞는 운동을 골라 드려요.',
      options: {
        gym: { title: '헬스장', body: '랙, 머신, 프리웨이트.' },
        home: { title: '집', body: '나만의 공간, 나만의 일정.' },
        both: { title: '둘 다', body: '주마다 바꿔 가며.' },
      },
    },
    days: {
      title: '일주일에 며칠 운동할 수 있나요?', subtitle: '완벽함보다 꾸준함.', unit: '일 / 주', cta: '내 일주일 정하기',
      weekdays: ['월', '화', '수', '목', '금', '토', '일'],
      feedback: { 2: '현명하고 안정적인 시작.', 3: '훌륭한 균형이에요.', 4: '제대로 된 습관을 만들고 있어요.', 5: '빠른 성장에 딱이에요.', 6: '선수 모드. 회복도 포함.', 7: '매일, 액티브 리커버리와 함께.' },
    },
    duration: {
      title: '시간이 얼마나 있나요?', subtitle: '한 세션 기준. 1분도 허투루 쓰지 않아요.', unit: '분',
      options: { '20-30': '짧고 집중적으로', '30-45': '가장 알맞게', '45-60': '깊이 있게', '60-90': '풀 세션' },
    },
    equipment: {
      title: '어떤 장비를 쓸 수 있나요?', subtitle: '사용할 수 있는 장비를 모두 선택하세요.', selected: '{count}개 선택됨',
      options: { dumbbells: '덤벨', barbell: '바벨', bench: '벤치', 'cable-machine': '케이블 머신', bands: '저항 밴드', 'smith-machine': '스미스 머신', 'pull-up-bar': '턱걸이 바', machines: '머신', bodyweight: '맨몸', 'full-gym': '풀 장비 헬스장' },
    },
    age: { title: '나이가 어떻게 되나요?', subtitle: '알맞은 강도를 정하는 데 도움이 돼요.', unit: '세' },
    height: { title: '키가 어떻게 되나요?', subtitle: '운동 강도를 세밀하게 맞추는 데 써요.', unit: 'cm' },
    weight: { title: '몸무게가 어떻게 되나요?', subtitle: '나만 볼 수 있어요. 언제나.', unit: 'kg' },
    gender: {
      title: '성별을 알려 주세요', subtitle: '플랜을 맞춤화하는 데 도움이 돼요.', cta: '내 플랜 만들기',
      options: { woman: '여성', man: '남성', 'non-binary': '논바이너리', unspecified: '밝히지 않음' },
    },
    complete: {
      building: '플랜을 만드는 중', checks: ['목표 맞추는 중', '일정 조율 중', '운동 고르는 중'],
      title: '플랜이 준비됐어요', body: '목표, 일정, 장비에 맞춰 만들었어요.',
      goal: '목표', schedule: '일정', session: '세션', location: '장소', perWeek: '주 {count}일',
      cta: '시작하기', error: '플랜을 저장하지 못했어요. 연결을 확인해 주세요.', retry: '다시 시도',
    },
  },
};

export const ko = mergeTranslations(firstRun, koApp, dashboard.ko, utilities.ko, growth.ko, activity.ko, nutrition.ko, sounds.ko, support.ko, socialShare.ko);
