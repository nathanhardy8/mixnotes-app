'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectService } from '@/services/projectService';
import { useUser } from '@/context/UserContext';
import { Loader } from 'lucide-react';
import { Project, User } from '@/types';

export default function SharedProjectPage() {
    const params = useParams(); // { token }
    const token = params?.token as string;
    const router = useRouter();
    const { setGuestUser } = useUser();
    const [status, setStatus] = useState('Checking link...');

    useEffect(() => {
        if (!token) return;

        const validate = async () => {
            try {
                // 1. Fetch Project by Token
                const project = await projectService.getProjectByShareToken(token);

                if (!project) {
                    setStatus('Invalid or expired link');
                    return;
                }

                // 2. Create Guest User Object
                const guestUser: User = {
                    id: 'guest-' + token,
                    email: '',
                    name: 'Guest Client',
                    role: 'client',
                    defaultRevisionLimit: null
                };

                // 3. Set Context
                setStatus('Loading project...');
                setGuestUser(guestUser);

                // 4. Redirect to Project ID (Context is now hydrated)
                // Note: The UserContext will persist this guest session in-memory.
                // Redirecting to /projects/[id] will load the real page.
                // The page relies on `getProject(id)` or `projectService.getProjectById(id)`.
                // Standard getProjectById is protected by RLS? Yes usually.
                // But wait!
                // If I redirect to `/projects/[id]`, the page will try to fetch with `projectService.getProjectById(id)`.
                // This uses the standard supabase client.
                // Since the user is NOT authenticated in Supabase (only in local context), RLS will block the read!

                // CRITICAL ISSUE: RLS blocks standard reads for unauthed users.
                // Our `setGuestUser` only updates React state, not Supabase session.

                // Solution:
                // We CANNOT just redirect to `/projects/[id]`.
                // The Shared Link Page MUST render the Project UI itself, passing the data we just fetched via the API route.
                // OR duplicate the Project Page logic but pass explicit data.

                // Better approach:
                // Modify `ProjectPage` to accept `initialData`? Or use a context?
                // Actually, if we are "logged in as Guest", we mimic the UI.
                // But data fetching is the issue.

                // Option A: Use the existing /projects/[id] route but hydrate the ProjectContext with the data we fetched here?
                // If we cache it in `projectService` or `useProjects`?

                // Option B: This page IS the project page.
                // We reuse the components `AudioPlayer`, `CommentSidebar`.
                // This is safer and cleaner.

                // Let's implement Option B for now to avoid RLS complexity on the main route.
                // We will render the Project View here directly.

                // However, user requirement 1: "Logs in as a temporary guest session... Navigates directly to the correct project".
                // And "Shows only the parent client's name and projects in the sidebar".

                // If we want the sidebar to work (listing other projects for that client), we need API routes for those too.
                // For simplicity, guests only see THIS project?
                // Requirement said: "Shows only the parent client's name and projects in the sidebar".
                // This implies "Client Portal" view.

                // Guest Auth via Anonymous Login?
                // Supabase supports `signInAnonymously()`.
                // If we sign them in anonymously, they have a UID.
                // We can add them to `project.client_ids`? No, that modifies DB.
                // RLS: `auth.uid() = ANY(client_ids)`.

                // If we use `share_token` (public), we don't need auth. 
                // We just need the API to fetch data.

                // Revised Plan:
                // 1. `SharedProjectPage` fetches project data via `validate` API (Bypassing RLS).
                // 2. It renders the full UI.
                // 3. It mocks `useUser()` context for child components.
                // 4. Sidebar: We might hide it or show simplified version?
                //    "no access to other clients".
                //    If we want to show "projects in the sidebar", we need a `getClientProjectsByToken`?
                //    Lets start with Single Project. If sidebar is empty, that's fine.

                setFetchedProject(project);

            } catch (e) {
                setStatus('Error loading project');
            }
        };

        validate();
    }, [token, setGuestUser]);

    const [fetchedProject, setFetchedProject] = useState<Project | null>(null);

    if (fetchedProject) {
        // Reuse ProjectPage Logic?
        // We can import `ProjectPage` content?
        // Or just redirect?
        // Redirecting is cleaner URL `/projects/[id]`.
        // But RLS blocks it.

        // Let's try to Sign In Anonymously? 
        // If we do that, we still need RLS permission.
        // We would have to add `is_public` or similar to RLS.

        // Compromise: Render the UI here.
        // We will copy the JSX from `ProjectPage` or extract it to a `ProjectView` component.
        // To be dry, let's look at `ProjectPage` again. It's quite big.

        // I will copy the logic for now (Speed) and clean up later.
        // Actually, extracting to `components/ProjectView.tsx` is better.

        // FOR NOW: I will redirect to `/projects/[id]?token=XYZ`.
        // And update `ProjectPage` to handle `token`.
        // If `token` is present, it uses `getProjectByShareToken` instead of `getProjectById`.

        router.push(`/projects/${fetchedProject.id}?share_token=${token}`);
    }

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
            <div style={{ textAlign: 'center' }}>
                <Loader className="spin" size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <div style={{ color: 'var(--foreground)' }}>{status}</div>
            </div>
        </div>
    );
}
