const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https'); // ✅ added for HTTPS
const app = express();
const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app); // ✅ replaced HTTP with HTTPS

const { Server } = require('socket.io');
const io = new Server(server);
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/match');
const feedbackRoutes = require('./routes/feedback');
const userRoutes = require('./routes/user');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Client')));

// API routes
app.use('/api', authRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/user', userRoutes);

// Serve home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Client/home.html'));
});

// ======================
// Socket.IO connections
// ======================
const userSockets = {};

io.on('connection', (socket) => {
  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('registerUser', (userId) => {
    userSockets[userId] = socket.id;
  });

  socket.on('chat message', ({ room, from, message }) => {
    socket.to(room).emit('chat message', { from, message });
  });

  socket.on('callUser', ({ to, from }) => {
    const target = userSockets[to];
    if (target) io.to(target).emit('callUser', { from });
  });

  socket.on('callAccepted', ({ to, from }) => {
    const target = userSockets[to];
    if (target) io.to(target).emit('callAccepted', { from });
  });

  socket.on('callDeclined', ({ to }) => {
    const target = userSockets[to];
    if (target) io.to(target).emit('callDeclined');
  });

  socket.on('webrtc-offer', ({ to, offer }) => {
    const target = userSockets[to];
    if (target) io.to(target).emit('webrtc-offer', { offer });
  });

  socket.on('webrtc-answer', ({ to, answer }) => {
    const target = userSockets[to];
    if (target) io.to(target).emit('webrtc-answer', { answer });
  });

  socket.on('webrtc-candidate', ({ to, candidate }) => {
    const target = userSockets[to];
    if (target) io.to(target).emit('webrtc-candidate', { candidate });
  });
});

// ✅ Listen on all interfaces
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on https://0.0.0.0:${PORT}`));
