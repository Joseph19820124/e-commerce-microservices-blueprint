import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product, Category, ProductSearchParams, ProductsResponse } from '../../types/products';

export interface ProductsState {
  products: Product[];
  currentProduct: Product | null;
  categories: Category[];
  featuredProducts: Product[];
  searchResults: Product[];
  filters: {
    categories: Category[];
    brands: string[];
    priceRange: { min: number; max: number };
  };
  loading: {
    products: boolean;
    categories: boolean;
    currentProduct: boolean;
    featured: boolean;
    search: boolean;
  };
  error: {
    products: string | null;
    categories: string | null;
    currentProduct: string | null;
    featured: string | null;
    search: string | null;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  searchParams: ProductSearchParams;
}

// Mock data
const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Electronics',
    slug: 'electronics',
    level: 1,
    isActive: true,
    productCount: 150,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Clothing',
    slug: 'clothing',
    level: 1,
    isActive: true,
    productCount: 200,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Books',
    slug: 'books',
    level: 1,
    isActive: true,
    productCount: 80,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation and long battery life.',
    shortDescription: 'Premium wireless headphones with noise cancellation',
    price: 199.99,
    originalPrice: 249.99,
    discount: 20,
    currency: 'USD',
    sku: 'WBH-001',
    brand: 'TechSound',
    category: mockCategories[0],
    images: [
      {
        id: '1',
        url: 'https://via.placeholder.com/400x400/007bff/ffffff?text=Headphones',
        alt: 'Wireless Bluetooth Headphones',
        isPrimary: true,
        order: 1,
      },
    ],
    tags: ['wireless', 'bluetooth', 'noise-cancelling'],
    attributes: [
      { name: 'Color', value: 'Black', type: 'color', isFilterable: true, displayOrder: 1 },
      { name: 'Battery Life', value: '30 hours', type: 'text', isFilterable: false, displayOrder: 2 },
    ],
    inventory: {
      quantity: 50,
      reserved: 5,
      available: 45,
      lowStockThreshold: 10,
      isInStock: true,
      warehouse: 'main',
      lastUpdated: '2024-01-01T00:00:00Z',
    },
    rating: {
      average: 4.5,
      count: 128,
      distribution: { 5: 64, 4: 32, 3: 16, 2: 8, 1: 8 },
    },
    isActive: true,
    isFeatured: true,
    slug: 'wireless-bluetooth-headphones',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Comfortable Cotton T-Shirt',
    description: 'Soft and comfortable cotton t-shirt perfect for everyday wear.',
    shortDescription: '100% cotton comfortable t-shirt',
    price: 29.99,
    currency: 'USD',
    sku: 'CCT-002',
    brand: 'ComfortWear',
    category: mockCategories[1],
    images: [
      {
        id: '2',
        url: 'https://via.placeholder.com/400x400/28a745/ffffff?text=T-Shirt',
        alt: 'Cotton T-Shirt',
        isPrimary: true,
        order: 1,
      },
    ],
    tags: ['cotton', 'comfortable', 'casual'],
    attributes: [
      { name: 'Size', value: 'M', type: 'size', isFilterable: true, displayOrder: 1 },
      { name: 'Material', value: '100% Cotton', type: 'text', isFilterable: false, displayOrder: 2 },
    ],
    inventory: {
      quantity: 100,
      reserved: 10,
      available: 90,
      lowStockThreshold: 20,
      isInStock: true,
      warehouse: 'main',
      lastUpdated: '2024-01-01T00:00:00Z',
    },
    rating: {
      average: 4.2,
      count: 45,
      distribution: { 5: 20, 4: 15, 3: 8, 2: 2, 1: 0 },
    },
    isActive: true,
    isFeatured: false,
    slug: 'comfortable-cotton-t-shirt',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Mock API functions
const mockProductsAPI = {
  getProducts: async (params: ProductSearchParams): Promise<ProductsResponse> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let filteredProducts = [...mockProducts];
    
    if (params.query) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(params.query!.toLowerCase()) ||
        product.description.toLowerCase().includes(params.query!.toLowerCase())
      );
    }
    
    if (params.category) {
      filteredProducts = filteredProducts.filter(product =>
        product.category.slug === params.category
      );
    }
    
    if (params.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.price >= params.minPrice!);
    }
    
    if (params.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.price <= params.maxPrice!);
    }
    
    const page = params.page || 1;
    const limit = params.limit || 12;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      products: filteredProducts.slice(startIndex, endIndex),
      total: filteredProducts.length,
      page,
      limit,
      totalPages: Math.ceil(filteredProducts.length / limit),
      categories: mockCategories,
      brands: ['TechSound', 'ComfortWear'],
      priceRange: { min: 0, max: 500 },
    };
  },

  getProduct: async (id: string): Promise<Product> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const product = mockProducts.find(p => p.id === id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  },

  getCategories: async (): Promise<Category[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockCategories;
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockProducts.filter(product => product.isFeatured);
  },
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: ProductSearchParams = {}, { rejectWithValue }) => {
    try {
      return await mockProductsAPI.getProducts(params);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch products');
    }
  }
);

export const fetchProduct = createAsyncThunk(
  'products/fetchProduct',
  async (id: string, { rejectWithValue }) => {
    try {
      return await mockProductsAPI.getProduct(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch product');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await mockProductsAPI.getCategories();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories');
    }
  }
);

export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeaturedProducts',
  async (_, { rejectWithValue }) => {
    try {
      return await mockProductsAPI.getFeaturedProducts();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch featured products');
    }
  }
);

export const searchProducts = createAsyncThunk(
  'products/searchProducts',
  async (params: ProductSearchParams, { rejectWithValue }) => {
    try {
      return await mockProductsAPI.getProducts(params);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search products');
    }
  }
);

// Initial state
const initialState: ProductsState = {
  products: [],
  currentProduct: null,
  categories: [],
  featuredProducts: [],
  searchResults: [],
  filters: {
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 1000 },
  },
  loading: {
    products: false,
    categories: false,
    currentProduct: false,
    featured: false,
    search: false,
  },
  error: {
    products: null,
    categories: null,
    currentProduct: null,
    featured: null,
    search: null,
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  },
  searchParams: {},
};

// Products slice
const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
      state.error.currentProduct = null;
    },
    updateSearchParams: (state, action: PayloadAction<ProductSearchParams>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.error.search = null;
    },
    clearErrors: (state) => {
      state.error = {
        products: null,
        categories: null,
        currentProduct: null,
        featured: null,
        search: null,
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading.products = true;
        state.error.products = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading.products = false;
        state.products = action.payload.products;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
        state.filters.categories = action.payload.categories;
        state.filters.brands = action.payload.brands;
        state.filters.priceRange = action.payload.priceRange;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading.products = false;
        state.error.products = action.payload as string;
      });

    // Fetch single product
    builder
      .addCase(fetchProduct.pending, (state) => {
        state.loading.currentProduct = true;
        state.error.currentProduct = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loading.currentProduct = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading.currentProduct = false;
        state.error.currentProduct = action.payload as string;
      });

    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading.categories = true;
        state.error.categories = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.error.categories = action.payload as string;
      });

    // Fetch featured products
    builder
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.loading.featured = true;
        state.error.featured = null;
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.loading.featured = false;
        state.featuredProducts = action.payload;
      })
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.loading.featured = false;
        state.error.featured = action.payload as string;
      });

    // Search products
    builder
      .addCase(searchProducts.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading.search = false;
        state.searchResults = action.payload.products;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.payload as string;
      });
  },
});

// Export actions
export const { clearCurrentProduct, updateSearchParams, clearSearchResults, clearErrors } = productsSlice.actions;

// Export selectors
export const selectProducts = (state: { products: ProductsState }) => state.products.products;
export const selectCurrentProduct = (state: { products: ProductsState }) => state.products.currentProduct;
export const selectCategories = (state: { products: ProductsState }) => state.products.categories;
export const selectFeaturedProducts = (state: { products: ProductsState }) => state.products.featuredProducts;
export const selectSearchResults = (state: { products: ProductsState }) => state.products.searchResults;
export const selectProductsLoading = (state: { products: ProductsState }) => state.products.loading;
export const selectProductsError = (state: { products: ProductsState }) => state.products.error;
export const selectPagination = (state: { products: ProductsState }) => state.products.pagination;
export const selectSearchParams = (state: { products: ProductsState }) => state.products.searchParams;

// Export reducer
export default productsSlice.reducer;