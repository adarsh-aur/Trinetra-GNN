import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send password reset email
export const sendPasswordResetEmail = async (email, resetUrl, userName) => {
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.EMAIL_FROM.match(/<(.+)>/)?.[1] || process.env.EMAIL_FROM,
        name: 'CloudGraph Sentinel'
      },
      replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM,
      subject: 'Password Reset Request - CloudGraph Sentinel',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #0a192f 0%, #1e293b 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .logo {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .company-name {
              color: #64ffda;
              font-size: 28px;
              font-weight: bold;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #0a192f;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .message {
              color: #475569;
              font-size: 16px;
              margin-bottom: 30px;
              line-height: 1.8;
            }
            .button-container {
              text-align: center;
              margin: 35px 0;
            }
            .reset-button {
              display: inline-block;
              padding: 16px 40px;
              background: linear-gradient(135deg, #64ffda 0%, #00aeff 100%);
              color: #0a192f;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(100, 255, 218, 0.3);
            }
            .alternative {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              border-left: 4px solid #64ffda;
            }
            .alternative-text {
              color: #64748b;
              font-size: 14px;
              margin: 0 0 10px 0;
              font-weight: 600;
            }
            .link {
              color: #0ea5e9;
              word-break: break-all;
              font-size: 13px;
              text-decoration: none;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px 20px;
              margin: 25px 0;
              border-radius: 5px;
            }
            .warning-text {
              color: #92400e;
              font-size: 14px;
              margin: 0;
            }
            .security-note {
              background: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin-top: 25px;
            }
            .security-text {
              color: #475569;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer {
              background: #0a192f;
              color: #94a3b8;
              padding: 30px 20px;
              text-align: center;
              font-size: 14px;
            }
            .footer-link {
              color: #64ffda;
              text-decoration: none;
            }
            .footer-text {
              margin: 10px 0;
            }
            @media only screen and (max-width: 600px) {
              .content {
                padding: 30px 20px;
              }
              .reset-button {
                padding: 14px 30px;
                font-size: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="logo">🛡️</div>
              <h1 class="company-name">CloudGraph Sentinel</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hello${userName ? ' ' + userName : ''},</p>
              
              <p class="message">
                We received a request to reset your password for your CloudGraph Sentinel account. 
                If you made this request, click the button below to create a new password:
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
              </div>
              
              <div class="alternative">
                <p class="alternative-text">Button not working?</p>
                <p class="alternative-text">Copy and paste this link into your browser:</p>
                <a href="${resetUrl}" class="link">${resetUrl}</a>
              </div>
              
              <div class="warning">
                <p class="warning-text">
                  ⚠️ <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
                </p>
              </div>
              
              <p class="message">
                If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                For security purposes, you may want to review your recent account activity.
              </p>
              
              <div class="security-note">
                <p class="security-text">
                  🔒 <strong>Security Reminder:</strong> Never share your password or reset link with anyone. 
                  CloudGraph Sentinel will never ask for your password via email or phone.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                <strong>CloudGraph Sentinel</strong><br>
                Enterprise Cybersecurity Platform for Multi-Cloud Environments
              </p>
              <p class="footer-text">
                Questions? Contact us at <a href="mailto:support@cloudgraphsentinel.com" class="footer-link">support@cloudgraphsentinel.com</a>
              </p>
              <p class="footer-text" style="font-size: 12px; margin-top: 20px;">
                © ${new Date().getFullYear()} CloudGraph Sentinel. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Plain text version for email clients that don't support HTML
      text: `
Hello${userName ? ' ' + userName : ''},

We received a request to reset your password for your CloudGraph Sentinel account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

Best regards,
CloudGraph Sentinel Team

---
CloudGraph Sentinel
Enterprise Cybersecurity Platform
      `.trim()
    };

    await sgMail.send(msg);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PASSWORD RESET EMAIL SENT (SendGrid)');
    console.log('='.repeat(60));
    console.log(`📧 To: ${email}`);
    console.log(`✔️  Status: Sent successfully`);
    console.log('='.repeat(60) + '\n');

    return { success: true };
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ EMAIL SEND FAILED (SendGrid)');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
    console.error('='.repeat(60) + '\n');
    
    throw new Error('Failed to send password reset email');
  }
};

// Test SendGrid configuration
export const testEmailConnection = async () => {
  try {
    // SendGrid doesn't have a verify method like nodemailer
    // We'll just check if API key is set
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured');
    }
    
    console.log('✅ SendGrid is configured and ready');
    return true;
  } catch (error) {
    console.error('❌ SendGrid configuration error:', error.message);
    return false;
  }
};

export default {
  sendPasswordResetEmail,
  testEmailConnection
};