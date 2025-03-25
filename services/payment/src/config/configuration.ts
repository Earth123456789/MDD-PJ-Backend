// payment/src/config/configuration.ts

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'payment_service',
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  services: {
    matching: {
      url: process.env.MATCHING_SERVICE_URL || 'http://localhost:3001',
    },
    user: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    },
  },
  pricing: {
    // Base fare configuration
    baseFares: {
      CAR: parseInt(process.env.BASE_FARE_CAR || '40', 10),
      VAN: parseInt(process.env.BASE_FARE_VAN || '50', 10),
      TRUCK: parseInt(process.env.BASE_FARE_TRUCK || '100', 10),
      MOTORCYCLE: parseInt(process.env.BASE_FARE_MOTORCYCLE || '20', 10),
    },
    // Rate per kilometer configuration
    distanceRates: {
      CAR: parseFloat(process.env.DISTANCE_RATE_CAR || '7'),
      VAN: parseFloat(process.env.DISTANCE_RATE_VAN || '9'),
      TRUCK: parseFloat(process.env.DISTANCE_RATE_TRUCK || '15'),
      MOTORCYCLE: parseFloat(process.env.DISTANCE_RATE_MOTORCYCLE || '4'),
    },
    // Rate per minute configuration
    timeRates: {
      CAR: parseFloat(process.env.TIME_RATE_CAR || '2'),
      VAN: parseFloat(process.env.TIME_RATE_VAN || '2.5'),
      TRUCK: parseFloat(process.env.TIME_RATE_TRUCK || '3'),
      MOTORCYCLE: parseFloat(process.env.TIME_RATE_MOTORCYCLE || '1'),
    },
    // Surge multiplier (e.g., 1.5x during peak hours)
    surgeMultiplier: parseFloat(process.env.SURGE_MULTIPLIER || '1.5'),
  },
});
