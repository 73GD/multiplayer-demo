/** @type { HTMLCanvasElement } */

import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import { getDatabase, ref, set, child, get, onDisconnect, onValue, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

const db = getDatabase();
const dbRef = ref(getDatabase());

function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let gameWidth = innerWidth;
let gameHeight = innerHeight;

canvas.width = gameWidth;
canvas.height = gameHeight;

class Player {
  constructor(x, y, width, height, color, isYou, name) {
    this.position = {
      x: x,
      y: y
    }
    this.width = width;
    this.height = height;
    this.color = color;
    this.isYou = isYou;
    this.name = name;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.position.x * 10, this.position.y * 10, this.width, this.height);
    ctx.fillStyle = 'black';
    ctx.font = "8px Arial";
    ctx.fillText(this.name, this.position.x * 10 + 4, (this.position.y * 10) + (4 + this.height / 2));
  }
}

function createName() {
  const prefix = randomFromArray([
    "Good",
    "Bad",
    "Angry",
    "Peaceful",
    "Legendry",
    "Noob",
    "Pro"
  ]);
  const animals = randomFromArray([
    "dog",
    "cat",
    "bear",
    "panda",
    "donkey",
    "cube"
  ]);

  return `${prefix}_${animals}`
}

const playerColors = ['white', 'pink', 'red', 'green', 'yellow', 'brown'];
const auth = getAuth();

signInAnonymously(auth).then(() => {}).catch((error) => {
  const errorCode = error.code;
  const errorMessage = error.message;

  console.error(errorCode, errorMessage);
});

let playerUid, playerRef, thisCPlayer, thisPlayer;
let playerElements = [];
let players = [];

function handelArrowPress(xChange = 0, yChange = 0) {
  get(child(dbRef, `players/${playerUid}`)).then((snapshot) => {
    const playerData = snapshot.val();
    set(ref(db, `players/${playerUid}`), {
      uid: playerData.uid,
      name: playerData.name,
      color: playerData.color,
      x: Number(playerData.x) + Number(xChange),
      y: Number(playerData.y) + Number(yChange)
    })
  });
}

const up = document.getElementById('top');
const down = document.getElementById('bottom');
const left = document.getElementById('left');
const right = document.getElementById('right');

up.addEventListener('pointerdown', function() { handelArrowPress(0, -1) });
down.addEventListener('pointerdown', function() { handelArrowPress(0, 1) });
left.addEventListener('pointerdown', function() { handelArrowPress(-1, 0) });
right.addEventListener('pointerdown', function() { handelArrowPress(1, 0) });

function initGame() {
  const allPlayersRef = ref(db, 'players');
  const allCPlayers = {};
  onValue(allPlayersRef, (snapshot) => {
    players = snapshot.val() || {};
    Object.keys(players).forEach((key) => {
      const player = players[key];
      const CPlayer = allCPlayers[key];
      CPlayer.position.x = player.x;
      CPlayer.position.y = player.y;
    });
  });
  onChildAdded(allPlayersRef, (snapshot) => {
    const addedPlayer = snapshot.val();
    const cPlayer = new Player(addedPlayer.x, addedPlayer.y, 50, 50, addedPlayer.color, false, addedPlayer.name);
    allCPlayers[addedPlayer.uid] = cPlayer;
  });
  onChildRemoved(allPlayersRef, (snapshot) => {
    const removedKey = snapshot.val().uid;

    delete allCPlayers[removedKey];
  })

  function update() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    Object.keys(allCPlayers).forEach((key) => {
      allCPlayers[key].draw(ctx);
    });
    if (gameWidth != innerWidth) {
      gameWidth = innerWidth;
      canvas.width = gameWidth;
    }

    if (gameHeight != innerHeight) {
      gameHeight = innerHeight;
      canvas.height = gameHeight;
    }

    requestAnimationFrame(update);
  }
  update();
}
onAuthStateChanged(auth, (user) => {
  if (user) {
    playerUid = user.uid;
    playerRef = ref(db, `players/${playerUid}`);
    const name = createName();
    set(playerRef, {
      uid: playerUid,
      name: name,
      color: randomFromArray(playerColors),
      x: "3",
      y: "10",
    });
    onDisconnect(playerRef).remove();
    initGame();
  }
});
