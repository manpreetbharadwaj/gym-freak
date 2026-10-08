import * as Speech from 'expo-speech';

/**
 * Text-to-speech for the countdown and the voice coach (platform TTS via expo-speech; no audio files).
 * Speech is queued by the OS, so a milestone never cuts off the previous sentence.
 */
let language = 'en';

export function setVoiceLanguage(lang: string) { language = lang; }

export function speak(text: string, options: { interrupt?: boolean; rate?: number } = {}) {
  if (!text) return;
  try {
    if (options.interrupt) Speech.stop();
    Speech.speak(text, { language, rate: options.rate ?? 1, pitch: 1 });
  } catch {
    // Speech is a nice-to-have; tracking must never fail because TTS is unavailable.
  }
}

export function stopSpeaking() { try { Speech.stop(); } catch { /* ignore */ } }
