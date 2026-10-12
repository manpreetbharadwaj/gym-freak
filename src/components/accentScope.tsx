import React, { createContext, useContext } from 'react';
import { GradientPair, gradients, palette } from '@/theme';

/**
 * Accent colours a screen can scope onto shared components (rings, active marks, section links, card surfaces)
 * without touching the global tokens. The default is exactly the app theme, so every screen without a provider
 * renders as before; a screen opts in by wrapping its content in <AccentScopeProvider>.
 */
export interface AccentScope {
  accent: string;
  accentSoft: string;
  onAccent: string;
  /** Quick Start / avatar rings. */
  ring: GradientPair;
  /** Unseen story rings. */
  storyRing: GradientPair;
  /** Optional card surface + hairline override (undefined = the component's own). */
  surface?: string;
  line?: string;
  /** Page canvas behind rings (the thin gap inside Quick Start / story circles). */
  canvas?: string;
}

export const DEFAULT_ACCENT_SCOPE: AccentScope = {
  accent: palette.accent,
  accentSoft: palette.accentSoft,
  onAccent: palette.onAccent,
  ring: gradients.primary,
  storyRing: ['#1DAEEA', '#63D8FF', '#2C7BFF'],
};

const AccentScopeContext = createContext<AccentScope>(DEFAULT_ACCENT_SCOPE);

export function AccentScopeProvider({ value, children }: { value: AccentScope; children: React.ReactNode }) {
  return <AccentScopeContext.Provider value={value}>{children}</AccentScopeContext.Provider>;
}

export const useAccentScope = () => useContext(AccentScopeContext);

/** Surface override for a card style (empty when the scope doesn't override surfaces). */
export const scopedSurface = (scope: AccentScope) => (scope.surface ? { backgroundColor: scope.surface, borderColor: scope.line ?? undefined } : null);
