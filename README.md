# peakup_backend

#### Tech Stack:
Node.js: JavaScript runtime for building scalable server-side applications.
Express.js: Fast, minimalist web framework for Node.js.
TypeScript: Typed superset of JavaScript for better code quality and maintainability.
MongoDB (Mongoose): NoSQL database with schema-based modeling.

#### Prerequisites
Node.js v16+
MongoDB

#### Getting Started
# Clone the Repository
git clone https://github.com/devgeektech/peakup_backend.git

# Install Dependencies
npm install

## Set up environment variables
need to add .env file Create `.env` file at the root level and configure:
MONGO_URI=
JWT_SECRET=
FIREBASE_CREDENTIALS=
STRIPE_SECRET_KEY= 
...etc

## Database Setup
MongoDB does not require migrations, but ensure your MongoDB instance is running and the MONGO_URI is correctly set in the .env file.Running the

## Running the Application
npm run dev

## Branch with updated code 
main 

#### Folder Structure ****************
src >DB : Stores Database Models using Mongoose.

Middleware (Global Middleware) : Contains reusable middleware functions like;
Error Handlers
Route Handlers

# server.ts
The main entry point for the application, initializing:
Initializes Express App
Applies Middleware
Registers Routes
Connects to MongoDB