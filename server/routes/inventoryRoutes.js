const express =
  require('express');

const router =
  express.Router();

const {
  addInventory,
  getInventory,
  getInventoryById,
  updateInventory,
  consumeInventory,
  deleteInventory,
  getSummary,
  getInventoryAlerts
} =
  require(
    '../controllers/inventoryController'
  );

const {
  protect,
  authorize
} =
  require('../middleware/auth');

router.use(protect);

/*
|--------------------------------------------------------------------------
| Inventory access
|--------------------------------------------------------------------------
|
| BloodBank:
| - manage own inventory
|
| Hospital:
| - read-only inventory access
|
| Admin:
| - global inventory management
|
*/

router.use(
  authorize(
    'BloodBank',
    'Hospital',
    'Admin'
  )
);

/*
|--------------------------------------------------------------------------
| Summary / alerts
|--------------------------------------------------------------------------
*/

router.get(
  '/summary/me',

  authorize(
    'BloodBank',
    'Admin'
  ),

  getSummary
);

router.get(
  '/alerts/me',

  authorize(
    'BloodBank',
    'Admin'
  ),

  getInventoryAlerts
);

router.get(
  '/bank/:bloodBankId/summary',

  getSummary
);

router.get(
  '/bank/:bloodBankId/alerts',

  getInventoryAlerts
);

/*
|--------------------------------------------------------------------------
| Inventory collection
|--------------------------------------------------------------------------
*/

router
  .route('/')
  .post(
    authorize(
      'BloodBank',
      'Admin'
    ),

    addInventory
  )
  .get(
    getInventory
  );

/*
|--------------------------------------------------------------------------
| Consume / issue blood
|--------------------------------------------------------------------------
|
| Hospital is intentionally excluded.
|
*/

router.patch(
  '/:id/consume',

  authorize(
    'BloodBank',
    'Admin'
  ),

  consumeInventory
);

/*
|--------------------------------------------------------------------------
| Individual inventory item
|--------------------------------------------------------------------------
*/

router
  .route('/:id')
  .get(
    getInventoryById
  )
  .put(
    authorize(
      'BloodBank',
      'Admin'
    ),

    updateInventory
  )
  .delete(
    authorize(
      'BloodBank',
      'Admin'
    ),

    deleteInventory
  );

module.exports =
  router;