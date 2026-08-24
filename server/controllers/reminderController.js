const Reminder =
  require('../models/Reminder');

const {
  resolveDonor,
  normalizeDonor
} =
  require('../services/donorIdentityService');

const {
  checkEligibility
} =
  require('../services/eligibilityService');

/*
|--------------------------------------------------------------------------
| Resolve + normalize donor
|--------------------------------------------------------------------------
|
| Reminder logic should never care whether the donor is:
|
| role = Donor
|
| OR
|
| role = Patient + donorProfile
|
|--------------------------------------------------------------------------
*/

async function getResolvedDonor(
  identifier
) {
  const user =
    await resolveDonor(
      identifier
    );

  if (!user) {
    return null;
  }

  return {
    user,

    donor:
      normalizeDonor(user)
  };
}

/*
|--------------------------------------------------------------------------
| GET next eligibility
|--------------------------------------------------------------------------
*/

exports.getNextEligibleDate =
  async (
    req,
    res
  ) => {
    try {
      const resolved =
        await getResolvedDonor(
          req.params.donorId
        );

      if (!resolved) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Donor not found'
          });
      }

      /*
       * Single source of truth.
       */
      const eligibility =
        checkEligibility(
          resolved.donor
        );

      return res.json({
        success:
          true,

        donor: {
          _id:
            resolved.user._id,

          publicId:
            resolved.donor.publicId,

          name:
            resolved.donor.name,

          donorType:
            resolved.donor.donorType
        },

        nextEligibleDate:
          eligibility.nextEligibleDate,

        isEligibleNow:
          eligibility.eligible,

        reasons:
          eligibility.reasons,

        requiredIntervalDays:
          eligibility.requiredIntervalDays,

        daysSinceLastDonation:
          eligibility.daysSinceLastDonation
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Create / refresh reminder
|--------------------------------------------------------------------------
*/

exports.createReminder =
  async (
    req,
    res
  ) => {
    try {
      const resolved =
        await getResolvedDonor(
          req.params.donorId
        );

      if (!resolved) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Donor not found'
          });
      }

      const eligibility =
        checkEligibility(
          resolved.donor
        );

      /*
       * No previous approved donation means there is no future
       * donation-interval date to remind the donor about.
       *
       * They may already be eligible, subject to the other
       * eligibility rules.
       */
      if (
        !eligibility
          .nextEligibleDate
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'This donor does not currently have a future donation eligibility date.',

            eligibility
          });
      }

      const reminder =
        await Reminder
          .findOneAndUpdate(
            {
              donorId:
                resolved.user._id
            },

            {
              donorId:
                resolved.user._id,

              nextEligibleDate:
                eligibility
                  .nextEligibleDate,

              reminderSent:
                false,

              reminderDate:
                null
            },

            {
              upsert:
                true,

              new:
                true,

              runValidators:
                true
            }
          );

      return res
        .status(201)
        .json({
          success:
            true,

          reminder,

          eligibility
        });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| GET reminders due within the next 7 days
|--------------------------------------------------------------------------
|
| Hospital, BloodBank and Admin can inspect upcoming reminders.
|
|--------------------------------------------------------------------------
*/

exports.getDueReminders =
  async (
    req,
    res
  ) => {
    try {
      const sevenDaysFromNow =
        new Date();

      sevenDaysFromNow
        .setDate(
          sevenDaysFromNow
            .getDate() +
            7
        );

      const reminders =
        await Reminder
          .find({
            nextEligibleDate: {
              $lte:
                sevenDaysFromNow
            },

            reminderSent:
              false
          })
          .populate(
            'donorId'
          )
          .sort({
            nextEligibleDate:
              1
          });

      const dueReminders =
        [];

      for (
        const reminder
        of reminders
      ) {
        const user =
          reminder.donorId;

        const donor =
          normalizeDonor(
            user
          );

        /*
         * Ignore deleted, inactive or no-longer donor-capable users.
         */
        if (!donor) {
          continue;
        }

        /*
         * Re-check using the real eligibility engine instead of trusting
         * an old hardcoded reminder calculation.
         */
        const eligibility =
          checkEligibility(
            donor
          );

        if (
          !eligibility
            .nextEligibleDate
        ) {
          continue;
        }

        dueReminders.push({
          _id:
            reminder._id,

          donor: {
            _id:
              user._id,

            publicId:
              donor.publicId,

            name:
              donor.name,

            email:
              donor.email,

            phone:
              donor.phone,

            bloodGroup:
              donor.bloodGroup,

            donorType:
              donor.donorType
          },

          nextEligibleDate:
            eligibility
              .nextEligibleDate,

          reminderSent:
            reminder.reminderSent,

          reminderDate:
            reminder.reminderDate,

          eligibility: {
            eligible:
              eligibility.eligible,

            reasons:
              eligibility.reasons,

            requiredIntervalDays:
              eligibility
                .requiredIntervalDays,

            daysSinceLastDonation:
              eligibility
                .daysSinceLastDonation
          }
        });
      }

      return res.json({
        success:
          true,

        count:
          dueReminders.length,

        reminders:
          dueReminders
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Mark reminder sent
|--------------------------------------------------------------------------
*/

exports.markReminderSent =
  async (
    req,
    res
  ) => {
    try {
      const reminder =
        await Reminder
          .findByIdAndUpdate(
            req.params
              .reminderId,

            {
              reminderSent:
                true,

              reminderDate:
                new Date()
            },

            {
              new:
                true
            }
          );

      if (!reminder) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Reminder not found'
          });
      }

      return res.json({
        success:
          true,

        reminder
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };