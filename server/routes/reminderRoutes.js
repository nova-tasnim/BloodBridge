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
| Native Donor or Patient-donor:
| own reminder.
|
| Staff:
| may inspect donor eligibility.
|
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
| Read saved Reminder from MongoDB
|--------------------------------------------------------------------------
*/

router.get(
  '/donor/:donorId',

  donorOwnerOrRoles(
    'donorId',
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  reminderController
    .getReminderForDonor
);


/*
|--------------------------------------------------------------------------
| Create / refresh own reminder
|--------------------------------------------------------------------------
|
| Donor owner:
| yes
|
| Admin:
| may create for another donor
|
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
| Staff management
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