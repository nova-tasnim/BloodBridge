const express =
  require('express');

const router =
  express.Router();

const {
  getResources,
  getAllTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation
} =
  require('../controllers/translationController');

const {
  protect,
  authorize
} =
  require('../middleware/auth');

/*
|--------------------------------------------------------------------------
| Public read endpoint
|--------------------------------------------------------------------------
|
| Login/register pages need translation resources before authentication.
|--------------------------------------------------------------------------
*/

router.get(
  '/resources',
  getResources
);

/*
|--------------------------------------------------------------------------
| Admin Translation Management
|--------------------------------------------------------------------------
*/

router.use(
  protect
);

router.use(
  authorize('Admin')
);

router.get(
  '/',
  getAllTranslations
);

router.post(
  '/',
  createTranslation
);

router.put(
  '/:id',
  updateTranslation
);

router.delete(
  '/:id',
  deleteTranslation
);

module.exports =
  router;