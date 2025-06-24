const elasticsearchClient = require('./elasticsearchClient');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.client = null;
    this.indexName = null;
  }

  async initialize() {
    this.client = elasticsearchClient.getClient();
    this.indexName = elasticsearchClient.getIndexName();
  }

  async search(query, filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '_score:desc'
      } = options;

      const from = (page - 1) * limit;
      const [sortField, sortOrder] = sort.split(':');

      const body = {
        query: this.buildQuery(query, filters),
        sort: this.buildSort(sortField, sortOrder),
        aggs: this.buildAggregations(),
        from,
        size: limit,
        highlight: {
          fields: {
            name: {},
            description: {}
          }
        }
      };

      const response = await this.client.search({
        index: this.indexName,
        body
      });

      return this.formatSearchResponse(response.body, page, limit);
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  buildQuery(query, filters) {
    const must = [];
    const filter = [];

    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'name^3',
            'description^2',
            'brand^2',
            'category',
            'tags'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    filter.push({ term: { status: 'active' } });

    if (filters.category) {
      filter.push({ term: { category: filters.category } });
    }

    if (filters.subcategory) {
      filter.push({ term: { subcategory: filters.subcategory } });
    }

    if (filters.brand) {
      if (Array.isArray(filters.brand)) {
        filter.push({ terms: { brand: filters.brand } });
      } else {
        filter.push({ term: { brand: filters.brand } });
      }
    }

    if (filters.minPrice || filters.maxPrice) {
      const range = {};
      if (filters.minPrice) range.gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) range.lte = parseFloat(filters.maxPrice);
      filter.push({ range: { price: range } });
    }

    if (filters.minRating) {
      filter.push({
        range: {
          'rating.average': { gte: parseFloat(filters.minRating) }
        }
      });
    }

    if (filters.inStock) {
      filter.push({ range: { stock: { gt: 0 } } });
    }

    return {
      bool: {
        must,
        filter
      }
    };
  }

  buildSort(sortField, sortOrder = 'desc') {
    const sortMap = {
      price: { price: { order: sortOrder } },
      rating: { 'rating.average': { order: sortOrder } },
      name: { 'name.keyword': { order: sortOrder } },
      created: { createdAt: { order: sortOrder } },
      _score: { _score: { order: sortOrder } }
    };

    return sortMap[sortField] || sortMap._score;
  }

  buildAggregations() {
    return {
      categories: {
        terms: { field: 'category', size: 10 }
      },
      subcategories: {
        terms: { field: 'subcategory', size: 20 }
      },
      brands: {
        terms: { field: 'brand', size: 20 }
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 25, key: 'Under $25' },
            { from: 25, to: 50, key: '$25 - $50' },
            { from: 50, to: 100, key: '$50 - $100' },
            { from: 100, to: 250, key: '$100 - $250' },
            { from: 250, key: 'Over $250' }
          ]
        }
      },
      rating_ranges: {
        range: {
          field: 'rating.average',
          ranges: [
            { from: 4, key: '4+ stars' },
            { from: 3, to: 4, key: '3-4 stars' },
            { from: 2, to: 3, key: '2-3 stars' },
            { to: 2, key: 'Under 2 stars' }
          ]
        }
      }
    };
  }

  formatSearchResponse(response, page, limit) {
    const hits = response.hits.hits.map(hit => ({
      ...hit._source,
      _id: hit._id,
      _score: hit._score,
      highlight: hit.highlight
    }));

    return {
      products: hits,
      total: response.hits.total.value,
      page,
      limit,
      pages: Math.ceil(response.hits.total.value / limit),
      aggregations: this.formatAggregations(response.aggregations)
    };
  }

  formatAggregations(aggs) {
    const formatted = {};
    
    Object.keys(aggs).forEach(key => {
      if (aggs[key].buckets) {
        formatted[key] = aggs[key].buckets.map(bucket => ({
          key: bucket.key,
          count: bucket.doc_count
        }));
      }
    });

    return formatted;
  }

  async autocomplete(query, limit = 10) {
    try {
      const body = {
        suggest: {
          product_suggest: {
            prefix: query,
            completion: {
              field: 'name.suggest',
              size: limit
            }
          }
        }
      };

      const response = await this.client.search({
        index: this.indexName,
        body
      });

      const suggestions = response.body.suggest.product_suggest[0].options.map(
        option => ({
          text: option.text,
          score: option._score,
          source: option._source
        })
      );

      return suggestions;
    } catch (error) {
      logger.error('Autocomplete error:', error);
      throw error;
    }
  }

  async indexProduct(product) {
    try {
      await this.client.index({
        index: this.indexName,
        id: product._id,
        body: {
          ...product,
          suggest: {
            input: [
              product.name,
              product.brand,
              ...product.tags || []
            ]
          }
        },
        refresh: 'wait_for'
      });

      logger.info(`Product indexed: ${product._id}`);
    } catch (error) {
      logger.error('Product indexing error:', error);
      throw error;
    }
  }

  async updateProduct(productId, product) {
    try {
      await this.client.update({
        index: this.indexName,
        id: productId,
        body: {
          doc: {
            ...product,
            suggest: {
              input: [
                product.name,
                product.brand,
                ...product.tags || []
              ]
            }
          }
        },
        refresh: 'wait_for'
      });

      logger.info(`Product updated in index: ${productId}`);
    } catch (error) {
      logger.error('Product update error:', error);
      throw error;
    }
  }

  async deleteProduct(productId) {
    try {
      await this.client.delete({
        index: this.indexName,
        id: productId,
        refresh: 'wait_for'
      });

      logger.info(`Product deleted from index: ${productId}`);
    } catch (error) {
      logger.error('Product deletion error:', error);
      throw error;
    }
  }

  async bulkIndex(products) {
    try {
      const body = products.flatMap(product => [
        {
          index: {
            _index: this.indexName,
            _id: product._id
          }
        },
        {
          ...product,
          suggest: {
            input: [
              product.name,
              product.brand,
              ...product.tags || []
            ]
          }
        }
      ]);

      const response = await this.client.bulk({
        body,
        refresh: 'wait_for'
      });

      if (response.body.errors) {
        logger.error('Bulk indexing errors:', response.body.items);
      } else {
        logger.info(`Bulk indexed ${products.length} products`);
      }

      return response.body;
    } catch (error) {
      logger.error('Bulk indexing error:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();