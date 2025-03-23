export default () => ({
  port: parseInt(process.env.PORT || '3003', 10),
  environment: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  
  redis: {
    url: process.env.REDIS_URL,
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'payment_service',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '1h',
  },
  
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE,
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  promptPay: {
    defaultPhoneNumber: process.env.DEFAULT_PROMPTPAY_PHONE || '0000000000',
  },
  
  services: {
    userDriver: {
      url: process.env.USER_DRIVER_SERVICE_URL || 'http://localhost:3001',
      apiKey: process.env.USER_DRIVER_API_KEY,
    },
    vehicleMatching: {
      url: process.env.VEHICLE_MATCHING_SERVICE_URL || 'http://localhost:3002',
      apiKey: process.env.VEHICLE_MATCHING_API_KEY,
    },
  },
});