const http = require('http');
const fs = require('fs');
const url = require('url');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read the index into memory
const index = fs.readFileSync(`${__dirname}/../hosted/index.html`);
const bundle = fs.readFileSync(`${__dirname}/../hosted/bundle.js`);


const onRequest = (request, response) => {
  const myUrl = url.parse(request.url);
    
    console.log(myUrl.path);
  switch (myUrl.path) {
    case '/bundle.js':
  response.writeHead(200, { 'Content-Type': 'text/javascript' });
  response.write(bundle);
          console.log("bundlin")
  response.end();break;
      default:
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
          break;
  }
};

const app = http.createServer(onRequest).listen(port);

console.log(`listening on 127.0.0.1: ${port}`);

const io = socketio(app);

let users = {};
let modifiedUsers= {};

//math library because i'm like that
const sqrMagnitude = v1 => (v1.x * v1.x) + (v1.y * v1.y);

const magnitude = v1 => Math.sqrt(sqrMagnitude(v1));

const normalize = (v1) => {
  const m = magnitude(v1);
  if (m === 0) { return { x: 0, y: 0 }; }
  return { x: v1.x / m, y: v1.y / m};
};

const add = (v1, v2) => ({ x: v1.x + v2.x,
  y: v1.y + v2.y});


// easiest human readable guid generator
let curId = 0;
let freeIds = [];
const getNextID = () => {
  if (freeIds.length !== 0) {
    return freeIds.pop();
  }
  return curId++;
};

const spawnPos = () => ({ x: Math.floor(Math.random()*700), y:0 });

let pxSize = 50;

const gravity = {x:0, y:1};

const onJoin = (sock) => {
    let socket = sock;
    socket.uid = getNextID();
    
    //let spawnp = spawnPos(socket.uid);
    const user = {
      id: socket.uid,
      transform: spawnPos(socket.uid),
      constant: {transform:{width: pxSize, height:pxSize}},
      vector: { x: 0, y: 0},
      cliForce: { x: 0, y: 0},
      serForce: { x: 0, y: 0}
    };// undefined cuz unused//socket;d
    
    users[socket.uid] = user
  socket.join('room1');
  socket.emit('syncCanvas', { users, id : socket.uid });
};

let speed = 10;
const onAct = (socket) => {
  socket.on('act', (data) => {
      
      if (data.vector !== undefined) {
        users[socket.uid].vector = data.vector;
          
        users[socket.uid].vector = normalize(users[socket.uid].vector);
        users[socket.uid].vector.x = users[socket.uid].vector.x*speed;
      }
      if (data.jump) {
          users[socket.uid].cliForce = {
              x: 0, y: -10
          };
      }
  });
};

// when somebody leaves us
const onDisconnect = (socket) => {
    socket.on('disconnect', () => {
      delete users[socket.uid];
      freeIds.push(socket.uid);

      io.to('room1').emit('disconnectPlayer', { name: socket.uid });
    });
};

io.sockets.on('connection', (socket) => {
  console.log('started');
  onJoin(socket);
  onAct(socket);
  onDisconnect(socket);
});

const update = () =>{
    
    let toSend = [];
    Object.keys(users).forEach((user)=>{
        users[user].transform = add(users[user].vector, users[user].transform);
        //newton has no authority here
        users[user].serForce = add(users[user].serForce, gravity);
        if(sqrMagnitude(users[user].cliForce)!==0)
        {
            users[user].cliForce = add(users[user].cliForce, gravity);
            if(users[user].cliForce.y>0)
            {
                users[user].cliForce.y = 0;
            } else{
                 users[user].transform = add(users[user].cliForce, users[user].transform);
            }
        }
        users[user].transform = add(users[user].serForce, users[user].transform);
        
        if(users[user].transform.y>475){
            users[user].transform.y = 475;
            users[user].serForce = {x:0, y:0};
        }
        
        toSend.push({id: user, transform: users[user].transform});
    });
    if(toSend.length>0);
    io.to('room1').emit('act', { users:toSend });
    
    console.log(users);
    
}

// fixed update rate
const delay = 120;


setInterval(update, delay);