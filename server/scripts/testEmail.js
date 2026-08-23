require('dotenv').config();

const {
  sendEmail,
  verifyEmailConnection
} =
  require('../services/emailService');

async function test() {
  console.log(
    'Testing BloodBridge email configuration...'
  );

  const verified =
    await verifyEmailConnection();

  if (!verified) {
    console.error(
      'SMTP verification failed.'
    );

    process.exitCode =
      1;

    return;
  }

  const result =
    await sendEmail({
      to:
        process.env.EMAIL_USER,

      subject:
        'BloodBridge Email Test',

      text:
        'BloodBridge email delivery is working correctly.'
    });

  console.log(
    result
  );
}

test();