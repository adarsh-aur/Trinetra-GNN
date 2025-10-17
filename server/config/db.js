import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log('\n' + '='.repeat(50));
    console.log('✅ MongoDB Connected Successfully');
    console.log('='.repeat(50));
    console.log(`📊 Database Host: ${conn.connection.host}`);
    console.log(`📁 Database Name: ${conn.connection.name}`);
    console.log(`🔌 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    console.log('='.repeat(50) + '\n');

    // Handle MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ MongoDB Connection Failed');
    console.error('='.repeat(50));
    console.error(`Error: ${error.message}`);
    console.error('='.repeat(50) + '\n');
    
    process.exit(1);
  }
};

export default connectDB;