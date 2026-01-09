import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email';

export async function GET(request: Request) {
    // Basic security check (e.g. check for header if using Cron)
    // const authHeader = request.headers.get('Authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminAuthClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find eligible projects
    // - Review Enabled
    // - Reminders Enabled
    // - PENDING approval
    // - Has client email
    // - Last activity > threshold

    // MVP: Simple logic. 
    // If reminder_stage = 0 and (now - last_activity > 2 days) -> Send Reminder 1
    // If reminder_stage = 1 and (now - last_reminder > 3 days) -> Send Reminder 2
    // etc.

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const { data: projects, error } = await adminAuthClient
        .from('projects')
        .select('*')
        .eq('review_enabled', true)
        .eq('reminders_enabled', true)
        .eq('approval_status', 'PENDING')
        .lt('reminder_stage', 3); // Max 3 reminders

    if (error || !projects) return NextResponse.json({ processed: 0, error });

    let count = 0;

    for (const p of projects) {
        if (!p.client_email) continue;

        let shouldSend = false;
        const lastActivity = new Date(p.last_client_activity_at || p.created_at);
        const lastReminder = p.last_reminder_sent_at ? new Date(p.last_reminder_sent_at) : null;

        // Anti-spam: Don't send if last reminder was < 24h ago
        if (lastReminder && (now.getTime() - lastReminder.getTime() < 24 * 60 * 60 * 1000)) {
            continue;
        }

        if (p.reminder_stage === 0) {
            // Send if inactivity > 2 days
            if (lastActivity < twoDaysAgo) shouldSend = true;
        } else if (p.reminder_stage === 1) {
            // Send if 3 days since last reminder?
            // Simplified logic for MVP
            if (lastActivity < twoDaysAgo) shouldSend = true;
        }

        if (shouldSend) {
            // Generate link (we don't have token hash handy to reverse it? No, we generate NEW token? No.
            // We need to Find Existing Active Token or Create One.
            // ... Logic to find token ...
            const { data: links } = await adminAuthClient
                .from('review_magic_links')
                .select('*')
                .eq('project_id', p.id)
                .order('created_at', { ascending: false })
                .limit(1);

            // Note: We can't recover the token from the hash.
            // So we can't include the link unless we store it elsewhere or generate a new one.
            // Strategy: Generate a NEW token for the reminder? Or just clean simple text?
            // "Please check your feedback link sent previously." -> Not actionable.
            // Better: Generate a NEW token for this reminder.

            // Generate Temporary Reminder Token
            const crypto = (await import('crypto')).default;
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await adminAuthClient.from('review_magic_links').insert([{
                project_id: p.id,
                token_hash: tokenHash,
                created_by_user_id: p.engineer_id // System
            }]);

            // Construct Link
            // We need HOST. request.url might work or env var.
            const origin = new URL(request.url).origin;
            const link = `${origin}/review/${p.review_public_id}?t=${token}`;

            await emailService.sendReminder(p.client_email, p.title, link);

            // Update State
            await adminAuthClient.from('projects').update({
                reminder_stage: p.reminder_stage + 1,
                last_reminder_sent_at: new Date().toISOString()
            }).eq('id', p.id);

            // Log
            await adminAuthClient.from('review_reminder_log').insert([{
                project_id: p.id,
                sent_via: 'EMAIL',
                sent_to: p.client_email,
                stage: p.reminder_stage + 1,
                status: 'SENT'
            }]);

            count++;
        }
    }

    return NextResponse.json({ success: true, processed: count });
}
