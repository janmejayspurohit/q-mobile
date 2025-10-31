// Script to clear all collections in the database
import { config } from 'dotenv';
config({ path: '.env.local' });

import connectDB from '../lib/mongodb';
import User from '../lib/models/User';
import Admin from '../lib/models/Admin';
import Question from '../lib/models/Question';
import Game from '../lib/models/Game';

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️  Starting database cleanup...\n');

    // Clear all collections
    const usersDeleted = await User.deleteMany({});
    console.log(`✅ Deleted ${usersDeleted.deletedCount} users`);

    const adminsDeleted = await Admin.deleteMany({});
    console.log(`✅ Deleted ${adminsDeleted.deletedCount} admins`);

    const questionsDeleted = await Question.deleteMany({});
    console.log(`✅ Deleted ${questionsDeleted.deletedCount} questions`);

    const gamesDeleted = await Game.deleteMany({});
    console.log(`✅ Deleted ${gamesDeleted.deletedCount} games`);

    console.log('\n🎉 Database cleared successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${usersDeleted.deletedCount}`);
    console.log(`   Admins: ${adminsDeleted.deletedCount}`);
    console.log(`   Questions: ${questionsDeleted.deletedCount}`);
    console.log(`   Games: ${gamesDeleted.deletedCount}`);
    console.log(
      `   Total: ${usersDeleted.deletedCount + adminsDeleted.deletedCount + questionsDeleted.deletedCount + gamesDeleted.deletedCount} records deleted`
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
