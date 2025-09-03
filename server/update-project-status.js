const mongoose = require('mongoose');
const ThesisProject = require('./models/ThesisProject');

const updateProjectStatus = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/thesis-sync', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Update all projects that don't have a status field
    const result = await ThesisProject.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'proposal' } }
    );

    console.log(`Updated ${result.modifiedCount} projects with default status 'proposal'`);

    // Also update projects with null or empty status
    const result2 = await ThesisProject.updateMany(
      { $or: [{ status: null }, { status: '' }] },
      { $set: { status: 'proposal' } }
    );

    console.log(`Updated ${result2.modifiedCount} projects with null/empty status`);

    mongoose.disconnect();
    console.log('Database update completed');
  } catch (error) {
    console.error('Error updating project status:', error);
    process.exit(1);
  }
};

updateProjectStatus();
