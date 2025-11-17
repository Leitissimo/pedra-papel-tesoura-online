const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Permitir CORS automático para Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir arquivos da pasta public/
app.use(express.static("public"));

// =========================
// SISTEMA DE SALAS E PLAYERS
// =========================

let rooms = {};

function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function createRoom() {
  let code;
  do { code = generateRoomCode(); }
  while (rooms[code]);

  rooms[code] = {
    players: { j1: null, j2: null },
    playerIds: { j1: null, j2: null },
    jogadas: { j1: null, j2: null }
  };

  return code;
}

function updateRoomStatus(roomCode) {
  const r = rooms[roomCode];
  if (!r) return;

  const status = {
    j1: !!r.players.j1,
    j2: !!r.players.j2
  };

  if (r.players.j1) io.to(r.players.j1).emit("room_update", status);
  if (r.players.j2) io.to(r.players.j2).emit("room_update", status);
}

function resetJogadas(roomCode) {
  const r = rooms[roomCode];
  if (!r) return;
  r.jogadas = { j1: null, j2: null };
}

function getWinner(j1, j2) {
  if (j1 === j2) return "empate";
  if (
    (j1 === "pedra" && j2 === "tesoura") ||
    (j1 === "papel" && j2 === "pedra") ||
    (j1 === "tesoura" && j2 === "papel")
  ) return "j1";
  return "j2";
}

// =========================
// SOCKET.IO
// =========================

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("create_room", (callback) => {
    const code = createRoom();
    callback({ ok: true, room: code });
  });

  socket.on("join_room", ({ room, playerId }, callback) => {
    const r = rooms[room];
    if (!r) {
      callback({ ok: false, error: "not_found" });
      return;
    }

    // Reentrada mantendo J1
    if (r.playerIds.j1 === playerId) {
      r.players.j1 = socket.id;
      socket.join(room);
      updateRoomStatus(room);
      callback({ ok: true, role: "j1" });
      return;
    }

    // Reentrada mantendo J2
    if (r.playerIds.j2 === playerId) {
      r.players.j2 = socket.id;
      socket.join(room);
      updateRoomStatus(room);
      callback({ ok: true, role: "j2" });
      return;
    }

    // Entrada nova
    if (!r.players.j1) {
      r.players.j1 = socket.id;
      r.playerIds.j1 = playerId;
      socket.join(room);
      updateRoomStatus(room);
      callback({ ok: true, role: "j1" });
      return;
    }

    if (!r.players.j2) {
      r.players.j2 = socket.id;
      r.playerIds.j2 = playerId;
      socket.join(room);
      updateRoomStatus(room);
      callback({ ok: true, role: "j2" });
      return;
    }

    callback({ ok: false, error: "full" });
  });

  // Jogada
  socket.on("jogada", ({ room, escolha }) => {
    const r = rooms[room];
    if (!r) return;

    let role = null;
    if (r.players.j1 === socket.id) role = "j1";
    if (r.players.j2 === socket.id) role = "j2";

    if (!role) return;

    r.jogadas[role] = escolha;

    if (r.jogadas.j1 && r.jogadas.j2) {
      const vencedor = getWinner(r.jogadas.j1, r.jogadas.j2);

      const resultado = {
        j1: r.jogadas.j1,
        j2: r.jogadas.j2,
        vencedor
      };

      if (r.players.j1) io.to(r.players.j1).emit("resultado", resultado);
      if (r.players.j2) io.to(r.players.j2).emit("resultado", resultado);

      resetJogadas(room);
    }
  });

  // Chat
  socket.on("chat_message", ({ room, author, text }) => {
    io.to(room).emit("chat_message", { author, text });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Cliente saiu:", socket.id);

    for (const code in rooms) {
      const r = rooms[code];

      if (r.players.j1 === socket.id) {
        r.players.j1 = null;
        updateRoomStatus(code);
        return;
      }

      if (r.players.j2 === socket.id) {
        r.players.j2 = null;
        updateRoomStatus(code);
        return;
      }
    }
  });
});

// PORTA PARA DEPLOY
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
