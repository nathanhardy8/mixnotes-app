export function getBaseUrl(req?: Request): string {
    // 1. Explicitly set environment variable (Primary override)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }

    // 2. Derive from request headers (Server-side) in Vercel/Production
    if (req) {
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const proto = req.headers.get('x-forwarded-proto') || 'https';
        if (host) {
            return `${proto}://${host}`;
        }
    }

    // 3. Client-side fallback (if running in browser)
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // 4. Default fallback for local dev server-side
    return 'http://localhost:3000';
}
