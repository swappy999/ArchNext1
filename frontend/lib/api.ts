import { handleApiError, handleApiRefresh } from './verification/middlewares/apiInterceptor';

// Ensure BASE does not contain /api/v1 because main.py mounts routers directly at the root (e.g. /auth)
const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('/api/v1', '');

async function req(path: string, options: RequestInit = {}, token?: string | null) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Bypass-Tunnel-Reminder': 'true',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Ensure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    let res = await fetch(`${BASE}${normalizedPath}`, { ...options, headers });

    // Handle token refresh logic using the verification module interceptor
    const retriedRes = await handleApiRefresh(res, path, options, headers, BASE, normalizedPath);
    if (retriedRes) {
        res = retriedRes;
    }

    if (!res.ok) {
        // Handle all other errors via standard throwing interceptor
        await handleApiError(res, path);
    }

    return res.json();
}

export const api = {
    get: (path: string, token?: string | null) => req(path, { method: 'GET' }, token),
    post: (path: string, body: unknown, token?: string | null) =>
        req(path, { method: 'POST', body: JSON.stringify(body) }, token),
    put: (path: string, body: unknown, token?: string | null) =>
        req(path, { method: 'PUT', body: JSON.stringify(body) }, token),
    delete: (path: string, token?: string | null) => req(path, { method: 'DELETE' }, token),
};
