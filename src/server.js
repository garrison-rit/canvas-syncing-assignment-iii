const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read the index into memory
const index = fs.readFileSync(`${__dirname}/../client/index.html`);


const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`listening on 127.0.0.1: ${port}`);

const io = socketio(app);

const draws = {};

const onJoin = (socket) => {
  socket.join('room1');
  socket.emit('syncCanvas', { draws });
};

const onDraw = (socket) => {
  socket.on('draw', (data) => {
    const time = new Date().getTime();
    draws[time] = data.shape;

    const response = {
      when: time,
      shape: data.shape,
    };

    socket.emit('draw', response);

    response.shape.ours = false;

    socket.broadcast.to('room1').emit('draw', response);
  });
};


io.sockets.on('connection', (socket) => {
  console.log('started');
  onJoin(socket);
  onDraw(socket);
      /*
    onJoined(socket);
    onMsg(socket);
    socket.on('disconnect', () => {
      onDisconnect(socket);
    });
    */
});
