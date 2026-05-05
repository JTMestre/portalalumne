export type ResourceType = 'video' | 'game' | 'doc' | 'link' | 'kahoot' | 'html';

export interface School {
  id: string;
  name: string;
  logo?: string;
  slug: string;
  themeColor?: string;
  order?: number;
}

export interface Resource {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  content?: string; // For HTML/JS code
  thumbnail?: string;
  createdAt: any;
}

export interface News {
  id: string;
  title: string;
  content: string;
  image?: string;
  date: any;
  schoolId?: string;
}

export interface SiteConfig {
  id: string;
  siteName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  primaryColor?: string; // hex
  accentColor?: string; // hex
  fontSans?: string;
  fontHeading?: string;
  baseFontSize?: string; // e.g., '16px'
  adminEmail?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
