export function getFriendlyErrorMessage(error: any): string {
    const msg = (error?.message || '').toLowerCase();

    // Login errors
    if (msg.includes('invalid login credentials')) return 'Incorrect email or password.';
    if (msg.includes('email not confirmed')) return 'Please verify your email address before logging in.';

    // Signup errors
    if (msg.includes('user already registered')) return 'This email is already connected to an account.';
    if (msg.includes('password should be at least')) return 'Password is too short (min 6 characters).';
    if (msg.includes('anonymous')) return 'We could not sign you in. Please try again.';

    // Network / Rate limit
    if (msg.includes('too many requests')) return 'Too many attempts. Please try again later.';
    if (msg.includes('fetch')) return 'Connection issue. Please check your internet.';

    // Fallback
    return msg || 'Something went wrong. Please try again.';
}

export function validateEmail(email: string): string | null {
    if (!email) return 'Email is required';
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) return 'Please enter a valid email address';
    return null;
}

export function validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
}
