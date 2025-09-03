const mongoose = require('mongoose');
const ThesisApplication = require('./models/ThesisApplication');
const ThesisProject = require('./models/ThesisProject');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/thesis-sync', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkOrphanedApplications() {
  try {
    console.log('Checking for orphaned applications...');
    
    // Get all applications and populate project
    const applications = await ThesisApplication.find({}).populate('project');
    
    console.log(`Total applications: ${applications.length}`);
    
    const orphanedApplications = applications.filter(app => !app.project);
    
    if (orphanedApplications.length > 0) {
      console.log(`Found ${orphanedApplications.length} orphaned applications:`);
      orphanedApplications.forEach(app => {
        console.log(`- Application ID: ${app._id}, Team: ${app.team}, Status: ${app.status}`);
      });
      
      console.log('\nDeleting orphaned applications...');
      for (const app of orphanedApplications) {
        await ThesisApplication.findByIdAndDelete(app._id);
        console.log(`Deleted application ${app._id}`);
      }
    } else {
      console.log('No orphaned applications found.');
    }
    
    // Check applications with valid projects
    const validApplications = applications.filter(app => app.project);
    console.log(`Valid applications: ${validApplications.length}`);
    
  } catch (error) {
    console.error('Error checking applications:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkOrphanedApplications();
