const nodemailer = require('nodemailer');
const env = require('../config/env');

// Gmail SMTP — requires an App Password (Google Account > Security > App Passwords)
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: Number(env.SMTP_PORT) === 465, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"BloomKnights" <${env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
};

const sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your BloomKnights email',
    html: `
      <h2>Welcome to BloomKnights, ${user.username}!</h2>
      <p>Please confirm your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>Or paste this URL into your browser:</p>
      <p>${verifyUrl}</p>
      <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `,
  });
};

const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your BloomKnights password',
    html: `
      <h2>Password reset requested</h2>
      <p>Hi ${user.username}, we received a request to reset your password.</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>Or paste this URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email — your password will not change.</p>
    `,
  });
};

const sendUsernameReminderEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Your BloomKnights username',
    html: `
      <h2>Username reminder</h2>
      <p>You (or someone else) requested a reminder of the username for this email address.</p>
      <p>Your username is: <strong>${user.username}</strong></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendUsernameReminderEmail,
};
