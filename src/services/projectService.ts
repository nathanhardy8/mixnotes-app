import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Project, Comment, ProjectVersion } from '@/types';



export type ReviewStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved';
export type RoundStatus = 'draft' | 'submitted' | 'acknowledged' | 'completed';

export interface RevisionRound {
    id: string;
    projectId: string;
    projectVersionId: string;
    title?: string;
    status: RoundStatus;

    authorType: 'ENGINEER' | 'CLIENT';
    authorId?: string;

    createdAt: string;
    updatedAt?: string;
    submittedAt?: string;
    completedAt?: string;
}

export const projectService = {
    // REVISION ROUNDS
    async getRevisionRounds(versionId: string): Promise<RevisionRound[]> {
        const { data, error } = await supabase
            .from('revision_rounds')
            .select('*')
            .eq('project_version_id', versionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching rounds:', error);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((r: any) => ({
            id: r.id,
            projectId: r.project_id,
            projectVersionId: r.project_version_id,
            title: r.title,
            status: r.status,
            authorType: r.author_type,
            authorId: r.author_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            submittedAt: r.submitted_at,
            completedAt: r.completed_at
        }));
    },

    async createRevisionRound(round: Partial<RevisionRound>): Promise<RevisionRound | null> {
        const { data, error } = await supabase
            .from('revision_rounds')
            .insert([{
                project_id: round.projectId,
                project_version_id: round.projectVersionId,
                title: round.title,
                status: round.status || 'draft',
                author_type: round.authorType,
                author_id: round.authorId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating round:', error);
            return null;
        }

        return {
            id: data.id,
            projectId: data.project_id,
            projectVersionId: data.project_version_id,
            title: data.title,
            status: data.status,
            authorType: data.author_type,
            authorId: data.author_id,
            createdAt: data.created_at
        };
    },

    async updateRevisionRoundStatus(roundId: string, status: RoundStatus): Promise<boolean> {
        const updates: any = { status };
        if (status === 'submitted') updates.submitted_at = new Date().toISOString();
        if (status === 'completed') updates.completed_at = new Date().toISOString();

        const { error } = await supabase
            .from('revision_rounds')
            .update(updates)
            .eq('id', roundId);

        return !error;
    },

    async updateVersionReviewStatus(versionId: string, status: string): Promise<boolean> {
        const { error } = await supabase
            .from('project_versions')
            .update({ review_status: status })
            .eq('id', versionId);
        return !error;
    },

    // PROJECTS
    async getProjects(userId: string): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*, client:clients(name)')
            .eq('engineer_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            audioUrl: p.audio_url,
            engineerId: p.engineer_id,
            clientId: p.client_id,
            clientIds: p.client_ids || [],
            createdAt: p.created_at,
            isLocked: p.is_locked,
            price: p.price,
            reviewEnabled: p.review_enabled,
            reviewPublicId: p.review_public_id,
            approvalStatus: p.approval_status,

            archivedAt: p.archived_at,
            allowDownload: p.allow_download,
            clientName: p.client?.name, // Map resolved client name
            clientVersionVisibility: p.client_version_visibility || 'all',
        }));
    },

    async getProjectsByClient(clientId: string): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching client projects:', error);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            audioUrl: p.audio_url,
            engineerId: p.engineer_id,
            clientId: p.client_id,
            clientIds: p.client_ids || [],
            createdAt: p.created_at,
            isLocked: p.is_locked,
            price: p.price,
            archivedAt: p.archived_at,
            clientVersionVisibility: p.client_version_visibility || 'all',
        }));
    },

    async getProjectById(id: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                versions:project_versions!project_versions_project_id_fkey(*),
                client:clients(name)
            `)
            .eq('id', id)
            .single();

        if (error || !data) {
            return null;
        }

        const p = data;
        const versions = (p.versions || []).map((v: any) => ({
            id: v.id,
            projectId: v.project_id,
            versionNumber: v.version_number,
            audioUrl: v.audio_url,
            createdAt: v.created_at,
            createdByUserId: v.created_by_user_id,
            isApproved: v.is_approved,
            originalFilename: v.original_filename,
            displayOrder: v.display_order || 0,

            displayName: v.display_name,
            reviewStatus: v.review_status || 'in_review'
        })).sort((a: ProjectVersion, b: ProjectVersion) => {
            // Primary: display_order ASC
            const orderA = a.displayOrder || 0;
            const orderB = b.displayOrder || 0;
            if (orderA !== orderB) return orderA - orderB;
            // Secondary: versionNumber DESC (fallback)
            return b.versionNumber - a.versionNumber;
        });

        // If revisions are enabled, determine the effective audio URL
        // Typically the latest version, unless one is approved or specific view logic
        // For now, simpler: base audioUrl is the *latest* or the project's main pointer
        // But with versions, we should probably prefer the latest version's audio
        const latestVersionAudio = versions.length > 0 ? versions[0].audioUrl : p.audio_url;

        return {
            id: p.id,
            title: p.title,
            description: p.description,
            audioUrl: latestVersionAudio, // Prefer versioned URL
            engineerId: p.engineer_id,
            clientId: p.client_id,
            clientIds: p.client_ids || [],
            createdAt: p.created_at,
            isLocked: p.is_locked,
            price: p.price,

            archivedAt: p.archived_at,
            allowDownload: p.allow_download,
            shareToken: p.share_token,

            // Review fields
            reviewPublicId: p.review_public_id,
            reviewEnabled: p.review_enabled,
            clientName: (p.client as any)?.name || p.client_name,
            clientEmail: p.client_email,
            clientPhone: p.client_phone,
            revisionLimit: p.revision_limit,
            revisionsUsed: p.revisions_used,
            approvalStatus: p.approval_status,
            approvedVersionId: p.approved_version_id,
            approvedAt: p.approved_at,
            approvedBy: p.approved_by,
            remindersEnabled: p.reminders_enabled,
            versions: versions,
            clientVersionVisibility: p.client_version_visibility || 'all'
        };
    },

    async createProject(project: Partial<Project>): Promise<Project | null> {
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                body: JSON.stringify(project),
            });

            if (!res.ok) {
                const err = await res.json();
                console.error('Create Project Error:', err);
                return null;
            }

            const data = await res.json();

            return {
                ...project,
                id: data.id,
                createdAt: data.created_at,
                // Ensure field mapping is consistent
                audioUrl: data.audio_url,
                clientId: data.client_id,
                engineerId: data.engineer_id,
                isLocked: data.is_locked,
                price: data.price,
                clientVersionVisibility: data.client_version_visibility || 'all'
            } as Project;
        } catch (e) {
            console.error('Create Project Network Error:', e);
            return null;
        }
    },

    async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.isLocked !== undefined) dbUpdates.is_locked = updates.isLocked;
        if (updates.clientIds !== undefined) dbUpdates.client_ids = updates.clientIds;
        if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
        if (updates.allowDownload !== undefined) dbUpdates.allow_download = updates.allowDownload;
        if (updates.clientVersionVisibility !== undefined) dbUpdates.client_version_visibility = updates.clientVersionVisibility;

        // Review specific updates
        if (updates.reviewEnabled !== undefined) dbUpdates.review_enabled = updates.reviewEnabled;
        if (updates.reviewPublicId !== undefined) dbUpdates.review_public_id = updates.reviewPublicId;
        if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
        if (updates.clientEmail !== undefined) dbUpdates.client_email = updates.clientEmail;
        if (updates.revisionLimit !== undefined) dbUpdates.revision_limit = updates.revisionLimit;
        if (updates.remindersEnabled !== undefined) dbUpdates.reminders_enabled = updates.remindersEnabled;

        const { error } = await supabase
            .from('projects')
            .update(dbUpdates)
            .eq('id', id);

        return !error;
    },

    // VERSIONS
    async createVersion(projectId: string, audioUrl: string, userId: string, originalFilename?: string): Promise<ProjectVersion | null> {
        // 1. Get current versions to calculate next version number and display order
        const { data: versions } = await supabase
            .from('project_versions')
            .select('version_number, display_order')
            .eq('project_id', projectId)
            .order('version_number', { ascending: false }); // Get all to find max version

        let nextVersion = 1;
        let nextDisplayOrder = 0;

        // Check for legacy backfill needed
        if (!versions || versions.length === 0) {
            // No versions found. Check if project has existing audio to backfill as V1.
            const { data: project } = await supabase
                .from('projects')
                .select('audio_url, created_at')
                .eq('id', projectId)
                .single();

            if (project?.audio_url) {
                // Backfill V1
                console.log('[createVersion] Backfilling V1 for legacy project');
                await supabase.from('project_versions').insert([{
                    project_id: projectId,
                    version_number: 1,
                    audio_url: project.audio_url,
                    created_by_user_id: userId, // ideally original author
                    display_name: 'Original Mix',
                    created_at: project.created_at,
                    display_order: 0 // First one is 0
                }]);
                nextVersion = 2; // Next is 2
                nextDisplayOrder = 1; // Next is 1
            }
        } else {
            nextVersion = versions[0].version_number + 1;

            // Calculate max display order
            const maxOrder = Math.max(...versions.map(v => v.display_order || 0));
            nextDisplayOrder = maxOrder + 1;
        }

        // 2. Insert new version
        const { data, error } = await supabase
            .from('project_versions')
            .insert([{
                project_id: projectId,
                version_number: nextVersion,
                audio_url: audioUrl,
                created_by_user_id: userId,
                original_filename: originalFilename,
                display_order: nextDisplayOrder
            }])
            .select()
            .single();

        if (error) return null;

        // 3. Update project master audio_url to point to latest?
        await supabase.from('projects')
            .update({ audio_url: audioUrl, approval_status: 'PENDING' }) // Reset approval if adding new version
            .eq('id', projectId);

        return {
            id: data.id,
            projectId: data.project_id,
            versionNumber: data.version_number,
            audioUrl: data.audio_url,
            createdAt: data.created_at,
            createdByUserId: data.created_by_user_id,
            isApproved: data.is_approved,
            originalFilename: data.original_filename,
            displayOrder: data.display_order
        };
    },

    async approveProjectVersion(projectId: string, versionId: string, shareToken?: string): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch(`/api/projects/${projectId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId, shareToken })
            });

            const data = await res.json();
            return { success: res.ok && data.success, error: data.error };
        } catch (e) {
            console.error('Approve Version Error:', e);
            return { success: false, error: 'Network error' };
        }
    },

    async deleteVersion(versionId: string): Promise<boolean> {
        console.log(`[deleteVersion] Deleting version ${versionId}...`);

        // 1. Manual Cascade: Delete Comments first
        const { error: commentsError } = await supabase
            .from('comments')
            .delete()
            .eq('project_version_id', versionId);

        if (commentsError) {
            console.error("[deleteVersion] Failed to delete comments:", commentsError);
        }

        // 2. Clear approved_version_id if it references this version
        // We use two attempts to catch potential schema mismatches (approvedVersionId vs approved_version_id) just in case,
        // though snake_case is standard for Supabase.
        const { error: clearApprovedError } = await supabase
            .from('projects')
            .update({ approved_version_id: null })
            .eq('approved_version_id', versionId);

        if (clearApprovedError) {
            console.error("[deleteVersion] Failed to clear approved_version_id:", clearApprovedError);
        }

        // 3. Get version to find audioUrl and clean up storage
        const { data: version, error: fetchError } = await supabase
            .from('project_versions')
            .select('audio_url')
            .eq('id', versionId)
            .single();

        if (fetchError) {
            console.error("[deleteVersion] Failed to fetch version:", fetchError);
            // We continue to try to delete the record anyway
        }

        if (version?.audio_url) {
            try {
                const parts = version.audio_url.split('/projects/');
                if (parts.length > 1) {
                    const filePath = parts[1];
                    await supabase.storage.from('projects').remove([filePath]);
                }
            } catch (e) {
                console.error("Failed to delete file from storage", e);
            }
        }

        // 4. Delete Record
        const { error } = await supabase
            .from('project_versions')
            .delete()
            .eq('id', versionId);

        if (error) {
            console.error("[deleteVersion] DB Delete Error:", error);
            return false;
        }

        return true;
    },

    async renameVersion(projectId: string, versionId: string, name: string): Promise<boolean> {
        const { error } = await supabase
            .from('project_versions')
            .update({ display_name: name })
            .eq('id', versionId);

        if (error) {
            console.error("[renameVersion] Error:", error);
            return false;
        }

        // Touch project to trigger realtime update for clients
        await supabase.from('projects')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', projectId);

        return true;
    },

    async reorderVersions(projectId: string, orderedVersionIds: string[]): Promise<boolean> {
        console.log(`[reorderVersions] Reordering ${orderedVersionIds.length} versions for project ${projectId} (Atomic RPC)`);

        const { error } = await supabase.rpc('reorder_project_versions', {
            p_project_id: projectId,
            p_version_ids: orderedVersionIds
        });

        if (error) {
            console.error("[reorderVersions] RPC Error:", error);
            return false;
        }

        /*
        // Touch project to trigger realtime update for clients
        await supabase.from('projects')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', projectId);
        */
        // RPC update on project_versions should trigger realtime for project_versions table listeners? 
        // Yes, regular updates fire events.
        // However, to be 100% sure the client project version list updates, triggering project update is good backup, 
        // but might double-fetch. Let's rely on project_versions listener first.

        return true;
    },

    // COMMENTS
    async getComments(projectId: string, versionId?: string): Promise<Comment[]> {
        let query = supabase
            .from('comments')
            .select('*')
            .eq('project_id', projectId)
            .order('timestamp', { ascending: true });

        if (versionId) {
            query = query.eq('project_version_id', versionId);
        }

        const { data, error } = await query;

        if (error) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((c: any) => ({
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
            archivedAt: c.archived_at,
            parentId: c.parent_id,
            updatedAt: c.updated_at,

            // New Fields
            status: c.status || 'open',
            needsClarification: c.needs_clarification || false,
            revisionRoundId: c.revision_round_id
        }));
    },

    async addComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment | null> {
        const { data, error } = await supabase
            .from('comments')
            .insert([{
                project_id: comment.projectId,
                project_version_id: comment.projectVersionId,
                author_id: comment.authorId,
                content: comment.content,
                timestamp: comment.timestamp,
                is_post_approval: comment.isPostApproval,
                author_type: comment.authorType,
                author_name: comment.authorName,
                author_user_id: comment.authorUserId,
                author_client_identifier: comment.authorClientIdentifier,
                parent_id: comment.parentId,

                // New Fields
                revision_round_id: comment.revisionRoundId,
                status: comment.status || 'open',
                needs_clarification: comment.needsClarification || false
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase Error in addComment:', JSON.stringify(error, null, 2));
            throw error;
        }

        return {
            id: data.id,
            projectId: data.project_id,
            projectVersionId: data.project_version_id,
            authorId: data.author_id,
            content: data.content,
            timestamp: data.timestamp,
            createdAt: data.created_at,
            isCompleted: false,
            isPostApproval: data.is_post_approval,
            authorType: data.author_type,
            authorName: data.author_name,
            authorUserId: data.author_user_id,
            parentId: data.parent_id,
            revisionRoundId: data.revision_round_id,
            status: data.status || 'open',
            needsClarification: data.needs_clarification || false
        };
    },

    async updateCommentStatus(commentId: string, status?: 'open' | 'resolved', needsClarification?: boolean): Promise<boolean> {
        const updates: any = {};
        if (status) updates.status = status;
        if (needsClarification !== undefined) updates.needs_clarification = needsClarification;

        const { error } = await supabase.from('comments').update(updates).eq('id', commentId);
        return !error;
    },

    async toggleCommentComplete(commentId: string, isCompleted: boolean): Promise<boolean> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = { is_completed: isCompleted };
        if (isCompleted) {
            updates.archived_at = new Date().toISOString();
        } else {
            updates.archived_at = null;
        }

        const { data, error } = await supabase
            .from('comments')
            .update(updates)
            .eq('id', commentId)
            .select();

        if (error) {
            console.error('Error toggling comment:', error);
            return false;
        }

        return data && data.length > 0;
    },

    async updateComment(commentId: string, content: string): Promise<Comment | null> {
        const { data, error } = await supabase
            .from('comments')
            .update({
                content,
                updated_at: new Date().toISOString()
            })
            .eq('id', commentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            return null;
        }

        const c = data;
        return {
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
            archivedAt: c.archived_at,
            parentId: c.parent_id,
            updatedAt: c.updated_at,
        };
    },

    async deleteComment(commentId: string): Promise<boolean> {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting comment:', error);
            return false;
        }
        return true;
    },

    // UPLOAD
    async uploadFile(file: File, bucket: string = 'projects'): Promise<string | null> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    },

    async uploadFileDirect(file: File, bucket: string, path: string): Promise<string | null> {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file);

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    },

    async deleteProject(id: string): Promise<boolean> {
        // 1. Get project to find audioUrl
        const { data: project } = await supabase
            .from('projects')
            .select('audio_url')
            .eq('id', id)
            .single();

        if (project?.audio_url) {
            // Extract filename from URL (simple assumption: last part of path)
            const urlParts = project.audio_url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            // Delete from Storage
            await supabase.storage.from('projects').remove([fileName]);
        }

        // 2. Delete from DB
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        return !error;
    },

    // REVIEW LINKS
    async generateReviewLink(projectId: string): Promise<{ success: boolean; token?: string; publicId?: string; isNew?: boolean; linkExists?: boolean; expiresAt?: string }> {
        try {
            const res = await fetch(`/api/projects/${projectId}/review-link`, {
                method: 'POST'
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('Error generating review link:', e);
            return { success: false };
        }
    },

    async regenerateReviewLink(projectId: string): Promise<{ success: boolean; token?: string; publicId?: string }> {
        try {
            const res = await fetch(`/api/projects/${projectId}/review-link/regenerate`, {
                method: 'POST'
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('Error regenerating review link:', e);
            return { success: false };
        }
    },

    async updateProjectAPI(id: string, updates: { title?: string; clientId?: string; archivedAt?: string }): Promise<Project | null> {
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
            if (!res.ok) return null;

            const data = await res.json();
            // Map raw DB response to Project type if needed, or if key names match mostly...
            // The service usually maps snake_case to camelCase.
            // Let's reuse the mapping logic or manual map basic fields.
            // Safest to rely on `getProjectById` re-fetch? No, we want speed.
            // Let's do a basic map here.
            return {
                id: data.id,
                title: data.title,
                description: data.description,
                audioUrl: data.audio_url,
                engineerId: data.engineer_id,
                clientId: data.client_id,
                clientIds: data.client_ids || [],
                createdAt: data.created_at,
                isLocked: data.is_locked,
                price: data.price,
                reviewEnabled: data.review_enabled,
                reviewPublicId: data.review_public_id,
                approvalStatus: data.approval_status,
                archivedAt: data.archived_at,
                allowDownload: data.allow_download,
                shareToken: data.share_token
            } as Project;
        } catch (e) {
            console.error('API Update Error:', e);
            return null;
        }
    },

    async getProjectByShareToken(token: string): Promise<Project | null> {
        try {
            const res = await fetch('/api/projects/share/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!res.ok) return null;
            const data = await res.json();

            // Map Data (similar to getProjectById but from raw API response)
            // The API returns snake_case from DB
            const rawVisibility = data.client_version_visibility || 'all';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let versions = (data.versions || []).map((v: any) => ({
                id: v.id,
                projectId: v.project_id,
                versionNumber: v.version_number,
                audioUrl: v.audio_url,
                createdAt: v.created_at,
                createdByUserId: v.created_by_user_id,
                isApproved: v.is_approved,
                displayOrder: v.display_order || 0,
                displayName: v.display_name,
                reviewStatus: v.review_status || 'in_review',
                originalFilename: v.original_filename // Ensure mapped
            })).sort((a: any, b: any) => {
                const orderA = a.displayOrder || 0;
                const orderB = b.displayOrder || 0;
                if (orderA !== orderB) return orderA - orderB;
                return b.versionNumber - a.versionNumber;
            });

            // Enforce visibility restriction
            if (rawVisibility === 'latest' && versions.length > 1) {
                // Keep only the first one (latest) because we sorted descending logic?
                // Wait, logic above is: displayOrder ASC (so [0] is oldest).
                // Let's check sort logic:
                // Primary: display_order ASC -> [0] is Version 1, [1] is Version 2.
                // Latest version is the LAST one in the array.
                // Ah, above logic: `if (orderA !== orderB) return orderA - orderB;` -> Ascending.
                // So versions[versions.length - 1] is the latest.
                const latest = versions[versions.length - 1];
                versions = [latest];
            }

            // Determine effective audio if filtering or standard
            // Logic for regular ProjectView expects versions sorted by displayOrder ASC usually?
            // ProjectView audio player uses them in order.

            // Re-calc latest audio
            const latestVersionAudio = versions.length > 0 ? versions[versions.length - 1].audioUrl : data.audio_url;

            return {
                id: data.id,
                title: data.title,
                description: data.description,
                audioUrl: latestVersionAudio,
                engineerId: data.engineer_id,
                clientId: data.client_id,
                clientIds: data.client_ids || [],
                createdAt: data.created_at,
                isLocked: data.is_locked,
                price: data.price,
                archivedAt: data.archived_at,
                allowDownload: data.allow_download,
                shareToken: data.share_token,
                reviewEnabled: data.review_enabled,
                reviewPublicId: data.review_public_id,
                clientName: data.client?.name,
                revisionLimit: data.revision_limit,
                revisionsUsed: data.revisions_used,
                approvalStatus: data.approval_status,
                versions: versions,
                clientVersionVisibility: rawVisibility
            };
        } catch (e) {
            console.error('Get Shared Project Error:', e);
            return null;
        }
    },

    async resetShareToken(projectId: string): Promise<string | null> {
        try {
            const res = await fetch(`/api/projects/${projectId}/share/reset`, {
                method: 'POST'
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.token;
        } catch (e) {
            console.error('Reset Token Error:', e);
            return null;
        }
    },

    async deleteProjectAPI(id: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
            });
            return res.ok;
        } catch (e) {
            console.error('API Delete Error:', e);
            return false;
        }
    },

    async getProjectsWithComments(userId: string): Promise<{
        projectId: string;
        title: string;
        clientId: string | null;
        clientName: string;
        totalComments: number;
        unresolvedComments: number;
        latestCommentAt: string;
    }[]> {
        // 1. Get all projects for user
        const projects = await this.getProjects(userId);
        if (!projects || projects.length === 0) return [];

        const projectIds = projects.map(p => p.id);

        // 2. Get all comments for these projects
        // We only need basic metadata to count and find latest
        const { data: comments, error } = await supabase
            .from('comments')
            .select('project_id, created_at, is_completed')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

        if (error || !comments) {
            console.error("Error fetching inbox comments", error);
            return [];
        }

        // 3. Aggregate
        const statsMap = new Map<string, { total: number; unresolved: number; latest: string }>();

        comments.forEach(c => {
            const current = statsMap.get(c.project_id) || { total: 0, unresolved: 0, latest: '' };

            current.total++;
            if (!c.is_completed) current.unresolved++;

            // Comments are ordered desc, so the first one we see is the latest
            if (!current.latest) current.latest = c.created_at;

            statsMap.set(c.project_id, current);
        });

        // 4. Map back to projects
        return projects
            .map(p => {
                const stats = statsMap.get(p.id);
                if (!stats) return null; // Only show projects with comments? Or all? User likely wants Inbox = Active
                // "Inbox" usually implies items with activity.
                // If we want all, remove this check.

                return {
                    projectId: p.id,
                    title: p.title,
                    clientId: p.clientId || null,
                    clientName: p.clientName || 'Unknown Client',
                    totalComments: stats.total,
                    unresolvedComments: stats.unresolved,
                    latestCommentAt: stats.latest
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null && p.totalComments > 0) // Filter out no-comment projects
            .sort((a, b) => new Date(b.latestCommentAt).getTime() - new Date(a.latestCommentAt).getTime());
    }
};
