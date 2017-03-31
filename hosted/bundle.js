'use strict';

// vars
var users = void 0; // keys: time -> obj. last -> time. if
var ctx = void 0;
var sock = void 0;
var ours = -1;
var myWindow = void 0;
var vector = { x: 0, y: 0 };
var activeKeys = {};

// formatted from http://www.babylon.actifgames.com/moveCharacter/Scene.js
// functions to track keypress
function onKeyDown(event) {
  var code = event.keyCode;
  var ch = String.fromCharCode(code);

  var act = {};

  switch (code) {
    case 32:
      // Space: toggle
      act.jump = true;
      break;
    default:
      break;
  }

  if (activeKeys[ch] === true) {
    return;
  }
  activeKeys[ch] = true;

  if (ch === 'A') vector.x -= 1;
  if (ch === 'D') vector.x += 1;
  if (ch === ' ') act.jump = true;

  act.vector = vector;

  sock.emit('act', act);
}
function onKeyUp(event) {
  var code = event.keyCode;
  var ch = String.fromCharCode(code);

  if (activeKeys[ch] !== true) {
    return;
  }

  var act = {};

  if (ch === 'A') vector.x += 1;
  if (ch === 'D') vector.x -= 1;

  activeKeys[ch] = false;

  act.vector = vector;

  sock.emit('act', act);
}

var alphaMultip = 4.9;

var lerpVector = function lerpVector(v1, v2, a) {
  return (
    // return v1.scale(a).add(v2.scale(1-a));

    { x: v1.x * a + v2.x * (1 - a), y: v1.y * a + v2.y * (1 - a) }
  );
};
var deltaTime = 0;
var last = 0;
// canvas based
var draw = function draw(shap) {
  var shape = shap;
  if (shape.id === ours) {
    // then its local
    ctx.fillStyle = 'red';
  } else {
    // networked shape
    ctx.fillStyle = 'black';
  }
  shape.anim.alpha += deltaTime / 1000 * alphaMultip;
  shape.anim.alpha = Math.min(1, shape.anim.alpha);
  console.log(shape.anim);
  var t = lerpVector(shape.anim.target, shape.anim.last, shape.anim.alpha);
  var ct = shape.constant.transform;
  ctx.fillRect(t.x - ct.halfwidth, t.y - ct.halfheight, ct.width, ct.height);
  // console.log("drawd at "+t.x+","+t.y);
  // console.dir(ct);
};

var rollAlpha = function rollAlpha(name) {
  users[name].anim.last = lerpVector(users[name].anim.target, users[name].anim.last, users[name].anim.alpha);
  users[name].anim.target = users[name].transform;
  users[name].anim.alpha = 0;
};

var act = function act(data) {
  console.log(data);
  data.users.forEach(function (itm) {
    users[itm.id].transform = itm.transform;
    rollAlpha(itm.id);
  });
};

var addUser = function addUser(user) {
  console.log(user);
  users[user.id] = user;
  users[user.id].constant.transform.halfwidth = Math.round(user.constant.transform.width / 2);
  users[user.id].constant.transform.halfheight = Math.round(user.constant.transform.height / 2);
  users[user.id].anim = { last: user.transform, target: user.transform, alpha: 1 };
  console.log(users);
};

var removeUser = function removeUser(user) {
  delete users[user.id];
};

var redraw = function redraw(dt) {
  console.log(dt);
  if (users === undefined) {
    console.log('No users');
    myWindow.requestAnimationFrame(redraw);
    return;
  }

  // priorityqueue
  var drawsList = [];
  Object.keys(users).forEach(function (itm) {
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

  drawsList.forEach(function (itm) {
    draw(itm);
  });
  myWindow.requestAnimationFrame(redraw);
};

// Setup
var setupSocket = function setupSocket(socket) {
  socket.on('act', function (data) {
    act(data);
    // redraw();
  });

  socket.on('addUser', function (data) {
    addUser(data.user);
    // redraw();
  });

  socket.on('removeUser', function (data) {
    removeUser(data.user);
    // redraw();
  });

  socket.on('syncCanvas', function (data) {
    Object.keys(data.users).forEach(function (itm) {
      addUser(data.users[itm]);
    });
    ours = data.id;
    // redraw();
  });
};

var init = function init(w, document, io) {
  myWindow = w;
  users = {};
  var canvas = document.querySelector('#myCanvas');
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
if (false) {
  init(null, null, null);
}
