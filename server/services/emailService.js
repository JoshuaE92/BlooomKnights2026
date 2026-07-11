const env = require('../config/env');

// Resend HTTPS email API (https://resend.com) — works on Render free tier,
// which blocks outbound SMTP. EMAIL_FROM must use the Resend-verified domain.
const sendEmail = async ({ to, subject, html }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `GreenCart <${env.EMAIL_FROM}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
};

const sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your GreenCart email',
    html: `
      <h2>Welcome to GreenCart, ${user.username}!</h2>
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
    subject: 'Reset your GreenCart password',
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
    subject: 'Your GreenCart username',
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
