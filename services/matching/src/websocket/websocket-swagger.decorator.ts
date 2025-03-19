import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

export const WebSocketDoc = (options: {
  summary: string;
  description?: string;
  message?: string;
  response?: string;
}) => {
  return applyDecorators(
    ApiTags('WebSockets'),
    ApiOperation({
      summary: options.summary,
      description: `
WebSocket Event: ${options.message || 'N/A'}

${options.description || ''}

Response Event: ${options.response || 'N/A'}
      `,
    }),
  );
};
