
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: uploadId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('t');

    // Reuse auth logic (Consider refactoring into util)
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
        // Client can download ANY file in their folder? 
        // Prompt says: "Producer must be able to download any... Client can rename/delete ONLY files they uploaded."
        // Doesn't explicitly strict limit download.
        // Assuming client CAN see and download all files in their "uploads" folder?
        // Reference image shows a list. Typically clients can see what they uploaded.
        // Can they see others? Prompt: "Clients can upload files... Client can rename and delete ONLY the files they uploaded."
        // Implies they CAN see others but not edit them.
        if (access) isAuthorized = true;
    }

    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Generate Signed URL
    const { data, error } = await adminClient
        .storage
        .from('client-uploads')
        .createSignedUrl(upload.storage_key, 60 * 60, {
            download: upload.display_name // Force download with correct name
        });

    if (error || !data) return NextResponse.json({ error: 'Sign Error' }, { status: 500 });

    // Redirect to signed URL
    return NextResponse.redirect(data.signedUrl);
}
