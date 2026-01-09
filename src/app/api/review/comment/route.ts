import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminAuthClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const requestBody = await request.json();
    const { publicId, token, content, timestamp, versionId, authorName } = requestBody;

    if (!publicId || !token || !content) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validate Token (Check if this is a valid public link access)
    // Note: Even authenticated engineers need a valid token to access this specific review context unless we loosen security
    // But for now, we assume they are viewing via the link.
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { data: magicLink, error: linkError } = await adminAuthClient
        .from('review_magic_links')
        .select('*, project:projects!inner(id, review_public_id)')
        .eq('project.review_public_id', publicId)
        .eq('token_hash', tokenHash)
        .single();

    if (linkError) {
        console.error('Magic Link Lookup Error:', linkError);
    }

    let projectId = magicLink?.project_id;
    let authorClientIdentifier = tokenHash; // Default to hash for basic links

    // If no direct magic link found, check for Folder Link (HMAC)
    if (!magicLink) {
        // 1. Look up project by publicId to get client_id
        const { data: project, error: projError } = await adminAuthClient
            .from('projects')
            .select('id, client_id, review_enabled, review_public_id')
            .eq('review_public_id', publicId)
            .single();

        if (projError || !project) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
        }

        if (!project.review_enabled) {
            return NextResponse.json({ error: 'Review access disabled' }, { status: 403 });
        }

        // 2. Check Client Folder Link settings
        if (project.client_id) {
            const { data: clientData } = await adminAuthClient
                .from('clients')
                .select('id, folder_link_enabled, folder_link_version')
                .eq('id', project.client_id)
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

                if (isValid) {
                    // Valid Folder Link!
                    projectId = project.id;
                    // For folder links, we might want to track them differently or just use the hash/token as identifier?
                    // The token IS the identifier for the session effectively.
                    authorClientIdentifier = 'FOLDER_LINK:' + token.substring(0, 10);
                }
            }
        }
    } else {
        // Check revocation/expiry for Magic Link
        if (magicLink.revoked_at || new Date(magicLink.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Expired link' }, { status: 410 });
        }
    }

    if (!projectId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Check for Authenticated User (Engineer)
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Determine Author
    let authorType = 'CLIENT';
    let authorId = 'client-guest';
    let displayName = requestBody.authorName || 'Client';
    let authorUserId = null;

    if (user) {
        authorType = 'ENGINEER'; // Or fetch role? Assuming authenticated user on this page is engineer/admin
        authorId = user.id;
        authorUserId = user.id;

        // Fetch user name if not provided in body (though body might be 'Client' from default)
        // Ideally we fetch from users table.
        const { data: userData } = await adminAuthClient
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

        if (userData?.name) {
            displayName = userData.name;
        }
    }

    // Insert Comment
    const { data: comment, error: commentError } = await adminAuthClient
        .from('comments')
        .insert([{
            project_id: projectId,
            project_version_id: versionId,
            author_id: authorId,
            content: content,
            timestamp: timestamp,
            is_post_approval: false,
            // Attribution
            author_type: authorType,
            author_name: displayName,
            author_user_id: authorUserId,
            author_client_identifier: authorType === 'CLIENT' ? authorClientIdentifier : null // Only track hash for guests
        }])
        .select()
        .single();

    if (commentError) {
        return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    // Update activity
    await adminAuthClient
        .from('projects')
        .update({ last_client_activity_at: new Date().toISOString() })
        .eq('id', projectId);

    return NextResponse.json({
        success: true, comment: {
            id: comment.id,
            projectId: comment.project_id,
            authorId: comment.author_id,
            content: comment.content,
            timestamp: comment.timestamp,
            createdAt: comment.created_at,
            isCompleted: false,
            authorType: comment.author_type,
            authorName: comment.author_name
        }
    });
}
