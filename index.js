const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./mongodb/index'); 
const routes = require('./routes/index');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// CORS whitelist configuration
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000', 
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(routes);

app.use(connectDB);

app.listen(PORT, () => {    
  console.log(`Server is running on port ${PORT}`);
});

