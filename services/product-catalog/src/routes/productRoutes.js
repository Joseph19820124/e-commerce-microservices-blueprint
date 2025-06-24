const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const imageController = require('../controllers/imageController');
const upload = require('../middleware/upload');
const { validateProduct, validateProductUpdate } = require('../middleware/validation');

router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);
router.post('/', validateProduct, productController.createProduct);
router.put('/:id', validateProductUpdate, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.patch('/:id/stock', productController.updateStock);

router.post('/:productId/images', upload.single('image'), imageController.uploadProductImage);
router.delete('/:productId/images/:imageId', imageController.deleteProductImage);

module.exports = router;