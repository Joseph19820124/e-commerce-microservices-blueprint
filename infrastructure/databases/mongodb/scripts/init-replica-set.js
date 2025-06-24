// MongoDB Replica Set Initialization Script
// This script initializes the replica set for the e-commerce platform

// Wait for MongoDB to be ready
sleep(5000);

// Initialize replica set configuration
var config = {
    "_id": "rs0",
    "members": [
        {
            "_id": 0,
            "host": "mongodb-primary:27017",
            "priority": 2
        },
        {
            "_id": 1,
            "host": "mongodb-secondary1:27017",
            "priority": 1
        },
        {
            "_id": 2,
            "host": "mongodb-secondary2:27017",
            "priority": 1
        }
    ]
};

// Initialize the replica set
try {
    rs.initiate(config);
    print("Replica set initialized successfully");
} catch (error) {
    print("Error initializing replica set: " + error);
}

// Wait for replica set to be ready
sleep(10000);

// Create application databases and users
db = db.getSiblingDB('admin');

// Create product database and user
db.createUser({
    user: "product_service",
    pwd: "product_service_password",
    roles: [
        {
            role: "readWrite",
            db: "products_db"
        }
    ]
});

// Create cart database and user (for session storage)
db.createUser({
    user: "cart_service",
    pwd: "cart_service_password",
    roles: [
        {
            role: "readWrite",
            db: "cart_sessions_db"
        }
    ]
});

// Switch to products database and create collections
db = db.getSiblingDB('products_db');

// Create products collection with indexes
db.createCollection("products");
db.products.createIndex({ "name": "text", "description": "text" });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "price": 1 });
db.products.createIndex({ "brand": 1 });
db.products.createIndex({ "tags": 1 });
db.products.createIndex({ "createdAt": 1 });
db.products.createIndex({ "updatedAt": 1 });

// Create categories collection
db.createCollection("categories");
db.categories.createIndex({ "name": 1 }, { unique: true });
db.categories.createIndex({ "slug": 1 }, { unique: true });

// Create brands collection
db.createCollection("brands");
db.brands.createIndex({ "name": 1 }, { unique: true });
db.brands.createIndex({ "slug": 1 }, { unique: true });

// Create inventory collection
db.createCollection("inventory");
db.inventory.createIndex({ "productId": 1 }, { unique: true });
db.inventory.createIndex({ "warehouse": 1 });
db.inventory.createIndex({ "quantity": 1 });

// Insert sample data
db.categories.insertMany([
    {
        _id: ObjectId(),
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: ObjectId(),
        name: "Clothing",
        slug: "clothing",
        description: "Men's and women's clothing",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: ObjectId(),
        name: "Books",
        slug: "books",
        description: "Physical and digital books",
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

db.brands.insertMany([
    {
        _id: ObjectId(),
        name: "TechCorp",
        slug: "techcorp",
        description: "Leading technology brand",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: ObjectId(),
        name: "FashionPlus",
        slug: "fashionplus",
        description: "Premium fashion brand",
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

// Switch to cart sessions database
db = db.getSiblingDB('cart_sessions_db');

// Create cart sessions collection
db.createCollection("cart_sessions");
db.cart_sessions.createIndex({ "sessionId": 1 }, { unique: true });
db.cart_sessions.createIndex({ "userId": 1 });
db.cart_sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.cart_sessions.createIndex({ "createdAt": 1 });
db.cart_sessions.createIndex({ "updatedAt": 1 });

print("Database initialization completed successfully");
print("Created databases: products_db, cart_sessions_db");
print("Created users: product_service, cart_service");
print("Created indexes for optimal query performance");