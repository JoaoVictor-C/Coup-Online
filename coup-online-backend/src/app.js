const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');
const { gameSockets } = require('./sockets/gameSockets');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./services/databaseService');
const errorHandler = require('./middleware/errorHandler');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Consolidated Middleware for Socket.IO Authentication
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

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
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
    console.log('New client connected:', socket.id, 'User ID:', socket.user.id);
    gameSockets(io, socket);

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
        // Handle disconnection if needed
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});