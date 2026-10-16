import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Tell WebBrowser to complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
export const GOOGLE_WEB_CLIENT_ID = '288269881432-gfdp4g2ucqjo2bf445810gqv2g06ac08.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '288269881432-oec83o4p22iljr79fvhi6brq9ip6cthp.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = ''; // Placeholder for Android APK Client ID

// Reversed Client ID for iOS native redirect
const IOS_REVERSED_CLIENT_ID = 'com.googleusercontent.apps.288269881432-oec83o4p22iljr79fvhi6brq9ip6cthp';

export const loadGoogleSdk = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
        if (!document.getElementById('google-gsi-client')) {
            const script = document.createElement('script');
            script.id = 'google-gsi-client';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }
};

export const fetchGoogleUserProfile = async (accessToken, role = 'customer') => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error('Could not retrieve user info from Google.');
    }
    const profile = await res.json();
    if (!profile.email) {
        throw new Error('Could not retrieve email from Google account.');
    }
    return {
        id: profile.sub || 'g_' + Date.now(),
        name: profile.name || profile.given_name || profile.email.split('@')[0],
        email: profile.email,
        picture: profile.picture || '',
        role: role,
        provider: 'google',
    };
};

export const triggerGoogleAuth = async ({ onSuccess, onError, role = 'customer', isSignUp = false }) => {
    try {
        // --- 1. Web Environment (Google Identity Services) ---
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.google?.accounts?.oauth2?.initTokenClient) {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_WEB_CLIENT_ID,
                scope: 'email profile openid',
                callback: async (tokenResponse) => {
                    if (tokenResponse.error) {
                        if (onError) onError(tokenResponse.error_description || tokenResponse.error);
                        return;
                    }
                    if (tokenResponse.access_token) {
                        try {
                            const googleUserData = await fetchGoogleUserProfile(tokenResponse.access_token, role);
                            if (onSuccess) onSuccess({ ...googleUserData, isSignUp });
                        } catch (fetchErr) {
                            if (onError) onError(fetchErr.message || 'Failed to fetch Google profile details.');
                        }
                    }
                },
            });
            tokenClient.requestAccessToken({ prompt: 'select_account' });
            return;
        }

        // --- 2. Mobile Environment (iOS & Android via expo-web-browser) ---
        let activeClientId = GOOGLE_WEB_CLIENT_ID;
        let redirectUri = AuthSession.makeRedirectUri({
            scheme: 'pickfresh',
            path: 'auth',
            preferLocalhost: false,
        });

        if (Platform.OS === 'ios') {
            activeClientId = GOOGLE_IOS_CLIENT_ID;
            redirectUri = `${IOS_REVERSED_CLIENT_ID}:/oauth2redirect`;
        } else if (Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID) {
            activeClientId = GOOGLE_ANDROID_CLIENT_ID;
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(activeClientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=token` +
            `&scope=${encodeURIComponent('openid profile email')}` +
            `&prompt=select_account`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

        if (result.type === 'success' && result.url) {
            const hashMatch = result.url.match(/access_token=([^&]+)/);
            const queryMatch = result.url.match(/[?&]access_token=([^&]+)/);
            const accessToken = hashMatch ? decodeURIComponent(hashMatch[1]) : (queryMatch ? decodeURIComponent(queryMatch[1]) : null);

            if (!accessToken) {
                const errorMatch = result.url.match(/[?#&]error=([^&]+)/);
                const errorDesc = result.url.match(/[?#&]error_description=([^&]+)/);
                if (errorMatch) {
                    const desc = errorDesc ? decodeURIComponent(errorDesc[1]) : errorMatch[1];
                    throw new Error(desc || 'Google authentication returned an error.');
                }
                throw new Error('Google authentication completed but no access token was returned.');
            }

            const googleUserData = await fetchGoogleUserProfile(accessToken, role);
            if (onSuccess) onSuccess({ ...googleUserData, isSignUp });
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
            if (onError) onError('Google sign in was cancelled.');
        } else {
            if (onError) onError(result.message || 'Google authentication failed.');
        }
    } catch (err) {
        if (onError) onError(err.message || 'Failed to launch Google authentication.');
    }
};
