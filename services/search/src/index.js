require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const elasticsearchClient = require('./services/elasticsearchClient');
const searchService = require('./services/searchService');
const searchRoutes = require('./routes/searchRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/search', searchRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'search',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

const startServer = async () => {
  try {
    await elasticsearchClient.connect();
    await searchService.initialize();
    
    app.listen(PORT, () => {
      logger.info(`Search Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();