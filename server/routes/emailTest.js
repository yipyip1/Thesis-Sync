const express = require('express');
const auth = require('../middleware/auth');
const { testEmailConfig, sendTeamApplicationEmail } = require('../utils/emailService');
const router = express.Router();

// Test email configuration
router.get('/test-config', auth, async (req, res) => {
  try {
    console.log('Testing email configuration...');
    console.log('Environment variables:');
    console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'Not set');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    
    const isValid = await testEmailConfig();
    
    res.json({
      success: isValid,
      config: {
        emailService: process.env.EMAIL_SERVICE,
        emailUser: process.env.EMAIL_USER,
        emailFrom: process.env.EMAIL_FROM,
        hasPassword: !!process.env.EMAIL_PASS
      },
      message: isValid ? 'Email configuration is valid' : 'Email configuration has issues'
    });
  } catch (error) {
    console.error('Email config test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test email configuration'
    });
  }
});

// Send a simple test email
router.post('/send-test', auth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    console.log(`Attempting to send test email to: ${email}`);
    
    const result = await sendTeamApplicationEmail(
      email,
      'Test Recipient',
      'Test Applicant',
      'Test Team Project',
      'This is a test message to verify email functionality is working correctly.'
    );

    console.log('Email send result:', result);

    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully!' : 'Failed to send test email',
      details: result
    });
  } catch (error) {
    console.error('Test email send error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
      error: error.message
    });
  }
});

module.exports = router;
