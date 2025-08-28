const express = require('express');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Simple email test route
router.post('/test-simple-email', auth, async (req, res) => {
  try {
    const { testEmail } = req.body;
    const user = await User.findById(req.userId);
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a test email address'
      });
    }

    console.log('=== EMAIL TEST STARTING ===');
    console.log('Test email to:', testEmail);
    console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'NOT SET');

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('Transporter created');

    // Test configuration
    try {
      await transporter.verify();
      console.log('✅ Email configuration is valid');
    } catch (verifyError) {
      console.log('❌ Email configuration error:', verifyError.message);
      return res.status(500).json({
        success: false,
        message: 'Email configuration is invalid',
        error: verifyError.message,
        details: 'Check your EMAIL_USER and EMAIL_PASS in .env file'
      });
    }

    // Send test email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Team Application Notification Test - Thesis Sync',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">🎉 Email Test Successful!</h2>
          <p>This is a test email from your Thesis Sync application.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Team Application Notification</h3>
            <p><strong>Team:</strong> Sample Research Team</p>
            <p><strong>Applicant:</strong> ${user.name}</p>
            <p><strong>Message:</strong> This is a test application to verify email notifications are working correctly.</p>
          </div>
          
          <p>If you received this email, your team application notifications are working! 🚀</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from Thesis Sync
          </p>
        </div>
      `
    };

    console.log('Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);

    res.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.',
      messageId: result.messageId,
      sentTo: testEmail
    });

  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      details: 'Check server console for detailed error information'
    });
  }
});

module.exports = router;
