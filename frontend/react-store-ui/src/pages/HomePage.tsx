import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Skeleton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// Components
import ProductCard from '../components/products/ProductCard';
import CategoryGrid from '../components/products/CategoryGrid';

// Store
import { useAppSelector, useAppDispatch } from '../store';
import {
  selectFeaturedProducts,
  selectCategories,
  selectProductsLoading,
  fetchFeaturedProducts,
} from '../store/slices/productsSlice';

// Styled components
const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: 'white',
  padding: theme.spacing(8, 0),
  marginBottom: theme.spacing(6),
  borderRadius: theme.spacing(0, 0, 3, 3),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(3),
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -8,
    left: 0,
    width: 60,
    height: 3,
    backgroundColor: theme.palette.primary.main,
    borderRadius: 2,
  },
}));

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const featuredProducts = useAppSelector(selectFeaturedProducts);
  const categories = useAppSelector(selectCategories);
  const loading = useAppSelector(selectProductsLoading);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
  }, [dispatch]);

  const handleShopNow = () => {
    navigate('/products');
  };

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/products?category=${categorySlug}`);
  };

  return (
    <>
      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Welcome to Our Store
              </Typography>
              <Typography variant="h5" component="p" sx={{ mb: 4, opacity: 0.9 }}>
                Discover amazing products at unbeatable prices. 
                Quality guaranteed, fast shipping worldwide.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleShopNow}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}
                >
                  Shop Now
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'white',
                    },
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 300,
                }}
              >
                <Card
                  sx={{
                    maxWidth: 400,
                    transform: 'rotate(-5deg)',
                    boxShadow: 4,
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image="https://via.placeholder.com/400x200/1976d2/ffffff?text=Featured+Product"
                    alt="Featured Product"
                  />
                  <CardContent>
                    <Chip
                      label="Best Seller"
                      color="secondary"
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6">Premium Headphones</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Experience superior sound quality
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </HeroSection>

      <Container maxWidth="lg">
        {/* Categories Section */}
        <Box sx={{ mb: 8 }}>
          <SectionTitle variant="h4" component="h2">
            Shop by Category
          </SectionTitle>
          {loading.categories ? (
            <Grid container spacing={3}>
              {[1, 2, 3].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item}>
                  <Skeleton variant="rectangular" height={200} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <CategoryGrid
              categories={categories}
              onCategoryClick={handleCategoryClick}
            />
          )}
        </Box>

        {/* Featured Products Section */}
        <Box sx={{ mb: 8 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <SectionTitle variant="h4" component="h2">
              Featured Products
            </SectionTitle>
            <Button
              variant="outlined"
              onClick={() => navigate('/products')}
            >
              View All
            </Button>
          </Box>
          
          {loading.featured ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item}>
                  <Card>
                    <Skeleton variant="rectangular" height={200} />
                    <CardContent>
                      <Skeleton variant="text" />
                      <Skeleton variant="text" width="60%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {featuredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product.id}>
                  <ProductCard
                    product={product}
                    onProductClick={() => navigate(`/products/${product.id}`)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <SectionTitle variant="h4" component="h2">
            Why Choose Us
          </SectionTitle>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    fontSize: '2rem',
                  }}
                >
                  🚚
                </Box>
                <Typography variant="h6" gutterBottom>
                  Fast Shipping
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Free shipping on orders over $50. Express delivery available.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    fontSize: '2rem',
                  }}
                >
                  🛡️
                </Box>
                <Typography variant="h6" gutterBottom>
                  Quality Guarantee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  30-day money-back guarantee. Quality you can trust.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    fontSize: '2rem',
                  }}
                >
                  💬
                </Box>
                <Typography variant="h6" gutterBottom>
                  24/7 Support
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Round-the-clock customer support. We're here to help.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default HomePage;