import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis | null> => {
  try {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD;

    if (!host) {
      logger.warn('⚠️  Redis host not configured. Running without Redis (caching disabled).');
      return null;
    }

    logger.info(`🔄 Attempting to connect to Redis at ${host}:${port}...`);

    redisClient = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: 2,
      connectTimeout: 8000, // Reduced from 10s
      retryStrategy: (times: number) => {
        if (times > 2) {
          logger.warn('⚠️  Redis connection failed after 2 retries. Continuing without Redis.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 2000);
        logger.info(`   Retry ${times}/2 in ${delay}ms...`);
        return delay;
      },
      reconnectOnError: () => {
        return false; // Don't auto-reconnect on error
      },
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Fail fast if not connected
    });

    // Handle all error events to prevent unhandled errors
    redisClient.on('error', (err) => {
      // Suppress error logging during initial connection attempt
      if (!err.message.includes('ETIMEDOUT') && !err.message.includes('ECONNREFUSED')) {
        logger.error('❌ Redis error:', err.message);
      }
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connection established');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis is ready');
    });

    redisClient.on('close', () => {
      logger.warn('⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    // Attempt connection with timeout
    try {
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 8000)
        )
      ]);

      // Test with ping
      await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), 3000)
        )
      ]);

      logger.info('✅ Redis connected and responding');
      return redisClient;

    } catch (connectionError: any) {
      throw connectionError;
    }

  } catch (error: any) {
    logger.warn('⚠️  Redis connection failed:', error.message);
    
    // Provide helpful diagnostics
    if (error.message.includes('ETIMEDOUT')) {
      logger.error('🔍 Network timeout detected. Possible causes:');
      logger.error('   1. Redis server is not reachable');
      logger.error('   2. Firewall blocking connection');
      logger.error('   3. Incorrect host/port configuration');
      logger.error('   4. Redis cloud service is down');
      logger.error('');
      logger.error('💡 Quick fixes to try:');
      logger.error('   • Verify REDIS_HOST and REDIS_PORT in .env');
      logger.error('   • Check if Redis service is running');
      logger.error('   • Try disabling VPN/Firewall temporarily');
      logger.error('   • Verify Redis cloud service status');
    }

    if (error.message.includes('ECONNREFUSED')) {
      logger.error('🔍 Connection refused:');
      logger.error('   • Redis server is not running on specified host:port');
      logger.error('   • Check if Redis is installed and running');
    }

    if (error.message.includes('NOAUTH') || error.message.includes('authentication')) {
      logger.error('🔍 Authentication issue:');
      logger.error('   • Check REDIS_PASSWORD in .env');
      logger.error('   • Verify Redis ACL/password configuration');
    }

    logger.warn('⚠️  Server will continue without Redis (caching disabled)');
    
    // Clean up failed connection
    if (redisClient) {
      try {
        redisClient.removeAllListeners(); // Remove all event listeners
        await redisClient.quit();
      } catch (e) {
        // Ignore cleanup errors
        try {
          redisClient.disconnect();
        } catch (e2) {
          // Final attempt to disconnect
        }
      }
      redisClient = null;
    }
    
    return null; // Return null instead of throwing
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const isRedisConnected = (): boolean => {
  return redisClient !== null && redisClient.status === 'ready';
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    } finally {
      redisClient = null;
    }
  }
};
