import nodemailer from 'nodemailer';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  let transporter;

  // Use configured SMTP if available
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback to Ethereal Email for testing if no SMTP is configured
    console.log('No SMTP configured. Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"HRMS System" <noreply@hrms.com>',
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('Test email sent. Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
}
