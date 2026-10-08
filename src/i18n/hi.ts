import { mergeTranslations, type Translation } from './types';
import { hiApp } from './app/hi';
import { dashboard } from './app/dashboard';
import { utilities } from './app/utilities';
import { growth } from './app/growth';
import { activity } from './app/activity';

/** Splash, intro, language and onboarding. App screens live in `app/hi.ts`. */
const firstRun: Translation = {
  common: { next: 'आगे', back: 'पीछे', skip: 'छोड़ें', done: 'हो गया', continue: 'जारी रखें', search: 'खोजें' },
  splash: { tagline: 'बेहतर बनाएं। मज़बूती से आगे बढ़ें।' },
  intro: {
    slides: [
      { tag: 'आपके लिए', title: 'आपके हिसाब से बनी ट्रेनिंग', body: 'आपके लक्ष्य, अनुभव और जीवनशैली से हर वर्कआउट तय होता है।' },
      { tag: 'गाइडेड', title: 'हर मूवमेंट साफ़ देखें', body: 'साफ़ डेमो, सिर्फ़ ज़रूरी टिप्स के साथ।' },
      { tag: 'प्रगति', title: 'प्रगति जो सच में दिखे', body: 'स्ट्रीक, आंकड़े और पर्सनल बेस्ट, सब एक जगह।' },
      { tag: 'निरंतरता', title: 'छोटी जीत। हर हफ़्ते।', body: 'साप्ताहिक चैलेंज जो आपकी रफ़्तार बनाए रखें।' },
    ],
    start: 'चलिए शुरू करें',
    visual: {
      goal: 'आपका लक्ष्य', goalValue: 'मसल बनाना', schedule: 'हफ़्ते में 4 दिन', level: 'मध्यम',
      exercise: 'गॉबलेट स्क्वाट', reps: 'रेप्स', sets: 'सेट', muscle: 'मसल ग्रुप', muscleValue: 'ग्लूट्स · क्वाड्स', technique: 'तकनीक', techniqueValue: 'धीरे-धीरे नीचे जाएं',
      thisWeek: 'इस हफ़्ते', workouts: 'वर्कआउट', minutes: 'मिनट', personalBest: 'नया पर्सनल बेस्ट',
      challenge: 'साप्ताहिक चैलेंज', challengeValue: '4 में से 3 वर्कआउट', streak: 'दिन की स्ट्रीक', badge: 'बैज अनलॉक', badgeValue: 'सुबह का योद्धा', complete: 'वर्कआउट पूरा',
    },
  },
  language: { title: 'अपनी भाषा चुनें', body: 'आप इसे कभी भी बदल सकते हैं।', search: 'भाषा खोजें', popular: 'लोकप्रिय', all: 'सभी भाषाएं', results: 'परिणाम', noResults: '“{query}” से कोई भाषा मेल नहीं खाती।', continueIn: '{language} में जारी रखें' },
  onboarding: {
    stepOf: 'चरण {current} / {total}',
    goal: {
      title: 'आप किसके लिए ट्रेनिंग कर रहे हैं?', subtitle: 'वह लक्ष्य चुनें जो अभी सबसे ज़रूरी है।', cta: 'यही मेरा लक्ष्य है',
      options: {
        'build-muscle': { title: 'मसल बनाएं', body: 'साइज़ और ताकत बढ़ाएं।' },
        'lose-fat': { title: 'फैट घटाएं', body: 'लीन बनें, हल्का महसूस करें।' },
        'get-stronger': { title: 'ज़्यादा मज़बूत बनें', body: 'ज़्यादा उठाएं, दम से चलें।' },
        'stay-fit': { title: 'फिट रहें', body: 'हर दिन अच्छा महसूस करें।' },
        'improve-endurance': { title: 'स्टैमिना बढ़ाएं', body: 'ज़्यादा देर टिकें, जल्दी रिकवर करें।' },
        'improve-mobility': { title: 'लचीलापन बढ़ाएं', body: 'बिना जकड़न के आज़ादी से चलें।' },
      },
    },
    experience: {
      title: 'आप कहां से शुरू कर रहे हैं?', subtitle: 'कोई जवाब गलत नहीं। हम आपके साथ हैं।',
      options: {
        beginner: { title: 'शुरुआती', body: 'मैं अभी बेसिक्स सीख रहा/रही हूं।' },
        intermediate: { title: 'मध्यम', body: 'मैं नियमित रूप से ट्रेनिंग करता/करती हूं।' },
        advanced: { title: 'एडवांस्ड', body: 'ट्रेनिंग मेरी जीवनशैली का हिस्सा है।' },
      },
    },
    location: {
      title: 'आप आमतौर पर कहां ट्रेनिंग करते हैं?', subtitle: 'हम हर एक्सरसाइज़ आपकी जगह के हिसाब से चुनेंगे।',
      options: {
        gym: { title: 'जिम', body: 'रैक, मशीनें और फ्री वेट्स।' },
        home: { title: 'घर', body: 'आपकी जगह, आपका समय।' },
        both: { title: 'दोनों', body: 'हर हफ़्ते बदलते रहें।' },
      },
    },
    days: {
      title: 'आप हफ़्ते में कितने दिन ट्रेनिंग कर सकते हैं?', subtitle: 'निरंतरता परफ़ेक्शन से बेहतर है।', unit: 'दिन / हफ़्ता', cta: 'मेरा हफ़्ता तय करें',
      weekdays: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
      feedback: { 2: 'एक समझदार, स्थिर शुरुआत।', 3: 'बढ़िया संतुलन।', 4: 'आप गंभीर निरंतरता बना रहे हैं।', 5: 'तेज़ प्रगति के लिए एकदम सही।', 6: 'एथलीट मोड। रिकवरी शामिल।', 7: 'हर दिन, एक्टिव रिकवरी के साथ।' },
    },
    duration: {
      title: 'आपके पास कितना समय है?', subtitle: 'हर सेशन में। हम हर मिनट का फ़ायदा उठाएंगे।', unit: 'मिनट',
      options: { '20-30': 'तेज़ और फ़ोकस्ड', '30-45': 'सबसे सही', '45-60': 'गहरी ट्रेनिंग', '60-90': 'पूरा सेशन' },
    },
    equipment: {
      title: 'आप कौन-सा इक्विपमेंट इस्तेमाल कर सकते हैं?', subtitle: 'जो कुछ भी उपलब्ध है, सब चुनें।', selected: '{count} चुने गए',
      options: { dumbbells: 'डम्बल', barbell: 'बारबेल', bench: 'बेंच', 'cable-machine': 'केबल मशीन', bands: 'रेज़िस्टेंस बैंड', 'smith-machine': 'स्मिथ मशीन', 'pull-up-bar': 'पुल-अप बार', machines: 'मशीनें', bodyweight: 'बॉडीवेट', 'full-gym': 'पूरा जिम' },
    },
    age: { title: 'आपकी उम्र क्या है?', subtitle: 'सही इंटेंसिटी तय करने में मदद करता है।', unit: 'साल' },
    height: { title: 'आपकी लंबाई कितनी है?', subtitle: 'आपके ट्रेनिंग लोड को सटीक बनाने के लिए।', unit: 'सेमी' },
    weight: { title: 'आपका वज़न कितना है?', subtitle: 'सिर्फ़ आप देख सकते हैं। हमेशा।', unit: 'किग्रा' },
    gender: {
      title: 'आप अपनी पहचान कैसे करते हैं?', subtitle: 'आपका प्लान पर्सनलाइज़ करने में मदद करता है।', cta: 'मेरा प्लान बनाएं',
      options: { woman: 'महिला', man: 'पुरुष', 'non-binary': 'नॉन-बाइनरी', unspecified: 'बताना नहीं चाहते' },
    },
    complete: {
      building: 'आपका प्लान बन रहा है', checks: ['आपके लक्ष्य से मिलान', 'आपके शेड्यूल में फ़िट', 'आपकी एक्सरसाइज़ चुनी जा रही हैं'],
      title: 'आपका प्लान तैयार है', body: 'आपके लक्ष्य, शेड्यूल और इक्विपमेंट के हिसाब से बना।',
      goal: 'लक्ष्य', schedule: 'शेड्यूल', session: 'सेशन', location: 'जगह', perWeek: 'हफ़्ते में {count} दिन',
      cta: 'चलिए शुरू करें', error: 'आपका प्लान सेव नहीं हो सका। अपना कनेक्शन जांचें।', retry: 'फिर से कोशिश करें',
    },
  },
};

export const hi = mergeTranslations(firstRun, hiApp, dashboard.hi, utilities.hi, growth.hi, activity.hi);
