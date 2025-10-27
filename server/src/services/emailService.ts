import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Brevo SMTP configuration
    // Check if required environment variables are set
    if (!process.env.BREVO_SMTP_HOST || !process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
      console.warn('⚠️ Brevo SMTP credentials not configured. Email service will not work.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD
      }
    });
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email transporter not initialized. Check your Brevo SMTP configuration.');
        return false;
      }

      // Brevo credentials are configured with fallback values

      const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: `"Invictus Mall" <${process.env.FROM_EMAIL || 'your-email@yourdomain.com'}>`,
        to: email,
        subject: 'Complete Your Invictus Mall Registration',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Invictus Mall</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your Premier Shopping Destination</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome to Invictus Mall!</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Thank you for choosing Invictus Mall! To complete your registration and start shopping, 
                please verify your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #f97316; 
                          color: #ffffff !important; 
                          padding: 15px 30px; 
                          text-decoration: none !important; 
                          border-radius: 8px; 
                          display: inline-block;
                          font-weight: bold;
                          font-size: 16px;
                          font-family: Arial, sans-serif;
                          border: 2px solid #ea580c;
                          mso-padding-alt: 0;
                          mso-border-alt: 10px solid #f97316;">
                  Complete Registration
                </a>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                  Having trouble with the button?
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 0; word-break: break-all;">
                  Copy and paste this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #f97316;">${verificationUrl}</a>
                </p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                  <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  If you didn't create an account with Invictus Mall, please ignore this email.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2024 Invictus Mall. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `
          Welcome to Invictus Mall!
          
          Thank you for choosing Invictus Mall! To complete your registration and start shopping, 
          please verify your email address by clicking the link below:
          
          ${verificationUrl}
          
          Important: This verification link will expire in 24 hours for security reasons.
          
          If you didn't create an account with Invictus Mall, please ignore this email.
          
          © 2024 Invictus Mall. All rights reserved.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  async sendStaffInvitationEmail(email: string, firstName: string, lastName: string, role: string, invitationToken: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email transporter not initialized. Check your Brevo SMTP configuration.');
        return false;
      }

      const setupUrl = `${process.env.ADMIN_URL || 'http://localhost:3002'}/setup-password?token=${invitationToken}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Staff Invitation - InvictusMall</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #007bff; }
            .logo { font-size: 24px; font-weight: bold; color: #007bff; }
            .content { padding: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #007bff !important; color: white !important; text-decoration: none !important; border-radius: 5px; font-weight: bold; margin: 20px 0; font-family: Arial, sans-serif; border: none; mso-padding-alt: 0; mso-border-alt: none; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
            .highlight { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">InvictusMall</div>
            </div>
            <div class="content">
              <h2>Welcome to InvictusMall Staff Portal!</h2>
              <p>Hello ${firstName} ${lastName},</p>
              <p>You have been invited to join the InvictusMall team as a <strong>${role}</strong>. We're excited to have you on board!</p>
              
              <div class="highlight">
                <h3>Your Invitation Details:</h3>
                <ul>
                  <li><strong>Name:</strong> ${firstName} ${lastName}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Role:</strong> ${role}</li>
                </ul>
              </div>
              
              <p>To complete your registration and set up your password, please click the button below:</p>
              <a href="${setupUrl}" class="button">Set Up Your Password</a>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This invitation link will expire in 7 days</li>
                <li>You can only use this link once</li>
                <li>Make sure to set a strong password for your account</li>
              </ul>
              
              <p>If you have any questions or need assistance, please contact your administrator.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from InvictusMall Staff Portal</p>
              <p>If you didn't expect this invitation, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'your-email@yourdomain.com',
        to: email,
        subject: 'Staff Invitation - InvictusMall',
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Staff invitation email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send staff invitation email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email transporter not initialized. Check your Brevo SMTP configuration.');
        return false;
      }

      // Brevo credentials are configured with fallback values

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"Invictus Mall" <${process.env.FROM_EMAIL || 'your-email@yourdomain.com'}>`,
        to: email,
        subject: 'Reset Your Invictus Mall Password',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Invictus Mall</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your Premier Shopping Destination</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                We received a request to reset your password for your Invictus Mall account. 
                If you made this request, click the button below to reset your password.
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #f97316; 
                          color: #ffffff !important; 
                          padding: 15px 30px; 
                          text-decoration: none !important; 
                          border-radius: 8px; 
                          display: inline-block;
                          font-weight: bold;
                          font-size: 16px;
                          font-family: Arial, sans-serif;
                          border: 2px solid #ea580c;
                          mso-padding-alt: 0;
                          mso-border-alt: 10px solid #f97316;">
                  Reset Password
                </a>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                  Having trouble with the button?
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 0; word-break: break-all;">
                  Copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #f97316;">${resetUrl}</a>
                </p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
                  <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2024 Invictus Mall. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `
          Password Reset Request - Invictus Mall
          
          We received a request to reset your password for your Invictus Mall account. 
          If you made this request, click the link below to reset your password:
          
          ${resetUrl}
          
          Important: This password reset link will expire in 1 hour for security reasons.
          
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          
          © 2024 Invictus Mall. All rights reserved.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();
