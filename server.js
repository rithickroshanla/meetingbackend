const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS for all routes so your frontend can access it
app.use(cors());

const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from ANY frontend (Vercel, Netlify, Localhost)
        methods: ["GET", "POST"]
    }
});

// Store user mapping: socket.id -> roomID
const socketToRoom = {};

// Store users per room: roomID -> [socket.id, socket.id, ...]
const usersInRoom = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 1. Join Room Event
    socket.on("join-room", (roomID) => {
        // If room doesn't exist, create it
        if (!usersInRoom[roomID]) {
            usersInRoom[roomID] = [];
        }

        // Limit participants for Mesh Topology (Optional performance guard)
        // A pure mesh (P2P) gets laggy after 6-8 users.
        const length = usersInRoom[roomID].length;
        if (length === 10) {
            socket.emit("room-full");
            return;
        }

        // Add user to the room array
        usersInRoom[roomID].push(socket.id);
        socketToRoom[socket.id] = roomID;
        
        // Join the socket room (Socket.io internal grouping)
        socket.join(roomID);

        // Get all other users in this room (excluding self)
        const usersInThisRoom = usersInRoom[roomID].filter(id => id !== socket.id);

        // Send list of existing users to the NEW user
        socket.emit("all-users", usersInThisRoom);
        
        console.log(`User ${socket.id} joined room: ${roomID}`);
    });

    // 2. Signaling: Sending Offer (From New User -> Existing User)
    socket.on("sending-signal", payload => {
        io.to(payload.userToSignal).emit('user-joined', { 
            signal: payload.signal, 
            callerID: payload.callerID,
            metadata: payload.metadata // Pass name/info
        });
    });

    // 3. Signaling: Returning Answer (From Existing User -> New User)
    socket.on("returning-signal", payload => {
        io.to(payload.callerID).emit('receiving-returned-signal', { 
            signal: payload.signal, 
            id: socket.id,
            metadata: payload.metadata // Pass name/info
        });
    });

    // 4. Handle Disconnect
    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = usersInRoom[roomID];
        
        if (room) {
            // Remove user from the room array
            room = room.filter(id => id !== socket.id);
            usersInRoom[roomID] = room;
            
            // Notify remaining users in that room
            // Note: We use 'broadcast' inside the room logic via direct emit loop in frontend, 
            // but here we broadcast event to specific room
            socket.broadcast.to(roomID).emit('user-left', socket.id);
        }
        
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Basic Health Check Route
app.get('/', (req, res) => {
    res.send('Vibranium Signaling Server is Running.');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));