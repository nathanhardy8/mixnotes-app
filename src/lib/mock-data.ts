import { User, Project, Comment } from '@/types';

export const MOCK_USERS: User[] = [
    {
        id: 'user-1',
        name: 'Audio Engineer',
        email: 'engineer@studio.com',
        role: 'engineer',
        avatarUrl: 'https://ui-avatars.com/api/?name=Audio+Engineer&background=0D8ABC&color=fff',
    },
    {
        id: 'user-2',
        name: 'Client Reviewer',
        email: 'client@label.com',
        role: 'client',
        avatarUrl: 'https://ui-avatars.com/api/?name=Client+Reviewer&background=random',
    },
];

export const MOCK_PROJECTS: Project[] = [
    {
        id: 'project-1',
        title: 'Summer Hits',
        description: 'Upbeat pop track for the summer campaign.',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Public domain example
        engineerId: 'user-1',
        clientIds: ['user-2'],
        createdAt: '2023-10-27T10:00:00Z',
        isLocked: true,
        price: 150,
    },
];

export const MOCK_COMMENTS: Comment[] = [
    {
        id: 'c1',
        projectId: 'project-1',
        authorId: 'user-2',
        content: 'The bass is a bit too loud here.',
        timestamp: 12.5,
        createdAt: new Date(Date.now() - 100000).toISOString(),
        authorType: 'CLIENT',
        authorName: 'Client Reviewer',
    },
    {
        id: 'c2',
        projectId: 'project-1',
        authorId: 'user-1',
        content: 'Noted, I will cut 3dB at 60Hz.',
        timestamp: 15.0,
        createdAt: new Date(Date.now() - 80000).toISOString(),
        authorType: 'ENGINEER',
        authorName: 'Audio Engineer',
    },
];
