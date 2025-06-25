describe('Product Browsing User Journey', () => {
  beforeEach(() => {
    // Clear database and seed with test data
    cy.task('clearDatabase');
    cy.task('seedDatabase');
    
    // Visit the homepage
    cy.visit('/');
  });

  describe('Homepage Product Display', () => {
    it('should display featured products on homepage', () => {
      cy.get('[data-cy=featured-products]').should('be.visible');
      cy.get('[data-cy=product-card]').should('have.length.greaterThan', 0);
      
      // Check product card elements
      cy.get('[data-cy=product-card]').first().within(() => {
        cy.get('[data-cy=product-image]').should('be.visible');
        cy.get('[data-cy=product-name]').should('be.visible');
        cy.get('[data-cy=product-price]').should('be.visible');
        cy.get('[data-cy=add-to-cart-btn]').should('be.visible');
      });
    });

    it('should navigate to product details when clicking on product', () => {
      cy.get('[data-cy=product-card]').first().click();
      cy.url().should('include', '/products/');
      cy.get('[data-cy=product-details]').should('be.visible');
    });

    it('should show loading state while fetching products', () => {
      cy.intercept('GET', '/api/products*', { delay: 1000 }).as('getProducts');
      cy.visit('/');
      cy.get('[data-cy=loading-spinner]').should('be.visible');
      cy.wait('@getProducts');
      cy.get('[data-cy=loading-spinner]').should('not.exist');
    });
  });

  describe('Product Categories', () => {
    it('should display product categories', () => {
      cy.get('[data-cy=category-nav]').should('be.visible');
      cy.get('[data-cy=category-item]').should('have.length.greaterThan', 0);
    });

    it('should filter products by category', () => {
      cy.get('[data-cy=category-item]').contains('Electronics').click();
      cy.url().should('include', 'category=Electronics');
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).should('contain', 'Electronics');
      });
    });

    it('should show no products message for empty category', () => {
      cy.intercept('GET', '/api/products*', { body: { success: true, data: [], pagination: { total: 0 } } }).as('getEmptyProducts');
      cy.get('[data-cy=category-item]').first().click();
      cy.wait('@getEmptyProducts');
      cy.get('[data-cy=no-products-message]').should('be.visible');
    });
  });

  describe('Product Search', () => {
    it('should search products by name', () => {
      const searchTerm = 'iPhone';
      cy.get('[data-cy=search-input]').type(searchTerm);
      cy.get('[data-cy=search-button]').click();
      
      cy.url().should('include', `search=${searchTerm}`);
      cy.get('[data-cy=search-results]').should('be.visible');
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).should('contain.text', searchTerm);
      });
    });

    it('should show search suggestions while typing', () => {
      cy.get('[data-cy=search-input]').type('iPh');
      cy.get('[data-cy=search-suggestions]').should('be.visible');
      cy.get('[data-cy=suggestion-item]').should('have.length.greaterThan', 0);
    });

    it('should clear search when clicking clear button', () => {
      cy.get('[data-cy=search-input]').type('test search');
      cy.get('[data-cy=clear-search-btn]').click();
      cy.get('[data-cy=search-input]').should('have.value', '');
    });

    it('should handle search with no results', () => {
      cy.intercept('GET', '/api/search*', { body: { success: true, data: { hits: [] } } }).as('getNoResults');
      cy.get('[data-cy=search-input]').type('nonexistentproduct');
      cy.get('[data-cy=search-button]').click();
      cy.wait('@getNoResults');
      cy.get('[data-cy=no-results-message]').should('be.visible');
    });
  });

  describe('Product Filters', () => {
    beforeEach(() => {
      cy.visit('/products');
    });

    it('should filter products by price range', () => {
      cy.get('[data-cy=price-filter]').should('be.visible');
      cy.get('[data-cy=min-price-input]').type('100');
      cy.get('[data-cy=max-price-input]').type('500');
      cy.get('[data-cy=apply-filters-btn]').click();
      
      cy.url().should('include', 'minPrice=100');
      cy.url().should('include', 'maxPrice=500');
      
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=product-price]').then(($price) => {
          const price = parseFloat($price.text().replace('$', ''));
          expect(price).to.be.at.least(100);
          expect(price).to.be.at.most(500);
        });
      });
    });

    it('should filter products by brand', () => {
      cy.get('[data-cy=brand-filter]').should('be.visible');
      cy.get('[data-cy=brand-checkbox]').contains('Apple').check();
      cy.get('[data-cy=apply-filters-btn]').click();
      
      cy.url().should('include', 'brand=Apple');
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).should('contain', 'Apple');
      });
    });

    it('should filter products by rating', () => {
      cy.get('[data-cy=rating-filter]').should('be.visible');
      cy.get('[data-cy=rating-option]').contains('4+ stars').click();
      
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=product-rating]').then(($rating) => {
          const rating = parseFloat($rating.attr('data-rating'));
          expect(rating).to.be.at.least(4);
        });
      });
    });

    it('should clear all filters', () => {
      // Apply some filters first
      cy.get('[data-cy=min-price-input]').type('100');
      cy.get('[data-cy=brand-checkbox]').contains('Apple').check();
      cy.get('[data-cy=apply-filters-btn]').click();
      
      // Clear filters
      cy.get('[data-cy=clear-filters-btn]').click();
      cy.get('[data-cy=min-price-input]').should('have.value', '');
      cy.get('[data-cy=brand-checkbox]').should('not.be.checked');
      cy.url().should('not.include', 'minPrice');
      cy.url().should('not.include', 'brand');
    });
  });

  describe('Product Sorting', () => {
    beforeEach(() => {
      cy.visit('/products');
    });

    it('should sort products by price (low to high)', () => {
      cy.get('[data-cy=sort-dropdown]').select('price_asc');
      cy.url().should('include', 'sort=price_asc');
      
      let previousPrice = 0;
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=product-price]').then(($price) => {
          const currentPrice = parseFloat($price.text().replace('$', ''));
          expect(currentPrice).to.be.at.least(previousPrice);
          previousPrice = currentPrice;
        });
      });
    });

    it('should sort products by name (A to Z)', () => {
      cy.get('[data-cy=sort-dropdown]').select('name_asc');
      cy.url().should('include', 'sort=name_asc');
      
      const productNames = [];
      cy.get('[data-cy=product-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=product-name]').then(($name) => {
          productNames.push($name.text());
        });
      }).then(() => {
        const sortedNames = [...productNames].sort();
        expect(productNames).to.deep.equal(sortedNames);
      });
    });

    it('should sort products by popularity', () => {
      cy.get('[data-cy=sort-dropdown]').select('popularity');
      cy.url().should('include', 'sort=popularity');
      cy.get('[data-cy=product-card]').should('be.visible');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      cy.visit('/products');
    });

    it('should navigate through pages', () => {
      cy.get('[data-cy=pagination]').should('be.visible');
      cy.get('[data-cy=next-page-btn]').click();
      cy.url().should('include', 'page=2');
      cy.get('[data-cy=page-info]').should('contain', 'Page 2');
      
      cy.get('[data-cy=prev-page-btn]').click();
      cy.url().should('include', 'page=1');
      cy.get('[data-cy=page-info]').should('contain', 'Page 1');
    });

    it('should change items per page', () => {
      cy.get('[data-cy=items-per-page-select]').select('24');
      cy.url().should('include', 'limit=24');
      cy.get('[data-cy=product-card]').should('have.length.at.most', 24);
    });

    it('should disable navigation buttons appropriately', () => {
      cy.get('[data-cy=prev-page-btn]').should('be.disabled');
      
      // Go to last page
      cy.get('[data-cy=pagination-info]').then(($info) => {
        const totalPages = parseInt($info.text().match(/of (\d+)/)[1]);
        if (totalPages > 1) {
          cy.get('[data-cy=page-number]').contains(totalPages).click();
          cy.get('[data-cy=next-page-btn]').should('be.disabled');
        }
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should display mobile navigation', () => {
      cy.visit('/');
      cy.get('[data-cy=mobile-menu-btn]').should('be.visible');
      cy.get('[data-cy=mobile-menu-btn]').click();
      cy.get('[data-cy=mobile-nav]').should('be.visible');
    });

    it('should show products in mobile grid layout', () => {
      cy.visit('/products');
      cy.get('[data-cy=product-grid]').should('have.class', 'mobile-grid');
      cy.get('[data-cy=product-card]').should('be.visible');
    });

    it('should display mobile-friendly filters', () => {
      cy.visit('/products');
      cy.get('[data-cy=mobile-filter-btn]').click();
      cy.get('[data-cy=mobile-filter-drawer]').should('be.visible');
      cy.get('[data-cy=close-filter-btn]').click();
      cy.get('[data-cy=mobile-filter-drawer]').should('not.be.visible');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should be navigable by keyboard', () => {
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'skip-to-main');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'search-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'search-button');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-cy=search-input]').should('have.attr', 'aria-label');
      cy.get('[data-cy=product-card]').should('have.attr', 'role', 'button');
      cy.get('[data-cy=add-to-cart-btn]').should('have.attr', 'aria-label');
    });

    it('should announce page changes to screen readers', () => {
      cy.get('[data-cy=category-item]').first().click();
      cy.get('[aria-live="polite"]').should('contain', 'Products updated');
    });
  });
});