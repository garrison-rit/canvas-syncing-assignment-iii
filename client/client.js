// vars
let users;// keys: time -> obj. last -> time. if
let ctx;
let sock;
let ours = -1;
let myWindow;
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

const alphaMultip = 4.9;

const lerpVector = (v1, v2, a) =>
    // return v1.scale(a).add(v2.scale(1-a));

   ({ x: (v1.x * a) + (v2.x * (1 - a)), y: (v1.y * a) + (v2.y * (1 - a)) });
let deltaTime = 0;
let last = 0;
// canvas based
const draw = (shap) => {
  const shape = shap;
  if (shape.id === ours) {
        // then its local
    ctx.fillStyle = 'red';
  } else {
        // networked shape
    ctx.fillStyle = 'black';
  }
  shape.anim.alpha += (deltaTime / 1000) * alphaMultip;
  shape.anim.alpha = Math.min(1, shape.anim.alpha);
  const t = lerpVector(shape.anim.target, shape.anim.last, shape.anim.alpha);
  const ct = shape.constant.transform;
  ctx.fillRect(t.x - ct.halfwidth, t.y - ct.halfheight, ct.width, ct.height);
    // console.log("drawd at "+t.x+","+t.y);
    // console.dir(ct);
};


const rollAlpha = (name) => {
  users[name].anim.last = lerpVector(users[name].anim.target,
                                     users[name].anim.last,
                                     users[name].anim.alpha);
  users[name].anim.target = users[name].transform;
  users[name].anim.alpha = 0;
};

const act = (data) => {
  data.users.forEach((itm) => {
    users[itm.id].transform = itm.transform;
    rollAlpha(itm.id);
  });
};

const addUser = (user) => {
  console.log(user);
  users[user.id] = user;
  users[user.id].constant.transform.halfwidth = Math.round(user.constant.transform.width / 2);
  users[user.id].constant.transform.halfheight = Math.round(user.constant.transform.height / 2);
  users[user.id].anim = { last: user.transform, target: user.transform, alpha: 1 };
  console.log(users);
};


const removeUser = (user) => {
  console.log(`bye${user}`);
  delete users[user.id];
};

const redraw = (dt) => {
  if (users === undefined) {
    console.log('No users');
    myWindow.requestAnimationFrame(redraw);
    return;
  }

    // priorityqueue
  const drawsList = [];
  Object.keys(users).forEach((itm) => {
    drawsList.push(users[itm]);
  });

  deltaTime = dt - last;
  last = dt;
  if (drawsList.length === 0) {
    console.log('nothing to redraw');
    myWindow.requestAnimationFrame(redraw);
    return;
  }

  // drawsList.sort((a, b) => a.when - b.when);

    // dequeue everything, add to canvas
  ctx.clearRect(0, 0, ctx.width, ctx.height);

  drawsList.forEach((itm) => {
    draw(itm);
  });
  myWindow.requestAnimationFrame(redraw);
};

// Setup
const setupSocket = (socket) => {
  socket.on('act', (data) => {
    act(data);
    // redraw();
  });

  socket.on('addUser', (data) => {
    addUser(data.user);
    // redraw();
  });

  socket.on('removeUser', (data) => {
    removeUser(data.user);
    // redraw();
  });

  socket.on('syncCanvas', (data) => {
    Object.keys(data.users).forEach((itm) => { addUser(data.users[itm]); });
    ours = data.id;
    // redraw();
  });
};


const init = (w, document, io) => {
  myWindow = w;
  users = {};
  const canvas = document.querySelector('#myCanvas');
  ctx = document.querySelector('#myCanvas').getContext('2d');
  ctx.width = canvas.width;
  ctx.height = canvas.height;
  sock = io.connect();
  setupSocket(sock);
  // keyboard input
  myWindow.addEventListener('keydown', onKeyDown, false);
  myWindow.addEventListener('keyup', onKeyUp, false);

  myWindow.requestAnimationFrame(redraw);
    /*
    setInterval(function(){
        sendMessage(socket);
    }, 3000);
    */
};

// it's a feature (export)
if (false) { init(null, null, null); }
