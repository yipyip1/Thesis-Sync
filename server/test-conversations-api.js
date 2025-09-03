const axios = require('axios');

// Test the new conversations endpoint
async function testConversationsAPI() {
  try {
    console.log('🚀 Starting API test...');
    
    // First, let's get a user token by logging in
    console.log('🔐 Attempting login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'raditodhali101@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Now test the conversations endpoint
    console.log('📱 Testing conversations endpoint...');
    const conversationsResponse = await axios.get('http://localhost:5000/api/messages/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Conversations API Response:');
    console.log(JSON.stringify(conversationsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing API:');
    console.error('Error object keys:', Object.keys(error));
    console.error('Response data:', error.response?.data);
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testConversationsAPI();
