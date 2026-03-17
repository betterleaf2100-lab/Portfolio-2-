import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  runTransaction, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

export const APP_ID = "portfolio_manager_2026";
export const UPSELL_LINK = "https://school.betterleaf.co/mvi-course";
export const STUDENT_UPSELL_LINK = "https://betterleaf.co/checkout-aitools-subscription";
export const COST_PER_USE = 2;

export function getUpsellLink(role?: string) {
  if (role === 'student') return STUDENT_UPSELL_LINK;
  return UPSELL_LINK;
}

export const VIP_DAILY_LIMIT = 50;
export const STUDENT_TRIAL_LIMIT = 30;

export type UserRole = 'admin' | 'vip' | 'student' | 'trial';

export interface UserData {
  portfolio_credits: number;
  role: UserRole;
  email: string;
  last_reset_date: string; // YYYY-MM-DD
}

/**
 * Step A & B: Identify Role and Handle Credit Logic
 */
export async function syncUserRoleAndCredits(uid: string, email: string): Promise<UserData> {
  const userRef = doc(db, "users", uid);
  const whitelistRef = doc(db, "whitelisted_users", email.toLowerCase());
  
  try {
    const [userSnap, whitelistSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(whitelistRef)
    ]);

    let role: UserRole = 'trial';
    const today = new Date().toISOString().split('T')[0];

    // Determine role based on Whitelist
    if (whitelistSnap.exists()) {
      const data = whitelistSnap.data();
      const plan = data.plan?.toLowerCase();
      
      if (plan === 'admin' || plan === 'vip' || plan === 'student' || plan === 'trial') {
        role = plan as UserRole;
      } else {
        console.warn(`[Firestore] Unknown plan in whitelist: "${data.plan}", defaulting to trial`);
        role = 'trial';
      }
    } else {
      role = 'trial';
    }

    let userData: UserData;

    if (!userSnap.exists()) {
      userData = {
        portfolio_credits: STUDENT_TRIAL_LIMIT,
        role: role,
        email: email,
        last_reset_date: today
      };
      await setDoc(userRef, userData);
    } else {
      const currentData = userSnap.data() as any;
      let newCredits = currentData.portfolio_credits ?? currentData.credits ?? STUDENT_TRIAL_LIMIT;
      
      // Credit Logic
      if (role === 'admin') {
        newCredits = 999999;
      } else if (role === 'vip') {
        if (currentData.last_reset_date !== today) {
          newCredits = VIP_DAILY_LIMIT;
        }
      } else {
        if (newCredits > STUDENT_TRIAL_LIMIT) {
          newCredits = STUDENT_TRIAL_LIMIT;
        }
      }

      userData = {
        ...currentData,
        portfolio_credits: newCredits,
        role: role,
        email: email,
        last_reset_date: today
      };
      
      await updateDoc(userRef, {
        portfolio_credits: newCredits,
        role: role,
        last_reset_date: today,
        email: email // Ensure email is synced
      });
    }

    return userData;
  } catch (error) {
    console.error(`[Firestore] Error in syncUserRoleAndCredits for ${email}:`, error);
    // Return a safe default or rethrow
    throw error;
  }
}

/**
 * Step C: Deduction (Atomic Transaction)
 */
export async function deductCredits(uid: string, amount: number = COST_PER_USE): Promise<boolean> {
  const userRef = doc(db, "users", uid);

  try {
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User does not exist!");

      const data = userSnap.data() as UserData;
      
      if (data.role === 'admin') return true;

      if (data.portfolio_credits < amount) {
        return false;
      }

      transaction.update(userRef, {
        portfolio_credits: data.portfolio_credits - amount
      });
      return true;
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
    return false;
  }
}
