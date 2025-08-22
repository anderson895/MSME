import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string
) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"MentorHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to MentorHub - Please Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to MentorHub!</h1>
              <p>Your journey to success starts here</p>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for joining MentorHub! We're excited to have you as part of our mentorship community.</p>
              <p>To complete your registration and start accessing our training resources, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3B82F6;">${verificationUrl}</p>
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              <p>Once verified, you'll be able to:</p>
              <ul>
                <li>Access training sessions and resources</li>
                <li>Connect with mentors</li>
                <li>Track your progress</li>
                <li>Join the community chat</li>
              </ul>
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The MentorHub Team</p>
              <p>Need help? Contact us at support@mentorhub.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const mailOptions = {
    from: `"MentorHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to MentorHub - Account Activated!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MentorHub</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981, #3B82F6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Activated!</h1>
              <p>You're all set to begin your journey</p>
            </div>
            <div class="content">
              <h2>Congratulations ${name}!</h2>
              <p>Your MentorHub account has been successfully activated. You now have full access to all our features and resources.</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login to Your Account</a>
              </div>
              <p>Here's what you can do now:</p>
              <ul>
                <li><strong>Browse Training Sessions:</strong> Join upcoming sessions with expert mentors</li>
                <li><strong>Access Resources:</strong> Download guides, templates, and training materials</li>
                <li><strong>Connect & Chat:</strong> Network with other mentees and mentors</li>
                <li><strong>Track Progress:</strong> Monitor your learning journey and achievements</li>
              </ul>
              <p>We're here to support you every step of the way. If you have any questions, don't hesitate to reach out!</p>
            </div>
            <div class="footer">
              <p>Happy learning!<br>The MentorHub Team</p>
              <p>Need help? Contact us at support@mentorhub.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email as it's not critical
  }
};