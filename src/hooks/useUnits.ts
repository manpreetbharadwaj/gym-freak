import { getLocales } from 'expo-localization';
import { usePreferences } from '@/hooks/queries';
import { resolveUnitSystem, UnitPreference, UnitSystem } from '@/utils/units';

/** The device's region decides "auto" (not its language). */
export function deviceUnitSystem(preference: UnitPreference | undefined): UnitSystem {
  const locale = getLocales()[0];
  return resolveUnitSystem(preference ?? 'auto', { measurementSystem: locale?.measurementSystem, regionCode: locale?.regionCode });
}

/** Unit system for display, everywhere. Changing Settings → Units re-renders every screen using it. */
export function useUnitSystem(): UnitSystem {
  const prefs = usePreferences();
  return deviceUnitSystem(prefs.data?.units);
}
