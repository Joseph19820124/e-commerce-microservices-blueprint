// Common type definitions for the e-commerce application

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface FormField {
  value: string;
  error?: string;
  touched?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  message: string;
}

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

export interface Alert {
  id: string;
  message: string;
  severity: AlertSeverity;
  autoHide?: boolean;
  duration?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SortOption {
  value: string;
  label: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = unknown> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
}

// Form types
export interface FormConfig {
  initialValues: Record<string, any>;
  validationSchema?: Record<string, ValidationRule[]>;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
}

// Theme types
export type ThemeMode = 'light' | 'dark';

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType;
  children?: NavItem[];
  requiresAuth?: boolean;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

export class AppError extends Error {
  public code: string;
  public statusCode?: number;
  public details?: Record<string, any>;

  constructor(message: string, code: string, statusCode?: number, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}