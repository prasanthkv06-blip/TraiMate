import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export default function PrivacyScreen() {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.openBrowserAsync('https://traimate.app/privacy').finally(() => {
      router.back();
    });
  }, [router]);

  return null;
}
