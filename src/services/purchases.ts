import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { minorDigits } from '@/utils/money';
import { storefrontToAlpha2 } from '@/utils/storefront';

/**
 * Store billing (StoreKit 2 / Google Play Billing via expo-iap). The store is the source of truth for
 * what a user is charged and in which currency; HealthyMe verifies every receipt and alone updates
 * `GymUserEntitlement.premiumUntil`. The app only ever reads entitlement from the backend.
 */

/** Where the pricing country came from: the store account's storefront (authoritative) or the device region (a hint). */
export interface StoreCountry { country: string | null; source: 'store' | 'device' | 'none' | 'dev-override' }

/** A subscription as the store will charge it in this storefront. */
export interface StoreProduct {
  productId: string;
  /** Localised by the store, e.g. "£7.99" — shown as-is, never re-formatted. */
  displayPrice: string;
  currency: string;
  /** Same amount in minor units for comparing with the server quote; null if the store gave no number. */
  priceMinor: number | null;
  store: 'App Store' | 'Google Play';
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'unverified' | 'unavailable';
export type VerifyReceipt = (input: { platform: 'ios' | 'android'; productId: string; receipt: string }) => Promise<void>;

export interface PurchaseService {
  available(): Promise<boolean>;
  storeCountry(): Promise<StoreCountry>;
  products(productIds: string[]): Promise<Record<string, StoreProduct>>;
  /** Buys `productId`, sends the receipt to `verify`, and finishes the store transaction only after the server accepted it. */
  purchase(productId: string, verify: VerifyReceipt): Promise<PurchaseOutcome>;
  restore(verify: VerifyReceipt): Promise<'restored' | 'nothing' | 'unavailable'>;
}

type Iap = typeof import('expo-iap');
let module: Iap | null | undefined;
/** Loaded lazily so builds without the native module (tests, web) degrade to "unavailable" instead of crashing. */
function iap(): Iap | null {
  if (module === undefined) {
    try { module = Platform.OS === 'ios' || Platform.OS === 'android' ? (require('expo-iap') as Iap) : null; }
    catch { module = null; }
  }
  return module;
}

let connecting: Promise<boolean> | null = null;
function connect(): Promise<boolean> {
  const mod = iap();
  if (!mod) return Promise.resolve(false);
  connecting ??= mod.initConnection().then(() => true, () => { connecting = null; return false; });
  return connecting;
}

const platform = (): 'ios' | 'android' => (Platform.OS === 'ios' ? 'ios' : 'android');
const deviceRegion = () => storefrontToAlpha2(getLocales()[0]?.regionCode ?? null);

export const purchases: PurchaseService = {
  available: connect,

  async storeCountry() {
    // Debug builds only: QA can price as another storefront (EXPO_PUBLIC_DEV_STOREFRONT=GB) since the simulator's
    // StoreKit storefront can't be switched outside Xcode. Release builds never read it.
    const override = __DEV__ ? storefrontToAlpha2(process.env.EXPO_PUBLIC_DEV_STOREFRONT) : null;
    if (override) return { country: override, source: 'dev-override' };
    const mod = iap();
    if (mod && (await connect())) {
      try {
        const country = storefrontToAlpha2(await mod.getStorefront());
        if (country) return { country, source: 'store' };
      } catch { /* fall through to the device region */ }
    }
    const country = deviceRegion();
    return country ? { country, source: 'device' } : { country: null, source: 'none' };
  },

  async products(productIds) {
    const mod = iap();
    if (!mod || !productIds.length || !(await connect())) return {};
    try {
      const items = ((await mod.fetchProducts({ skus: productIds, type: 'subs' })) ?? []) as { id: string; displayPrice: string; currency: string; price?: number | null }[];
      return Object.fromEntries(items.map((p) => [p.id, {
        productId: p.id,
        displayPrice: p.displayPrice,
        currency: p.currency,
        priceMinor: p.price != null ? Math.round(p.price * 10 ** minorDigits(p.currency)) : null,
        store: platform() === 'ios' ? 'App Store' : 'Google Play',
      } satisfies StoreProduct]));
    } catch { return {}; }
  },

  async purchase(productId, verify) {
    const mod = iap();
    if (!mod || !(await connect())) return 'unavailable';
    // Play Billing needs an offer token for subscriptions; StoreKit ignores the Google half.
    let offerToken: string | null = null;
    if (platform() === 'android') {
      try {
        const [product] = ((await mod.fetchProducts({ skus: [productId], type: 'subs' })) ?? []) as { subscriptionOffers?: { offerTokenAndroid?: string | null }[] }[];
        offerToken = product?.subscriptionOffers?.find((o) => o.offerTokenAndroid)?.offerTokenAndroid ?? null;
      } catch { return 'unavailable'; }
      if (!offerToken) return 'unavailable';
    }
    return new Promise<PurchaseOutcome>((resolve) => {
      let settled = false;
      const subscriptions: { remove: () => void }[] = [];
      const settle = (outcome: PurchaseOutcome) => {
        if (settled) return;
        settled = true;
        subscriptions.forEach((s) => s.remove());
        resolve(outcome);
      };
      subscriptions.push(mod.purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId !== productId) return;
        if (purchase.purchaseState === 'pending') return settle('pending'); // e.g. Ask to Buy / slow card: entitlement follows later
        if (!purchase.purchaseToken) return settle('unverified');
        try {
          await verify({ platform: platform(), productId, receipt: purchase.purchaseToken });
          await mod.finishTransaction({ purchase, isConsumable: false });
          settle('purchased');
        } catch {
          // Left unfinished on purpose: the store redelivers it and Restore retries verification.
          settle('unverified');
        }
      }));
      subscriptions.push(mod.purchaseErrorListener((error) => settle(mod.isUserCancelledError(error) ? 'cancelled' : 'unavailable')));
      mod.requestPurchase({
        type: 'subs',
        request: { apple: { sku: productId }, google: { skus: [productId], subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : null } },
      }).catch((error: unknown) => settle(mod.isUserCancelledError(error as never) ? 'cancelled' : 'unavailable'));
    });
  },

  async restore(verify) {
    const mod = iap();
    if (!mod || !(await connect())) return 'unavailable';
    try {
      const owned = (await mod.getAvailablePurchases()) ?? [];
      let restored = 0;
      for (const purchase of owned) {
        if (!purchase.purchaseToken) continue;
        try {
          await verify({ platform: platform(), productId: purchase.productId, receipt: purchase.purchaseToken });
          await mod.finishTransaction({ purchase, isConsumable: false });
          restored += 1;
        } catch { /* the server refused or is unreachable: keep it for the next attempt */ }
      }
      return restored ? 'restored' : 'nothing';
    } catch { return 'unavailable'; }
  },
};
