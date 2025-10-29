// services/emailService.js
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.error('❌ SENDGRID_API_KEY is not defined in environment variables');
} else if (!apiKey.startsWith('SG.')) {
  console.error('❌ SENDGRID_API_KEY does not start with "SG."');
  console.error('💡 Current value starts with:', apiKey.substring(0, 10));
  console.error('💡 Check your .env file for spaces or formatting issues');
} else {
  sgMail.setApiKey(apiKey);
  console.log('✅ SendGrid initialized successfully');
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Password reset URL
 * @param {string} fullName - User's full name
 */
export const sendPasswordResetEmail = async (email, resetUrl, fullName) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'sohoxel@gmail.com',
    subject: 'Password Reset Request - CloudGraph Sentinel',
    text: `Hi ${fullName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nCloudGraph Sentinel Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      🔐 Password Reset
                    </h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                      Hi <strong>${fullName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #333333;">
                      We received a request to reset your password for your CloudGraph Sentinel account. Click the button below to create a new password:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${resetUrl}" 
                             style="display: inline-block; 
                                    padding: 16px 40px; 
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    color: #ffffff; 
                                    text-decoration: none; 
                                    border-radius: 6px; 
                                    font-size: 16px; 
                                    font-weight: bold;
                                    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 20px; font-size: 14px; line-height: 1.6; color: #666666;">
                      Or copy and paste this link into your browser:
                    </p>
                    
                    <p style="margin: 0 0 30px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea;">
                      ${resetUrl}
                    </p>
                    
                    <!-- Warning Box -->
                    <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #856404;">
                        ⚠️ <strong>Important:</strong> This link will expire in <strong>1 hour</strong>. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                      Best regards,<br>
                      <strong>CloudGraph Sentinel Team</strong>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #999999;">
                      This is an automated email. Please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    console.log('📧 Sending password reset email to:', email);
    console.log('🔗 Reset URL:', resetUrl);
    
    const response = await sgMail.send(msg);
    
    console.log('✅ Email sent successfully!');
    console.log('   Status Code:', response[0].statusCode);
    console.log('   Message ID:', response[0].headers['x-message-id']);
    
    return { success: true, messageId: response[0].headers['x-message-id'] };
    
  } catch (error) {
    console.error('❌ Failed to send email');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status Code:', error.response.statusCode);
      console.error('Error Body:', JSON.stringify(error.response.body, null, 2));
      
      // Provide specific error messages
      if (error.response.statusCode === 403) {
        console.error('\n💡 403 Forbidden Error - Common causes:');
        console.error('   1. ❌ Sender email NOT VERIFIED in SendGrid');
        console.error('   2. ❌ API key lacks "Mail Send" permission');
        console.error('   3. ❌ API key has been revoked or expired');
        console.error('\n🔧 TO FIX:');
        console.error('   → Go to: https://app.sendgrid.com/settings/sender_auth/senders');
        console.error('   → Verify sender email:', process.env.EMAIL_FROM);
        console.error('   → Or create a new API key with proper permissions\n');
      } else if (error.response.statusCode === 401) {
        console.error('\n💡 401 Unauthorized - Invalid API Key');
        console.error('🔧 TO FIX: Generate a new API key in SendGrid\n');
      }
    }
    
    throw error;
  }
};

/**
 * Send welcome email (optional - for registration)
 * @param {string} email - Recipient email
 * @param {string} fullName - User's full name
 */
export const sendWelcomeEmail = async (email, fullName) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'sohoxel@gmail.com',
    subject: 'Welcome to CloudGraph Sentinel! 🎉',
    text: `Hi ${fullName},\n\nWelcome to CloudGraph Sentinel! Your account has been created successfully.\n\nYou can now start managing your cloud infrastructure with ease.\n\nBest regards,\nCloudGraph Sentinel Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px;">
                <tr>
                  <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">
                      🎉 Welcome to CloudGraph Sentinel!
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">
                      Hi <strong>${fullName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                      Your CloudGraph Sentinel account has been created successfully! 🚀
                    </p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                      You can now start managing and monitoring your cloud infrastructure with ease.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #666666;">
                      Best regards,<br><strong>CloudGraph Sentinel Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    console.log('📧 Sending welcome email to:', email);
    const response = await sgMail.send(msg);
    console.log('✅ Welcome email sent successfully!');
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
    // Don't throw - welcome emails are optional
    return { success: false, error: error.message };
  }
};