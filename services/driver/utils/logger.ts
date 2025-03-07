import winston from 'winston';
const { format, transports } = winston;

// Define log format
const logFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'driver-api' },
  transports: [
    // Write logs to console
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      )
    }),
    // Write errors to error.log
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // Write all logs to combined.log
    new transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Add stream for Morgan HTTP logger
interface LoggerStream {
  write(message: string): void;
}

const stream: LoggerStream = {
  write: (message: string) => logger.info(message.trim())
};

logger.stream = stream;

export default logger;