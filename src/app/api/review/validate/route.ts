import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    const supabase = await createClient(); // Valid to use server client to read RLS protected if we were using service role, but here we are validating a public token
    // We strictly use the token to look up logic. But to read the private project data, we might need Service Role or rely on RLS allowing "public" if we opened it.
    // However, migration kept RLS strict. So we MUST use Service Role here to fetch data if token is valid.

    // NOTE: 'createClient' usually creates a client scoped to the request cookies (user session).
    // If the client has no session, it's anon.
    // If RLS blocks anon, we can't fetch.
    // So we need a Service Role client for this specific "Sudo" check.

    // Check if we have a way to get admin client.
    // usually `createClient(cookieStore, process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)`
    // OR we just assume we will implement public read policy for "projects with review_enabled = true".
    // Security-wise, "security by obscurity" of the public_id isn't enough, we need the token check.

    // Strategy: Use Service Role to validate token. If valid, return the data.
    // In a real app, we might return a signed JWT for the client to use for subsequent requests (R LS policies on 'client' role).
    // MVP: Return the data directly here for the initial load, and for subsequent actions (comments), re-validate token or use a session cookie.

    // Let's stick to: Validate Token -> Return Data.
    // We need the service role key.

    // FIX: I don't see `utils/supabase/admin` or similar. I'll stick to `createClient` and hope the user provided keys.
    // If I can't use service role, I must use RLS.
    // Let's try to import a service role client if available or just use `supabase-js` directly with the key from process.env.

    // Assuming process.env.SUPABASE_SERVICE_ROLE_KEY is available.

    const { publicId, token } = await request.json();

    if (!publicId || !token) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Hash token to compare
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Admin Client for secure lookup
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');

    const adminAuthClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find Project by Public ID
    const { data: project, error: projError } = await adminAuthClient
        .from('projects')
        .select(`
            id, 
            title, 
            description, 
            engineer_id, 
            client_id,
            review_enabled, 
            audio_url,
            approval_status,
            revision_limit,
            revisions_used,
            approved_version_id,
            allow_download,
            versions:project_versions!project_versions_project_id_fkey(*)
        `)
        .eq('review_public_id', publicId)
        .single();

    if (projError) console.error('API Project Lookup Error:', projError);

    if (projError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.review_enabled) {
        return NextResponse.json({ error: 'Review access disabled' }, { status: 403 });
    }

    // 2. Validate Token against DB
    let activeLink = null;
    let linkType = 'project';

    // A. Check Project Link
    const { data: projectLink } = await adminAuthClient
        .from('review_magic_links')
        .select('*')
        .eq('project_id', project.id)
        .eq('token_hash', tokenHash)
        .single();

    if (projectLink) {
        activeLink = projectLink;
        linkType = 'project';
    } else if (project.client_id) {
        // B. Check Folder Link (Versioned HMAC)
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
                activeLink = {
                    id: clientData.id, // Use client ID as ref
                    expires_at: new Date(Date.now() + 1000000000 * 1000).toISOString(), // Never expires logic
                    revoked_at: null
                };
                linkType = 'folder';
            }
        }
    }

    if (!activeLink) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Check expiration (Project links only really)
    if (new Date(activeLink.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    if (activeLink.revoked_at) {
        return NextResponse.json({ error: 'Link revoked' }, { status: 410 });
    }

    // 3. Update Last Used
    if (linkType === 'project') {
        await adminAuthClient
            .from('review_magic_links')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', activeLink.id);
    } else {
        await adminAuthClient
            .from('clients')
            .update({ folder_link_last_used_at: new Date().toISOString() })
            .eq('id', activeLink.id);
    }

    await adminAuthClient
        .from('projects')
        .update({ last_client_activity_at: new Date().toISOString() })
        .eq('id', project.id);

    // 3.5 Fetch Engineer Name (for UI)
    const { data: { user: engineerUser } } = await adminAuthClient.auth.admin.getUserById(project.engineer_id);
    const engineerName = engineerUser?.user_metadata?.name || 'your engineer';

    // 4. Return Project Data tailored for Client
    // Sort versions
    const versions = (project.versions || []).sort((a: any, b: any) => b.version_number - a.version_number);
    // Logic: If approved, default audio is approved version. Else latest.
    const latestVersion = versions[0];
    const approvedVersion = versions.find((v: any) => v.id === project.approved_version_id);

    const activeVersion = approvedVersion || latestVersion;

    const clientProject = {
        id: project.id,
        title: project.title,
        description: project.description,
        audioUrl: activeVersion ? activeVersion.audio_url : project.audio_url,
        versionNumber: activeVersion ? activeVersion.version_number : 1,
        activeVersionId: activeVersion ? activeVersion.id : null,
        approvalStatus: project.approval_status,
        revisionsUsed: project.revisions_used,
        isLocked: false,
        allowDownload: project.allow_download,
        engineerName,
        versions: versions.map((v: any) => ({
            id: v.id,
            versionNumber: v.version_number,
            audioUrl: v.audio_url,
            createdAt: v.created_at
        }))
    };

    return NextResponse.json({
        success: true,
        project: clientProject
    });
}
