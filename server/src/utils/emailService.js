const env = require("../config/env");

let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  console.warn(
    "Warning: nodemailer package not found. Falling back to console email logging."
  );
}

const createTransporter = () => {
  if (!nodemailer || !env.EMAIL_USER || !env.EMAIL_PASS) {
    return null;
  }

  const isGmail = (env.EMAIL_HOST || "").includes("gmail.com");
  const port = isGmail ? 465 : Number(env.EMAIL_PORT) || 465;

  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port,
    secure: port === 465,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
};

/**
 * Send a 6-digit verification code for registration
 */
exports.sendVerificationOtpEmail = async (email, name, otp) => {
  const recipientName = name || "Resident";
  const subject = `Your AkureClean verification code is ${otp}`;

  // Plain-text version (critical for avoiding Gmail Spam folder)
  const text = [
    `Hello ${recipientName},`,
    ``,
    `Welcome to AkureClean.`,
    `Your 6-digit email verification code is: ${otp}`,
    ``,
    `This code expires in 10 minutes.`,
    `If you did not request this code, you can safely ignore this message.`,
    ``,
    `Thank you,`,
    `AkureClean Team`,
  ].join("\n");

  // Clean, minimal transactional HTML (avoids CSS gradients/dashed boxes that trigger spam filters)
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">AkureClean Account Verification</h2>
      <p style="margin: 0 0 16px; font-size: 15px;">Hello ${recipientName},</p>
      <p style="margin: 0 0 16px; font-size: 15px;">
        Please enter the following 6-digit verification code in the app to complete your sign-up:
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #0f766e;">${otp}</span>
      </div>
      <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">
        This code expires in 10 minutes.
      </p>
      <p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">
        Thank you,<br />AkureClean Team
      </p>
    </div>
  `;

  console.log(`\n========================================`);
  console.log(`[EMAIL OTP - VERIFY ACCOUNT]`);
  console.log(`To:  ${email}`);
  console.log(`OTP: ${otp} (Expires in 10 mins)`);
  console.log(`========================================\n`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn(
      "[emailService] EMAIL_USER or EMAIL_PASS not configured in .env. Using console OTP above for development."
    );
    return { delivered: false, devOtp: otp };
  }

  const fromAddress = `AkureClean <${env.EMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: env.EMAIL_USER,
      to: email,
      subject,
      text,
      html,
    });
    console.log(
      `[emailService] Verification email sent to ${email} | messageId: ${info.messageId} | response: ${info.response}`
    );
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      "[emailService] Failed to send verification email via SMTP:",
      error.message
    );
    if (env.NODE_ENV !== "production") {
      return { delivered: false, devOtp: otp };
    }
    throw new Error(
      "Could not send verification email. Please check email configuration."
    );
  }
};

/**
 * Send a 6-digit code for password reset
 */
exports.sendPasswordResetOtpEmail = async (email, name, otp) => {
  const recipientName = name || "User";
  const subject = `Your AkureClean password reset code is ${otp}`;

  const text = [
    `Hello ${recipientName},`,
    ``,
    `We received a request to reset the password for your AkureClean account.`,
    `Your 6-digit password reset code is: ${otp}`,
    ``,
    `This code expires in 10 minutes.`,
    `If you did not request a password reset, please ignore this message.`,
    ``,
    `Thank you,`,
    `AkureClean Team`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">AkureClean Password Reset</h2>
      <p style="margin: 0 0 16px; font-size: 15px;">Hello ${recipientName},</p>
      <p style="margin: 0 0 16px; font-size: 15px;">
        We received a request to reset your password. Enter the 6-digit code below to set a new password:
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #0f766e;">${otp}</span>
      </div>
      <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">
        This code expires in 10 minutes. If you did not request this, your password will remain unchanged.
      </p>
      <p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">
        Thank you,<br />AkureClean Team
      </p>
    </div>
  `;

  console.log(`\n========================================`);
  console.log(`[EMAIL OTP - PASSWORD RESET]`);
  console.log(`To:  ${email}`);
  console.log(`OTP: ${otp} (Expires in 10 mins)`);
  console.log(`========================================\n`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn(
      "[emailService] EMAIL_USER or EMAIL_PASS not configured in .env. Using console OTP above for development."
    );
    return { delivered: false, devOtp: otp };
  }

  const fromAddress = `AkureClean <${env.EMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: env.EMAIL_USER,
      to: email,
      subject,
      text,
      html,
    });
    console.log(
      `[emailService] Password reset email sent to ${email} | messageId: ${info.messageId} | response: ${info.response}`
    );
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      "[emailService] Failed to send password reset email via SMTP:",
      error.message
    );
    if (env.NODE_ENV !== "production") {
      return { delivered: false, devOtp: otp };
    }
    throw new Error(
      "Could not send password reset email. Please check email configuration."
    );
  }
};
