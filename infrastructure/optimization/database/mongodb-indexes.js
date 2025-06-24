// MongoDB Index Optimization Script
// Run this script to create optimized indexes for the e-commerce platform

const MongoClient = require('mongodb').MongoClient;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ecommerce';

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Products Collection Indexes
    console.log('\n📦 Creating indexes for products collection...');
    const products = db.collection('products');
    
    // Primary indexes
    await products.createIndex({ sku: 1 }, { unique: true, background: true });
    await products.createIndex({ name: 'text', description: 'text' }, { 
      weights: { name: 10, description: 5 },
      background: true 
    });
    await products.createIndex({ category: 1, status: 1 }, { background: true });
    await products.createIndex({ price: 1, status: 1 }, { background: true });
    await products.createIndex({ createdAt: -1 }, { background: true });
    await products.createIndex({ 'inventory.quantity': 1, status: 1 }, { background: true });
    
    // Compound indexes for common queries
    await products.createIndex({ 
      category: 1, 
      'attributes.brand': 1, 
      price: 1 
    }, { background: true });
    
    await products.createIndex({ 
      status: 1, 
      'inventory.quantity': 1, 
      popularity: -1 
    }, { background: true });
    
    // TTL index for product views tracking
    await products.createIndex({ 
      'analytics.lastViewed': 1 
    }, { 
      expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
      background: true 
    });
    
    console.log('✅ Product indexes created successfully');
    
    // Users Collection Indexes
    console.log('\n👤 Creating indexes for users collection...');
    const users = db.collection('users');
    
    await users.createIndex({ email: 1 }, { unique: true, background: true });
    await users.createIndex({ username: 1 }, { unique: true, sparse: true, background: true });
    await users.createIndex({ 'profile.phone': 1 }, { sparse: true, background: true });
    await users.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await users.createIndex({ 'auth.lastLogin': -1 }, { background: true });
    await users.createIndex({ 'auth.resetToken': 1 }, { sparse: true, background: true });
    
    // Geospatial index for user locations
    await users.createIndex({ 'address.location': '2dsphere' }, { sparse: true, background: true });
    
    console.log('✅ User indexes created successfully');
    
    // Orders Collection Indexes
    console.log('\n📋 Creating indexes for orders collection...');
    const orders = db.collection('orders');
    
    await orders.createIndex({ orderNumber: 1 }, { unique: true, background: true });
    await orders.createIndex({ userId: 1, createdAt: -1 }, { background: true });
    await orders.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await orders.createIndex({ 'payment.status': 1, createdAt: -1 }, { background: true });
    await orders.createIndex({ 'shipping.trackingNumber': 1 }, { sparse: true, background: true });
    await orders.createIndex({ 'items.productId': 1 }, { background: true });
    
    // Compound index for order analytics
    await orders.createIndex({ 
      userId: 1, 
      status: 1, 
      'payment.status': 1, 
      createdAt: -1 
    }, { background: true });
    
    console.log('✅ Order indexes created successfully');
    
    // Shopping Carts Collection Indexes
    console.log('\n🛒 Creating indexes for carts collection...');
    const carts = db.collection('carts');
    
    await carts.createIndex({ userId: 1 }, { unique: true, background: true });
    await carts.createIndex({ sessionId: 1 }, { sparse: true, background: true });
    await carts.createIndex({ updatedAt: 1 }, { 
      expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days for abandoned carts
      background: true 
    });
    await carts.createIndex({ 'items.productId': 1 }, { background: true });
    
    console.log('✅ Cart indexes created successfully');
    
    // Reviews Collection Indexes
    console.log('\n⭐ Creating indexes for reviews collection...');
    const reviews = db.collection('reviews');
    
    await reviews.createIndex({ productId: 1, userId: 1 }, { unique: true, background: true });
    await reviews.createIndex({ productId: 1, rating: -1, createdAt: -1 }, { background: true });
    await reviews.createIndex({ userId: 1, createdAt: -1 }, { background: true });
    await reviews.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await reviews.createIndex({ helpful: -1, createdAt: -1 }, { background: true });
    
    console.log('✅ Review indexes created successfully');
    
    // Analytics Collection Indexes
    console.log('\n📊 Creating indexes for analytics collection...');
    const analytics = db.collection('analytics');
    
    await analytics.createIndex({ eventType: 1, timestamp: -1 }, { background: true });
    await analytics.createIndex({ userId: 1, eventType: 1, timestamp: -1 }, { background: true });
    await analytics.createIndex({ sessionId: 1, timestamp: -1 }, { background: true });
    await analytics.createIndex({ 'data.productId': 1, timestamp: -1 }, { background: true });
    await analytics.createIndex({ timestamp: 1 }, { 
      expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days retention
      background: true 
    });
    
    console.log('✅ Analytics indexes created successfully');
    
    // Get index statistics
    console.log('\n📈 Index Statistics:');
    const collections = ['products', 'users', 'orders', 'carts', 'reviews', 'analytics'];
    
    for (const collName of collections) {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();
      const stats = await coll.stats();
      
      console.log(`\n${collName}:`);
      console.log(`  Total indexes: ${indexes.length}`);
      console.log(`  Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Collection size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Index optimization complete!');
  }
}

// Run the script
createIndexes().catch(console.error);

// Export for use in other scripts
module.exports = { createIndexes };