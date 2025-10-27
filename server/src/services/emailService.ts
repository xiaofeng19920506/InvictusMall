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
    this.transporter = nodemailer.createTransporter({
      host: 'smtp-relay.brevo.com', // Brevo SMTP server
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.BREVO_SMTP_USER || '', // Your Brevo SMTP username
        pass: process.env.BREVO_SMTP_PASSWORD || '' // Your Brevo SMTP password
      }
    });
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // Check if Brevo credentials are configured
      if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
        console.warn('Brevo SMTP credentials not configured. Email will not be sent.');
        return false;
      }

      const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: `"Invictus Mall" <${process.env.FROM_EMAIL || 'noreply@invictusmall.com'}>`,
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
                   style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block;
                          font-weight: 600;
                          font-size: 16px;
                          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
                          transition: all 0.3s ease;">
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

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // Check if Brevo credentials are configured
      if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
        console.warn('Brevo SMTP credentials not configured. Email will not be sent.');
        return false;
      }

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"Invictus Mall" <${process.env.FROM_EMAIL || 'noreply@invictusmall.com'}>`,
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
                   style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block;
                          font-weight: 600;
                          font-size: 16px;
                          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
                          transition: all 0.3s ease;">
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
}

export const emailService = new EmailService();
