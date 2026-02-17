import { auth } from './firebase';

/**
 * Wrapper around fetch that automatically includes the Firebase auth token.
 * Use this for all API calls that require authentication.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Not authenticated');
    }

    const token = await user.getIdToken();
    console.log('authFetch: Token retrieved for uid:', user.uid, 'token length:', token.length);

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        },
    });
}
