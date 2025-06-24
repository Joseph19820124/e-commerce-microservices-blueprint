require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { connectRedis } = require('./services/redisClient');
const cartRoutes = require('./routes/cartRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/cart', cartRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'shopping-cart',
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
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info(`Shopping Cart Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();