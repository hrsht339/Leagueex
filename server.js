const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

const rooms = [];

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const sampleQuestions = [
  { id: 1, text: 'What is the capital of France?', options: ['Paris', 'Berlin', 'London', 'Madrid'], correctAnswer: 'Paris' },
  { id: 2, text: 'Who wrote "Romeo and Juliet"?', options: ['Shakespeare', 'Hemingway', 'Tolstoy', 'Austen'], correctAnswer: 'Shakespeare' },

];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', () => {
    const room = { id: socket.id, users: [socket.id], questions: sampleQuestions, currentQuestion: 0 };
    rooms.push(room);
    socket.join(socket.id);
    io.to(socket.id).emit('roomCreated', room);
    sendNextQuestion(socket.id);
  });

  socket.on('getRooms', () => {
    io.to(socket.id).emit('availableRooms', rooms.filter((room) => room.users.length === 1));
  });

  socket.on('joinRoom', (roomId) => {
    const room = rooms.find((r) => r.id === roomId && r.users.length === 1);
    if (room) {
      room.users.push(socket.id);
      socket.join(room.id);
      io.to(room.id).emit('roomJoined', room);
      sendNextQuestion(room.id);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomIndex = rooms.findIndex((r) => r.users.includes(socket.id));
    if (roomIndex !== -1) {
      const room = rooms[roomIndex];
      socket.leave(room.id);
      rooms.splice(roomIndex, 1);
      io.to(room.id).emit('playerLeft', socket.id);
    }
  });

  function sendNextQuestion(roomId) {
    const room = rooms.find((r) => r.id === roomId);
    if (room && room.currentQuestion < room.questions.length) {
      const question = room.questions[room.currentQuestion];
      io.to(room.id).emit('nextQuestion', question);
      io.to(room.id).emit('quizState', { currentQuestion: room.currentQuestion + 1, totalQuestions: room.questions.length });
      room.currentQuestion++;
    } else {
      io.to(room.id).emit('gameConclusion', 'Quiz completed!');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
