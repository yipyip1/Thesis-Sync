require('dotenv').config();
const mongoose = require('mongoose');
const ThesisProject = require('./models/ThesisProject');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-sync')
  .then(async () => {
    console.log('Connected to DB');
    
    // Get a student user ID
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('No student found');
      mongoose.disconnect();
      return;
    }
    
    console.log('Testing with student:', student.name, student._id);
    
    // Simulate the exact query that would be used for a student
    const query = {
      $and: [
        {
          $or: [
            { isPublic: true },
            { students: student._id },
            { supervisor: student._id },
            { coSupervisors: student._id }
          ]
        }
      ]
    };
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    // Execute the query
    const projects = await ThesisProject.find(query)
      .populate([
        { path: 'students', select: 'name email avatar department' },
        { path: 'supervisor', select: 'name email avatar department' },
        { path: 'coSupervisors', select: 'name email avatar department' }
      ])
      .sort({ createdAt: -1 });
    
    console.log('Found projects:', projects.length);
    projects.forEach(project => {
      console.log(`- ${project.title} (isPublic: ${project.isPublic}, supervisor: ${project.supervisor?.name})`);
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
