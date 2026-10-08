import { mergeTranslations, type Translation } from './types';
import { arApp } from './app/ar';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/ar.ts`. */
const firstRun: Translation = {
  common: { next: 'التالي', back: 'رجوع', skip: 'تخطٍّ', done: 'تم', continue: 'متابعة', search: 'بحث' },
  splash: { tagline: 'تمرّن أفضل. تحرّك بقوة أكبر.' },
  intro: {
    slides: [
      { tag: 'مخصّص', title: 'تمارين مصمّمة لك', body: 'أهدافك وخبرتك وأسلوب حياتك تشكّل كل تمرين.' },
      { tag: 'موجَّه', title: 'شاهد كل حركة بوضوح', body: 'عروض واضحة مع الإرشادات المهمة فعلًا.' },
      { tag: 'التقدّم', title: 'تقدّم تراه فعلًا', body: 'السلاسل والإحصاءات وأرقامك القياسية في مكان واحد.' },
      { tag: 'الاستمرارية', title: 'انتصارات صغيرة. كل أسبوع.', body: 'تحديات أسبوعية تحافظ على حماسك.' },
    ],
    start: 'لننطلق',
    visual: {
      goal: 'هدفك', goalValue: 'بناء العضلات', schedule: '4 أيام / أسبوع', level: 'متوسط',
      exercise: 'سكوات الكأس', reps: 'تكرارات', sets: 'مجموعات', muscle: 'المجموعة العضلية', muscleValue: 'الألوية · الفخذ الأمامي', technique: 'الأسلوب', techniqueValue: 'انزل ببطء',
      thisWeek: 'هذا الأسبوع', workouts: 'تمارين', minutes: 'دقائق', personalBest: 'رقم قياسي شخصي جديد',
      challenge: 'تحدي الأسبوع', challengeValue: '3 من 4 تمارين', streak: 'أيام متتالية', badge: 'تم فتح شارة', badgeValue: 'المبكّر', complete: 'اكتمل التمرين',
    },
  },
  language: { title: 'اختر لغتك', body: 'يمكنك تغييرها في أي وقت.', search: 'ابحث عن لغة', popular: 'الأكثر استخدامًا', all: 'كل اللغات', results: 'النتائج', noResults: 'لا توجد لغة تطابق «{query}».', continueIn: 'المتابعة بـ{language}' },
  onboarding: {
    stepOf: 'الخطوة {current} من {total}',
    goal: {
      title: 'لأجل ماذا تتمرّن؟', subtitle: 'اختر الهدف الأهم بالنسبة لك الآن.', cta: 'هذا هدفي',
      options: {
        'build-muscle': { title: 'بناء العضلات', body: 'حجم وقوة أكبر.' },
        'lose-fat': { title: 'حرق الدهون', body: 'جسم أنحف وشعور أخف.' },
        'get-stronger': { title: 'زيادة القوة', body: 'ارفع أكثر وتحرّك بقوة.' },
        'stay-fit': { title: 'الحفاظ على اللياقة', body: 'اشعر بالنشاط كل يوم.' },
        'improve-endurance': { title: 'تحسين التحمّل', body: 'استمر أطول وتعافَ أسرع.' },
        'improve-mobility': { title: 'تحسين المرونة', body: 'تحرّك بحرية ودون تيبّس.' },
      },
    },
    experience: {
      title: 'من أين تبدأ؟', subtitle: 'لا توجد إجابة خاطئة. سنبدأ من حيث أنت.',
      options: {
        beginner: { title: 'مبتدئ', body: 'ما زلت أتعلّم الأساسيات.' },
        intermediate: { title: 'متوسط', body: 'أتمرّن بانتظام.' },
        advanced: { title: 'متقدّم', body: 'التمرين جزء من أسلوب حياتي.' },
      },
    },
    location: {
      title: 'أين تتمرّن عادةً؟', subtitle: 'سنختار كل تمرين بما يناسب مساحتك.',
      options: {
        gym: { title: 'النادي', body: 'أجهزة وأوزان حرة.' },
        home: { title: 'المنزل', body: 'مساحتك ووقتك.' },
        both: { title: 'كلاهما', body: 'نوّع من أسبوع لآخر.' },
      },
    },
    days: {
      title: 'كم يومًا يمكنك التمرّن أسبوعيًا؟', subtitle: 'الاستمرارية أهم من الكمال.', unit: 'أيام / أسبوع', cta: 'حدّد أسبوعي',
      weekdays: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
      feedback: { 2: 'بداية ذكية وثابتة.', 3: 'توازن رائع.', 4: 'أنت تبني استمرارية حقيقية.', 5: 'مثالي لتقدّم أسرع.', 6: 'وضع الرياضي. التعافي مشمول.', 7: 'كل يوم، مع تعافٍ نشط.' },
    },
    duration: {
      title: 'كم لديك من الوقت؟', subtitle: 'لكل جلسة. سنستفيد من كل دقيقة.', unit: 'دقيقة',
      options: { '20-30': 'سريع ومركّز', '30-45': 'المدة المثالية', '45-60': 'تمرين عميق', '60-90': 'جلسة كاملة' },
    },
    equipment: {
      title: 'ما المعدات المتاحة لك؟', subtitle: 'اختر كل ما يمكنك استخدامه.', selected: 'تم اختيار {count}',
      options: { dumbbells: 'دمبل', barbell: 'بار حديد', bench: 'مقعد', 'cable-machine': 'جهاز الكابل', bands: 'أحزمة المقاومة', 'smith-machine': 'جهاز سميث', 'pull-up-bar': 'بار العقلة', machines: 'أجهزة', bodyweight: 'وزن الجسم', 'full-gym': 'نادٍ كامل' },
    },
    age: { title: 'كم عمرك؟', subtitle: 'يساعدنا على ضبط الشدة المناسبة.', unit: 'سنة' },
    height: { title: 'كم طولك؟', subtitle: 'لضبط أحمال تمرينك بدقة.', unit: 'سم' },
    weight: { title: 'كم وزنك؟', subtitle: 'لا يراه أحد سواك. دائمًا.', unit: 'كغ' },
    gender: {
      title: 'كيف تعرّف نفسك؟', subtitle: 'يساعدنا على تخصيص خطتك.', cta: 'أنشئ خطتي',
      options: { woman: 'امرأة', man: 'رجل', 'non-binary': 'غير ثنائي', unspecified: 'أفضّل عدم الإجابة' },
    },
    complete: {
      building: 'نُعدّ خطتك', checks: ['مطابقة هدفك', 'ملاءمة جدولك', 'اختيار تمارينك'],
      title: 'خطتك جاهزة', body: 'مصمّمة حول هدفك وجدولك ومعداتك.',
      goal: 'الهدف', schedule: 'الجدول', session: 'الجلسة', location: 'المكان', perWeek: '{count} أيام / أسبوع',
      cta: 'لننطلق', error: 'تعذّر حفظ خطتك. تحقّق من اتصالك.', retry: 'حاول مجددًا',
    },
  },
};

export const ar = mergeTranslations(firstRun, arApp, dashboard.ar, utilities.ar, growth.ar, activity.ar);
