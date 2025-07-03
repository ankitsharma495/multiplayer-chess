const express = require("express");
const socket = require("socket.io");
const { Chess } = require("chess.js");
const http = require("http");
const path = require("path");
const e = require("express");

const app = express();

const server = http.createServer(app); // socket says tgat create a separte http server and connect your express server with this http server
const io = socket(server); // and this line says that socket will run on that http server

const rooms = {}; // { roomId: { chess: ChessInstance, players: [socketId, ...] } }

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.render("index");
});

//for sending the chessboard state to the players

io.on("connection", (uniquesocket) => {
  console.log("connected");

  uniquesocket.on("joinRoom", () => {
    // Find or create a room with less than 2 players
    let roomId = null;
    for (const [id, room] of Object.entries(rooms)) {
      if (room.players.length < 2) {
        roomId = id;
        break;
      }
    }
    if (!roomId) {
      roomId = `room-${Math.floor(Math.random() * 1000)}`;
      rooms[roomId] = { chess: new Chess(), players: [] };
    }

    const room = rooms[roomId];
    room.players.push(uniquesocket.id);
    uniquesocket.join(roomId);
    uniquesocket.roomId = roomId;

    // Assign roles
    if (room.players.length === 1) {
      uniquesocket.emit("playerRole", "w");
      io.to(roomId).emit("playerJoined", "White player joined");
    } else if (room.players.length === 2) {
      uniquesocket.emit("playerRole", "b");
      io.to(roomId).emit("playerJoined", "Black player joined");
    } else {
      uniquesocket.emit("spectatorRole");
      io.to(roomId).emit("spectatorJoined", "A spectator joined");
    }

    // Send initial board state
    uniquesocket.emit("boardState", room.chess.fen());
  });

  // Allow spectating any room by roomId
  uniquesocket.on("spectateRoom", (roomId) => {
    if (!rooms[roomId]) {
      uniquesocket.emit("spectatorJoined", "Room does not exist.");
      return;
    }
    uniquesocket.join(roomId);
    uniquesocket.roomId = roomId;
    uniquesocket.emit("spectatorRole");
    uniquesocket.emit("boardState", rooms[roomId].chess.fen());
    io.to(roomId).emit("spectatorJoined", "A spectator joined");
  });

  // List all active rooms (with at least one player)
  uniquesocket.on("getRooms", () => {
    const activeRooms = Object.entries(rooms)
      .filter(([id, room]) => room.players.length > 0)
      .map(([id]) => id);
    uniquesocket.emit("roomList", activeRooms);
  });

  uniquesocket.on("move", (move) => {
    const roomId = uniquesocket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];
    const chess = room.chess;

    try {
      if (chess.turn() === "w" && uniquesocket.id !== room.players[0]) return;
      if (chess.turn() === "b" && uniquesocket.id !== room.players[1]) return;

      const result = chess.move(move);
      if (result) {
        io.to(roomId).emit("move", move);
        io.to(roomId).emit("boardState", chess.fen());
      } else {
        uniquesocket.emit("invalidMove", move);
      }
    } catch (error) {
      console.log(error);
    }
  });

  uniquesocket.on("disconnect", () => {
    const roomId = uniquesocket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];
    room.players = room.players.filter((id) => id !== uniquesocket.id);
    if (room.players.length === 0) {
      delete rooms[roomId];
    }
  });
});

server.listen(3000, function () {
  console.log("server is listening on port 3000");
});