'use strict';

// vars
var users = void 0; // keys: time -> obj. last -> time. if
var ctx = void 0;
var sock = void 0;
var ours = -1;
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

// canvas based
var draw = function draw(shape) {
  if (shape.id === ours) {
    // then its local
    ctx.fillStyle = 'red';
  } else {
    // networked shape
    ctx.fillStyle = 'black';
  }
  var t = shape.transform;
  var ct = shape.constant.transform;
  ctx.fillRect(t.x - ct.halfwidth, t.y - ct.halfheight, ct.width, ct.height);
  //console.log("drawd at "+t.x+","+t.y);
  //console.dir(ct);
};

var act = function act(data) {
  data.users.forEach(function (itm) {
    users[itm.id].transform = itm.transform;
  });
};

var addUser = function addUser(user) {
  console.log(user);
  users[user.id] = user;
  users[user.id].constant.transform.halfwidth = Math.round(user.constant.transform.width / 2);
  users[user.id].constant.transform.halfheight = Math.round(user.constant.transform.height / 2);
  console.log(users);
};

var removeUser = function removeUser(user) {
  delete users[user.id];
};

var redraw = function redraw() {
  if (users === undefined) {
    console.log('No users');
    return;
  }

  // priorityqueue
  var drawsList = [];
  Object.keys(users).forEach(function (itm) {
    drawsList.push(users[itm]);
  });

  if (drawsList.length === 0) {
    console.log('nothing to redraw');
    return;
  }

  // drawsList.sort((a, b) => a.when - b.when);

  // dequeue everything, add to canvas
  ctx.clearRect(0, 0, ctx.width, ctx.height);

  drawsList.forEach(function (itm) {
    draw(itm);
  });
};

// Setup
var setupSocket = function setupSocket(socket) {
  socket.on('act', function (data) {
    act(data);
    redraw();
  });

  socket.on('addUser', function (data) {
    addUser(data.user);
    redraw();
  });

  socket.on('removeUser', function (data) {
    removeUser(data.user);
    redraw();
  });

  socket.on('syncCanvas', function (data) {
    Object.keys(data.users).forEach(function (itm) {
      addUser(data.users[itm]);
    });
    ours = data.id;
    redraw();
  });
};

var init = function init(window, document, io) {
  users = {};
  var canvas = document.querySelector('#myCanvas');
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
if (false) {
  init(null, null, null);
}
