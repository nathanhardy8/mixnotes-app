import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    // Admin Client for secure write
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminAuthClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { publicId, token, versionId, action } = await request.json();

    if (!publicId || !token || !action) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Validate Token (Reuse logic or abstract)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Get Link & Project to verify
    const { data: magicLink, error: linkError } = await adminAuthClient
        .from('review_magic_links')
        .select('*, project:projects!inner(id, review_public_id)')
        .eq('project.review_public_id', publicId)
        .eq('token_hash', tokenHash)
        .single();

    if (linkError || !magicLink) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    // Check expiry
    if (new Date(magicLink.expires_at) < new Date() || magicLink.revoked_at) {
        return NextResponse.json({ error: 'Token expired' }, { status: 410 });
    }

    const projectId = magicLink.project_id;

    if (action === 'APPROVE') {
        if (!versionId) return NextResponse.json({ error: 'Version ID required' }, { status: 400 });

        // Update Project Status
        const { error: updateError } = await adminAuthClient
            .from('projects')
            .update({
                approval_status: 'APPROVED',
                approved_version_id: versionId,
                approved_at: new Date().toISOString(),
                approved_by: 'Client (Magic Link)',
                last_client_activity_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error("Approval Error", updateError);
            return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
        }

        // Mark version as approved
        await adminAuthClient
            .from('project_versions')
            .update({ is_approved: true })
            .eq('id', versionId);

        // Send Email Notifications
        try {
            // Fetch project details to get engineer_id and client_id
            const { data: fullProject } = await adminAuthClient
                .from('projects')
                .select('title, engineer_id, client_id, clients(name)') // Join clients to get client name if possible
                .eq('id', projectId)
                .single();

            if (fullProject) {
                // Fetch Engineer (Producer) Email
                const { data: { user: engineer } } = await adminAuthClient.auth.admin.getUserById(fullProject.engineer_id);

                if (engineer && engineer.email) {
                    const { emailService } = await import('@/lib/email');
                    // Determine Client Name (from magic link or DB)
                    // If magic link was joined in previous query (lines 22-27), we don't have client name there easily 
                    // unless we fetch it. `fullProject.clients?.name` handles it if joined properly.
                    // But `clients` relation might be singular `client:clients`.
                    // Let's assume 'Client' generic if name missing.

                    // Actually, the `select` above uses `clients(name)`. Supabase returns it as `clients: { name: ... }` if singular?
                    // Or `client_id` relations.
                    // Safe access:
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const clientName = (fullProject as any).clients?.name || 'The Client';

                    await emailService.sendApprovalNotification(engineer.email, clientName, fullProject.title);
                }
            }
        } catch (emailErr) {
            console.error("Failed to send approval email", emailErr);
            // Don't fail the request if email fails
        }

        return NextResponse.json({ success: true, status: 'APPROVED' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
