import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { APP_ID } from './authService';

export interface SimulationParams {
  annualReturn: number;
  years: number;
  monthlyExpenses: number;
  monthlyInvestment: number;
  lumpSum?: number;
  inflationRate: number;
  manualGoal: number | null;
  useCalculatedGoal: boolean;
  bufferYears?: number;
  customAllocations?: { symbol: string; weight: number }[];
}

export interface UserSettings {
  currency: string;
  language: string;
  onboardingCompleted: boolean;
  simulationParams: SimulationParams;
}

interface SettingsContextType {
  settings: UserSettings | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const settingsRef = doc(db, 'users', user.uid, 'apps', APP_ID, 'settings', 'config');
        const unsubscribeSnapshot = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as UserSettings);
          } else {
            // Default settings if none exist
            setSettings({
              currency: 'USD',
              language: 'zh-TW',
              onboardingCompleted: false,
              simulationParams: {
                annualReturn: 10,
                years: 30,
                monthlyExpenses: 800,
                monthlyInvestment: 800,
                inflationRate: 3,
                manualGoal: null,
                useCalculatedGoal: true,
                bufferYears: 2
              }
            });
          }
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setSettings(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!auth.currentUser) return;

    const settingsRef = doc(db, 'users', auth.currentUser.uid, 'apps', APP_ID, 'settings', 'config');
    
    // We only send the updates. Firestore with { merge: true } will merge them.
    // We also explicitly remove obsolete root-level fields to ensure they don't reappear.
    const dataToSave: any = {
      ...updates,
      updatedAt: serverTimestamp(),
      monthlyInvestment: deleteField(),
      initialCapital: deleteField(),
      targetAmount: deleteField()
    };

    try {
      await setDoc(settingsRef, dataToSave, { merge: true });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
