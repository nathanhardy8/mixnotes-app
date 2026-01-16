export type UserRole = 'engineer' | 'client' | 'admin';

export interface Subscription {
  userId: string;
  billingProvider?: 'stripe' | 'paypal';
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  billingStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'exempt' | 'inactive';
  planInterval?: 'month' | 'year';
  currentPeriodEnd?: string;
  trialStartAt?: string;
  trialEndAt?: string;
  trialUsed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  subscription?: Subscription | null; // Null if no record exists
  defaultRevisionLimit?: number | null;
}

export interface Comment {
  id: string;
  projectId: string;
  projectVersionId?: string; // Optional for backward compatibility/during migration
  authorId: string;
  content: string;
  timestamp: number; // in seconds
  createdAt: string; // ISO date string
  isCompleted?: boolean;
  isPostApproval?: boolean;

  // New Attribution Fields
  authorType: 'ENGINEER' | 'CLIENT';
  authorName: string;
  authorUserId?: string;
  authorClientIdentifier?: string;
  archivedAt?: string;
  parentId?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  engineerId: string;
  createdAt: string;
  uploadInstructions?: string;
  accessPublicId?: string;
  archivedAt?: string;
}

export interface ClientUpload {
  id: string;
  clientId: string;
  uploadedByType: 'CLIENT' | 'PRODUCER';
  uploadedByIdentifier?: string;
  originalFilename: string;
  displayName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED';

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  audioUrl: string;
  createdAt: string;
  createdByUserId?: string;
  isApproved: boolean;
  originalFilename?: string;
  displayOrder?: number;
  displayName?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  audioUrl: string; // URL to the audio file (current version)
  engineerId: string;
  clientId?: string; // Link to the 'Client Entity'
  clientIds: string[]; // List of specific user IDs (guests) who have access
  createdAt: string;
  isLocked: boolean; // For payment gating
  price?: number; // Price in dollars
  sizeBytes?: number; // Storage usage in bytes
  archivedAt?: string; // ISO date string if archived
  shareToken?: string; // Unique token for public sharing

  // Review & Approval Fields
  reviewPublicId?: string;
  reviewEnabled?: boolean;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  revisionLimit?: number | null; // null = unlimited
  revisionsUsed?: number;
  approvalStatus?: ApprovalStatus;
  approvedVersionId?: string;
  approvedAt?: string;
  approvedBy?: string;
  remindersEnabled?: boolean;

  lastClientActivityAt?: string;
  allowDownload?: boolean;

  // Computed/Hydrated fields
  versions?: ProjectVersion[];
  activeVersionId?: string; // For client reviews, the specifically shared version or latest
}


export interface ReviewMagicLink {
  id: string;
  projectId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface FolderMagicLink {
  id: string;
  clientId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
}
