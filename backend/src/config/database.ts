import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      const error = new Error('MONGODB_URI is not defined in environment variables');
      logger.error('❌ ' + error.message);
      logger.error('💡 Please create a .env file in the backend directory with:');
      logger.error('   MONGODB_URI=mongodb://localhost:27017/dashboard');
      logger.error('   or');
      logger.error('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
      throw error;
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('✅ MongoDB already connected');
      return;
    }

    // Sanitize URI for logging (hide password)
    const safeUri = mongoUri.replace(/:([^@]+)@/, ':****@');
    logger.info(`🔌 Connecting to MongoDB: ${safeUri}`);

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Force IPv4
    };

    await mongoose.connect(mongoUri, options);

    // Verify connection
    if (mongoose.connection.readyState === 1) {
      logger.info('✅ MongoDB connection established successfully');
      logger.info(`   Database: ${mongoose.connection.name || 'default'}`);
      logger.info(`   Host: ${mongoose.connection.host}:${mongoose.connection.port || 'default'}`);
    } else {
      throw new Error('Connection established but readyState is not 1');
    }

    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB connection event: connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected');
    });

  } catch (error: any) {
    logger.error('❌ Failed to connect to MongoDB:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('MONGODB_URI')) {
      // Already handled above
    } else if (error.message.includes('ETIMEOUT') || error.message.includes('querySrv')) {
      logger.error('💡 Network/DNS timeout. Check:');
      logger.error('   1. Internet connection');
      logger.error('   2. VPN/Firewall settings');
      logger.error('   3. MongoDB Atlas cluster status');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      logger.error('💡 IP Whitelist issue. Fix:');
      logger.error('   1. Go to MongoDB Atlas → Network Access');
      logger.error('   2. Add IP: 0.0.0.0/0 (allow all)');
    } else if (error.message.includes('authentication failed')) {
      logger.error('💡 Authentication failed. Check:');
      logger.error('   1. Username and password in MONGODB_URI');
      logger.error('   2. Database user exists in MongoDB Atlas');
    }
    
    throw error;
  }
};

/**
 * Check if database is connected
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Export closeDatabase for graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('✅ MongoDB connection closed gracefully');
  } catch (error) {
    logger.error('❌ Error closing MongoDB:', error);
  }
};

// import mongoose from "mongoose";
// import { logger } from "./logger";

// let isConnected = false;
// let connectionAttempts = 0;
// const MAX_RETRY_ATTEMPTS = 2; // Reduced to fail faster
// const RETRY_DELAY_MS = 3000; // Reduced delay

// /**
//  * Connect to MongoDB with retry logic and better error handling
//  */
// export const connectDatabase = async (): Promise<void> => {
//   const mongoUri = process.env.MONGODB_URI;

//   if (!mongoUri) {
//     throw new Error("MONGODB_URI is not defined in environment variables");
//   }

//   // Sanitize URI for logging (hide password)
//   const safeUri = mongoUri.replace(/:([^@]+)@/, ":****@");
  
//   // Connection events (register BEFORE connect)
//   mongoose.connection.on("connected", () => {
//     isConnected = true;
//     connectionAttempts = 0;
//     logger.info("✅ MongoDB connection established");
//     logger.info(`   Database: ${mongoose.connection.name || 'default'}`);
//   });

//   mongoose.connection.on("error", (err) => {
//     isConnected = false;
//     logger.error("❌ MongoDB connection error:", err.message);
//   });

//   mongoose.connection.on("disconnected", () => {
//     isConnected = false;
//     logger.warn("⚠️  MongoDB disconnected");
//   });

//   // Attempt connection with retry logic
//   while (connectionAttempts < MAX_RETRY_ATTEMPTS) {
//     try {
//       connectionAttempts++;
//       logger.info(`🔄 MongoDB connection attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}`);
//       logger.info(`   URI: ${safeUri}`);

//       await mongoose.connect(mongoUri, {
//         maxPoolSize: 10,
//         serverSelectionTimeoutMS: 30000, // Increased to 30s for slow networks
//         socketTimeoutMS: 45000,
//         connectTimeoutMS: 30000, // Increased to 30s for SSL handshake
//         family: 4, // Force IPv4
//       });

//       logger.info("✅ MongoDB connected successfully!");
//       return; // Success!

//     } catch (error: any) {
//       logger.error(`❌ MongoDB connection attempt ${connectionAttempts} failed:`, error.message);

//       // Provide helpful diagnostics
//       if (error.message.includes("ETIMEOUT") || error.message.includes("querySrv")) {
//         logger.error("🔍 Network/DNS timeout detected. Possible causes:");
//         logger.error("   1. Internet connection issues");
//         logger.error("   2. VPN/Firewall blocking MongoDB Atlas");
//         logger.error("   3. DNS resolution failure");
//         logger.error("   4. MongoDB Atlas cluster is down");
//         logger.error("");
//         logger.error("💡 Quick fixes to try:");
//         logger.error("   • Check your internet connection");
//         logger.error("   • Disable VPN temporarily");
//         logger.error("   • Try a different network (mobile hotspot)");
//         logger.error("   • Verify MongoDB Atlas cluster status");
//       }

//       if (error.message.includes("IP") || error.message.includes("not allowed")) {
//         logger.error("🔍 IP Whitelist issue detected:");
//         logger.error("   • Go to MongoDB Atlas → Network Access");
//         logger.error("   • Add IP: 0.0.0.0/0 (allow all IPs)");
//       }

//       if (error.message.includes("authentication failed")) {
//         logger.error("🔍 Authentication issue:");
//         logger.error("   • Check MONGODB_URI username and password");
//         logger.error("   • Verify database user exists in MongoDB Atlas");
//       }

//       // Retry logic
//       if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
//         logger.info(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
//         await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
//       } else {
//         logger.error("❌ Max retry attempts reached. MongoDB connection failed.");
//         throw error;
//       }
//     }
//   }
// };

// /**
//  * Check if MongoDB is currently connected
//  */
// export const isDatabaseConnected = (): boolean => {
//   return isConnected && mongoose.connection.readyState === 1;
// };

// /**
//  * Gracefully close MongoDB connection
//  */
// export const closeDatabase = async (): Promise<void> => {
//   if (mongoose.connection.readyState !== 0) {
//     try {
//       await mongoose.connection.close();
//       isConnected = false;
//       logger.info("✅ MongoDB connection closed gracefully");
//     } catch (error: any) {
//       logger.error("❌ Error closing MongoDB connection:", error.message);
//       throw error;
//     }
//   }
// };
