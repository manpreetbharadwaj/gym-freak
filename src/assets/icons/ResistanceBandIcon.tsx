import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** Plain line icon for an actual closed-loop resistance band, never a mat or cartoon. */
export function ResistanceBandIcon({ size = 38, color = '#666487' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
    <Path d="M10 32 24 10c4-6 14 0 10 6L20 38c-4 6-14 0-10-6Z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="m15 32 13-20c1-2 4 0 3 2L18 34c-1 2-4 0-3-2Z" fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>;
}
