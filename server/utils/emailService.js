const nodemailer = require('nodemailer');

// Email service with debugging enabled - NO PERSONAL CREDENTIALS NEEDED!

// Create transporter using environment variables OR test account
const createTransporter = async () => {
  // Check if real email credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
      process.env.EMAIL_USER !== 'your-email@gmail.com' && 
      process.env.EMAIL_PASS !== 'your-app-password') {
    
    console.log('Using real email configuration');
    
    let transporterConfig;
    
    if (process.env.EMAIL_HOST) {
      // Custom SMTP configuration
      transporterConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };
    } else {
      // Service-based configuration (Gmail, Outlook, etc.)
      transporterConfig = {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };
    }

    return nodemailer.createTransporter(transporterConfig);
  }
  
  // Use test account (no real credentials needed)
  console.log('No real email credentials found. Creating test email account...');
  
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('✅ Test account created:', testAccount.user);
    
    const transporter = nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    return { transporter, testAccount };
  } catch (error) {
    console.error('Failed to create test account:', error);
    // Fallback: create a basic transporter that will show the email content in logs
    return createLogOnlyTransporter();
  }
};

// Creates a transporter that only logs emails (no actual sending)
const createLogOnlyTransporter = () => {
  return {
    sendMail: async (mailOptions) => {
      console.log('\n=== EMAIL NOTIFICATION (LOG ONLY) ===');
      console.log('📧 Email would be sent to:', mailOptions.to);
      console.log('📬 Subject:', mailOptions.subject);
      console.log('📝 Content Preview:');
      console.log('   Team Leader:', mailOptions.to);
      console.log('   Email Type: Team Application Notification');
      console.log('=== EMAIL END ===\n');
      
      return {
        messageId: 'log-only-' + Date.now(),
        accepted: [mailOptions.to],
        rejected: []
      };
    }
  };
};

// Send team application notification email
const sendTeamApplicationEmail = async (teamLeaderEmail, teamLeaderName, applicantName, teamTitle, applicationMessage) => {
  try {
    console.log('Email configuration check:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('Sending email to:', teamLeaderEmail);
    
    const transporterResult = await createTransporter();
    let transporter, testAccount;
    
    if (transporterResult.transporter) {
      transporter = transporterResult.transporter;
      testAccount = transporterResult.testAccount;
    } else {
      transporter = transporterResult;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@thesis-sync.com',
      to: teamLeaderEmail,
      subject: `New Team Application - ${teamTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-bottom: 10px;">🎉 New Team Application</h2>
            <p style="color: #666; margin: 0;">Someone has applied to join your team on Thesis Sync</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Application Details</h3>
            
            <div style="margin-bottom: 15px;">
              <strong>Team:</strong> ${teamTitle}
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong>Applicant:</strong> ${applicantName}
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong>Team Leader:</strong> ${teamLeaderName}
            </div>
            
            ${applicationMessage ? `
            <div style="margin-bottom: 20px;">
              <strong>Message:</strong>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 8px;">
                ${applicationMessage}
              </div>
            </div>
            ` : ''}
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #666;">
                Log in to your Thesis Sync dashboard to review and respond to this application.
              </p>
            </div>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>This is an automated message from Thesis Sync</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    if (testAccount) {
      const previewUrl = nodemailer.getTestMessageUrl(result);
      console.log('✅ Test email sent successfully!');
      console.log('📧 Preview URL:', previewUrl);
      console.log('📬 Test email account:', testAccount.user);
      
      return { 
        success: true, 
        messageId: result.messageId, 
        previewUrl: previewUrl,
        testAccount: testAccount.user,
        message: 'Test email sent - check preview URL'
      };
    } else {
      console.log('✅ Email notification logged:', result.messageId);
      return { success: true, messageId: result.messageId };
    }
    
  } catch (error) {
    console.error('❌ Error sending team application email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporterResult = await createTransporter();
    
    if (transporterResult.transporter) {
      await transporterResult.transporter.verify();
      console.log('✅ Test email configuration is valid');
      return true;
    } else if (transporterResult.sendMail) {
      console.log('✅ Log-only email configuration is active');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendTeamApplicationEmail,
  testEmailConfig
};
