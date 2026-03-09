export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CITIZEN' | 'ADMIN' | 'MUNICIPAL_COUNCILOR' | 'SUPER_ADMIN';
  kepVerified: boolean;
  kepId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address?: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  assignedToId?: string;
  user?: User;
  comments?: Comment[];
  history?: ReportHistory[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  reportId: string;
  userId: string;
  user?: User;
}

export interface ReportHistory {
  id: string;
  action: string;
  oldStatus?: ReportStatus;
  newStatus?: ReportStatus;
  description?: string;
  createdAt: Date;
  reportId: string;
}

export type ReportCategory =
  | 'POTHOLE'
  | 'STREET_LIGHT'
  | 'GARBAGE'
  | 'GRAFFITI'
  | 'TRAFFIC_SIGNAL'
  | 'WATER_LEAK'
  | 'PARK_MAINTENANCE'
  | 'NOISE_COMPLAINT'
  | 'ILLEGAL_PARKING'
  | 'OTHER';

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ReportStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  totalUsers: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  category: ReportCategory;
  status: ReportStatus;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  category?: ReportCategory;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
