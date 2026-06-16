{
  "name": "school-activity-registration-app",
  "version": "1.0.0",
  "description": "Simple and secure school activity registration website using Express and MongoDB",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js"
  },
  "engines": {
    "node": "20.x"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cloudinary": "^1.41.3",
    "connect-mongo": "^5.1.0",
    "dotenv": "^16.6.1",
    "express": "^4.18.3",
    "express-rate-limit": "^7.5.1",
    "express-session": "^1.18.0",
    "helmet": "^7.1.0",
    "mongo-sanitize": "^1.1.0",
    "mongoose": "^8.2.1",
    "multer": "^1.4.5-lts.1",
    "multer-storage-cloudinary": "^4.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
