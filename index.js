const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./src/routes/authRoutes');
const gameRoutes = require('./src/routes/gameRoutes');
const userRoutes = require('./src/routes/userRoutes');
const { gameSockets } = require('./src/sockets/gameSockets');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/services/databaseService');
const errorHandler = require('./src/middleware/errorHandler');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit'); // Added rate limiter
const helmet = require('helmet'); // Added security headers

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [process.env.CLIENT_URL, 'http://localhost:5173'] || '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware for Socket.IO Authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.user = decoded; // Ensure consistent naming
        next();
    });
});

// Make io accessible to controllers
app.set('io', io);

// Security Middleware
app.use(helmet());

// Rate Limiting Middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

app.use(cors({
    origin: [process.env.CLIENT_URL, 'http://179.108.3.212'] || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

// Connect to MongoDB
connectDB();

// Error Handling Middleware
app.use(errorHandler);

// Handle Socket.io connections
io.on('connection', (socket) => {
    console.log('New client connected: ', socket.id, 'User ID:', socket.user.id);
    gameSockets(io, socket);
});

// Handle Socket.IO errors globally
io.on('error', (error) => {
    console.error('Socket.IO error:', error);
});

// Graceful Shutdown
const shutdown = () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('HTTP server closed.');
        io.close(() => {
            console.log('Socket.IO server closed.');
            process.exit(0);
        });
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});