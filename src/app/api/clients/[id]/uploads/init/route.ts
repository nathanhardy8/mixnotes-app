
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// POST /api/clients/[id]/uploads/init
// Request a secure upload URL.
// Body: { filename, mimeType, token }
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: clientId } = await params;
    const { filename, mimeType, token } = await request.json();

    // 1. Validate File Type
    const allowedExtensions = ['wav', 'mp3', 'aif', 'aiff', 'flac', 'zip', 'mid', 'midi', 'pdf', 'txt'];
    const ext = filename.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
        return NextResponse.json({
            error: `File type .${ext} not supported. Allowed: ${allowedExtensions.join(', ')}`
        }, { status: 400 });
    }

    // reused auth logic
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let isAuthorized = false;

    if (user) {
        const { data: client } = await adminClient.from('clients').select('engineer_id').eq('id', clientId).single();
        if (client && client.engineer_id === user.id) isAuthorized = true;
    } else if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Check Access Tokens
        const { data: access } = await adminClient
            .from('client_access_tokens')
            .select('id')
            .eq('client_id', clientId)
            .eq('token_hash', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (access) isAuthorized = true;
        else {
            // Check Folder Link (HMAC Versioned)
            // Need to fetch client version
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

                // Secure compare
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

                if (isValid) isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Generate Storage Key
    // ext is already validated above
    const randomId = crypto.randomBytes(8).toString('hex');
    const storageKey = `${clientId}/${randomId}.${ext}`;

    // Create Signed Upload URL
    const { data, error } = await adminClient
        .storage
        .from('client-uploads')
        .createSignedUploadUrl(storageKey);

    if (error || !data) return NextResponse.json({ error: 'Storage Init Error' }, { status: 500 });

    return NextResponse.json({
        success: true,
        signedUrl: data.signedUrl,
        storageKey: storageKey,
        token: data.token // Supabase might need this header
    });
}
