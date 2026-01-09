import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Client } from '@/types';

export const clientService = {
    async getClients(engineerId: string, role: string = 'engineer'): Promise<Client[]> {
        let query = supabase.from('clients').select('*');

        // Only filter by engineer_id if NOT admin
        if (role !== 'admin') {
            query = query.eq('engineer_id', engineerId);
        }

        // Always filter out archived to treat them as "soft deleted" if they exist
        query = query.is('archived_at', null);

        const { data, error } = await query.order('name', { ascending: true });

        if (error) {
            console.error('Error fetching clients:', error);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            engineerId: c.engineer_id,
            createdAt: c.created_at,
            archivedAt: c.archived_at
        }));
    },

    async createClient(name: string, engineerId: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .insert([{ name, engineer_id: engineerId }])
            .select()
            .single();

        if (error) {
            console.error('Error creating client:', error);
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            engineerId: data.engineer_id,
            createdAt: data.created_at,
        };
    },

    async deleteClient(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting client:', error);
            return false;
        }
        return true;
    },

    async getClientById(id: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            engineerId: data.engineer_id,
            createdAt: data.created_at,
        };
    },

    async updateClientAPI(id: string, updates: { name?: string; archivedAt?: string | null }): Promise<Client | null> {
        try {
            const res = await fetch(`/api/clients/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
            if (!res.ok) return null;

            const data = await res.json();
            return {
                id: data.id,
                name: data.name,
                engineerId: data.engineer_id,
                createdAt: data.created_at,
                archivedAt: data.archived_at
            };
        } catch (e) {
            console.error('API Update Error:', e);
            return null;
        }
    },

    async deleteClientAPI(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch(`/api/clients/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const data = await res.json();
                return { success: false, error: data.error || 'Unknown error' };
            }
            return { success: true };
        } catch (e: any) {
            console.error('API Delete Error:', e);
            return { success: false, error: e.message || 'Network error' };
        }
    },

    // UPLOADS
    async getClientUploads(clientId: string): Promise<import('@/types').ClientUpload[]> {
        try {
            const res = await fetch(`/api/clients/${clientId}/uploads`);
            if (!res.ok) return [];
            const data = await res.json();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data.files || []).map((f: any) => ({
                id: f.id,
                clientId: f.client_id,
                uploadedByType: f.uploaded_by_type,
                uploadedByIdentifier: f.uploaded_by_identifier,
                originalFilename: f.original_filename,
                displayName: f.display_name,
                storageKey: f.storage_key,
                mimeType: f.mime_type,
                sizeBytes: f.size_bytes,
                createdAt: f.created_at
            }));
        } catch (e) {
            console.error('Error fetching uploads via API:', e);
            return [];
        }
    },

    async createClientUpload(clientId: string, fileData: { originalFilename: string, storageKey: string, mimeType: string, sizeBytes: number }, token?: string): Promise<import('@/types').ClientUpload | null> {
        try {
            const res = await fetch(`/api/clients/${clientId}/uploads${token ? `?t=${token}` : ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...fileData, token })
            });
            const data = await res.json();
            if (data.success && data.file) {
                const f = data.file;
                return {
                    id: f.id,
                    clientId: f.client_id,
                    uploadedByType: f.uploaded_by_type,
                    uploadedByIdentifier: f.uploaded_by_identifier,
                    originalFilename: f.original_filename,
                    displayName: f.display_name,
                    storageKey: f.storage_key,
                    mimeType: f.mime_type,
                    sizeBytes: f.size_bytes,
                    createdAt: f.created_at
                };
            }
            return null;
        } catch (e) {
            console.error('Create Upload Error:', e);
            return null;
        }
    },

    async updateClientInstructions(clientId: string, instructions: string): Promise<boolean> {
        const { error } = await supabase
            .from('clients')
            .update({ upload_instructions: instructions })
            .eq('id', clientId);
        return !error;
    },

    async deleteClientUpload(uploadId: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/uploads/${uploadId}`, { method: 'DELETE' });
            return res.ok;
        } catch (e) {
            console.error('Delete Upload Error', e);
            return false;
        }
    },

    async renameClientUpload(uploadId: string, newName: string): Promise<boolean> {
        const { error } = await supabase
            .from('client_uploaded_files')
            .update({ display_name: newName })
            .eq('id', uploadId);
        return !error;
    },

    // MAGIC LINKS (For Producer to Generate)
    async generateClientAccessLink(clientId: string): Promise<string | null> {
        try {
            const res = await fetch(`/api/clients/${clientId}/access-link`, { method: 'POST' });
            const data = await res.json();
            if (data.success && data.url) return data.url;
            return null;
        } catch (e) {
            console.error('Generate Link Error', e);
            return null;
        }
    },

    // FOLDER SHARE LINK
    async getFolderLinkStatus(clientId: string): Promise<{ exists: boolean; expiresAt?: string }> {
        try {
            const res = await fetch(`/api/clients/${clientId}/folder-link`);
            if (!res.ok) return { exists: false };
            return await res.json();
        } catch (e) {
            console.error('Get Folder Link Status Error', e);
            return { exists: false };
        }
    },

    async toggleFolderLink(clientId: string, action: 'enable' | 'revoke'): Promise<{ success: boolean; enabled?: boolean; url?: string; token?: string; error?: string }> {
        try {
            const res = await fetch(`/api/clients/${clientId}/folder-link`, {
                method: 'POST',
                body: JSON.stringify({ action })
            });
            return await res.json();
        } catch (e) {
            console.error('Toggle Folder Link Error', e);
            return { success: false, error: 'Network error' };
        }
    }
};
