import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../../types/products';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedAttributes?: Record<string, string>;
  addedAt: string;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemsCount: number;
  isOpen: boolean;
  shipping: {
    cost: number;
    method: string;
    estimatedDays: number;
  };
  discount: {
    code?: string;
    amount: number;
    percentage?: number;
  };
}

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
};

const calculateItemsCount = (items: CartItem[]): number => {
  return items.reduce((count, item) => count + item.quantity, 0);
};

const initialState: CartState = {
  items: [],
  total: 0,
  itemsCount: 0,
  isOpen: false,
  shipping: {
    cost: 0,
    method: 'standard',
    estimatedDays: 5,
  },
  discount: {
    amount: 0,
  },
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; quantity?: number; attributes?: Record<string, string> }>) => {
      const { product, quantity = 1, attributes = {} } = action.payload;
      const existingItemIndex = state.items.findIndex(
        item => item.product.id === product.id && 
        JSON.stringify(item.selectedAttributes) === JSON.stringify(attributes)
      );

      if (existingItemIndex >= 0) {
        state.items[existingItemIndex].quantity += quantity;
      } else {
        const newItem: CartItem = {
          id: `${product.id}-${Date.now()}`,
          product,
          quantity,
          selectedAttributes: attributes,
          addedAt: new Date().toISOString(),
        };
        state.items.push(newItem);
      }

      state.total = calculateTotal(state.items);
      state.itemsCount = calculateItemsCount(state.items);
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.total = calculateTotal(state.items);
      state.itemsCount = calculateItemsCount(state.items);
    },

    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);
      
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.id !== id);
        } else {
          item.quantity = quantity;
        }
        state.total = calculateTotal(state.items);
        state.itemsCount = calculateItemsCount(state.items);
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemsCount = 0;
      state.discount.amount = 0;
      state.discount.code = undefined;
    },

    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },

    openCart: (state) => {
      state.isOpen = true;
    },

    closeCart: (state) => {
      state.isOpen = false;
    },

    setShipping: (state, action: PayloadAction<{ method: string; cost: number; estimatedDays: number }>) => {
      state.shipping = action.payload;
    },

    applyDiscount: (state, action: PayloadAction<{ code: string; amount: number; percentage?: number }>) => {
      state.discount = action.payload;
    },

    removeDiscount: (state) => {
      state.discount = { amount: 0 };
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  toggleCart,
  openCart,
  closeCart,
  setShipping,
  applyDiscount,
  removeDiscount,
} = cartSlice.actions;

// Selectors
export const selectCart = (state: { cart: CartState }) => state.cart;
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartTotal = (state: { cart: CartState }) => state.cart.total;
export const selectCartItemsCount = (state: { cart: CartState }) => state.cart.itemsCount;
export const selectCartIsOpen = (state: { cart: CartState }) => state.cart.isOpen;

export default cartSlice.reducer;