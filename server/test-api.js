// Simple test to check thesis projects API
const axios = require('axios');

// You need to replace this with an actual student token
// To get a token, you can:
// 1. Log in as a student in the browser
// 2. Open browser console
// 3. Run: localStorage.getItem('token')
// 4. Copy the token value here

const STUDENT_TOKEN = 'YOUR_STUDENT_TOKEN_HERE';
const API_URL = 'http://localhost:5000/api/thesis-projects';

async function testAPI() {
  try {
    console.log('Testing thesis projects API...');
    console.log('URL:', API_URL);
    
    const response = await axios.get(API_URL, {
      headers: {
        'Authorization': `Bearer ${STUDENT_TOKEN}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

if (STUDENT_TOKEN !== 'YOUR_STUDENT_TOKEN_HERE') {
  testAPI();
} else {
  console.log('Please set a valid student token in this script first.');
  console.log('To get a token:');
  console.log('1. Log in as a student in the browser');
  console.log('2. Open browser console');
  console.log('3. Run: localStorage.getItem("token")');
  console.log('4. Copy the token value to this script');
}
