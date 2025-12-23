export function otpEmailTemplate(params: {
  appName: string;
  otp: string;
  expiresInMinutes: number;
  schoolCode?: string;
}) {
  const { appName, otp, expiresInMinutes, schoolCode } = params;

  return {
    subject: `${appName} - OTP Verification`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin: 0 0 12px 0;">${appName} OTP Verification</h2>

        ${
          schoolCode
            ? `<p style="margin: 0 0 8px 0;"><b>School Code:</b> ${schoolCode}</p>`
            : ''
        }

        <p style="margin: 0 0 8px 0;">
          Your One-Time Password (OTP) is:
        </p>

        <div style="
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 6px;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 10px;
          width: fit-content;
          background: #fafafa;
        ">
          ${otp}
        </div>

        <p style="margin: 12px 0 0 0;">
          This OTP will expire in <b>${expiresInMinutes} minutes</b>.
        </p>

        <p style="margin: 12px 0 0 0; color: #555;">
          If you did not request this OTP, please ignore this email.
        </p>

        <hr style="margin: 18px 0; border: 0; border-top: 1px solid #eee;" />

        <p style="margin: 0; font-size: 12px; color: #777;">
          © ${new Date().getFullYear()} ${appName}. All rights reserved.
        </p>
      </div>
    `,
    text: `${appName} OTP: ${otp}. Expires in ${expiresInMinutes} minutes.`,
  };
}
