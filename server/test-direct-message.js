// Simple test for direct message API
const axios = require('axios');

async function testDirectMessage() {
  try {
    console.log('🚀 Starting direct message test...');
    
    // Login as user 1
    console.log('🔐 Attempting login...');
    const login1 = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'raditodhali101@gmail.com',
      password: 'password123'
    });
    
    console.log('✅ User 1 logged in');
    const token1 = login1.data.token;
    
    // Try to send a direct message
    console.log('📤 Attempting to send direct message...');
    const messageResponse = await axios.post('http://localhost:5000/api/messages/direct', {
      receiverId: '68afc95d33209dfa4d70bd01', // ahanaftanvir@gmail.com
      message: 'Test direct message from API'
    }, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    
    console.log('✅ Direct message sent successfully!');
    console.log('Response:', JSON.stringify(messageResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:');
    console.error('Has response:', !!error.response);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    if (error.response) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    }
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

testDirectMessage();
