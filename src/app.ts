/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import globalErrorHandler from './app/middleware/globalErrorhandler';
import notFound from './app/middleware/notfound';
import router from './app/routes';
// import axios from 'axios';
// import archiver from 'archiver';
const app: Application = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'public/ejs');
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

//parsers
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      'https://admin.techcrafters.tech/login',
      'https://www.admin.techcrafters.tech/login',
      'https://api.techcrafters.tech/login',
      'https://www.api.techcrafters.tech/login',
      'https://socket.techcrafters.tech/login',
      'https://www.socket.techcrafters.tech/login',
      'https://techcrafters.tech/login',
      'https://www.techcrafters.tech/login',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
);

// Remove duplicate static middleware
// app.use(app.static('public'));

// application routes
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('server is running');
});
app.use(globalErrorHandler);

//Not Found
app.use(notFound);

export default app;
