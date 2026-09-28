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

## Search apartments inside a city boundary

Use `GET /property-types/global-search` (under the API base URL) with
`searchType=Apartment` and `polygon` containing a JSON array of
`[longitude, latitude]` pairs. The frontend supplies the city boundary; the
backend does not convert a city name into a polygon.

```js
const params = new URLSearchParams({
  searchType: 'Apartment',
  polygon: JSON.stringify([
    [3.0, 36.7],
    [3.2, 36.7],
    [3.2, 36.85],
    [3.0, 36.85],
  ]),
  page: '1',
  limit: '10',
});
fetch(`${API_BASE_URL}/property-types/global-search?${params}`);
```

Send 3–500 numeric coordinate pairs forming a simple boundary without crossing
edges. Closing the ring by repeating the first point is optional. Invalid input
returns HTTP 400. Polygon search overrides the existing five-mile latitude /
longitude radius; date, capacity, and pagination filters continue to apply.
It also supports `searchType=Property` using room-type locations.
Results retain the existing `{ meta, data }` response within the API envelope.

## Features

### Apartment drafts

All draft endpoints require a hotel-owner bearer token and only access that
owner's drafts. Drafts use a separate collection and are excluded from public
apartment searches, detail pages, and booking lookup.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/apartment-drafts` | Save an empty or partial draft |
| GET | `/api/v1/apartment-drafts?page=1&limit=10` | List own drafts |
| GET | `/api/v1/apartment-drafts/:id` | Resume a draft |
| PATCH | `/api/v1/apartment-drafts/:id` | Save changed fields |
| DELETE | `/api/v1/apartment-drafts/:id` | Delete own draft |
| POST | `/api/v1/apartment-drafts/:id/submit` | Validate and submit for approval |

Create/update accept apartment fields directly as JSON, e.g.
`{"name":"My apartment","price":80}`. They also accept multipart form data
with a JSON `data` field, up to 10 `images`, and one `banner` file. Missing
fields are preserved on PATCH; supplied arrays and nested objects replace
their previous values. Send `images: []` to clear the draft's image references.
Existing uploaded objects are retained in storage when references or drafts
are deleted; no shared image objects are deleted by these endpoints.

Draft responses contain apartment fields directly, e.g.
`{ _id, author, name, price, images, location, createdAt, updatedAt }`, inside
the standard response's `data`. The list uses `data: { meta, data: [...] }`.
The draft schema mirrors apartment fields, with optional listing details for
partial saves. Supplied values are type-checked and validated. Legacy nested
draft data is flattened on reads and migrated to top-level fields on edit.
Client-supplied ownership, approval, rating, boost, and deletion fields are
ignored. Incomplete data is allowed until submit. Submit validates against
the full Apartment schema, creates a `pending` apartment, and removes the
draft in one MongoDB transaction (requires a replica set or sharded cluster).
Validation failure keeps the draft. The submit response contains the new
apartment, whose ID differs from the draft ID. Concurrent/repeated submits
cannot create multiple apartments from one draft; a consumed draft returns 404.

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

For support or inquiries, please contact [dev.nazmulhasan@gmail.com](mailto:dev.nazmulhasan@gmail.com).
