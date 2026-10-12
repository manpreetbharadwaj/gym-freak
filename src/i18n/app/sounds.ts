import type { Translation } from '../types';

/** Settings → Sound effects. */
export const sounds: Record<'ar' | 'de' | 'es' | 'fr' | 'hi' | 'it' | 'ja' | 'ko' | 'nl' | 'pt' | 'tr', Translation> = {
  de: { profile: { soundEffects: 'Soundeffekte', soundEffectsBody: 'Töne in der App, z. B. beim Hinzufügen von Wasser' } },
  es: { profile: { soundEffects: 'Efectos de sonido', soundEffectsBody: 'Sonidos de la app, como al añadir agua' } },
  fr: { profile: { soundEffects: 'Effets sonores', soundEffectsBody: 'Sons dans l’app, par exemple en ajoutant de l’eau' } },
  it: { profile: { soundEffects: 'Effetti sonori', soundEffectsBody: 'Suoni nell’app, come quando aggiungi acqua' } },
  nl: { profile: { soundEffects: 'Geluidseffecten', soundEffectsBody: 'Geluiden in de app, zoals bij water toevoegen' } },
  pt: { profile: { soundEffects: 'Efeitos sonoros', soundEffectsBody: 'Sons no app, como ao adicionar água' } },
  hi: { profile: { soundEffects: 'साउंड इफ़ेक्ट', soundEffectsBody: 'ऐप की आवाज़ें, जैसे पानी जोड़ते समय' } },
  ar: { profile: { soundEffects: 'المؤثرات الصوتية', soundEffectsBody: 'أصوات داخل التطبيق، مثل إضافة الماء' } },
  tr: { profile: { soundEffects: 'Ses efektleri', soundEffectsBody: 'Uygulama içi sesler, örneğin su eklerken' } },
  ja: { profile: { soundEffects: '効果音', soundEffectsBody: '水を追加したときなどのアプリ内の音' } },
  ko: { profile: { soundEffects: '효과음', soundEffectsBody: '물 추가 등 앱 안의 소리' } },
};
