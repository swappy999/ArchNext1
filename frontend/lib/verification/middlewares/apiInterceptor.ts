import {
    AppError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError
} from '../errors/exceptions';

export const handleApiError = async (res: Response, path: string): Promise<any> => {
    const contentType = res.headers.get('content-type');
    let detail = '';

    if (contentType && contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}));
        detail = err.detail || err.message || err.error || '';
    } else {
        const rawText = await res.text().catch(() => '');
        detail = `Network error: ${res.status} ${res.statusText}. ${rawText.substring(0, 100)}`;
    }

    const errorMessage = detail || res.statusText || `Request failed with status ${res.status}`;

    // If it's a 401 that couldn't be refreshed, auto-logout silently
    if (res.status === 401) {
        try {
            const { useAuthStore } = await import('@/store/authStore');
            useAuthStore.getState().logout();
        } catch { }
        throw new AuthenticationError(errorMessage);
    }

    if (res.status === 403) {
        throw new AuthorizationError(errorMessage);
    }

    if (res.status === 404) {
        throw new NotFoundError(errorMessage);
    }

    if (res.status === 400 || res.status === 422) {
        throw new ValidationError(errorMessage);
    }

    throw new AppError(errorMessage, res.status);
};

export const handleApiRefresh = async (
    res: Response,
    path: string,
    options: RequestInit,
    headers: Record<string, string>,
    BASE: string,
    normalizedPath: string
): Promise<Response | null> => {
    // Attempt Token Refresh on 401
    if (res.status === 401 && !path.includes('/auth/')) {
        try {
            const { useAuthStore } = await import('@/store/authStore');
            const refreshToken = useAuthStore.getState().refreshToken;

            if (refreshToken) {
                console.log('[API interceptor] Access token expired, attempting refresh...');
                const refreshRes = await fetch(`${BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    if (data.access_token) {
                        console.log('[API interceptor] Refresh successful, retrying request...');
                        useAuthStore.setState({ accessToken: data.access_token });
                        headers['Authorization'] = `Bearer ${data.access_token}`;

                        // Retry the original request
                        const retriedRes = await fetch(`${BASE}${normalizedPath}`, { ...options, headers });
                        return retriedRes;
                    }
                } else {
                    console.warn('[API interceptor] Refresh failed, session invalid:', refreshRes.status);
                }
            }
        } catch (err) {
            console.error('[API interceptor] Refresh error:', err);
        }
    }

    return null; // Return null if refresh wasn't attempted or failed
};
