import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer"; // For iPhone
import path from "path";

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// PEERJS SERVER - REQUIRED FOR IPHONE
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});
app.use('/peerjs', peerServer);

app.use(express.static('.')); // serve html/css/js

const rooms = {};

io.on("connection", socket => {
  socket.on("join-room", (roomId, peerId) => {
    socket.join(roomId);
    if(!rooms[roomId]) rooms[roomId] = [];
    
    // tell new user about everyone already in room
    rooms[roomId].forEach(id => socket.emit("user-connected", id));
    // tell everyone else about new user
    socket.to(roomId).emit("user-connected", peerId);
    
    rooms[roomId].push(peerId);

    // CHAT
    socket.on("chat", (roomId, msg) => {
      socket.to(roomId).emit("chat", peerId, msg);
    });

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId].filter(id => id!== peerId);
      socket.to(roomId).emit("user-disconnected", peerId);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
