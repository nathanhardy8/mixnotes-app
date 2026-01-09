import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { publicId, token, versionId } = await req.json();

        if (!publicId || !token) {
            return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
        }

        // Initialize Admin Client (Bypass RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Find Project by Public ID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, client_id, review_enabled')
            .eq('review_public_id', publicId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
        }

        if (!project.review_enabled) {
            return NextResponse.json({ success: false, error: 'Review access disabled' }, { status: 403 });
        }

        // 2. Validate Token (Project specific OR Folder level)
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        let isValid = false;

        // A. Check Project Link (review_magic_links)
        const { data: projectLink } = await supabase
            .from('review_magic_links')
            .select('*')
            .eq('project_id', project.id)
            .eq('token_hash', tokenHash)
            .single();

        if (projectLink) {
            if (new Date(projectLink.expires_at) > new Date() && !projectLink.revoked_at) {
                isValid = true;
            }
        }

        // B. Check Folder Link (if A failed)
        if (!isValid && project.client_id) {
            const { data: clientData } = await supabase
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

                try {
                    if (bufferToken.length === bufferExpected.length) {
                        if (crypto.timingSafeEqual(bufferToken, bufferExpected)) {
                            isValid = true;
                        }
                    }
                } catch (e) {
                    isValid = false;
                }
            }
        }

        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 403 });
        }


        // 3. Fetch Comments (Service Role has full access)
        let query = supabase
            .from('comments')
            .select('*')
            .eq('project_id', project.id)
            .order('timestamp', { ascending: true });

        if (versionId) {
            // Allow specific version OR global comments (null version)
            query = query.or(`project_version_id.eq.${versionId},project_version_id.is.null`);
        }

        const { data: comments, error: commentError } = await query;

        if (commentError) {
            return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
        }

        // Map to standard shape (include new threading fields)
        const mappedComments = comments.map((c: any) => ({
            id: c.id,
            projectId: c.project_id,
            projectVersionId: c.project_version_id,
            authorId: c.author_id,
            content: c.content,
            timestamp: c.timestamp,
            createdAt: c.created_at,
            isCompleted: c.is_completed || false,
            isPostApproval: c.is_post_approval || false,
            authorType: c.author_type,
            authorName: c.author_name,
            authorUserId: c.author_user_id,
            authorClientIdentifier: c.author_client_identifier,
            archivedAt: c.archived_at,
            parentId: c.parent_id,
            updatedAt: c.updated_at,
        }));

        return NextResponse.json({ success: true, comments: mappedComments });

    } catch (e) {
        console.error('Error fetching review comments:', e);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
