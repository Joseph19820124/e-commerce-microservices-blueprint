import React from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { Category } from '../../types/products';

interface CategoryGridProps {
  categories: Category[];
  onCategoryClick: (categorySlug: string) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onCategoryClick,
}) => {
  return (
    <Grid container spacing={3}>
      {categories.map((category) => (
        <Grid item xs={12} sm={6} md={4} key={category.id}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3,
              },
            }}
            onClick={() => onCategoryClick(category.slug)}
          >
            <CardMedia
              component="img"
              height="150"
              image={category.imageUrl || `https://via.placeholder.com/300x150/2196f3/ffffff?text=${category.name}`}
              alt={category.name}
              sx={{ objectFit: 'cover' }}
            />
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                {category.name}
              </Typography>
              {category.description && (
                <Typography variant="body2" color="text.secondary">
                  {category.description}
                </Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="primary">
                  {category.productCount} products
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default CategoryGrid;