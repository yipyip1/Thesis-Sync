require('dotenv').config();
const mongoose = require('mongoose');
const ThesisProject = require('./models/ThesisProject');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-sync')
  .then(async () => {
    console.log('Connected to DB');
    
    // Check all projects
    const projects = await ThesisProject.find({})
      .populate('supervisor', 'name email role')
      .populate('students', 'name email role');
    
    console.log('\n=== ALL PROJECTS IN DATABASE ===');
    console.log('Total projects:', projects.length);
    
    projects.forEach((project, index) => {
      console.log(`\nProject ${index + 1}:`);
      console.log('  Title:', project.title);
      console.log('  isPublic:', project.isPublic);
      console.log('  Status:', project.status);
      console.log('  Supervisor:', project.supervisor?.name, '(', project.supervisor?.role, ')');
      console.log('  Students:', project.students?.length || 0);
      console.log('  Created:', project.createdAt);
    });
    
    // Check users
    const users = await User.find({}, 'name email role');
    console.log('\n=== ALL USERS ===');
    users.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
