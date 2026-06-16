# School Activity Registration App

A simple Express + MongoDB website for student activity registration.

## Features

- Student registration
- Student login with national ID and password
- Unique national ID validation
- Automatic student ID generation
- Gender code: male = B, female = G
- Class code: John = Y, Philo = S, Mary = M
- Upload birth certificate and payment proof
- Activity selection with checkboxes
- Teacher/admin login
- Teacher dashboard for all students
- CSV export
- Password hashing with bcrypt
- Session storage in MongoDB

## Requirements

- Node.js
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Edit `.env` if needed:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/school_activity_app
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
ADMIN_PHONE=01012345678
ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

4. Seed the first teacher/admin and sample activities:

```bash
npm run seed
```

The admin login is created from `ADMIN_PHONE` and `ADMIN_PASSWORD` in `.env`. Do not use a default password in production.

5. Start the app:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Student ID Format

```text
[Gender Code][Class Code]-[Year]-[Number]
```

Examples:

```text
BY-2026-0001 = male student in John class
GS-2026-0001 = female student in Philo class
BM-2026-0001 = male student in Mary class
```

## Important Production Notes

Before using this with real student data:

- Use HTTPS.
- Change SESSION_SECRET.
- Change the default admin password.
- Do not expose uploads publicly without access controls.
- Use a secure MongoDB account and network restrictions.
- Back up the database regularly.
