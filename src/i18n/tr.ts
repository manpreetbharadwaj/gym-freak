import { mergeTranslations, type Translation } from './types';
import { trApp } from './app/tr';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/tr.ts`. */
const firstRun: Translation = {
  common: { next: 'İleri', back: 'Geri', skip: 'Atla', done: 'Bitti', continue: 'Devam et', search: 'Ara' },
  splash: { tagline: 'Daha iyi çalış. Daha güçlü hareket et.' },
  intro: {
    slides: [
      { tag: 'Kişisel', title: 'Sana göre kurulan antrenman', body: 'Hedeflerin, deneyimin ve yaşam tarzın her antrenmanı şekillendirir.' },
      { tag: 'Rehberli', title: 'Her hareketi net gör', body: 'Gerçekten önemli ipuçlarıyla net demolar.' },
      { tag: 'İlerleme', title: 'Gerçekten görebildiğin ilerleme', body: 'Seriler, istatistikler ve kişisel rekorlar tek yerde.' },
      { tag: 'İstikrar', title: 'Küçük kazanımlar. Her hafta.', body: 'Temponu koruyan haftalık görevler.' },
    ],
    start: 'Hadi başlayalım',
    visual: {
      goal: 'Hedefin', goalValue: 'Kas kazanmak', schedule: 'Haftada 4 gün', level: 'Orta seviye',
      exercise: 'Goblet squat', reps: 'Tekrar', sets: 'Set', muscle: 'Kas grubu', muscleValue: 'Kalça · Ön bacak', technique: 'Teknik', techniqueValue: 'Yavaşça in',
      thisWeek: 'Bu hafta', workouts: 'Antrenman', minutes: 'Dakika', personalBest: 'Yeni kişisel rekor',
      challenge: 'Haftalık görev', challengeValue: '4 antrenmandan 3’ü', streak: 'günlük seri', badge: 'Rozet açıldı', badgeValue: 'Erkenci', complete: 'Antrenman tamamlandı',
    },
  },
  language: { title: 'Dilini seç', body: 'İstediğin zaman değiştirebilirsin.', search: 'Dil ara', popular: 'Popüler', all: 'Tüm diller', results: 'Sonuçlar', noResults: '“{query}” ile eşleşen dil yok.', continueIn: '{language} ile devam et' },
  onboarding: {
    stepOf: 'Adım {current} / {total}',
    goal: {
      title: 'Ne için antrenman yapıyorsun?', subtitle: 'Şu an senin için en önemli hedefi seç.', cta: 'Hedefim bu',
      options: {
        'build-muscle': { title: 'Kas kazan', body: 'Daha fazla hacim ve güç.' },
        'lose-fat': { title: 'Yağ yak', body: 'Sıkılaş, hafifle.' },
        'get-stronger': { title: 'Güçlen', body: 'Daha çok kaldır, güçle hareket et.' },
        'stay-fit': { title: 'Formda kal', body: 'Her gün iyi hisset.' },
        'improve-endurance': { title: 'Dayanıklılığı artır', body: 'Daha uzun dayan, hızlı toparlan.' },
        'improve-mobility': { title: 'Mobiliteyi artır', body: 'Tutukluk olmadan özgürce hareket et.' },
      },
    },
    experience: {
      title: 'Nereden başlıyorsun?', subtitle: 'Yanlış cevap yok. Seninle aynı yerden başlarız.',
      options: {
        beginner: { title: 'Başlangıç', body: 'Hâlâ temelleri öğreniyorum.' },
        intermediate: { title: 'Orta seviye', body: 'Düzenli antrenman yapıyorum.' },
        advanced: { title: 'İleri seviye', body: 'Antrenman yaşam tarzımın bir parçası.' },
      },
    },
    location: {
      title: 'Genelde nerede antrenman yaparsın?', subtitle: 'Her egzersizi alanına göre seçeriz.',
      options: {
        gym: { title: 'Spor salonu', body: 'Rack’ler, makineler ve serbest ağırlıklar.' },
        home: { title: 'Ev', body: 'Senin alanın, senin programın.' },
        both: { title: 'İkisi de', body: 'Haftadan haftaya değiştir.' },
      },
    },
    days: {
      title: 'Haftada kaç gün antrenman yapabilirsin?', subtitle: 'İstikrar mükemmellikten iyidir.', unit: 'gün / hafta', cta: 'Haftamı belirle',
      weekdays: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
      feedback: { 2: 'Akıllıca ve istikrarlı bir başlangıç.', 3: 'Harika bir denge.', 4: 'Ciddi bir istikrar kuruyorsun.', 5: 'Hızlı ilerleme için ideal.', 6: 'Sporcu modu. Toparlanma dahil.', 7: 'Her gün, aktif toparlanmayla.' },
    },
    duration: {
      title: 'Ne kadar vaktin var?', subtitle: 'Seans başına. Her dakikayı değerlendireceğiz.', unit: 'dk',
      options: { '20-30': 'Hızlı ve odaklı', '30-45': 'En ideali', '45-60': 'Derinlemesine', '60-90': 'Tam seans' },
    },
    equipment: {
      title: 'Hangi ekipmanları kullanabilirsin?', subtitle: 'Erişebildiğin her şeyi seç.', selected: '{count} seçildi',
      options: { dumbbells: 'Dambıl', barbell: 'Halter', bench: 'Sehpa', 'cable-machine': 'Kablo makinesi', bands: 'Direnç bantları', 'smith-machine': 'Smith makinesi', 'pull-up-bar': 'Barfiks barı', machines: 'Makineler', bodyweight: 'Vücut ağırlığı', 'full-gym': 'Tam donanımlı salon' },
    },
    age: { title: 'Kaç yaşındasın?', subtitle: 'Doğru yoğunluğu ayarlamamıza yardımcı olur.', unit: 'yaş' },
    height: { title: 'Boyun kaç?', subtitle: 'Antrenman yüklerini ince ayar için.', unit: 'cm' },
    weight: { title: 'Kilon kaç?', subtitle: 'Sadece sen görürsün. Her zaman.', unit: 'kg' },
    gender: {
      title: 'Kendini nasıl tanımlıyorsun?', subtitle: 'Planını kişiselleştirmemize yardımcı olur.', cta: 'Planımı oluştur',
      options: { woman: 'Kadın', man: 'Erkek', 'non-binary': 'Non-binary', unspecified: 'Belirtmek istemiyorum' },
    },
    complete: {
      building: 'Planın hazırlanıyor', checks: ['Hedefin eşleştiriliyor', 'Programın ayarlanıyor', 'Egzersizlerin seçiliyor'],
      title: 'Planın hazır', body: 'Hedefine, programına ve ekipmanına göre hazırlandı.',
      goal: 'Hedef', schedule: 'Program', session: 'Seans', location: 'Yer', perWeek: 'Haftada {count} gün',
      cta: 'Hadi başlayalım', error: 'Planın kaydedilemedi. Bağlantını kontrol et.', retry: 'Tekrar dene',
    },
  },
};

export const tr = mergeTranslations(firstRun, trApp, dashboard.tr, utilities.tr, growth.tr, activity.tr);
