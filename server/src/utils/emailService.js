const env = require("../config/env");

let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  console.warn(
    "Warning: nodemailer package not found. Falling back to HTTP/console email logging."
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
 * Send email via Google Apps Script HTTPS Relay (port 443 - works on Render Free Tier)
 */
const sendViaGoogleAppsScript = async ({ to, subject, text, html }) => {
  const response = await fetch(env.GOOGLE_SCRIPT_URL.trim(), {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      to,
      subject,
      text,
      html,
      fromName: "AkureClean",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script HTTP ${response.status}`);
  }

  const result = await response.json().catch(() => ({ success: true }));
  if (result && result.success === false) {
    throw new Error(result.error || "Google Apps Script returned failure");
  }

  console.log(`[emailService] Email sent to ${to} via Google Apps Script HTTPS relay`);
  return { delivered: true, provider: "google-script" };
};

/**
 * Send email via Brevo HTTPS API (port 443 - works on Render Free Tier)
 */
const sendViaBrevo = async ({ to, recipientName, subject, text, html }) => {
  const senderEmail = env.EMAIL_USER || "hedristemitope2001@gmail.com";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY.trim(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "AkureClean", email: senderEmail },
      to: [{ email: to, name: recipientName }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Brevo API HTTP ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  console.log(
    `[emailService] Email sent to ${to} via Brevo API | messageId: ${data.messageId}`
  );
  return { delivered: true, messageId: data.messageId, provider: "brevo" };
};

/**
 * Unified email dispatcher:
 * 1. Google Apps Script HTTPS Relay (GOOGLE_SCRIPT_URL) — bypasses Render SMTP block
 * 2. Brevo HTTPS API (BREVO_API_KEY) — bypasses Render SMTP block
 * 3. Nodemailer SMTP (EMAIL_USER + EMAIL_PASS) — works locally or on unblocked hosts
 */
const dispatchEmail = async ({ to, recipientName, subject, text, html, otp }) => {
  // 1. Try Google Apps Script HTTPS relay first (ideal for Render Free Tier + Gmail)
  if (env.GOOGLE_SCRIPT_URL) {
    try {
      return await sendViaGoogleAppsScript({ to, subject, text, html });
    } catch (err) {
      console.error(
        "[emailService] Google Apps Script relay failed:",
        err.message
      );
    }
  }

  // 2. Try Brevo HTTPS API if configured
  if (env.BREVO_API_KEY) {
    try {
      return await sendViaBrevo({ to, recipientName, subject, text, html });
    } catch (err) {
      console.error("[emailService] Brevo API failed:", err.message);
    }
  }

  // 3. Fallback to Nodemailer SMTP
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(
      "[emailService] No email transport configured (set GOOGLE_SCRIPT_URL, BREVO_API_KEY, or EMAIL_USER/EMAIL_PASS). Using console OTP above."
    );
    return { delivered: false, devOtp: otp };
  }

  const fromAddress = `AkureClean <${env.EMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    console.log(
      `[emailService] Email sent to ${to} via SMTP | messageId: ${info.messageId} | response: ${info.response}`
    );
    return { delivered: true, messageId: info.messageId, provider: "smtp" };
  } catch (error) {
    console.error(
      "[emailService] Failed to send email via SMTP (Note: Render free tier blocks port 465/587; set GOOGLE_SCRIPT_URL to send over HTTPS):",
      error.message
    );
    return { delivered: false, devOtp: otp, error: error.message };
  }
};

/**
 * Send a 6-digit verification code for registration
 */
exports.sendVerificationOtpEmail = async (email, name, otp) => {
  const recipientName = name || "Resident";
  const subject = `Your AkureClean verification code is ${otp}`;

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

  return dispatchEmail({
    to: email,
    recipientName,
    subject,
    text,
    html,
    otp,
  });
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

  return dispatchEmail({
    to: email,
    recipientName,
    subject,
    text,
    html,
    otp,
  });
};
