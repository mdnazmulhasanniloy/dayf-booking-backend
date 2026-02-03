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
import getUrlData from './scp';
import multer from 'multer';
import catchAsync from './app/utils/catchAsync';
import { rekognition } from './app/utils/rekognition';
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

app.use(
  cors({
    origin: [
      'http://206.162.244.133:3001',
      'http://localhost:4000',
      'http://10.10.10.48:5015:4000',
      'https://admin.techcrafters.tech',
      'https://www.admin.techcrafters.tech',
      'https://api.techcrafters.tech',
      'https://www.api.techcrafters.tech',
      'https://socket.techcrafters.tech',
      'https://www.socket.techcrafters.tech',
      'https://techcrafters.tech',
      'https://www.techcrafters.tech',
      'http://10.10.10.48:4000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
);
// Remove duplicate static middleware
// app.use(app.static('public'));

// application routes
// app.post(
//   '/api/verify',
//   multer({ storage: multer.memoryStorage() }).fields([
//     { name: 'idImage', maxCount: 1 },
//     { name: 'liveImage', maxCount: 1 },
//   ]),
//   catchAsync(async (req: Request, res: Response) => {
//     const idImage = req.files?.['idImage']?.[0];
//     const liveImage = req.files?.['liveImage']?.[0];

//     if (!idImage || !liveImage) {
//       return res.status(400).json({ message: 'Images missing' });
//     }

//     // Step-1: Detect face in ID
//     const detect = await rekognition
//       .detectFaces({
//         Image: { Bytes: idImage.buffer },
//       })
//       .promise();
//     console.log('detect-------------->>', detect);

//     if (!detect.FaceDetails || detect.FaceDetails.length === 0) {
//       return res.status(400).json({ message: 'No face found in ID' });
//     }

//     // Step-2: Compare faces
//     const compare = await rekognition
//       .compareFaces({
//         SourceImage: { Bytes: idImage.buffer },
//         TargetImage: { Bytes: liveImage.buffer },
//         SimilarityThreshold: 85,
//       })
//       .promise();
//     console.log('compare-------------->>', compare);

//     if (compare.FaceMatches && compare.FaceMatches.length > 0) {
//       console.log('id verification success');
//       return res.json({ success: true, verified: true });
//     }
//     console.log('id verification failed');
//     return res.status(401).json({ success: false, verified: false });
//   }),
// );

app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('server is running');
});
app.use(globalErrorHandler);

//Not Found
app.use(notFound);

export default app;
