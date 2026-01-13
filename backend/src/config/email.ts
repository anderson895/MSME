import nodemailer from 'nodemailer';

// Email configuration with timeout settings
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add timeout configurations to prevent hanging connections
  connectionTimeout: 10000, // 10 seconds to establish connection
  socketTimeout: 10000, // 10 seconds for socket operations
  greetingTimeout: 10000, // 10 seconds for SMTP greeting
  // Retry configuration
  pool: true,
  maxConnections: 1,
  maxMessages: 3,
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
    // Verify transporter configuration with timeout
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email verification timeout')), 10000)
      )
    ]);
    console.log('Email transporter verified successfully');
    
    // Send email with timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
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
    if (emailError.message?.includes('timeout')) {
      throw new Error('Email service timeout. The email server is taking too long to respond. Please try again later.');
    } else if (emailError.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS configuration.');
    } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT') {
      throw new Error('Could not connect to email server. Please check EMAIL_HOST and EMAIL_PORT configuration or network connectivity.');
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
    // Send email with timeout
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
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
    // Verify transporter configuration with timeout
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email verification timeout')), 10000)
      )
    ]);
    console.log('Email transporter verified successfully');
    
    // Send email with timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
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
    if (emailError.message?.includes('timeout')) {
      throw new Error('Email service timeout. The email server is taking too long to respond. Please try again later.');
    } else if (emailError.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS configuration.');
    } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT') {
      throw new Error('Could not connect to email server. Please check EMAIL_HOST and EMAIL_PORT configuration or network connectivity.');
    } else {
      throw new Error(`Failed to send password reset email: ${emailError.message || 'Unknown error'}`);
    }
  }
};

export const sendApprovalEmail = async (
  email: string,
  name: string,
  role: 'MENTOR' | 'MENTEE'
) => {
  // Validate email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    // Don't throw error, just log it - approval should still succeed
    return;
  }

  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const roleLabel = role === 'MENTOR' ? 'Mentor' : 'MSME (Mentee)';
  const roleSpecificContent = role === 'MENTOR' 
    ? `
      <ul>
        <li><strong>Create Training Sessions:</strong> Schedule and conduct training sessions for mentees</li>
        <li><strong>Upload Resources:</strong> Share educational materials, guides, and templates</li>
        <li><strong>Connect with Mentees:</strong> Communicate directly with your assigned mentees</li>
        <li><strong>Track Progress:</strong> Monitor mentee engagement and session completion</li>
      </ul>
    `
    : `
      <ul>
        <li><strong>Join Training Sessions:</strong> Attend scheduled sessions with your assigned mentors</li>
        <li><strong>Access Resources:</strong> Download training materials and guides</li>
        <li><strong>Track Your Progress:</strong> Monitor your learning journey and achievements</li>
        <li><strong>Connect with Mentors:</strong> Message mentors directly for guidance</li>
      </ul>
    `;

  const mailOptions = {
    from: `"MentorHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎉 Your ${roleLabel} Account Has Been Approved!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981, #3B82F6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10B981; }
            ul { margin: 15px 0; padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Approved!</h1>
              <p>You're ready to start your journey</p>
            </div>
            <div class="content">
              <h2>Congratulations ${name}!</h2>
              <p>Great news! Your ${roleLabel} account registration has been reviewed and <strong>approved</strong> by our admin team.</p>
              
              <div class="highlight">
                <p style="margin: 0;"><strong>✅ Your account is now active!</strong> You can now log in and start using all the features of MentorHub.</p>
              </div>

              <p>You can now access your account and enjoy the following features:</p>
              ${roleSpecificContent}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" class="button">Login to Your Account</a>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Click the button above or visit: <a href="${loginUrl}" style="color: #3B82F6;">${loginUrl}</a></li>
                <li>Log in using the email and password you used during registration</li>
                <li>Explore the dashboard and start your mentorship journey!</li>
              </ol>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Need help?</strong><br>
                If you have any questions or need assistance, please don't hesitate to contact our support team. We're here to help you succeed!
              </p>
            </div>
            <div class="footer">
              <p>Welcome to MentorHub!<br>The MentorHub Team</p>
              <p>Need help? Contact us at support@mentorhub.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    // Send email with timeout
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
    console.log(`Approval email sent to ${email} for ${roleLabel}: ${name}`);
  } catch (error: unknown) {
    console.error('Error sending approval email:', error);
    const emailError = error as { message?: string; code?: string };
    console.error('Email error details:', {
      message: emailError.message,
      code: emailError.code,
      recipient: email,
      role: role
    });
    // Don't throw error - approval should still succeed even if email fails
  }
};

export const sendAnnouncementEmail = async (
  email: string,
  name: string,
  title: string,
  message: string,
  targetRole: string
) => {
  // Validate email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    // Don't throw error, just log it - announcement should still succeed
    return;
  }

  const announcementsUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/announcements`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const roleLabel = targetRole === 'MENTOR' ? 'Mentors' : targetRole === 'MENTEE' ? 'MSMEs (Mentees)' : 'Admins';

  const mailOptions = {
    from: `"MentorHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `📢 New Announcement: ${title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Announcement</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .announcement-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .announcement-title { color: #1f2937; font-size: 24px; font-weight: bold; margin-bottom: 15px; }
            .announcement-message { color: #4b5563; font-size: 16px; line-height: 1.8; white-space: pre-wrap; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 New Announcement</h1>
              <p>Important update from MentorHub</p>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We have an important announcement for all ${roleLabel} on the MentorHub platform.</p>
              
              <div class="announcement-box">
                <span class="badge">ANNOUNCEMENT</span>
                <div class="announcement-title">${title}</div>
                <div class="announcement-message">${message}</div>
              </div>

              <p>Please take a moment to read this announcement as it may contain important information about:</p>
              <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Platform updates and new features</li>
                <li>Upcoming training sessions or events</li>
                <li>Policy changes or important notices</li>
                <li>Community news and updates</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${announcementsUrl}" class="button">View All Announcements</a>
              </div>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <strong>Note:</strong> This announcement was sent to all ${roleLabel} on the platform. 
                You can view all announcements and stay updated by logging into your MentorHub account.
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
    // Send email with timeout
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
    console.log(`Announcement email sent to ${email} (${targetRole}): ${name}`);
  } catch (error: unknown) {
    console.error('Error sending announcement email:', error);
    const emailError = error as { message?: string; code?: string };
    console.error('Email error details:', {
      message: emailError.message,
      code: emailError.code,
      recipient: email,
      role: targetRole
    });
    // Don't throw error - announcement should still succeed even if email fails
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
    // Send email with timeout
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
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