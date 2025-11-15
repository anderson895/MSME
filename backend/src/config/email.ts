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
  // Validate email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    throw new Error('Email service is not configured. Please contact support.');
  }

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
    // Verify transporter configuration
    await transporter.verify();
    console.log('Email transporter verified successfully');
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`, { messageId: info.messageId });
  } catch (error: unknown) {
    console.error('Error sending verification email:', error);
    const emailError = error as { message?: string; code?: string; command?: string; response?: string };
    console.error('Error details:', {
      message: emailError.message,
      code: emailError.code,
      command: emailError.command,
      response: emailError.response
    });
    
    // Provide more helpful error message
    if (emailError.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS configuration.');
    } else if (emailError.code === 'ECONNECTION') {
      throw new Error('Could not connect to email server. Please check EMAIL_HOST and EMAIL_PORT configuration.');
    } else {
      throw new Error(`Failed to send verification email: ${emailError.message || 'Unknown error'}`);
    }
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

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
) => {
  // Validate email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    throw new Error('Email service is not configured. Please contact support.');
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"MentorHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your MentorHub Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #EF4444, #F59E0B); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
              <p>We received a request to reset your password</p>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset your password for your MentorHub account. If you made this request, please click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #EF4444;">${resetUrl}</p>
              <div class="warning">
                <p style="margin: 0;"><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
              </div>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              <p>For security reasons, never share this link with anyone. If you have concerns about your account security, please contact us immediately.</p>
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
    // Verify transporter configuration
    await transporter.verify();
    console.log('Email transporter verified successfully');
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`, { messageId: info.messageId });
  } catch (error: unknown) {
    console.error('Error sending password reset email:', error);
    const emailError = error as { message?: string; code?: string; command?: string; response?: string };
    console.error('Error details:', {
      message: emailError.message,
      code: emailError.code,
      command: emailError.command,
      response: emailError.response
    });
    
    // Provide more helpful error message
    if (emailError.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS configuration.');
    } else if (emailError.code === 'ECONNECTION') {
      throw new Error('Could not connect to email server. Please check EMAIL_HOST and EMAIL_PORT configuration.');
    } else {
      throw new Error(`Failed to send password reset email: ${emailError.message || 'Unknown error'}`);
    }
  }
};

export const sendSessionNotificationEmail = async (
  email: string,
  menteeName: string,
  sessionTitle: string,
  sessionDescription: string | null,
  sessionDate: Date,
  sessionDuration: number,
  mentorName: string
) => {
  // Validate email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    // Don't throw error, just log it - session creation should still succeed
    return;
  }

  // Format date and time
  const sessionDateTime = new Date(sessionDate);
  const formattedDate = sessionDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = sessionDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Calculate end time
  const endTime = new Date(sessionDateTime.getTime() + sessionDuration * 60000);
  const formattedEndTime = endTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Format duration
  const hours = Math.floor(sessionDuration / 60);
  const minutes = sessionDuration % 60;
  const formattedDuration = hours > 0 
    ? `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`
    : `${minutes} minute${minutes > 1 ? 's' : ''}`;

  const calendarUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const mailOptions = {
    from: `"MentorHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `New Training Session Scheduled: ${sessionTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Training Session</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6; }
            .detail-row { margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #4b5563; margin-bottom: 5px; }
            .detail-value { color: #111827; font-size: 16px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Training Session Scheduled</h1>
              <p>You've been invited to a training session</p>
            </div>
            <div class="content">
              <h2>Hi ${menteeName},</h2>
              <p>Great news! Your mentor <strong>${mentorName}</strong> has scheduled a new training session for you.</p>
              
              <div class="session-details">
                <h3 style="margin-top: 0; color: #3B82F6;">${sessionTitle}</h3>
                
                <div class="detail-row">
                  <div class="detail-label">📅 Date & Time</div>
                  <div class="detail-value">${formattedDate} at ${formattedTime}</div>
                </div>
                
                <div class="detail-row">
                  <div class="detail-label">⏰ Duration</div>
                  <div class="detail-value">${formattedDuration} (${formattedTime} - ${formattedEndTime})</div>
                </div>
                
                <div class="detail-row">
                  <div class="detail-label">👨‍🏫 Mentor</div>
                  <div class="detail-value">${mentorName}</div>
                </div>
                
                ${sessionDescription ? `
                <div class="detail-row">
                  <div class="detail-label">📝 Description</div>
                  <div class="detail-value">${sessionDescription}</div>
                </div>
                ` : ''}
              </div>

              <div class="highlight">
                <p style="margin: 0;"><strong>💡 Don't forget!</strong> This session is scheduled for ${formattedDate} at ${formattedTime}. Make sure to mark your calendar and be ready to join.</p>
              </div>

              <div style="text-align: center;">
                <a href="${calendarUrl}" class="button">View Calendar</a>
              </div>

              <p>You can view all your scheduled sessions and manage your calendar by logging into your MentorHub account.</p>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Need to reschedule or have questions?</strong><br>
                Please contact your mentor or reach out to us if you need assistance.
              </p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The MentorHub Team</p>
              <p>Need help? Contact us at support@mentorhub.com</p>
              <p style="margin-top: 20px;">
                <a href="${loginUrl}" style="color: #3B82F6; text-decoration: none;">Login to MentorHub</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Session notification email sent to ${email} for session: ${sessionTitle}`);
  } catch (error: unknown) {
    console.error('Error sending session notification email:', error);
    const emailError = error as { message?: string; code?: string };
    console.error('Email error details:', {
      message: emailError.message,
      code: emailError.code,
      recipient: email
    });
    // Don't throw error - session creation should still succeed even if email fails
  }
};