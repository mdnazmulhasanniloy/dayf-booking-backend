import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
      /** Raw request body string — required for Chargily webhook HMAC verification */
      rawBody?: string;
    }
  }
}
