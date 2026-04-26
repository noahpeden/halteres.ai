import Purchases, { type PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
export const PRO_ENTITLEMENT_ID = 'pro';

let initialized = false;

// Configures RevenueCat with the user's Supabase id as app_user_id so the
// webhook can identify which subscription belongs to whom.
export async function initPurchases(supabaseUserId: string): Promise<void> {
  if (initialized) {
    await Purchases.logIn(supabaseUserId);
    return;
  }
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn('RevenueCat key not set; in-app purchases disabled');
    return;
  }
  Purchases.configure({ apiKey, appUserID: supabaseUserId });
  initialized = true;
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePro(): Promise<boolean> {
  const offering = await getOffering();
  const pkg = offering?.availablePackages[0];
  if (!pkg) throw new Error('No pro package available');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return PRO_ENTITLEMENT_ID in customerInfo.entitlements.active;
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return PRO_ENTITLEMENT_ID in customerInfo.entitlements.active;
}

export async function logoutPurchases(): Promise<void> {
  if (initialized) await Purchases.logOut();
}
