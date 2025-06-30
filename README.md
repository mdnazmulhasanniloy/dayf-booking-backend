# Dayf Booking Backend

A scalable backend API for hotel and apartment booking platforms, built with Node.js, Express, TypeScript, and MongoDB. This backend supports user authentication, property management, bookings, payments, notifications, messaging, and more.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Modules](#api-modules)
- [Testing](#testing)
- [License](#license)

---

## Features

- User authentication (JWT, Google, Facebook)
- Hotel/apartment property and room management
- Booking and payment processing (Stripe integration)
- Notifications and messaging (with Socket.io)
- File uploads (images, documents)
- Admin dashboard and analytics
- RESTful API with role-based access control
- Email notifications (OTP, password reset, support)
- Bookmarking, reviews, and content management

---

## Project Structure

```
.
├── src/
│   ├── app.ts                # Express app setup
│   ├── server.ts             # Server entry point
│   ├── app/
│   │   ├── builder/          # Builders (e.g., Stripe, Query)
│   │   ├── config/           # Configuration files
│   │   ├── constants/        # App-wide constants
│   │   ├── error/            # Error handling
│   │   ├── helpers/          # Helper utilities
│   │   ├── interface/        # TypeScript interfaces
│   │   ├── middleware/       # Express middlewares
│   │   ├── modules/          # Main API modules (users, bookings, etc.)
│   │   ├── routes/           # API route definitions
│   │   └── utils/            # Utility functions
│   └── socket.ts             # Socket.io setup
├── public/                   # Static files and email templates
│   ├── uploads/              # Uploaded files
│   └── view/                 # Email HTML templates
├── .env                      # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/your-org/dayf-booking-backend.git
   cd dayf-booking-backend
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

---

## Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```
NODE_ENV=development
PORT=5000
IP=127.0.0.1
DATABASE_URL=mongodb://localhost:27017/dayf-booking
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
STRIPE_API_KEY=your_stripe_key
STRIPE_API_SECRET=your_stripe_secret
S3_BUCKET_ACCESS_KEY=your_aws_access_key
S3_BUCKET_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
NODEMAILER_HOST_EMAIL=your_email
NODEMAILER_HOST_PASS=your_email_password
SOCKET_PORT=6001
```

---

## Running the Application

- **Development**
  ```sh
  npm run dev
  ```

- **Production**
  ```sh
  npm run build
  npm start
  ```

---

## API Modules

- **Authentication**: JWT, Google, Facebook login, password reset, OTP
- **Users**: Registration, profile, roles (admin, hotel owner, user)
- **Properties & Apartments**: CRUD for hotels, apartments, rooms, facilities
- **Bookings**: Room/apartment booking, status management
- **Payments**: Stripe integration, payment status, refunds
- **Notifications**: Real-time and email notifications
- **Messaging**: User-to-user chat, file attachments
- **Content**: CMS for static pages, banners, FAQs
- **Bookmarks & Reviews**: User bookmarks and property reviews

---

## Testing

- Use tools like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/) to test API endpoints.
- Automated tests can be added under a `tests/` directory.

---

## License

This project is licensed under the MIT License.

---

## Contact

For support or inquiries, please contact [your-email@example.com](mailto:your-email@example.com).