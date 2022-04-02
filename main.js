/** @type { HTMLCanvasElement } */
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, set, child, get, onDisconnect, onValue, onChildAdded, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import * as THREE from 'three';

const db = getDatabase();
const dbRef = ref(getDatabase());
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

class Player {

  constructor(x, y, z, width, height, length, color, isYou, name) {

    this.position = {

      x: x,

      y: y,

      z: z
    }
    this.width = width;
    this.height = height;
    this.length = length
    this.color = color;
    this.isYou = isYou;
    this.name = name;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshBasicMaterial({ color: this.color });
    this.cube = new THREE.Mesh(this.geometry, this.material);
    scene.add(this.cube);
    this.group = new THREE.Group();
    this.group.add(this.cube);
    scene.add(this.group);

    this.cube.castShadow = true;

    if (isYou) {

      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.cube1 = new THREE.Mesh(this.geometry, this.material);
      scene.add(this.cube1);
      this.cube1.position.set(0, 3, 5);
      this.camera.position.set(0, 2, 5);
      this.group.add(this.camera);
    }

    this.setPosition(this.group);

  }

  setPosition(group) {
    group.position.set(this.position.x, this.position.y, this.position.z);
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
let scene, camera, renderer;
let playerElements = [];
let players = [];

function handelArrowPress(xChange = 0, zChange = 0) {
  get(child(dbRef, `players/${playerUid}`)).then((snapshot) => {
    const playerData = snapshot.val();
    set(ref(db, `players/${playerUid}`), {
      uid: playerData.uid,
      name: playerData.name,
      color: playerData.color,
      x: Number(playerData.x) + Number(xChange),
      y: playerData.y,
      z: Number(playerData.z) + Number(zChange)
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

function initTHREE() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdddddd);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  const light = new THREE.DirectionalLight(0xffffff, 1, 100);
  light.position.set(1, 1, 1);
  light.castShadow = true;
  scene.add(light);
  const planeGeometry = new THREE.PlaneGeometry(20, 20);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 'white' })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
}

function initGame() {
  const allPlayersRef = ref(db, 'players');
  const allCPlayers = {};
  initTHREE();
  onValue(allPlayersRef, (snapshot) => {
    players = snapshot.val() || {};
    Object.keys(players).forEach((key) => {
      const player = players[key];
      const CPlayer = allCPlayers[key];
      CPlayer.position.x = player.x;
      CPlayer.position.y = player.y;
      CPlayer.position.z = player.z;
      CPlayer.setPosition(CPlayer.group);
    });
  });
  onChildAdded(allPlayersRef, (snapshot) => {
    const addedPlayer = snapshot.val();
    if (addedPlayer.uid === playerUid) {
      const cPlayer = new Player(addedPlayer.x, addedPlayer.y, addedPlayer.y, 1, 1, 1, addedPlayer.color, true, addedPlayer.name);
      allCPlayers[addedPlayer.uid] = cPlayer;
      thisCPlayer = cPlayer;
    }
    else {
      const cPlayer = new Player(addedPlayer.x, addedPlayer.y, addedPlayer.y, 1, 1, 1, addedPlayer.color, false, addedPlayer.name);
      allCPlayers[addedPlayer.uid] = cPlayer;
    }
  });
  onChildRemoved(allPlayersRef, (snapshot) => {
    const removedKey = snapshot.val().uid;
    scene.remove(allCPlayers[removedKey].group);
    delete allCPlayers[removedKey];
  })

  function update() {
    requestAnimationFrame(update);
    orbitControls.update();
    renderer.render(scene, thisCPlayer.camera);
    renderer.setSize(innerWidth, innerHeight);
    thisCPlayer.camera.aspect = innerWidth / innerHeight;
    thisCPlayer.camera.updateProjectionMatrix();

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
      x: "0",
      y: "0.5",
      z: "0"
    });
    onDisconnect(playerRef).remove();
    initGame();
  }
});
