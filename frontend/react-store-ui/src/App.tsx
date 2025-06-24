import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';

// Layout components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Sidebar from './components/common/Sidebar';
import NotificationContainer from './components/common/NotificationContainer';
import LoadingOverlay from './components/common/LoadingOverlay';

// Page components
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SearchPage from './pages/SearchPage';
import NotFoundPage from './pages/NotFoundPage';

// Hooks
import { useAppSelector, useAppDispatch } from './store';
import { selectLoading } from './store/slices/uiSlice';
import { fetchCategories } from './store/slices/productsSlice';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectLoading);

  useEffect(() => {
    // Initialize app data
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Loading overlay */}
      {loading.global && <LoadingOverlay />}
      
      {/* Header */}
      <Header />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/search" element={<SearchPage />} />
          
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
      
      {/* Footer */}
      <Footer />
      
      {/* Notifications */}
      <NotificationContainer />
    </Box>
  );
};

export default App;