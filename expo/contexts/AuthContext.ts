import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const AUTH_KEY = 'rpi_auth_site';
const ANON_KEY = 'rpi_anonymize';

const SITE_ANON_MAP: Record<string, string> = {
  SDD: 'Site 1',
  Abhis: 'Site 2',
  KIMS: 'Site 3',
  Kues: 'Site 4',
  AIG: 'Site 5',
};

export interface SiteCredential {
  site: string;
  label: string;
  email: string;
  password: string;
}

const SITE_CREDENTIALS: SiteCredential[] = [
  { site: 'KIMS', label: 'KIMS Secunderabad', email: 'kims@rpi.demo', password: 'kims2024' },
  { site: 'Abhis', label: 'Abhis Clinic', email: 'abhis@rpi.demo', password: 'abhis2024' },
  { site: 'Kues', label: 'Kues Center', email: 'kues@rpi.demo', password: 'kues2024' },
  { site: 'SDD', label: 'SDD Research', email: 'sdd@rpi.demo', password: 'sdd2024' },
  { site: 'AIG', label: 'AIG Hospital', email: 'aig@rpi.demo', password: 'aig2024' },
  { site: 'ALL', label: 'Admin (All Sites)', email: 'admin@rpi.demo', password: 'admin2024' },
  { site: 'RESEARCH', label: 'Research (All Sites)', email: 'research@rpi.demo', password: 'Research$123$' },
];

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentSite, setCurrentSite] = useState<string | null>(null);
  const [siteLabel, setSiteLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [anonymize, setAnonymize] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_KEY);
        const anonStored = await AsyncStorage.getItem(ANON_KEY);
        if (stored) {
          const cred = SITE_CREDENTIALS.find((c) => c.site === stored);
          if (cred) {
            setCurrentSite(cred.site);
            setSiteLabel(cred.label);
          }
        }
        if (anonStored === 'true') {
          setAnonymize(true);
        }
      } catch (e) {
        console.log('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
    setLoginError('');
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();
    const cred = SITE_CREDENTIALS.find(
      (c) => c.email.toLowerCase() === trimEmail && c.password === trimPass,
    );
    if (cred) {
      setCurrentSite(cred.site);
      setSiteLabel(cred.label);
      void AsyncStorage.setItem(AUTH_KEY, cred.site);
      if (cred.site === 'RESEARCH') {
        setAnonymize(true);
        void AsyncStorage.setItem(ANON_KEY, 'true');
        console.log('Research user: forced anonymize ON on login');
      }
      console.log(`Logged in as ${cred.label} (${cred.site})`);
      return true;
    }
    setLoginError('Invalid email or password. Please try again.');
    console.log('Login failed for', trimEmail);
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentSite(null);
    setSiteLabel('');
    void AsyncStorage.removeItem(AUTH_KEY);
    console.log('Logged out');
  }, []);

  const isAdmin = currentSite === 'ALL' || currentSite === 'RESEARCH';
  const isResearchUser = currentSite === 'RESEARCH';
  const isLoggedIn = currentSite !== null;

  useEffect(() => {
    if (isResearchUser && !anonymize) {
      setAnonymize(true);
      void AsyncStorage.setItem(ANON_KEY, 'true');
      console.log('Research user: forced anonymize ON');
    }
  }, [isResearchUser, anonymize]);

  const toggleAnonymize = useCallback(() => {
    if (isResearchUser) {
      console.log('Research user: anonymize toggle blocked');
      return;
    }
    setAnonymize((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(ANON_KEY, next ? 'true' : 'false');
      console.log('Anonymize toggled:', next);
      return next;
    });
  }, [isResearchUser]);

  const getDisplaySiteName = useCallback((realSite: string): string => {
    if (!isResearchUser) return realSite;
    return SITE_ANON_MAP[realSite] || realSite;
  }, [isResearchUser]);

  return useMemo(() => ({
    currentSite,
    siteLabel,
    isLoading,
    isLoggedIn,
    isAdmin,
    isResearchUser,
    anonymize,
    loginError,
    login,
    logout,
    toggleAnonymize,
    getDisplaySiteName,
    credentials: SITE_CREDENTIALS,
  }), [currentSite, siteLabel, isLoading, isLoggedIn, isAdmin, isResearchUser, anonymize, loginError, login, logout, toggleAnonymize, getDisplaySiteName]);
});
