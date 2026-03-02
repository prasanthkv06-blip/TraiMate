import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { migrateGuestDataToUser } from '../services/dataMigration';
import { clearMasterKey } from '../lib/secureStorage';
import { logSecurityEvent } from '../services/auditService';

WebBrowser.maybeCompleteAuthSession();

const GUEST_MODE_KEY = '@traimate_guest_mode';
const ONBOARDED_KEY = '@traimate_onboarded';
const USER_NAME_KEY = '@traimate_user_name';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  isLoading: true,
  isGuest: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signOut: async () => {},
  continueAsGuest: async () => {},
  resetPassword: async () => ({ error: null }),
  deleteAccount: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const wasGuest = useRef(false);

  useEffect(() => {
    async function init() {
      try {
        // Check guest mode
        const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const guestVal = guestMode === 'true';
        setIsGuest(guestVal);
        wasGuest.current = guestVal;

        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
      } catch (e) {
        console.warn('Auth init error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      // If transitioning from guest to authenticated, migrate data
      if (newSession?.user && wasGuest.current) {
        wasGuest.current = false;
        setIsGuest(false);
        try {
          await migrateGuestDataToUser(newSession.user.id);
        } catch (e) {
          console.warn('Data migration error:', e);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      logSecurityEvent('account_login', { method: 'email' });
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUri = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : makeRedirectUri({ scheme: 'traimate', path: 'auth/callback' });

      if (Platform.OS === 'web') {
        // On web, redirect directly instead of using WebBrowser
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
          },
        });
        if (error) return { error: new Error(error.message) };
        // If Supabase didn't auto-redirect, do it manually
        if (data?.url) {
          window.location.href = data.url;
        }
        return { error: null };
      }

      // Native: use WebBrowser
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error: new Error(error.message) };
      if (!data.url) return { error: new Error('No auth URL returned') };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1) || url.search.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) return { error: new Error(sessionError.message) };
        }
      }

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        return { error: new Error('Apple Sign-In is only available on iOS') };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: new Error('No identity token returned from Apple') };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: undefined,
      });

      if (error) return { error: new Error(error.message) };

      // If Apple provided a name, update the profile
      if (credential.fullName?.givenName) {
        const name = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          await (supabase.from('profiles') as any).update({ name }).eq('id', currentUser.id);
        }
      }

      return { error: null };
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return { error: null }; // User cancelled
      }
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    logSecurityEvent('account_logout');
    await supabase.auth.signOut();
    await AsyncStorage.multiRemove([ONBOARDED_KEY, GUEST_MODE_KEY]);
    setSession(null);
    setIsGuest(false);
  };

  const continueAsGuest = async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    await AsyncStorage.setItem(USER_NAME_KEY, 'Traveler');
    setIsGuest(true);
    wasGuest.current = true;
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { error: new Error(error.message) };
      logSecurityEvent('password_reset_requested', { email });
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const deleteAccount = async () => {
    try {
      if (session?.user) {
        logSecurityEvent('account_delete_requested');

        // Cascade delete all user data via Supabase RPC
        const { error: rpcError } = await (supabase.rpc as any)('delete_user_account', {
          target_user_id: session.user.id,
        });
        if (rpcError) {
          console.warn('RPC delete_user_account error:', rpcError.message);
          // Fallback: mark profile as deleted
          await (supabase.from('profiles') as any).update({
            name: 'Deleted User',
            is_guest: true,
          }).eq('id', session.user.id);
        }
      }

      // Clear all local data
      const allKeys = await AsyncStorage.getAllKeys();
      const traimateKeys = allKeys.filter(k => k.startsWith('@traimate'));
      if (traimateKeys.length > 0) {
        await AsyncStorage.multiRemove(traimateKeys);
      }

      // Clear encryption master key
      clearMasterKey();

      await signOut();
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        isGuest,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signOut,
        continueAsGuest,
        resetPassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
