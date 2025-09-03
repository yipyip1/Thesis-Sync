require('dotenv').config();
const mongoose = require('mongoose');
const ThesisApplication = require('./models/ThesisApplication');
const ThesisProject = require('./models/ThesisProject');
const Group = require('./models/Group');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-sync')
  .then(async () => {
    console.log('Connected to DB');
    
    // Check all applications
    const applications = await ThesisApplication.find({})
      .populate('project', 'title')
      .populate('team', 'name')
      .populate('applicant', 'name email role');
    
    console.log('\n=== ALL THESIS APPLICATIONS ===');
    console.log('Total applications:', applications.length);
    
    if (applications.length > 0) {
      applications.forEach((app, index) => {
        console.log(`\nApplication ${index + 1}:`);
        console.log('  ID:', app._id);
        console.log('  Project:', app.project?.title);
        console.log('  Team:', app.team?.name);
        console.log('  Applicant:', app.applicant?.name, `(${app.applicant?.role})`);
        console.log('  Status:', app.status);
        console.log('  Applied at:', app.appliedAt);
      });
    }
    
    // Check groups that could be teams
    const groups = await Group.find({})
      .populate('members.user', 'name email role');
    
    console.log('\n=== ALL GROUPS (TEAMS) ===');
    console.log('Total groups:', groups.length);
    
    groups.forEach((group, index) => {
      console.log(`\nGroup ${index + 1}:`);
      console.log('  ID:', group._id);
      console.log('  Name:', group.name);
      console.log('  Members:', group.members.length);
      group.members.forEach(member => {
        console.log(`    - ${member.user.name} (${member.role})`);
      });
    });
    
    mongoose.disconnect();
  })
  .catch(console.error);
