const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');
const gameSockets = require('./sockets/gameSockets');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./services/databaseService');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
    },
});

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);

// Connect to MongoDB
connectDB();

// Middleware
app.use(errorHandler);

// Handle Socket.io connections
io.on('connection', (socket) => {
    console.log('New client connected');
    gameSockets(io, socket);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});


// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});