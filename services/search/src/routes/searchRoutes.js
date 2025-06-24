const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { validateSearch, validateAutocomplete } = require('../middleware/validation');

router.get('/', validateSearch, searchController.search);
router.get('/autocomplete', validateAutocomplete, searchController.autocomplete);
router.get('/aggregations', searchController.getAggregations);

router.post('/reindex', searchController.reindex);
router.post('/products/:productId', searchController.indexProduct);
router.put('/products/:productId', searchController.updateProduct);
router.delete('/products/:productId', searchController.deleteProduct);

module.exports = router;