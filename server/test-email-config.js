// Test script to check email configuration
const nodemailer = require('nodemailer');

console.log('🔍 Checking Brevo SMTP Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('BREVO_SMTP_HOST:', process.env.BREVO_SMTP_HOST || 'NOT SET');
console.log('BREVO_SMTP_PORT:', process.env.BREVO_SMTP_PORT || 'NOT SET');
console.log('BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER || 'NOT SET');
console.log('BREVO_SMTP_PASSWORD:', process.env.BREVO_SMTP_PASSWORD ? '***SET***' : 'NOT SET');
console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'NOT SET');
console.log('');

// Test transporter creation
try {
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER || '81e643006@smtp-brevo.com',
      pass: process.env.BREVO_SMTP_PASSWORD || 'kHyU1jxBQz3VN4s6'
    }
  });

  console.log('✅ Transporter created successfully');
  
  // Test connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ SMTP Connection failed:', error.message);
    } else {
      console.log('✅ SMTP Connection successful');
    }
  });

} catch (error) {
  console.log('❌ Failed to create transporter:', error.message);
}
