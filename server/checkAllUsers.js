const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/thesis-sync-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkAllUsers() {
  try {
    console.log('Checking all users in database...');
    
    // Get all users
    const users = await User.find({}).select('name email role isActive isBanned');
    
    console.log(`Total users found: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\nAll users:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, Active: ${user.isActive}, Banned: ${user.isBanned}`);
      });
      
      // Look for Ahanaf specifically
      const ahanaf = users.find(u => u.name.toLowerCase().includes('ahanaf') || u.name.toLowerCase().includes('tanvir'));
      if (ahanaf) {
        console.log('\nFound Ahanaf:');
        console.log(`Name: ${ahanaf.name}`);
        console.log(`Email: ${ahanaf.email}`);
        console.log(`Role: ${ahanaf.role}`);
        console.log(`IsActive: ${ahanaf.isActive}`);
        console.log(`IsBanned: ${ahanaf.isBanned}`);
      } else {
        console.log('\nNo user with name containing "ahanaf" or "tanvir" found.');
      }
    } else {
      console.log('No users found in database.');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAllUsers();
