import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, appleProvider, isConfigured } from './config';
import { apiClient } from '../api/apiClient';

interface SocialLoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    kycStatus?: string;
    onboardingCompleted?: boolean;
  };
}

async function socialLogin(idToken: string): Promise<SocialLoginResponse> {
  const response = await apiClient.post<SocialLoginResponse>('/auth/social-login', {
    idToken,
    provider: 'firebase',
  });
  return response.data;
}

export async function signInWithGoogle(): Promise<SocialLoginResponse> {
  if (!isConfigured || !auth || !googleProvider) {
    throw new Error('Firebase nu este configurat');
  }

  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return socialLogin(idToken);
}

export async function signInWithApple(): Promise<SocialLoginResponse> {
  if (!isConfigured || !auth || !appleProvider) {
    throw new Error('Firebase nu este configurat');
  }

  const result = await signInWithPopup(auth, appleProvider);
  const idToken = await result.user.getIdToken();
  return socialLogin(idToken);
}
