const express = require('express');
const { query } = require('express-validator');
const { validate, paginationValidator } = require('../middlewares/validators');
const searchController = require('../controllers/search.controller');

const router = express.Router();

/**
 * @route   GET /api/v1/search
 * @desc    Recherche globale (restaurants + plats)
 * @access  Public
 */
router.get(
  '/',
  [
    query('q').optional().trim().isLength({ min: 1, max: 100 }),
    query('category').optional().trim(),
    query('cuisine_type').optional().trim(),
    query('latitude').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    query('longitude').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    query('min_rating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
    query('min_price').optional().isFloat({ min: 0 }).toFloat(),
    query('max_price').optional().isFloat({ min: 0 }).toFloat(),
    query('max_delivery_time').optional().isFloat({ min: 1 }).toFloat(),
    query('free_delivery').optional().isBoolean().toBoolean(),
    query('promotions').optional().isBoolean().toBoolean(),
    query('mobile_money').optional().isBoolean().toBoolean(),
    query('new_restaurants').optional().isBoolean().toBoolean(),
    query('tags').optional(),
    query('sort').optional().isIn(['distance', 'rating', 'popularity', 'newest']),
    ...paginationValidator,
  ],
  validate,
  searchController.search
);

module.exports = router;
