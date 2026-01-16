import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getBaseUrl } from '@/utils/urlHelpers';

// GET: Check status
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: clientId } = await params;
    const supabase = await createClient();

    // Auth verification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify permissions: Admin OR Owner
    const { data: client } = await supabase.from('clients').select('engineer_id').eq('id', clientId).single();

    if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const role = user.user_metadata?.role || 'engineer';
    const isOwner = client.engineer_id === user.id;
    const isAdmin = role === 'admin';

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check active link using admin client (using client columns now)
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: clientData } = await adminClient
        .from('clients')
        .select('folder_link_enabled, folder_link_version, review_public_id')
        .eq('id', clientId)
        .single();

    if (!clientData || !clientData.folder_link_enabled) {
        return NextResponse.json({ exists: false });
    }

    // Deterministic Token Generation
    // Token = HMAC(client_id + version + secret)
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const version = clientData.folder_link_version || 1;
    const payload = `${clientId}:${version}`;
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const origin = getBaseUrl(request);
    const publicId = clientData.review_public_id;
    const url = `${origin}/review/folder/${publicId}?t=${token}`;

    return NextResponse.json({
        exists: true,
        url,
        token
    });
}

// POST: Generate/Regenerate
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: clientId } = await params;
    const supabase = await createClient();

    // Auth verification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: client } = await supabase.from('clients').select('engineer_id, review_public_id, folder_link_version').eq('id', clientId).single();

    if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const role = user.user_metadata?.role || 'engineer';
    const isOwner = client.engineer_id === user.id;
    const isAdmin = role === 'admin';

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const action = body.action || 'toggle'; // 'revoke' | 'enable'



    if (action === 'revoke') {
        const { error } = await adminClient
            .from('clients')
            .update({ folder_link_enabled: false })
            .eq('id', clientId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, enabled: false });
    }

    if (action === 'enable') {
        // Ensure version exists
        const { error } = await adminClient
            .from('clients')
            .update({ folder_link_enabled: true })
            .eq('id', clientId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Build URL
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        // Re-fetch to be safe on version if we rotated? For enable we just use current.
        // Assuming version 1 default if null.
        const version = client.folder_link_version || 1;
        const payload = `${clientId}:${version}`;
        const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');

        const origin = getBaseUrl(request);
        const publicId = client.review_public_id;
        const url = `${origin}/review/folder/${publicId}?t=${token}`;

        return NextResponse.json({ success: true, enabled: true, url, token });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
