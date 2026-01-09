
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// POST /api/clients/[id]/access-link
// Generate or retrieve a valid access link for the client.
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: clientId } = await params;
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: client } = await supabase.from('clients').select('engineer_id').eq('id', clientId).single();
    if (!client || client.engineer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for existing valid token
    // (Optional: Reuse if exists to avoid spamming tokens, or always create new?)
    // Let's create new if none valid, or return existing.
    const { data: existing } = await adminClient
        .from('client_access_tokens')
        .select('*')
        .eq('client_id', clientId)
        .gt('expires_at', new Date().toISOString())
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // Note: We only store hash. We CANNOT retrieve the token string from DB.
    // So we must ALWAYS create a new one if the user asks, OR we accept that we can't show it again.
    // Standard pattern: Generate new one.

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { error } = await adminClient
        .from('client_access_tokens')
        .insert([{
            client_id: clientId,
            token_hash: tokenHash,
            created_by_user_id: user.id
        }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Public URL
    // Use existing origin or config
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    // Use correct route: /review/client/[clientId]?t=...
    const url = `${origin}/review/client/${clientId}/uploads?t=${token}`;

    return NextResponse.json({ success: true, url });
}
