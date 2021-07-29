const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const Filter = require('bad-words');
const {
  generateMessage,
  generateLocationMessage
} = require('./utils/messages');

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require('./utils/users');

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// let count = 0;

// io.on('connection', (socket) => {
//   console.log('New WebSocket connection');

//   socket.emit('countUpdated', count);

//   socket.on('increment', () => {
//     count++;
//     io.emit('countUpdated', count);
//   });
// });

//  Goal: Allow clients to send message
// 1. Create  a form with an input and button
// similar to the weather form
// 2. setup event listeneer  for form submission
// exit "sendMessage " with input string as message index
// Move server listen for "Send Message"
// send Message to all Connected clients
// Test your work

// io.on('connection', (socket) => {
//   console.log('New WebSocket connection');

//   socket.emit('message', 'Welcome!');
//   socket.broadcast.emit('message', 'A new user has joined!');

//   socket.on('sendMessage', (message) => {
//     io.emit('message', message);
//   });

//   socket.on('disconnect', () => {
//     io.emit('message', 'A user has left!');
//   });
// });

// io.on('connection', (socket) => {
//   console.log('New WebSocket connection');
//   socket.emit('message', 'Welcome!');
//   socket.broadcast.emit('message', 'A new user has joined!');
//   socket.broadcast.emit('message', generateMessage('A new user has joined!'));

//   //acknowlegement
//   socket.on('sendMessage', (message, callback) => {
//     const filter = new Filter();
//     if (filter.isProfane(message)) {
//       return callback('Profanity is bot allowed');
//     }
//     io.emit('message', generateMessage(message));
//     callback();
//   });

//   socket.on('sendLocation', (coords, callback) => {
//     io.emit(
//       'locationMessage',
//       generateLocationMessage(
//         `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
//       )
//     );
//     callback();
//   });

//   socket.on('disconnect', () => {
//     io.emit('message', generateMessage('A user has left!'));
//   });
// });

// server.listen(port, () => {
//   console.log(`Server is up on port ${port}!`);
// });

io.on('connection', (socket) => {
  console.log('New WebSocket connection');

  socket.on('join', (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit('message', generateMessage('Admin', 'Welcome!'));
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        generateMessage('Admin', `${user.username} has joined!`)
      );
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed!');
    }

    io.to(user.room).emit('message', generateMessage(user.username, message));
    callback();
  });

  socket.on('sendLocation', (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      'locationMessage',
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        generateMessage('Admin', `${user.username} has left!`)
      );
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
