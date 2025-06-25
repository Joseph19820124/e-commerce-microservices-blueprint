import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import type { RenderOptions } from '@testing-library/react';
import type { PreloadedState } from '@reduxjs/toolkit';

import { theme } from './theme';
import { RootState } from './store';
import authSlice from './store/slices/authSlice';
import cartSlice from './store/slices/cartSlice';
import productsSlice from './store/slices/productsSlice';
import uiSlice from './store/slices/uiSlice';

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: PreloadedState<RootState>;
  store?: ReturnType<typeof configureStore>;
}

// Create a mock store function
const createMockStore = (initialState?: PreloadedState<RootState>) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      cart: cartSlice,
      products: productsSlice,
      ui: uiSlice,
    },
    preloadedState: initialState,
  });
};

// Custom render function that includes providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<{}>) => {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );
  };

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Mock data factories
const createMockProduct = (overrides = {}) => ({
  id: 'test-product-1',
  name: 'Test Product',
  description: 'This is a test product description',
  price: 99.99,
  category: 'Electronics',
  stock: 100,
  images: ['https://example.com/image1.jpg'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  addresses: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createMockCartItem = (overrides = {}) => ({
  productId: 'test-product-1',
  quantity: 1,
  price: 99.99,
  name: 'Test Product',
  image: 'https://example.com/image1.jpg',
  ...overrides,
});

// Add to global testUtils
global.testUtils = {
  createMockStore,
  renderWithProviders,
  createMockProduct,
  createMockUser,
  createMockCartItem,
};

// Export for direct imports
export {
  createMockStore,
  renderWithProviders,
  createMockProduct,
  createMockUser,
  createMockCartItem,
};