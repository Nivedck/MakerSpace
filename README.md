# Makerspace Access Control

This is a Web application for managing check-in and check-out at  Makerspace. It supports both students and staff, records entry details, captures photos, and provides an admin dashboard for monitoring sessions.

## Features

- Student and staff check-in 
- Mandatory photo capture for check-in
- Check-out using registration number or phone number
- Admin dashboard with live sessions, daily records, and statistics
- CSV export for daily sessions


## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Configure environment variables:**
   - Create a `.env.local` file with Firebase and Cloudinary credentials.
   - Example variables:
     ```
     FIREBASE_SERVICE_ACCOUNT_JSON=...
     CLOUDINARY_CLOUD_NAME=...
     CLOUDINARY_API_KEY=...
     CLOUDINARY_API_SECRET=...
     ADMIN_EMAIL=youradmin@example.com
     ADMIN_PASSWORD=yourpassword
     ADMIN_JWT_SECRET=your_jwt_secret
     ```

3. **Run the development server:**
   ```sh
   npm run dev
   ```

4. **Access the app:**
   - User: [http://localhost:3000](http://localhost:3000)
   - Admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Project Structure

- `pages/` — Next.js pages (forms, capture, admin, API routes)
- `lib/firebaseAdmin.js` — Firebase Admin SDK setup
- `public/styles.css` — App styles

## Dependencies

- Next.js
- React
- Firebase Admin SDK
- Cloudinary
- Sharp
- JSON Web Token

## License

MIT