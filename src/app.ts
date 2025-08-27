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
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
);

// Remove duplicate static middleware
// app.use(app.static('public'));

// application routes
app.use('/api/v1', router);

app.get('/success', async (req, res) => {
  const paymentDetails = {
    transactionId: 'TXN-2024-001234', // Replace with actual transaction ID
    amount: '$99.99', // Replace with actual amount
    currency: 'USD', // Replace with currency if needed
    cardLast4: '4242', // Replace with actual card last 4 digits
    paymentDate: new Date().toLocaleString(), // Replace with actual date
  };
  res.render('paymentError', { message: '', device: 'webdsite' });
});
// app.get('/download', async (req, res) => {
//   const fileUrl = req.query.url; // Pass your view URL as ?url=

//   if (!fileUrl) {
//     return res.status(400).send('Missing file URL');
//   }
//   console.log(fileUrl);
//   try {
//     const response = await axios({
//       method: 'GET',
//       url: fileUrl,
//       responseType: 'stream',
//     });
//     console.log(response);
//     // Extract filename from URL or set default
//     const fileName = 'downloaded_file.mp4';

//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

//     // Pipe the remote file stream to the client
//     response.data.pipe(res);
//   } catch (err) {
//     console.log(err);
//     res.status(500).send('Error downloading file');
//   }
// });

// app.get('/download-zip', async (req, res) => {
//   // Example: images URLs can come from query or body
//   // For simplicity, here is a static list
//   const imageUrls = [
//     'https://real-state-admin.s3.eu-north-1.amazonaws.com/images/user/profile/856398',
//     'https://real-state-admin.s3.eu-north-1.amazonaws.com/images/user/profile/856398',

//   ];

//   res.setHeader('Content-Type', 'application/zip');
//   res.setHeader('Content-Disposition', 'attachment; filename="images.zip"');

//   const archive = archiver('zip', {
//     zlib: { level: 9 },
//   });

//   archive.on('error', err => {
//     throw err;
//   });

//   // Pipe archive data to the response
//   archive.pipe(res);

//   for (let i = 0; i < imageUrls.length; i++) {
//     const url = imageUrls[i];
//     const filename = `image_${i + 1}.png`;

//     // Fetch image as stream and append to zip
//     const response = await axios({
//       method: 'GET',
//       url,
//       responseType: 'stream',
//     });

//     archive.append(response.data, { name: filename });
//   }

//   // Finalize the archive (no more files)
//   await archive.finalize();
// });
app.get('/', (req: Request, res: Response) => {
  res.send('server is running');
});
app.use(globalErrorHandler);

//Not Found
app.use(notFound);

export default app;
