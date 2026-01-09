
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// DELETE /api/uploads/[id]
// PATCH /api/uploads/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: uploadId } = await params;
    // Auth Check logic...
    // We need to know WHO is asking.
    // If Producer: delete.
    // If Client: can only delete if THEY uploaded it.

    // How do we get the token? Retrieve from Header or Query?
    // Let's assume passed in Header 'x-client-token' or query 't'. 
    // Standardize on query param 't' for simplicity in this MVP context.
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('t');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get Upload Info
    const { data: upload } = await adminClient
        .from('client_uploaded_files')
        .select('*')
        .eq('id', uploadId)
        .single();

    if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let isAuthorized = false;

    if (user) {
        // Check producer ownership of client
        const { data: client } = await adminClient
            .from('clients')
            .select('engineer_id')
            .eq('id', upload.client_id)
            .single();
        if (client && client.engineer_id === user.id) isAuthorized = true;
    } else if (token) {
        // Check Client Token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { data: access } = await adminClient
            .from('client_access_tokens')
            .select('id')
            .eq('client_id', upload.client_id)
            .eq('token_hash', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        // Client can only delete OWN files
        if (access && upload.uploaded_by_type === 'CLIENT' && upload.uploaded_by_identifier === access.id) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Perform Delete
    // 1. Delete from Storage
    await adminClient.storage.from('client-uploads').remove([upload.storage_key]);

    // 2. Delete from DB (Soft or Hard? Prompt says soft optional, let's do hard for cleanup simplicity)
    const { error } = await adminClient.from('client_uploaded_files').delete().eq('id', uploadId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: uploadId } = await params;
    const { displayName, token } = await request.json(); // Expect JSON body for updates

    if (!displayName) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: upload } = await adminClient.from('client_uploaded_files').select('*').eq('id', uploadId).single();
    if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let isAuthorized = false;

    if (user) {
        const { data: client } = await adminClient.from('clients').select('engineer_id').eq('id', upload.client_id).single();
        if (client && client.engineer_id === user.id) isAuthorized = true;
    } else if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { data: access } = await adminClient
            .from('client_access_tokens')
            .select('id')
            .eq('client_id', upload.client_id)
            .eq('token_hash', tokenHash)
            .single();

        if (access && upload.uploaded_by_type === 'CLIENT' && upload.uploaded_by_identifier === access.id) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { error } = await adminClient
        .from('client_uploaded_files')
        .update({ display_name: displayName })
        .eq('id', uploadId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
