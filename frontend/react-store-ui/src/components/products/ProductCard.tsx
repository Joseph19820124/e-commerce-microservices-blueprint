import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Rating,
  Box,
} from '@mui/material';
import {
  AddShoppingCart,
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material';
import { Product } from '../../types/products';

interface ProductCardProps {
  product: Product;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  compact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  onAddToWishlist,
  compact = false,
}) => {
  const [isFavorite, setIsFavorite] = React.useState(false);

  const handleCardClick = () => {
    onProductClick?.(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    onAddToWishlist?.(product);
  };

  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Card
      className="product-card"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
        },
        transition: 'all 0.3s ease-in-out',
      }}
      onClick={handleCardClick}
    >
      {/* Discount Badge */}
      {discountPercentage > 0 && (
        <Chip
          label={`-${discountPercentage}%`}
          color="error"
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1,
            fontWeight: 'bold',
          }}
        />
      )}

      {/* Wishlist Button */}
      <IconButton
        onClick={handleAddToWishlist}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'background.paper',
          },
        }}
        size="small"
      >
        {isFavorite ? (
          <Favorite color="error" />
        ) : (
          <FavoriteBorder />
        )}
      </IconButton>

      {/* Product Image */}
      <CardMedia
        component="img"
        height={compact ? 150 : 200}
        image={primaryImage?.url || 'https://via.placeholder.com/300x200'}
        alt={primaryImage?.alt || product.name}
        sx={{
          objectFit: 'cover',
        }}
      />

      {/* Product Info */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Brand */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: 'uppercase', fontWeight: 500 }}
        >
          {product.brand}
        </Typography>

        {/* Product Name */}
        <Typography
          variant={compact ? 'body2' : 'h6'}
          component="h3"
          sx={{
            fontWeight: 500,
            mb: 1,
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}
        >
          {product.name}
        </Typography>

        {/* Short Description */}
        {!compact && product.shortDescription && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
            }}
          >
            {product.shortDescription}
          </Typography>
        )}

        {/* Rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Rating
            value={product.rating.average}
            precision={0.5}
            size="small"
            readOnly
          />
          <Typography variant="caption" sx={{ ml: 1 }}>
            ({product.rating.count})
          </Typography>
        </Box>

        {/* Price */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant={compact ? 'body1' : 'h6'}
            component="span"
            sx={{ fontWeight: 600, color: 'primary.main' }}
          >
            ${product.price.toFixed(2)}
          </Typography>
          {product.originalPrice && (
            <Typography
              variant="body2"
              component="span"
              sx={{
                textDecoration: 'line-through',
                color: 'text.secondary',
              }}
            >
              ${product.originalPrice.toFixed(2)}
            </Typography>
          )}
        </Box>

        {/* Stock Status */}
        <Box sx={{ mt: 1 }}>
          {product.inventory.isInStock ? (
            <Chip
              label="In Stock"
              color="success"
              size="small"
              variant="outlined"
            />
          ) : (
            <Chip
              label="Out of Stock"
              color="error"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddShoppingCart />}
          onClick={handleAddToCart}
          disabled={!product.inventory.isInStock}
          fullWidth
          size={compact ? 'small' : 'medium'}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProductCard;