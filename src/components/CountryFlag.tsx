import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

/** Small vector flags follow the country choices in i18n/languages.ts. */
export function CountryFlag({ code, width = 40, style }: { code: string; width?: number; style?: StyleProp<ViewStyle> }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.frame, { width, height: width * 2 / 3 }, style]}>
    <Svg width="100%" height="100%" viewBox="0 0 60 40" accessible={false}>
      <FlagArt code={code} />
    </Svg>
    <View style={styles.edge} />
  </View>;
}

function FlagArt({ code }: { code: string }) {
  switch (code) {
    case 'en': return <>
      <Rect width="60" height="40" fill="#012169" />
      <Path d="M0 0 60 40M60 0 0 40" stroke="#FFF" strokeWidth="9" />
      <Path d="m0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="3" />
      <Path d="M30 0v40M0 20h60" stroke="#FFF" strokeWidth="14" />
      <Path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
    </>;
    case 'es': return <>
      <Rect width="60" height="40" fill="#AA151B" />
      <Rect y="10" width="60" height="20" fill="#F1BF00" />
      <G transform="translate(15 14)">
        <Path d="M0 4h9v7c0 5-9 5-9 0Z" fill="#FFF" stroke="#AA151B" strokeWidth=".7" />
        <Path d="M0 4h4.5v5H0zm4.5 5H9v3.5H4.5z" fill="#AA151B" />
        <Path d="m0 1 2 1 2.5-2L7 2l2-1-.7 3H.7Z" fill="#B48A19" />
        <Path d="M-2 5v9M11 5v9" stroke="#FFF" strokeWidth="1.6" />
        <Path d="M-3 14h3m10 0h3" stroke="#AA151B" strokeWidth="1" />
        <Circle cx="4.5" cy="9" r="1.3" fill="#174789" />
      </G>
    </>;
    case 'de': return <>
      <Rect width="60" height="40" fill="#FFCE00" />
      <Rect width="60" height="13.33" fill="#151515" />
      <Rect y="13.33" width="60" height="13.34" fill="#D00" />
    </>;
    case 'fr': return <>
      <Rect width="60" height="40" fill="#FFF" />
      <Rect width="20" height="40" fill="#002395" />
      <Rect x="40" width="20" height="40" fill="#ED2939" />
    </>;
    case 'pt': return <>
      <Rect width="60" height="40" fill="#F00" />
      <Rect width="24" height="40" fill="#006600" />
      <G transform="translate(24 20)">
        <Circle r="8.4" fill="none" stroke="#FFDF00" strokeWidth="1.5" />
        <Path d="M-8 0H8M0-8v16M-6-5 6 5M-6 5 6-5" stroke="#FFDF00" strokeWidth="1" />
        <Path d="M-5-6H5v8c0 5-10 5-10 0Z" fill="#FFF" stroke="#C00" strokeWidth="2" />
        <Path d="M-1-4h2v2h-2zm-2 3h2v2h-2zm4 0h2v2H1zm-2 0h2v2h-2zm0 3h2v2h-2z" fill="#003399" />
      </G>
    </>;
    case 'hi': return <>
      <Rect width="60" height="40" fill="#FFF" />
      <Rect width="60" height="13.33" fill="#FF9933" />
      <Rect y="26.67" width="60" height="13.33" fill="#138808" />
      <Circle cx="30" cy="20" r="5.4" fill="none" stroke="#000080" strokeWidth=".7" />
      {Array.from({ length: 24 }, (_, index) => <Line key={index} x1="30" y1="20" x2="30" y2="14.6" stroke="#000080" strokeWidth=".3" transform={`rotate(${index * 15} 30 20)`} />)}
      <Circle cx="30" cy="20" r=".9" fill="#000080" />
    </>;
    case 'it': return <>
      <Rect width="60" height="40" fill="#FFF" />
      <Rect width="20" height="40" fill="#009246" />
      <Rect x="40" width="20" height="40" fill="#CE2B37" />
    </>;
    case 'nl': return <>
      <Rect width="60" height="40" fill="#FFF" />
      <Rect width="60" height="13.33" fill="#AE1C28" />
      <Rect y="26.67" width="60" height="13.33" fill="#21468B" />
    </>;
    case 'ar': return <>
      <Rect width="60" height="40" fill="#006C35" />
      <SvgText x="30" y="20" textAnchor="middle" fontFamily="serif" fontSize="7.5" fontWeight="bold" fill="#FFF">لا إله إلا الله محمد رسول الله</SvgText>
      <Path d="M14 27h31c-3 2-11 2-17 2H14Z" fill="#FFF" />
      <Path d="M14 26v4m-4-2h5" stroke="#FFF" strokeWidth="1.6" />
    </>;
    case 'tr': return <>
      <Rect width="60" height="40" fill="#E30A17" />
      <Circle cx="25" cy="20" r="10" fill="#FFF" />
      <Circle cx="28" cy="20" r="8" fill="#E30A17" />
      <Path d="m40 13 1.6 5.1H47l-4.4 3.2 1.7 5.2-4.3-3.2-4.4 3.2 1.7-5.2-4.4-3.2h5.4Z" fill="#FFF" transform="rotate(18 40 20)" />
    </>;
    case 'ja': return <>
      <Rect width="60" height="40" fill="#FFF" />
      <Circle cx="30" cy="20" r="11" fill="#BC002D" />
    </>;
    case 'ko': return <>
      <Rect width="60" height="40" fill="#FFF" />
      <G transform="rotate(33.7 30 20)">
        <Circle cx="30" cy="20" r="9" fill="#CD2E3A" />
        <Path d="M21 20a9 9 0 0 0 18 0 4.5 4.5 0 0 0-9 0 4.5 4.5 0 0 1-9 0" fill="#0047A0" />
      </G>
      <G fill="#171717">
        <G transform="translate(12 10) rotate(-56)"><Rect x="-5" y="-3" width="10" height="1.5" /><Rect x="-5" y="-.75" width="10" height="1.5" /><Rect x="-5" y="1.5" width="10" height="1.5" /></G>
        <G transform="translate(48 30) rotate(-56)">{[-3, -.75, 1.5].map((y) => <G key={y}><Rect x="-5" y={y} width="4.3" height="1.5" /><Rect x=".7" y={y} width="4.3" height="1.5" /></G>)}</G>
        <G transform="translate(48 10) rotate(56)"><Rect x="-5" y="-.75" width="10" height="1.5" />{[-3, 1.5].map((y) => <G key={y}><Rect x="-5" y={y} width="4.3" height="1.5" /><Rect x=".7" y={y} width="4.3" height="1.5" /></G>)}</G>
        <G transform="translate(12 30) rotate(56)"><Rect x="-5" y="-3" width="10" height="1.5" /><Rect x="-5" y="1.5" width="10" height="1.5" /><Rect x="-5" y="-.75" width="4.3" height="1.5" /><Rect x=".7" y="-.75" width="4.3" height="1.5" /></G>
      </G>
    </>;
    default: return <>
      <Rect width="60" height="40" fill="#F2F3F7" />
      <Circle cx="30" cy="20" r="12" fill="none" stroke="#666487" strokeWidth="1.5" />
      <Path d="M18 20h24M30 8c-7 6-7 18 0 24 7-6 7-18 0-24" fill="none" stroke="#666487" strokeWidth="1.5" />
    </>;
  }
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 5, backgroundColor: '#FFF', flexShrink: 0 },
  edge: { ...StyleSheet.absoluteFill, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,17,54,0.12)' },
});
