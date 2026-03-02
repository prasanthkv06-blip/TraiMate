import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  isBiometricEnabled,
  setBiometricEnabled as persistBiometricEnabled,
  getBiometricTimeout,
} from '../lib/biometricSettings';

interface BiometricState {
  /** Whether the app is currently locked behind biometric auth */
  isLocked: boolean;
  /** Unlock the app after successful biometric authentication */
  unlock: () => void;
  /** Whether biometric auth is enabled by the user */
  isEnabled: boolean;
  /** Toggle biometric auth on or off (persisted to SecureStore) */
  setEnabled: (enabled: boolean) => Promise<{ error: string | null }>;
  /** Whether the device has biometric hardware and is enrolled */
  isAvailable: boolean;
}

const BiometricContext = createContext<BiometricState>({
  isLocked: false,
  unlock: () => {},
  isEnabled: false,
  setEnabled: async () => ({ error: null }),
  isAvailable: false,
});

export function BiometricProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const lastBackgroundTimestamp = useRef<number | null>(null);
  const timeoutSeconds = useRef(60);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Check hardware availability and load persisted settings on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const available = hasHardware && isEnrolled;

        if (!mounted) return;
        setIsAvailable(available);

        const enabled = await isBiometricEnabled();
        if (!mounted) return;
        setIsEnabled(enabled);

        const timeout = await getBiometricTimeout();
        timeoutSeconds.current = timeout;
      } catch (e) {
        console.warn('BiometricContext init error:', e);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for AppState changes to lock/unlock
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current === 'active' &&
          (nextAppState === 'background' || nextAppState === 'inactive')
        ) {
          // App going to background — record timestamp
          lastBackgroundTimestamp.current = Date.now();
        }

        if (
          nextAppState === 'active' &&
          (appState.current === 'background' || appState.current === 'inactive')
        ) {
          // App returning to foreground — check if we should lock
          if (isEnabled && lastBackgroundTimestamp.current !== null) {
            const elapsed =
              (Date.now() - lastBackgroundTimestamp.current) / 1000;
            if (elapsed >= timeoutSeconds.current) {
              setIsLocked(true);
            }
          }
        }

        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isEnabled]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    lastBackgroundTimestamp.current = Date.now();
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean): Promise<{ error: string | null }> => {
      if (enabled) {
        // Verify hardware is available before enabling
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          return {
            error:
              'Biometric authentication is not available on this device. Please set up Face ID or fingerprint in your device settings.',
          };
        }
      }

      await persistBiometricEnabled(enabled);
      setIsEnabled(enabled);

      // If disabling, also unlock immediately
      if (!enabled) {
        setIsLocked(false);
      }

      return { error: null };
    },
    [],
  );

  return (
    <BiometricContext.Provider
      value={{
        isLocked,
        unlock,
        isEnabled,
        setEnabled,
        isAvailable,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export const useBiometric = () => useContext(BiometricContext);
