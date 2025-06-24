// Product-related type definitions

import { BaseEntity } from '../common';

export interface Product extends BaseEntity {
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  currency: string;
  sku: string;
  brand: string;
  category: Category;
  images: ProductImage[];
  tags: string[];
  attributes: ProductAttribute[];
  inventory: ProductInventory;
  rating: ProductRating;
  isActive: boolean;
  isFeatured: boolean;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  weight?: number;
  dimensions?: ProductDimensions;
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
  slug: string;
  parentId?: string;
  level: number;
  imageUrl?: string;
  isActive: boolean;
  productCount?: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductAttribute {
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'color' | 'size';
  isFilterable: boolean;
  displayOrder: number;
}

export interface ProductInventory {
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  isInStock: boolean;
  warehouse?: string;
  lastUpdated: string;
}

export interface ProductRating {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface ProductReview extends BaseEntity {
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  helpfulCount: number;
  images?: string[];
}

export interface ProductVariant extends BaseEntity {
  productId: string;
  name: string;
  sku: string;
  price: number;
  inventory: ProductInventory;
  attributes: ProductAttribute[];
  images: ProductImage[];
  isDefault: boolean;
}

// API request/response types
export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: Category[];
  brands: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'rating' | 'newest' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  tags?: string[];
}

export interface ProductFilters {
  categories: FilterOption[];
  brands: FilterOption[];
  priceRanges: FilterOption[];
  ratings: FilterOption[];
  tags: FilterOption[];
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

// Component props types
export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  showQuickView?: boolean;
  compact?: boolean;
}

export interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  itemsPerRow?: number;
}

export interface ProductDetailsProps {
  product: Product;
  reviews?: ProductReview[];
  relatedProducts?: Product[];
  onAddToCart?: (product: Product, quantity: number) => void;
  onAddToWishlist?: (product: Product) => void;
}

// Form types
export interface ProductFormData {
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number;
  sku: string;
  brand: string;
  categoryId: string;
  tags: string[];
  images: File[];
  attributes: ProductAttribute[];
  inventory: Omit<ProductInventory, 'lastUpdated'>;
  isActive: boolean;
  isFeatured: boolean;
  weight: number;
  dimensions: ProductDimensions;
}

// State types
export interface ProductsState {
  products: Product[];
  currentProduct: Product | null;
  categories: Category[];
  filters: ProductFilters;
  searchParams: ProductSearchParams;
  loading: {
    products: boolean;
    categories: boolean;
    currentProduct: boolean;
  };
  error: {
    products: string | null;
    categories: string | null;
    currentProduct: string | null;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}