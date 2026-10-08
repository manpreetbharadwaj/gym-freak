import { Glyph, mdi } from '@/components';
import { GradientPair, gradients } from '@/theme';

/** Category look for stories without uploaded media. Unknown categories fall back to "motivation". */
export const storyStyles: Record<string, { glyph: Glyph; gradient: GradientPair }> = {
  'weekly-challenge': { glyph: mdi('trophy'), gradient: gradients.citrus },
  'coach-tips': { glyph: mdi('whistle'), gradient: gradients.sky },
  'new-workouts': { glyph: mdi('dumbbell'), gradient: gradients.primary },
  nutrition: { glyph: mdi('food-apple'), gradient: gradients.lime },
  motivation: { glyph: mdi('lightning-bolt'), gradient: gradients.sunrise },
  'bonus-workout': { glyph: mdi('star-four-points'), gradient: gradients.berry },
  'new-exercise': { glyph: mdi('arm-flex'), gradient: gradients.ocean },
};
export const storyStyle = (category: string) => storyStyles[category] ?? storyStyles.motivation;
