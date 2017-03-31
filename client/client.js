// vars
let users;// keys: time -> obj. last -> time. if
let ctx;
let sock;
let ours = -1;
const vector = { x: 0, y: 0 };
const activeKeys = {};

// formatted from http://www.babylon.actifgames.com/moveCharacter/Scene.js
// functions to track keypress
function onKeyDown(event) {
  const code = event.keyCode;
  const ch = String.fromCharCode(code);

  const act = {};

  switch (code) {
    case 32: // Space: toggle
      act.jump = true;
      break;
    default: break;
  }

  if (activeKeys[ch] === true) { return; }
  activeKeys[ch] = true;

  if (ch === 'A') vector.x -= 1;
  if (ch === 'D') vector.x += 1;
  if (ch === ' ') act.jump = true;

  act.vector = vector;

  sock.emit('act', act);
}
function onKeyUp(event) {
  const code = event.keyCode;
  const ch = String.fromCharCode(code);


  if (activeKeys[ch] !== true) { return; }

  const act = {};

  if (ch === 'A') vector.x += 1;
  if (ch === 'D') vector.x -= 1;

  activeKeys[ch] = false;

  act.vector = vector;

  sock.emit('act', act);
}

// canvas based
const draw = (shape) => {
  if (shape.id === ours) {
        // then its local
    ctx.fillStyle = 'red';
  } else {
        // networked shape
    ctx.fillStyle = 'black';
  }
  const t = shape.transform;
  const ct = shape.constant.transform;
  ctx.fillRect(t.x - ct.halfwidth, t.y - ct.halfheight, ct.width, ct.height);
    //console.log("drawd at "+t.x+","+t.y);
    //console.dir(ct);
};

const act = (data) => {
  data.users.forEach((itm) => {
    users[itm.id].transform = itm.transform;
  });
};

const addUser = (user) => {
    console.log(user);
  users[user.id] = user;
  users[user.id].constant.transform.halfwidth = Math.round(user.constant.transform.width / 2);
  users[user.id].constant.transform.halfheight = Math.round(user.constant.transform.height / 2);
    console.log(users);
};


const removeUser = (user) => {
  delete users[user.id];
};

const redraw = () => {
  if (users === undefined) {
    console.log('No users');
    return;
  }

    // priorityqueue
  const drawsList = [];
  Object.keys(users).forEach((itm) => {
    drawsList.push(users[itm]);
  });

  if (drawsList.length === 0) {
    console.log('nothing to redraw');
    return;
  }

  // drawsList.sort((a, b) => a.when - b.when);

    // dequeue everything, add to canvas
  ctx.clearRect(0, 0, ctx.width, ctx.height);

  drawsList.forEach((itm) => {
    draw(itm);
  });
};

// Setup
const setupSocket = (socket) => {
  socket.on('act', (data) => {
    act(data);
    redraw();
  });

  socket.on('addUser', (data) => {
    addUser(data.user);
    redraw();
  });

  socket.on('removeUser', (data) => {
    removeUser(data.user);
    redraw();
  });

  socket.on('syncCanvas', (data) => {
    Object.keys(data.users).forEach((itm)=>{addUser(data.users[itm])});
    ours = data.id;
    redraw();
  });
};


const init = (window, document, io) => {
  users = {};
  const canvas = document.querySelector('#myCanvas');
  ctx = document.querySelector('#myCanvas').getContext('2d');
  ctx.width = canvas.width;
  ctx.height = canvas.height;
  sock = io.connect();
  setupSocket(sock);
  // keyboard input
  window.addEventListener('keydown', onKeyDown, false);
  window.addEventListener('keyup', onKeyUp, false);
    /*
    setInterval(function(){
        sendMessage(socket);
    }, 3000);
    */
};

// it's a feature (export)
if (false) { init(null, null, null); }
