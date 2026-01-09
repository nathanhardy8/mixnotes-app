import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    // 1. Setup Admin Client (Public Token Access)
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { publicId, token } = await request.json();

    if (!publicId || !token) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 2. Lookup Client
    const { data: client, error: clientError } = await adminClient
        .from('clients')
        .select('id, name, folder_link_enabled, folder_link_version')
        .eq('review_public_id', publicId)
        .single();

    if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 3. Validate Token

    // Check if enabled
    if (!client.folder_link_enabled) {
        return NextResponse.json({ error: 'Link disabled' }, { status: 403 });
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const version = client.folder_link_version || 1;
    const payload = `${client.id}:${version}`;
    const expectedToken = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Secure compare
    // Note: 'token' from request is untrusted input.
    // crypto.timingSafeEqual requires buffers of same length.

    const bufferToken = Buffer.from(token);
    const bufferExpected = Buffer.from(expectedToken);

    let isValid = false;
    try {
        if (bufferToken.length === bufferExpected.length) {
            isValid = crypto.timingSafeEqual(bufferToken, bufferExpected);
        }
    } catch (e) {
        isValid = false;
    }

    if (!isValid) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // 3.5 Backfill missing review_public_id (Self-Healing)
    // Some projects might be missing the public ID if created before schema updates.
    const { data: missingIds } = await adminClient
        .from('projects')
        .select('id')
        .eq('client_id', client.id)
        .is('review_public_id', null);

    if (missingIds && missingIds.length > 0) {
        console.log(`Backfilling ${missingIds.length} projects with missing public IDs`);
        await Promise.all(missingIds.map(p =>
            adminClient
                .from('projects')
                .update({ review_public_id: crypto.randomUUID() })
                .eq('id', p.id)
        ));
    }

    // 4. Fetch Projects
    // We want all projects for this client.
    // Include minimal data: id, title, review_public_id, updated_at/created_at
    // Also logic for version updates? "last updated"
    const { data: projects, error: projError } = await adminClient
        .from('projects')
        .select(`
            id,
            title,
            review_public_id,
            created_at,
            updated_at:created_at, 
            audio_url,
            is_locked
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
    // Notes: 'projects' table might not have 'updated_at' column in schema unless added. 
    // Using created_at as fallback.

    // 5. Update Last Used
    await adminClient
        .from('clients')
        .update({ folder_link_last_used_at: new Date().toISOString() })
        .eq('id', client.id);

    return NextResponse.json({
        success: true,
        clientName: client.name,
        clientId: client.id,
        projects: projects || []
    });
}
