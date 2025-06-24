const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

class ElasticsearchClient {
  constructor() {
    this.client = null;
    this.indexName = process.env.INDEX_NAME || 'products';
  }

  async connect() {
    try {
      const config = {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
      };

      if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
        config.auth = {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        };
      }

      this.client = new Client(config);

      const health = await this.client.cluster.health();
      logger.info('Connected to Elasticsearch:', health.body.status);

      await this.ensureIndex();
      return this.client;
    } catch (error) {
      logger.error('Elasticsearch connection error:', error);
      throw error;
    }
  }

  async ensureIndex() {
    try {
      const { body: exists } = await this.client.indices.exists({
        index: this.indexName
      });

      if (!exists) {
        await this.createIndex();
      }
    } catch (error) {
      logger.error('Error ensuring index:', error);
      throw error;
    }
  }

  async createIndex() {
    try {
      const mapping = {
        mappings: {
          properties: {
            name: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
                suggest: {
                  type: 'completion',
                  analyzer: 'simple'
                }
              }
            },
            description: {
              type: 'text',
              analyzer: 'standard'
            },
            category: {
              type: 'keyword',
              fields: {
                text: { type: 'text' }
              }
            },
            subcategory: {
              type: 'keyword',
              fields: {
                text: { type: 'text' }
              }
            },
            brand: {
              type: 'keyword',
              fields: {
                text: { type: 'text' }
              }
            },
            price: { type: 'float' },
            sku: { type: 'keyword' },
            stock: { type: 'integer' },
            status: { type: 'keyword' },
            tags: { type: 'keyword' },
            attributes: { type: 'object' },
            rating: {
              properties: {
                average: { type: 'float' },
                count: { type: 'integer' }
              }
            },
            images: {
              properties: {
                url: { type: 'keyword' },
                alt: { type: 'text' },
                isPrimary: { type: 'boolean' }
              }
            },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        },
        settings: {
          analysis: {
            analyzer: {
              autocomplete: {
                tokenizer: 'autocomplete',
                filter: ['lowercase']
              },
              autocomplete_search: {
                tokenizer: 'keyword',
                filter: ['lowercase']
              }
            },
            tokenizer: {
              autocomplete: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 10,
                token_chars: ['letter', 'digit']
              }
            }
          }
        }
      };

      await this.client.indices.create({
        index: this.indexName,
        body: mapping
      });

      logger.info(`Index ${this.indexName} created successfully`);
    } catch (error) {
      logger.error('Error creating index:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }
    return this.client;
  }

  getIndexName() {
    return this.indexName;
  }
}

module.exports = new ElasticsearchClient();