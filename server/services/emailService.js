const nodemailer = require('nodemailer');

/*
|--------------------------------------------------------------------------
| Email configuration
|--------------------------------------------------------------------------
*/

function emailConfigured() {
  return Boolean(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  );
}

let transporter = null;

function getTransporter() {
  if (!emailConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter =
      nodemailer.createTransport({
        service: 'gmail',

        auth: {
          user:
            process.env.EMAIL_USER,

          pass:
            process.env.EMAIL_PASS
        }
      });
  }

  return transporter;
}

/*
|--------------------------------------------------------------------------
| Generic email sender
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Email failure never throws into the main business workflow.
|
| Registration/request/donation must still succeed if Gmail is temporarily
| unavailable.
|--------------------------------------------------------------------------
*/

async function sendEmail({
  to,
  subject,
  text,
  html = null
}) {
  if (!to) {
    return {
      sent: false,
      reason: 'missing_recipient'
    };
  }

  const mailer =
    getTransporter();

  if (!mailer) {
    console.warn(
      'Email skipped: EMAIL_USER / EMAIL_PASS are not configured.'
    );

    return {
      sent: false,
      reason:
        'email_not_configured'
    };
  }

  try {
    const info =
      await mailer.sendMail({
        from:
          `"BloodBridge" <${process.env.EMAIL_USER}>`,

        to,

        subject,

        text,

        ...(html
          ? { html }
          : {})
      });

    console.log(
      `Email sent to ${to}: ${subject}`
    );

    return {
      sent: true,
      messageId:
        info.messageId
    };
  } catch (err) {
    console.error(
      `Email send failed for ${to}:`,
      err.message
    );

    return {
      sent: false,
      reason:
        err.message
    };
  }
}

/*
|--------------------------------------------------------------------------
| Test SMTP connection
|--------------------------------------------------------------------------
*/

async function verifyEmailConnection() {
  const mailer =
    getTransporter();

  if (!mailer) {
    return false;
  }

  try {
    await mailer.verify();

    console.log(
      'BloodBridge Gmail connection verified.'
    );

    return true;
  } catch (err) {
    console.error(
      'BloodBridge Gmail verification failed:',
      err.message
    );

    return false;
  }
}

module.exports = {
  sendEmail,
  verifyEmailConnection,
  emailConfigured
};