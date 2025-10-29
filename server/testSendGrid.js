// testSendGrid.js - Run this to test your SendGrid setup
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.SENDGRID_API_KEY;

console.log('='.repeat(50));
console.log('🧪 Testing SendGrid Configuration');
console.log('='.repeat(50));

// Check 1: API Key exists
if (!apiKey) {
  console.error('❌ SENDGRID_API_KEY is not defined');
  process.exit(1);
}

// Check 2: API Key format
console.log('✅ API Key found');
console.log('📋 First 10 chars:', apiKey.substring(0, 10));
console.log('📋 Starts with SG.:', apiKey.startsWith('SG.'));

if (!apiKey.startsWith('SG.')) {
  console.error('❌ API Key does not start with "SG."');
  console.error('💡 Check for leading/trailing spaces in .env file');
  process.exit(1);
}

// Check 3: API Key length (should be around 69 characters)
console.log('📋 Key length:', apiKey.length, '(should be ~69)');

// Check 4: Try to send a test email
sgMail.setApiKey(apiKey);

const msg = {
  to: process.env.EMAIL_FROM || 'sohoxel@gmail.com', // Send to yourself for testing
  from: process.env.EMAIL_FROM || 'sohoxel@gmail.com',
  subject: '🧪 SendGrid Test Email',
  text: 'If you receive this, SendGrid is working!',
  html: '<strong>If you receive this, SendGrid is working!</strong>',
};

console.log('\n📧 Attempting to send test email...');
console.log('From:', msg.from);
console.log('To:', msg.to);

try {
  const response = await sgMail.send(msg);
  console.log('\n✅ SUCCESS! Email sent!');
  console.log('Status Code:', response[0].statusCode);
  console.log('Message ID:', response[0].headers['x-message-id']);
  console.log('\n💡 Check your inbox at:', msg.to);
  console.log('='.repeat(50));
} catch (error) {
  console.error('\n❌ FAILED to send email');
  console.error('Error Message:', error.message);
  
  if (error.response) {
    console.error('\n📋 SendGrid Error Details:');
    console.error('Status Code:', error.response.statusCode);
    console.error('Body:', JSON.stringify(error.response.body, null, 2));
    
    // Common error explanations
    if (error.response.statusCode === 403) {
      console.error('\n💡 403 Forbidden - Possible causes:');
      console.error('   1. Sender email not verified in SendGrid');
      console.error('   2. API key lacks permissions');
      console.error('   3. API key has been revoked');
      console.error('\n🔧 Fix: Go to https://app.sendgrid.com/settings/sender_auth/senders');
      console.error('   and verify your sender email:', msg.from);
    } else if (error.response.statusCode === 401) {
      console.error('\n💡 401 Unauthorized - Invalid API key');
      console.error('🔧 Fix: Generate a new API key with "Mail Send" permissions');
    }
  }
  
  console.error('\n' + '='.repeat(50));
  process.exit(1);
}