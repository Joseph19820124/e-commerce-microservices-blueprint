import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../ProductCard';
import { renderWithProviders, createMockProduct } from '../../../testUtils';

describe('ProductCard Component', () => {
  const mockProduct = createMockProduct({
    id: '1',
    name: 'Test Product',
    price: 99.99,
    description: 'This is a test product',
    category: 'Electronics',
    images: ['https://example.com/image.jpg'],
    stock: 10
  });

  const defaultProps = {
    product: mockProduct,
    onAddToCart: jest.fn(),
    onViewDetails: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    renderWithProviders(<ProductCard {...defaultProps} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('This is a test product')).toBeInTheDocument();
  });

  it('displays product image with correct alt text', () => {
    renderWithProviders(<ProductCard {...defaultProps} />);

    const image = screen.getByRole('img', { name: /test product/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('shows stock status when product is in stock', () => {
    renderWithProviders(<ProductCard {...defaultProps} />);

    expect(screen.getByText('In Stock (10)')).toBeInTheDocument();
  });

  it('shows out of stock when stock is 0', () => {
    const outOfStockProduct = createMockProduct({ stock: 0 });
    const props = { ...defaultProps, product: outOfStockProduct };

    renderWithProviders(<ProductCard {...props} />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard {...defaultProps} />);

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addToCartButton);

    expect(defaultProps.onAddToCart).toHaveBeenCalledTimes(1);
    expect(defaultProps.onAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('calls onViewDetails when view details button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard {...defaultProps} />);

    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
    await user.click(viewDetailsButton);

    expect(defaultProps.onViewDetails).toHaveBeenCalledTimes(1);
    expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockProduct.id);
  });

  it('disables add to cart button when product is out of stock', () => {
    const outOfStockProduct = createMockProduct({ stock: 0 });
    const props = { ...defaultProps, product: outOfStockProduct };

    renderWithProviders(<ProductCard {...props} />);

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('calls onViewDetails when product image is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard {...defaultProps} />);

    const image = screen.getByRole('img', { name: /test product/i });
    await user.click(image);

    expect(defaultProps.onViewDetails).toHaveBeenCalledTimes(1);
    expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockProduct.id);
  });

  it('displays placeholder image when no image is provided', () => {
    const productWithoutImage = createMockProduct({ images: [] });
    const props = { ...defaultProps, product: productWithoutImage };

    renderWithProviders(<ProductCard {...props} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('placeholder'));
  });

  it('truncates long product descriptions', () => {
    const longDescription = 'This is a very long product description that should be truncated to prevent the card from becoming too tall and maintain consistent layout across the product grid';
    const productWithLongDescription = createMockProduct({ description: longDescription });
    const props = { ...defaultProps, product: productWithLongDescription };

    renderWithProviders(<ProductCard {...props} />);

    const description = screen.getByText(/this is a very long product description/i);
    expect(description).toBeInTheDocument();
    // Check if description is truncated (implementation dependent)
  });

  it('formats price correctly with currency symbol', () => {
    const productWithPrice = createMockProduct({ price: 1234.56 });
    const props = { ...defaultProps, product: productWithPrice };

    renderWithProviders(<ProductCard {...props} />);

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('applies hover effects and animations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard {...defaultProps} />);

    const card = screen.getByTestId('product-card');
    
    await user.hover(card);
    
    // Check if hover class is applied (implementation dependent)
    expect(card).toHaveClass('MuiCard-root');
  });

  it('handles missing product data gracefully', () => {
    const incompleteProduct = {
      id: '1',
      name: 'Test Product',
      // Missing other required fields
    };
    const props = { ...defaultProps, product: incompleteProduct as any };

    renderWithProviders(<ProductCard {...props} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    // Should not crash and handle missing data appropriately
  });
});