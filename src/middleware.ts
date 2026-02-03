import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user } } = await supabase.auth.getUser()

    // Protected Routes Configuration
    const path = request.nextUrl.pathname;

    // 1. Define routes that require authentication
    const protectedRoutes = [
        '/dashboard',
        '/api/upload',
        '/api/projects'
    ];

    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

    // 2. Define routes that require subscription (Paywall)
    // Assuming all dashboard routes except billing are paywalled for "pro" features unless in trial?
    // User request: "If user.role === 'admin' -> grant access immediately"

    if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
        const role = user.user_metadata?.role;

        // If admin or exempt, they bypass everything.
        // Also check if email is the specific exempt one (hardcoded or env)
        if (role === 'admin' || user.email === 'nathan.hardy24@gmail.com') {
            return response;
        }

        if (role === 'engineer') {
            // Check Subscription Status
            // We need to fetch from DB because metadata might be stale
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('onboarding_status, billing_status')
                .eq('user_id', user.id)
                .single();

            const onboardingStatus = subscription?.onboarding_status || 'LOCKED_PENDING_BILLING';
            // Note: If no subscription row exists, default to LOCKED.

            const isLocked = onboardingStatus !== 'ACTIVE';

            // Define allowed routes for locked users
            const allowedForLocked = [
                '/complete-setup',
                '/billing/success',
                '/login',
                '/signup',
                '/auth/callback',
                '/api/stripe/checkout', // Allow creating session
                '/api/auth', // Allow auth calls
                '/_next'
            ];

            const isAllowedPath = allowedForLocked.some(route => path.startsWith(route)) || path === '/';
            // Note: Home page '/' is public so allowed. But if they try to go to dashboard?

            if (isLocked && !isAllowedPath) {
                // Redirect to complete setup
                // But avoid redirect loop if already there
                if (path !== '/complete-setup') {
                    return NextResponse.redirect(new URL('/complete-setup', request.url));
                }
            }

            // Conversely, if ACTIVE, should we block /complete-setup? 
            // Maybe not block, but redirect to dashboard is nice (handled in page component).
        }
    }

    return response
}

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
