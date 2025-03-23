# Chat Application Backend

This is a Flask-based backend for the real-time chat application with MongoDB integration.

## Features

- User Authentication (Register/Login)
- JWT token-based authorization
- MongoDB integration for data storage

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Configure the .env file with your settings:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/chat_app
   JWT_SECRET=your_secret_key
   ```

3. Run the application:
   ```
   python app.py
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  - Body: `{ "username": "user", "email": "user@example.com", "password": "password123" }`

- `POST /api/auth/login` - Login
  - Body: `{ "email": "user@example.com", "password": "password123" }` 