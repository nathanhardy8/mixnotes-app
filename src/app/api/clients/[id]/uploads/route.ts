
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/clients/[id]/uploads
// List uploads for a client.
// Auth: Producer (Session) OR Client (Magic Token)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: clientId } = await params;
    const supabase = await createClient(); // Session client
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('t');

    let isAuthorized = false;

    // 1. Check Producer Session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Check if user owns the client (or is admin)
        // Simplification: Authenticated users can view uploads for now, or check ownership
        // Ideally: check 'clients' table where engineer_id = user.id
        const { data: client } = await supabase
            .from('clients')
            .select('engineer_id')
            .eq('id', clientId)
            .single();

        if (client && client.engineer_id === user.id) {
            isAuthorized = true;
        }
    }

    // 2. Check Magic Token
    if (!isAuthorized && token) {
        // Need Service Role to check tokens if RLS is strict
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        // Check Access Tokens
        const { data: access } = await adminClient
            .from('client_access_tokens')
            .select('*')
            .eq('client_id', clientId)
            .eq('token_hash', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .is('revoked_at', null)
            .single();

        if (access) {
            isAuthorized = true;
            // Update last used
            await adminClient
                .from('client_access_tokens')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', access.id);
        } else {
            // Check Folder Links (HMAC Versioned)
            const { data: clientData } = await adminClient
                .from('clients')
                .select('id, folder_link_enabled, folder_link_version')
                .eq('id', clientId)
                .single();

            if (clientData && clientData.folder_link_enabled) {
                const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                const version = clientData.folder_link_version || 1;
                const payload = `${clientData.id}:${version}`;
                const expectedToken = crypto.createHmac('sha256', secret).update(payload).digest('hex');

                const bufferToken = Buffer.from(token);
                const bufferExpected = Buffer.from(expectedToken);

                let isValid = false;
                try {
                    if (bufferToken.length === bufferExpected.length) {
                        isValid = crypto.timingSafeEqual(bufferToken, bufferExpected);
                    }
                } catch (e) { isValid = false; }

                if (isValid) {
                    isAuthorized = true;
                    // Update last used
                    await adminClient
                        .from('clients')
                        .update({ folder_link_last_used_at: new Date().toISOString() })
                        .eq('id', clientData.id);
                }
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // LIST FILES
    // Use admin client if RLS policies are complex, or just use `supabase` if auth user, 
    // BUT valid token requires admin client read usually if we don't have RLS for tokens.
    // Let's use Admin Client for consistency in this mixed auth route.
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: files, error } = await adminClient
        .from('client_uploaded_files')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, files });
}

// POST /api/clients/[id]/uploads
// Record a new upload.
// Body: { originalFilename, storageKey, mimeType, sizeBytes, token? }
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: clientId } = await params;
    const { originalFilename, storageKey, mimeType, sizeBytes, token } = await request.json();

    let uploaderType = 'PRODUCER';
    let uploaderId = null;

    // Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Verify Producer
        const { data: client } = await supabase.from('clients').select('engineer_id').eq('id', clientId).single();
        if (!client || client.engineer_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        uploaderType = 'PRODUCER';
        uploaderId = user.id;
    } else if (token) {
        // Verify Token
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        // Check Access Token
        const { data: access } = await adminClient
            .from('client_access_tokens')
            .select('id') // We can use the token ID as identifier
            .eq('client_id', clientId)
            .eq('token_hash', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (access) {
            uploaderType = 'CLIENT';
            uploaderId = access.id;
        } else {
            // Check Folder Link (HMAC Versioned)
            const { data: clientData } = await adminClient
                .from('clients')
                .select('id, folder_link_enabled, folder_link_version')
                .eq('id', clientId)
                .single();

            if (clientData && clientData.folder_link_enabled) {
                const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                const version = clientData.folder_link_version || 1;
                const payload = `${clientData.id}:${version}`;
                const expectedToken = crypto.createHmac('sha256', secret).update(payload).digest('hex');

                const bufferToken = Buffer.from(token);
                const bufferExpected = Buffer.from(expectedToken);

                let isValid = false;
                try {
                    if (bufferToken.length === bufferExpected.length) {
                        isValid = crypto.timingSafeEqual(bufferToken, bufferExpected);
                    }
                } catch (e) { isValid = false; }

                if (isValid) {
                    uploaderType = 'CLIENT';
                    uploaderId = clientData.id;
                } else {
                    return NextResponse.json({ error: 'Invalid Token' }, { status: 403 });
                }
            } else {
                return NextResponse.json({ error: 'Invalid Token' }, { status: 403 });
            }
        }
    } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert Record
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminClient
        .from('client_uploaded_files')
        .insert([{
            client_id: clientId,
            uploaded_by_type: uploaderType,
            uploaded_by_identifier: uploaderId,
            original_filename: originalFilename,
            display_name: originalFilename,
            storage_key: storageKey,
            mime_type: mimeType,
            size_bytes: sizeBytes
        }])
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // TODO: Send Email Notification to Engineer if uploader is Client

    return NextResponse.json({ success: true, file: data });
}
