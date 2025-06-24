import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  autoHide?: boolean;
  duration?: number;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  loading: {
    global: boolean;
    page: boolean;
  };
  searchOpen: boolean;
  filters: {
    isOpen: boolean;
    activeFilters: Record<string, any>;
  };
  modal: {
    isOpen: boolean;
    type: string | null;
    data: any;
  };
}

const initialState: UIState = {
  theme: 'light',
  sidebarOpen: false,
  notifications: [],
  loading: {
    global: false,
    page: false,
  },
  searchOpen: false,
  filters: {
    isOpen: false,
    activeFilters: {},
  },
  modal: {
    isOpen: false,
    type: null,
    data: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },

    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        autoHide: true,
        duration: 5000,
        ...action.payload,
      };
      state.notifications.push(notification);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },

    setPageLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.page = action.payload;
    },

    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen;
    },

    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
    },

    toggleFilters: (state) => {
      state.filters.isOpen = !state.filters.isOpen;
    },

    setFiltersOpen: (state, action: PayloadAction<boolean>) => {
      state.filters.isOpen = action.payload;
    },

    setActiveFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.filters.activeFilters = action.payload;
    },

    updateActiveFilter: (state, action: PayloadAction<{ key: string; value: any }>) => {
      const { key, value } = action.payload;
      if (value === null || value === undefined) {
        delete state.filters.activeFilters[key];
      } else {
        state.filters.activeFilters[key] = value;
      }
    },

    clearActiveFilters: (state) => {
      state.filters.activeFilters = {};
    },

    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.modal.isOpen = true;
      state.modal.type = action.payload.type;
      state.modal.data = action.payload.data || null;
    },

    closeModal: (state) => {
      state.modal.isOpen = false;
      state.modal.type = null;
      state.modal.data = null;
    },
  },
});

export const {
  toggleTheme,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  addNotification,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
  setPageLoading,
  toggleSearch,
  setSearchOpen,
  toggleFilters,
  setFiltersOpen,
  setActiveFilters,
  updateActiveFilter,
  clearActiveFilters,
  openModal,
  closeModal,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectLoading = (state: { ui: UIState }) => state.ui.loading;
export const selectSearchOpen = (state: { ui: UIState }) => state.ui.searchOpen;
export const selectFilters = (state: { ui: UIState }) => state.ui.filters;
export const selectModal = (state: { ui: UIState }) => state.ui.modal;

export default uiSlice.reducer;