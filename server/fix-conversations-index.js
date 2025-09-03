const mongoose = require('mongoose');
require('dotenv').config();

async function fixConversationsIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('directconversations');

    // Get current indexes
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Get all conversations
    console.log('\nCurrent conversations:');
    const conversations = await collection.find({}).toArray();
    console.log(JSON.stringify(conversations, null, 2));

    // Drop the problematic unique index
    try {
      await collection.dropIndex('participants_1');
      console.log('Dropped participants_1 index');
    } catch (error) {
      console.log('Index may not exist or already dropped:', error.message);
    }

    // Create a better compound index
    try {
      // Create an index that uses a hash of both participants
      await collection.createIndex(
        { 'participants.0': 1, 'participants.1': 1 },
        { 
          unique: true,
          name: 'participants_compound_unique'
        }
      );
      console.log('Created new compound unique index');
    } catch (error) {
      console.log('Error creating new index:', error.message);
    }

    // Get indexes after changes
    console.log('\nIndexes after changes:');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    console.log('\nIndex fix completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixConversationsIndex();
