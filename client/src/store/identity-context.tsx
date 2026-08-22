import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getInternByName } from '@client/src/data/interns';

const STORAGE_KEY = 'df_current_intern';

interface IdentityContextValue {
  internName: string | null;
  setIntern: (name: string) => void;
}

const IdentityContext = createContext<IdentityContextValue | undefined>(
  undefined,
);

interface IdentityProviderProps {
  children: ReactNode;
}

export const IdentityProvider = ({ children }: IdentityProviderProps) => {
  const [internName, setInternName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && getInternByName(stored)) {
        return stored;
      }
      if (stored) {
        logger.warn(`清除无效的实习身份缓存: "${stored}"`);
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return null;
    } catch {
      logger.warn('Failed to read intern identity from localStorage');
      return null;
    }
  });

  useEffect(() => {
    try {
      if (internName === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, internName);
      }
    } catch {
      logger.warn('Failed to persist intern identity to localStorage');
    }
  }, [internName]);

  const setIntern = useCallback((name: string) => {
    if (!name || !getInternByName(name)) {
      logger.warn(`拒绝设置无效实习身份: "${name}"`);
      return;
    }
    setInternName(name);
  }, []);

  const value = useMemo<IdentityContextValue>(
    () => ({ internName, setIntern }),
    [internName, setIntern],
  );

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = (): IdentityContextValue => {
  const ctx = useContext(IdentityContext);
  if (ctx === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return ctx;
};
