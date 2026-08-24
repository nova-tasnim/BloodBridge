const express =
  require('express');

const router =
  express.Router();

const reminderController =
  require(
    '../controllers/reminderController'
  );

const {
  protect,
  authorize,
  donorOwnerOrRoles
} =
  require('../middleware/auth');

router.use(
  protect
);

/*
|--------------------------------------------------------------------------
| Donor eligibility
|--------------------------------------------------------------------------
|
| Owner can view their own eligibility.
| Hospital / BloodBank / Admin may view another donor.
|
| donorOwnerOrRoles supports:
| - User._id
| - native DON-XXXXXX
| - Patient-donor DON-XXXXXX
|
|--------------------------------------------------------------------------
*/

router.get(
  '/donor/:donorId/next-eligible',

  donorOwnerOrRoles(
    'donorId',
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  reminderController
    .getNextEligibleDate
);

/*
|--------------------------------------------------------------------------
| Create / refresh reminder
|--------------------------------------------------------------------------
|
| Donor owner can create their own reminder.
| Admin may create one for another donor.
|
|--------------------------------------------------------------------------
*/

router.post(
  '/donor/:donorId',

  donorOwnerOrRoles(
    'donorId',
    'Admin'
  ),

  reminderController
    .createReminder
);

/*
|--------------------------------------------------------------------------
| Staff reminder management
|--------------------------------------------------------------------------
*/

router.get(
  '/due',

  authorize(
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  reminderController
    .getDueReminders
);

router.patch(
  '/:reminderId/sent',

  authorize(
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  reminderController
    .markReminderSent
);

module.exports =
  router;