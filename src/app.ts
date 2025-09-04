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
// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   }),
// );
const allowedOrigins = [
  'https://techcrafters.tech',
  'https://admin.techcrafters.tech',
  'https://socket.techcrafters.tech',
  // Add more domains as needed
];

const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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
