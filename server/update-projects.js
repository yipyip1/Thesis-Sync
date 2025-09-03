require('dotenv').config();
const mongoose = require('mongoose');
const ThesisProject = require('./models/ThesisProject');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-sync')
  .then(async () => {
    console.log('Connected to DB');
    
    // Check current projects
    const projects = await ThesisProject.find({});
    console.log('Total projects:', projects.length);
    
    if (projects.length > 0) {
      console.log('Current projects:', projects.map(p => ({ 
        title: p.title, 
        isPublic: p.isPublic,
        supervisor: p.supervisor 
      })));
      
      // Update all projects to be public
      const result = await ThesisProject.updateMany(
        { isPublic: { $ne: true } },
        { $set: { isPublic: true } }
      );
      
      console.log('Updated projects:', result.modifiedCount);
      
      // Verify the update
      const updatedProjects = await ThesisProject.find({}, 'title isPublic');
      console.log('Projects after update:', updatedProjects.map(p => ({ title: p.title, isPublic: p.isPublic })));
    }
    
    mongoose.disconnect();
  })
  .catch(console.error);
