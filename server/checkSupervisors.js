const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/thesis-sync', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkSupervisors() {
  try {
    console.log('Checking supervisors in database...');
    
    // Get all supervisors
    const supervisors = await User.find({ role: 'supervisor' }).select('-password');
    
    console.log(`Total supervisors found: ${supervisors.length}`);
    
    if (supervisors.length > 0) {
      console.log('\nSupervisor details:');
      supervisors.forEach((supervisor, index) => {
        console.log(`${index + 1}. ${supervisor.name}`);
        console.log(`   Email: ${supervisor.email}`);
        console.log(`   Role: ${supervisor.role}`);
        console.log(`   IsActive: ${supervisor.isActive}`);
        console.log(`   IsBanned: ${supervisor.isBanned}`);
        console.log(`   Department: ${supervisor.department || 'Not set'}`);
        console.log(`   Skills: ${supervisor.skills || 'Not set'}`);
        console.log(`   Research Interests: ${supervisor.researchInterests || 'Not set'}`);
        console.log('---');
      });
    } else {
      console.log('No supervisors found in database.');
    }
    
    // Test the search query that the API uses
    console.log('\nTesting API search query...');
    const apiQuery = { 
      role: 'supervisor', 
      isActive: true, 
      isBanned: false 
    };
    
    const apiResults = await User.find(apiQuery).select('-password -activityLog');
    console.log(`API query results: ${apiResults.length} supervisors`);
    
    if (apiResults.length > 0) {
      console.log('API would return:');
      apiResults.forEach((supervisor, index) => {
        console.log(`${index + 1}. ${supervisor.name} (${supervisor.email})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking supervisors:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkSupervisors();
