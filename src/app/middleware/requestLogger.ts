import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import logger from '../utils/logger';

const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const suppliedId = req.headers['x-request-id'];
    const requestId =
      typeof suppliedId === 'string' && suppliedId.trim()
        ? suppliedId
        : randomUUID();

    res.setHeader('x-request-id', requestId);
    return requestId;
  },
  serializers: {
    req: req => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    }),
    res: res => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: req => `${req.method} ${req.url} completed`,
  customErrorMessage: req => `${req.method} ${req.url} failed`,
});

export default requestLogger;
