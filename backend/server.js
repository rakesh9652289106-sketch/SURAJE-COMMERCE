require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173', // Vite default port
    credentials: true 
}));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PATCH') console.log('Body:', req.body);
    next();
});

// Import Routes
const { router: authRouter } = require('./routes/authRoute');
const productRouter = require('./routes/productRoute');
const adminRouter = require('./routes/adminRoute');
const indexRouter = require('./routes/indexRoute');
const userRouter = require('./routes/userRoute');

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api', indexRouter);

// Admin routes are now handled by adminRouter

// User Profile logic is now handled by userRouter at /api/user

const server = app.listen(PORT, () => {
    console.log(`Professional API Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('SERVER ERROR:', err);
    process.exit(1);
});
