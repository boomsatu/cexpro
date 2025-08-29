const Cryptocurrency = require('../models/Cryptocurrency');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * Admin Cryptocurrency Controller
 * Mengelola operasi CRUD untuk cryptocurrency
 */

/**
 * Get all cryptocurrencies
 */
const getCryptocurrencies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      is_active,
      is_fiat,
      sort_by = 'symbol',
      sort_order = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Apply filters
    if (search) {
      whereClause[Op.or] = [
        { symbol: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    if (is_fiat !== undefined) {
      whereClause.is_fiat = is_fiat === 'true';
    }

    // Get cryptocurrencies with pagination
    const { count, rows: cryptocurrencies } = await Cryptocurrency.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        cryptocurrencies,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get cryptocurrencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cryptocurrencies',
      code: 'GET_CRYPTOCURRENCIES_FAILED'
    });
  }
};

/**
 * Get cryptocurrency by ID
 */
const getCryptocurrencyById = async (req, res) => {
  try {
    const { id } = req.params;

    const cryptocurrency = await Cryptocurrency.findByPk(id);

    if (!cryptocurrency) {
      return res.status(404).json({
        success: false,
        error: 'Cryptocurrency not found',
        code: 'CRYPTOCURRENCY_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: cryptocurrency
    });
  } catch (error) {
    logger.error('Get cryptocurrency by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cryptocurrency details',
      code: 'GET_CRYPTOCURRENCY_FAILED'
    });
  }
};

/**
 * Create new cryptocurrency
 */
const createCryptocurrency = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      symbol,
      name,
      full_name,
      decimals = 8,
      contract_address,
      blockchain,
      is_active = true,
      is_fiat = false,
      min_deposit = 0,
      min_withdrawal = 0,
      withdrawal_fee = 0,
      confirmation_blocks = 6,
      logo_url,
      website_url,
      explorer_url
    } = req.body;

    // Check if cryptocurrency with same symbol already exists
    const existingCrypto = await Cryptocurrency.findOne({
      where: { symbol: symbol.toUpperCase() }
    });

    if (existingCrypto) {
      return res.status(400).json({
        success: false,
        error: 'Cryptocurrency with this symbol already exists',
        code: 'CRYPTOCURRENCY_EXISTS'
      });
    }

    // Create cryptocurrency
    const cryptocurrency = await Cryptocurrency.create({
      symbol: symbol.toUpperCase(),
      name,
      full_name,
      decimals,
      contract_address,
      blockchain,
      is_active,
      is_fiat,
      min_deposit,
      min_withdrawal,
      withdrawal_fee,
      confirmation_blocks,
      logo_url,
      website_url,
      explorer_url
    });

    // Log the action
    logger.info(`Cryptocurrency created by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      cryptocurrency_id: cryptocurrency.id,
      symbol: cryptocurrency.symbol,
      name: cryptocurrency.name
    });

    res.status(201).json({
      success: true,
      message: 'Cryptocurrency created successfully',
      data: cryptocurrency
    });
  } catch (error) {
    logger.error('Create cryptocurrency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cryptocurrency',
      code: 'CREATE_CRYPTOCURRENCY_FAILED'
    });
  }
};

/**
 * Update cryptocurrency
 */
const updateCryptocurrency = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Find cryptocurrency
    const cryptocurrency = await Cryptocurrency.findByPk(id);
    if (!cryptocurrency) {
      return res.status(404).json({
        success: false,
        error: 'Cryptocurrency not found',
        code: 'CRYPTOCURRENCY_NOT_FOUND'
      });
    }

    // If symbol is being updated, check for duplicates
    if (updateData.symbol && updateData.symbol.toUpperCase() !== cryptocurrency.symbol) {
      const existingCrypto = await Cryptocurrency.findOne({
        where: {
          symbol: updateData.symbol.toUpperCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingCrypto) {
        return res.status(400).json({
          success: false,
          error: 'Cryptocurrency with this symbol already exists',
          code: 'CRYPTOCURRENCY_EXISTS'
        });
      }

      updateData.symbol = updateData.symbol.toUpperCase();
    }

    // Update cryptocurrency
    await cryptocurrency.update(updateData);

    // Log the action
    logger.info(`Cryptocurrency updated by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      cryptocurrency_id: cryptocurrency.id,
      symbol: cryptocurrency.symbol,
      changes: updateData
    });

    res.json({
      success: true,
      message: 'Cryptocurrency updated successfully',
      data: cryptocurrency
    });
  } catch (error) {
    logger.error('Update cryptocurrency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cryptocurrency',
      code: 'UPDATE_CRYPTOCURRENCY_FAILED'
    });
  }
};

/**
 * Delete cryptocurrency
 */
const deleteCryptocurrency = async (req, res) => {
  try {
    const { id } = req.params;

    // Find cryptocurrency
    const cryptocurrency = await Cryptocurrency.findByPk(id);
    if (!cryptocurrency) {
      return res.status(404).json({
        success: false,
        error: 'Cryptocurrency not found',
        code: 'CRYPTOCURRENCY_NOT_FOUND'
      });
    }

    // Check if cryptocurrency is being used in trading pairs
    // This would require checking TradingPair model if it exists
    // For now, we'll just deactivate instead of delete
    await cryptocurrency.update({ is_active: false });

    // Log the action
    logger.info(`Cryptocurrency deactivated by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      cryptocurrency_id: cryptocurrency.id,
      symbol: cryptocurrency.symbol
    });

    res.json({
      success: true,
      message: 'Cryptocurrency deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete cryptocurrency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cryptocurrency',
      code: 'DELETE_CRYPTOCURRENCY_FAILED'
    });
  }
};

/**
 * Toggle cryptocurrency status
 */
const toggleCryptocurrencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Find cryptocurrency
    const cryptocurrency = await Cryptocurrency.findByPk(id);
    if (!cryptocurrency) {
      return res.status(404).json({
        success: false,
        error: 'Cryptocurrency not found',
        code: 'CRYPTOCURRENCY_NOT_FOUND'
      });
    }

    // Update status
    await cryptocurrency.update({ is_active });

    // Log the action
    logger.info(`Cryptocurrency status toggled by admin: ${req.admin.username}`, {
      admin_id: req.admin.id,
      cryptocurrency_id: cryptocurrency.id,
      symbol: cryptocurrency.symbol,
      new_status: is_active
    });

    res.json({
      success: true,
      message: `Cryptocurrency ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: cryptocurrency.id,
        symbol: cryptocurrency.symbol,
        is_active
      }
    });
  } catch (error) {
    logger.error('Toggle cryptocurrency status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle cryptocurrency status',
      code: 'TOGGLE_CRYPTOCURRENCY_STATUS_FAILED'
    });
  }
};

module.exports = {
  getCryptocurrencies,
  getCryptocurrencyById,
  createCryptocurrency,
  updateCryptocurrency,
  deleteCryptocurrency,
  toggleCryptocurrencyStatus
};