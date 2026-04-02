import logger from 'moment-logger';
import Redis from 'ioredis';
import createServer, { CreateServerOptions } from '@/www';
import { port, isProduction, allowedDomains, redisHost, redisPort, redisUsername, redisPassword } from '@/config';

async function bootstrap() {
  try {
    // Start Server
    logger.log('Starting Server');
    logger.info(
      `Running in ${isProduction ? 'production' : 'development'} mode`,
    );

    const options: CreateServerOptions = {
      port,
      production: isProduction,
      whitelistedDomains: allowedDomains,
    };

    await createServer(options);

    const redisOptions: any = {
      host: redisHost,
      port: redisPort,
      username: redisUsername,
      password: redisPassword,
      // Remove TLS configuration since it's causing issues
      // Add connection retry strategy
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 5000);
        logger.warn(`Retrying Redis connection in ${delay}ms`);
        return delay;
      },
      // Enable auto-reconnect
      reconnectOnError: (err: Error) => {
        logger.error('Redis connection error:', err.message);
        return true; // Reconnect on any error
      }
    };

    // Only add TLS configuration if explicitly needed
    if (process.env.REDIS_TLS === 'true') {
      redisOptions.tls = {
        rejectUnauthorized: false
      };
    }

    const redis = new Redis(redisOptions);

    // Log Redis connection status
    redis.on('connect', () => {
      logger.info('Connected to Redis server');
      console.log('✅ Redis OK');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err);
      console.error('❌ Redis FAIL:', err);
    });


    logger.info(`Server started on port ${port}`);
  } catch (error) {
    logger.error(error);
  }
}
bootstrap();
