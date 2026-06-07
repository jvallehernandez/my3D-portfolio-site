import * as THREE from "three"
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "jsm/renderers/CSS3DRenderer.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "jsm/lights/RectAreaLightUniformsLib.js";
RectAreaLightUniformsLib.init();
// renderer
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(w,h);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.position = "relative";
renderer.domElement.style.zIndex = "0";
document.body.appendChild(renderer.domElement);

const welcomeEl = document.createElement("div");
welcomeEl.id = "welcome-overlay";
welcomeEl.innerHTML = `
  <span class="welcome-name">Jose Valle</span>
  <span class="welcome-title">Full-Stack Engineer</span>
`;

const welcomeLayoutStyle = document.createElement("style");
welcomeLayoutStyle.textContent = `
  #welcome-overlay {
    position: fixed;
    z-index: 5;
    color: #2c2c2c;
    font-family: 'SF Pro Display', 'Helvetica Neue', sans-serif;
    line-height: 1.2;
    pointer-events: none;
    top: 175px;
    left: 325px;
  }
  #welcome-overlay .welcome-name {
    display: block;
    font-size: 72px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  #welcome-overlay .welcome-title {
    display: block;
    font-size: 16px;
    letter-spacing: 0.12em;
    opacity: 0.45;
    text-transform: uppercase;
  }
  #welcome-overlay .screen-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.03em;
    opacity: 0.75;
    transition: opacity 0.8s ease;
  }
  @media (max-width: 768px) {
    #welcome-overlay {
      top: max(20px, env(safe-area-inset-top));
      left: max(20px, env(safe-area-inset-left));
      right: max(20px, env(safe-area-inset-right));
      max-width: calc(100vw - 40px);
    }
    #welcome-overlay .welcome-name {
      font-size: 36px;
    }
    #welcome-overlay .welcome-title {
      font-size: 11px;
      letter-spacing: 0.1em;
    }
    #welcome-overlay .screen-hint {
      margin-top: 16px;
      font-size: 13px;
      gap: 8px;
    }
  }
`;
document.head.appendChild(welcomeLayoutStyle);

Object.assign(welcomeEl.style, {
  opacity: "0",
  transform: "translateY(8px)",
  transition: "opacity 0.8s ease, transform 0.8s ease"
});
document.body.appendChild(welcomeEl);

const hintStyle = document.createElement("style");
hintStyle.textContent = `
  @keyframes screen-hint-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.45); opacity: 0.45; }
  }
`;
document.head.appendChild(hintStyle);

const screenHintEl = document.createElement("div");
screenHintEl.className = "screen-hint";
screenHintEl.innerHTML = `
  <div style="
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #2c2c2c;
    box-shadow: 0 0 8px rgba(44, 44, 44, 0.35);
    animation: screen-hint-pulse 1.4s ease-in-out infinite;
    flex-shrink: 0;
  "></div>
  <span>Explore</span>
`;
welcomeEl.appendChild(screenHintEl);

function hideScreenHint() {
  screenHintEl.style.opacity = "0";
}

setTimeout(() => {
  welcomeEl.style.opacity = "1";
  welcomeEl.style.transform = "translateY(0)";
  setTimeout(hideScreenHint, 20000);
}, 400);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(w, h);
Object.assign(cssRenderer.domElement.style, {
  position: "absolute",
  top: "0",
  left: "0",
  zIndex: "1",
  pointerEvents: "none"
});
document.body.appendChild(cssRenderer.domElement);

const MOBILE_BREAKPOINT = "(max-width: 768px)";

function isMobile() {
  return window.matchMedia(MOBILE_BREAKPOINT).matches;
}

const PORTFOLIO_ZOOM_DURATION = 1000;
const PORTFOLIO_ZOOM_OUT_DURATION = 900;

const DESK_VIEW = {
  desktop: {
    position: new THREE.Vector3(6, 3, 5),
    target: new THREE.Vector3(0, 1.5, -1),
  },
  mobile: {
    position: new THREE.Vector3(3.5, 4, 8.5),
    target: new THREE.Vector3(0, 1.2, -0.4),
  },
};

function getDeskCamera() {
  const view = isMobile() ? DESK_VIEW.mobile : DESK_VIEW.desktop;
  return {
    position: view.position.clone(),
    target: view.target.clone(),
  };
}

const SCREEN_WIDTH = 3.05;
const SCREEN_HEIGHT = 2.2;

const _screenNormal = new THREE.Vector3();
const _screenUp = new THREE.Vector3();
const _viewDir = new THREE.Vector3();
const _cameraRight = new THREE.Vector3();
const _cameraUp = new THREE.Vector3();
const _cameraRot = new THREE.Matrix4();

function getScreenWorldFrame() {
  const center = new THREE.Vector3(0, 1.4, -1);
  const normal = new THREE.Vector3(0, 0, 1);
  if (!screenMesh) {
    return { center, normal, width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
  }

  screenMesh.updateWorldMatrix(true, true);
  const quaternion = screenMesh.getWorldQuaternion(new THREE.Quaternion());
  screenMesh.getWorldPosition(center);
  normal.set(0, 0, 1).applyQuaternion(quaternion);
  return { center, normal, width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
}

function getPortfolioZoomDistance(screenWidth, screenHeight) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distV = (screenHeight / 2) / Math.tan(vFov / 2);
  const distH = (screenWidth / 2) / Math.tan(hFov / 2);
  const padding = isMobile() ? 1.04 : 1.02;
  return Math.max(distV, distH) * padding;
}

function getPortfolioScreenCameraPose() {
  const { center, normal, width, height } = getScreenWorldFrame();
  const distance = getPortfolioZoomDistance(width, height);
  const position = center.clone().add(normal.clone().multiplyScalar(distance));

  if (!screenMesh) {
    return {
      position,
      target: center.clone(),
      quaternion: camera.quaternion.clone(),
      up: new THREE.Vector3(0, 1, 0)
    };
  }

  _viewDir.copy(center).sub(position).normalize();
  _screenUp.set(0, 1, 0).applyQuaternion(screenMesh.getWorldQuaternion(new THREE.Quaternion()));
  _cameraRight.crossVectors(_viewDir, _screenUp).normalize();
  if (_cameraRight.lengthSq() < 1e-6) {
    _cameraRight.crossVectors(_viewDir, new THREE.Vector3(0, 1, 0)).normalize();
  }
  _cameraUp.crossVectors(_cameraRight, _viewDir).normalize();

  _cameraRot.makeBasis(_cameraRight, _cameraUp, _viewDir.clone().negate());
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(_cameraRot);

  return {
    position,
    target: center.clone(),
    quaternion,
    up: _cameraUp.clone()
  };
}

function getPortfolioZoomCamera() {
  const pose = getPortfolioScreenCameraPose();
  return {
    position: pose.position,
    target: pose.target,
    quaternion: pose.quaternion,
    up: pose.up,
    duration: PORTFOLIO_ZOOM_DURATION
  };
}

function snapCameraToScreen() {
  const pose = getPortfolioScreenCameraPose();
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.quaternion);
  camera.up.copy(pose.up);
  controls.target.copy(pose.target);
}

function applyDeskCamera() {
  const desk = getDeskCamera();
  camera.position.copy(desk.position);
  camera.up.set(0, 1, 0);
  controls.target.copy(desk.target);
  controls.update();
}

// camera

const fov = 38.5; // 50 degrees for better view
const aspect = w / h;
const near = 0.1; // starts rendering
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

//scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f0eb);

function createDesk(){
    const deskMaterial = new THREE.MeshStandardMaterial({
        color: 0xE8E8E8, // Semi white/gray
        roughness: 0.1
    });
    const desktop = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.2, 4),
        deskMaterial
    );
    desktop.position.y = 0.1; // Position desk so top is at y=0.2
    desktop.receiveShadow = true;
    return desktop;
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.enableZoom = true;
controls.enablePan = true;
controls.minDistance = 0;
controls.maxDistance = 20;
controls.minAzimuthAngle = -Math.PI / 3;
controls.maxAzimuthAngle = Math.PI / 3;
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 2.2;
applyDeskCamera();

const IDLE_ORBIT_AMPLITUDE = 0.22;
const IDLE_ORBIT_SPEED = 0.004;

let idleOrbit = true;
let idleTime = 0;
let pointerDownX = 0;
let pointerDownY = 0;

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
});

renderer.domElement.addEventListener("pointerup", (e) => {
  const drag = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
  if (drag > 5) idleOrbit = false;
});

// Global variables for laptop screen
let screenMaterial;
let screenMesh = null;
let portfolioCssObject = null;
let portfolioIframe = null;
let portfolioOpen = false;
let pendingPortfolioOpen = false;
let backButtonEl = null;
let speakerMesh = null;

const DESK_MUSIC_VOLUME = 0.1;

const deskMusic = new Audio("./The-Boulevard-Of-Broken-Dreams.mp3");
deskMusic.preload = "auto";
deskMusic.volume = DESK_MUSIC_VOLUME;

function toggleDeskMusic() {
  if (!deskMusic.paused) {
    deskMusic.pause();
    return;
  }
  if (deskMusic.ended) deskMusic.currentTime = 0;
  deskMusic.play().catch((err) => console.warn("Audio playback blocked:", err));
}

function getMouseFromEvent(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
}

function getSpeakerRaycastHits(raycaster) {
  if (!speakerMesh) return [];
  return raycaster.intersectObject(speakerMesh, true);
}

const PORTFOLIO_IFRAME_W = 1280;
const PORTFOLIO_IFRAME_H = Math.round(PORTFOLIO_IFRAME_W * (SCREEN_HEIGHT / SCREEN_WIDTH));
const SCREEN_SMUDGE_IMAGE = "./image.png";
const SCREEN_SMUDGE_OPACITY = "0.2";

function attachPortfolioToScreen(screenW, screenH) {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    width: `${PORTFOLIO_IFRAME_W}px`,
    height: `${PORTFOLIO_IFRAME_H}px`,
    overflow: "hidden",
    outline: "none",
    background: "#000000",
    pointerEvents: "none",
    position: "relative",
    isolation: "isolate",
  });

  portfolioIframe = document.createElement("iframe");
  portfolioIframe.src = "./Portfolio-Site/index.html?embed=1";
  Object.assign(portfolioIframe.style, {
    width: "100%",
    height: "100%",
    border: "none",
    opacity: "0.9",
    outline: "none",
    background: "#000000",
    pointerEvents: "none",
    display: "block",
  });

  const smudgeImg = document.createElement("img");
  smudgeImg.src = SCREEN_SMUDGE_IMAGE;
  smudgeImg.alt = "";
  Object.assign(smudgeImg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    mixBlendMode: "screen",
    opacity: SCREEN_SMUDGE_OPACITY,
    display: "block",
  });
  wrapper.appendChild(portfolioIframe);
  wrapper.appendChild(smudgeImg);

  portfolioCssObject = new CSS3DObject(wrapper);
  portfolioCssObject.element.style.pointerEvents = "none";
  portfolioCssObject.element.style.outline = "none";
  portfolioCssObject.scale.set(
    screenW / PORTFOLIO_IFRAME_W,
    screenH / PORTFOLIO_IFRAME_H,
    1
  );
  portfolioCssObject.position.set(0, 0, 0.002);
  screenMesh.add(portfolioCssObject);
}

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  cssRenderer.setSize(width, height);
  if (!portfolioOpen && !isAnimating) applyDeskCamera();
});

// Helper function to create key texture
function createKeyTexture(keyChar, keyWidth, keyDepth) {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, size, size);
    
    // Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(keyChar.toUpperCase(), size / 2, size / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createLaptop() {
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(0, 0.2, 0); // Position on top of desk
    scene.add(laptopGroup);
    const laptopWidth = 3.2;
    const laptopDepth = 2.2;
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A4A4A, // Space gray
      roughness: 0.4,
      metalness: 0.5,
      side: THREE.FrontSide
    });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(laptopWidth, 0.1, laptopDepth),
      baseMaterial
    );
    base.castShadow = true;
    base.receiveShadow = true;
    laptopGroup.add(base);
    const keySideMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.4
    });
    const keyRows = [
      {
        y: -0.8,
        keys: [
          ["`", 1],
          ["1", 1],
          ["2", 1],
          ["3", 1],
          ["4", 1],
          ["5", 1],
          ["6", 1],
          ["7", 1],
          ["8", 1],
          ["9", 1],
          ["0", 1],
          ["-", 1],
          ["=", 1],
          ["del", 1.3]
        ]
      },
      {
        y: -0.6,
        keys: [
          ["tab", 1.25],
          ["q", 1],
          ["w", 1],
          ["e", 1],
          ["r", 1],
          ["t", 1],
          ["y", 1],
          ["u", 1],
          ["i", 1],
          ["o", 1],
          ["p", 1],
          ["[", 1],
          ["]", 1],
          ["\\", 1]
        ]
      },
      {
        y: -0.4,
        keys: [
          ["caps", 1.65],
          ["a", 1],
          ["s", 1],
          ["d", 1],
          ["f", 1],
          ["g", 1],
          ["h", 1],
          ["j", 1],
          ["k", 1],
          ["l", 1],
          [";", 1],
          ["'", 1],
          ["ret", 1.65]
        ]
      },
      {
        y: -0.2,
        keys: [
          ["shift", 2.2],
          ["z", 1],
          ["x", 1],
          ["c", 1],
          ["v", 1],
          ["b", 1],
          ["n", 1],
          ["m", 1],
          [",", 1],
          [".", 1],
          ["/", 1],
          ["shift", 2.2]
        ]
      },
      {
        y: 0,
        keys: [
          ["fn",1.2],
          ["ctrl", 1.2],
          ["opt", 1.2],
          ["cmd", 1.2],
          [" ", 7.75],
          ["cmd", 1.2],
          ["opt", 1.2]
        ]
      }
    ];
    const keyHeight = 0.03;
    const keyUnitWidth = 0.16;
    const keyDepth = 0.16;
    const keySpacing = 0.018;
    keyRows.forEach((row) => {
      let totalRowWidth = 0;
      row.keys.forEach((keyInfo) => {
        totalRowWidth += keyUnitWidth * keyInfo[1];
      });
      totalRowWidth += (row.keys.length - 1) * keySpacing;
      let currentX = -totalRowWidth / 2;
      row.keys.forEach((keyInfo) => {
        const keyChar = keyInfo[0];
        const keyWidth = keyUnitWidth * keyInfo[1];
        const keyTopMaterial = new THREE.MeshStandardMaterial({
          map: createKeyTexture(keyChar, keyWidth, keyDepth)
        });
        const keyMaterials = [
          keySideMaterial,
          keySideMaterial,
          keyTopMaterial,
          keySideMaterial,
          keySideMaterial,
          keySideMaterial
        ];
        const key = new THREE.Mesh(
          new THREE.BoxGeometry(keyWidth, keyHeight, keyDepth),
          keyMaterials
        );
        key.position.set(currentX + keyWidth / 2, 0.065, row.y);
        key.castShadow = true;
        laptopGroup.add(key);
        currentX += keyWidth + keySpacing;
      });
    });
    const trackpadMaterial = new THREE.MeshStandardMaterial({
      color: "#2c2f31",
      roughness: 0.2
    });
    const trackpad = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      trackpadMaterial
    );
    trackpad.rotation.x = -Math.PI / 2;
    trackpad.position.y = 0.051;
    trackpad.position.z = 0.55;
    laptopGroup.add(trackpad);
    const screenGroup = new THREE.Group();
    screenGroup.position.y = 0.05;
    screenGroup.position.z = -laptopDepth / 2 + 0.1;
    laptopGroup.add(screenGroup);
    const screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(laptopWidth, 2.4, 0.1),
      baseMaterial
    );
    screenFrame.position.y = 1.2;
    screenFrame.castShadow = true;
    screenGroup.add(screenFrame);
    const bezelMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000
    });
    const bottomBezel = new THREE.Mesh(
      new THREE.BoxGeometry(laptopWidth - 0.2, 0.2, 0.11),
      bezelMaterial
    );
    bottomBezel.position.y = 0.2;
    screenGroup.add(bottomBezel);
    screenMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.FrontSide
    });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(laptopWidth - 0.2, 2.2),
      screenMaterial
    );
    screen.position.set(0, 1.2, 0.051);
    screenMesh = screen;
    screenGroup.add(screen);

    const screenBackMaterial = new THREE.MeshBasicMaterial({ color: 0x4A4A4A });
    const screenBack = new THREE.Mesh(
      new THREE.PlaneGeometry(laptopWidth - 0.2, 2.2),
      screenBackMaterial
    );
    screenBack.position.set(0, 1.2, 0.049);
    screenBack.rotation.y = Math.PI;
    screenGroup.add(screenBack);
    attachPortfolioToScreen(SCREEN_WIDTH, SCREEN_HEIGHT);
    screenGroup.rotation.x = -0.2;
}

const DESK_TOP_Y = 0.21;
const RUBIKS_CUBE_SIZE = 0.45;
const RUBIKS_CUBE_POSITION = { x: 2.9, y: 0, z: 0.55 };
const RUBIKS_CUBE_ROTATION = 380/5;
const WALLET_SIZE = 0.8;
const WALLET_POSITION = { x: 3.5, y: -0.05, z: 1.05 };
const WATCH_SIZE = 0.48;
const WATCH_POSITION = { x: 2.9, y: 0.445, z: 0.55 };
const WATCH_ROTATION_X = Math.PI / 2;
const WATCH_ROTATION_Y = Math.PI / 20;
const WATCH_ROTATION_Z = 0;
const SPEAKER_SIZE = 2;
const SPEAKER_POSITION = { x: 2.18, y: 0, z: -1.5 };
const SPEAKER_ROTATION = 36/3;
const CAP_SIZE = 2.25;
const CAP_POSITION = { x: 4.258, y: 0, z: 0.2 };
const CAP_ROTATION_Y = Math.PI / 7;
const NOTEBOOK_SIZE = 2.4;
const NOTEBOOK_POSITION = { x: -2.5, y: 0, z: 0.1 };
const NOTEBOOK_ROTATION_Y = Math.PI;
const HEADPHONES_SIZE = 1.15;
const HEADPHONES_OFFSET = { x: 0, y: -0.1, z: 0.4 };
const HEADPHONES_ROTATION_Y = Math.PI / 4;
const CHARGER_SIZE = 1.5;
const CHARGER_POSITION = { x: -2.5, y: 0, z: -0.9 };
const CHARGER_ROTATION = 180/3;
const CALCULATOR_SIZE = 1.3;
const CALCULATOR_POSITION = { x: -2.7, y: 0, z: 1.2 };
const CALCULATOR_ROTATION_Y = Math.PI / 3;
const FILM_CAMERA_SIZE = 1.6;
const FILM_CAMERA_POSITION = { x: -4, y: 0, z: -1 };
const FILM_CAMERA_ROTATION_Y = Math.PI / 2.7;
const DESK_PHOTO_POSITION = { x: -4.3, y: 0.002, z: -0.3 };


const deskPhotoLoader = new THREE.TextureLoader();
const deskPhotoGeometries = new Map();
const IMAGES_DIR = "./images/";

// Move the whole fan on the desk

// Scale all photos — increase to make them bigger
const DESK_PHOTO_SIZE_SCALE = 1.25;

const DESK_PHOTO_FLARE = {
  arc: Math.PI / 1.3,
  baseRadius: 0.15,
  stepRadius: 0.3,
  yStep: 0.002,
};

const DESK_PHOTO_FILES = [
  { file: "image1.jpeg", width: 0.5, aspect: 768 / 1024, angleOffset: 1.2 },
  { file: "image2.jpeg", width: 0.65, aspect: 1280/960, positionOffset:{x:0.05,z:0.1}, distOffset: 0.18, angleOffset: 0 },
  { file: "image3.jpeg", width: 0.5, aspect: 1536 / 2048, positionOffset: { x: -0.28, y: 0.004, z: 0.4 }, distOffset: 0.32, angleOffset: 0.14 },
  {
    file: "image5.jpeg",
    width: 0.65,
    aspect: 1024 / 768,
    alignIndex: 3,
    positionOffset: { x: -0.28, y: 0.004, z: 0.01 },
    order: 5,
  },
  {
    file: "image6.jpeg",
    width: 0.5,
    aspect: 1536 / 2048,
    alignIndex: 3,
    positionOffset: { x: 0.1, y: 0, z: 0.54 },
    rotationOffset: 0.3,
    order: 4,
  },
];

function buildDeskPhotoFlare() {
  const count = DESK_PHOTO_FILES.length;
  return DESK_PHOTO_FILES.map((photo, i) => {
    const alignIndex = photo.alignIndex ?? i;
    const t = count === 1 ? 0.5 : alignIndex / (count - 1);
    const angle = (t - 0.5) * DESK_PHOTO_FLARE.arc + (photo.angleOffset ?? 0);
    const dist =
      DESK_PHOTO_FLARE.baseRadius +
      alignIndex * DESK_PHOTO_FLARE.stepRadius +
      (photo.distOffset ?? 0);
    const width = photo.width * DESK_PHOTO_SIZE_SCALE;

    return {
      src: `${IMAGES_DIR}${photo.file}`,
      width,
      height: width / photo.aspect,
      position: {
        x:
          DESK_PHOTO_POSITION.x +
          Math.sin(angle) * dist +
          (photo.positionOffset?.x ?? 0),
        y:
          DESK_PHOTO_POSITION.y +
          i * DESK_PHOTO_FLARE.yStep +
          (photo.positionOffset?.y ?? 0),
        z:
          DESK_PHOTO_POSITION.z +
          Math.cos(angle) * dist +
          (photo.positionOffset?.z ?? 0),
      },
      rotationY: angle + (photo.rotationOffset ?? 0),
      order: photo.order ?? i,
    };
  });
}

const DESK_PHOTOS = buildDeskPhotoFlare();

function getDeskPhotoGeometry(width, height) {
  const key = `${width}x${height}`;
  if (!deskPhotoGeometries.has(key)) {
    deskPhotoGeometries.set(key, new THREE.PlaneGeometry(width, height));
  }
  return deskPhotoGeometries.get(key);
}

function placeDeskPhoto({ src, width, height, position, rotationY = 0, order = 0 }) {
  deskPhotoLoader.load(
    src,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      const photo = new THREE.Mesh(
        getDeskPhotoGeometry(width, height),
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.9,
          metalness: 0,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: order,
          depthWrite: true,
        })
      );
      photo.rotation.x = -Math.PI / 2;
      photo.renderOrder = order;
      photo.castShadow = order === 0;
      photo.receiveShadow = true;

      const mount = new THREE.Group();
      mount.position.set(position.x, DESK_TOP_Y + position.y, position.z);
      mount.rotation.y = rotationY;
      mount.renderOrder = order;
      mount.add(photo);
      scene.add(mount);
    },
    undefined,
    (err) => console.error(`Failed to load desk photo (${src}):`, err)
  );
}

function loadDeskPhotos() {
  DESK_PHOTOS.forEach(placeDeskPhoto);
}

function loadPhoneCharger() {
  loadDeskModel(
    "./models/phone_charger_low_poly.glb",
    CHARGER_SIZE,
    CHARGER_POSITION,
    "phone charger",
    CHARGER_ROTATION
  );
}

function placeModelOnDesk(model, targetSize, offset, rotationY = 0, rotationX = 0, rotationZ = 0) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  model.scale.setScalar(targetSize / maxDim);
  model.rotation.set(rotationX, rotationY, rotationZ);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, DESK_TOP_Y - box.min.y, -center.z);
  model.position.add(new THREE.Vector3(offset.x, offset.y, offset.z));

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(model);
}

function placeModelOnTopOf(
  baseModel,
  model,
  targetSize,
  rotationY = 0,
  rotationX = 0,
  rotationZ = 0,
  offset = { x: 0, y: 0, z: 0 }
) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  model.scale.setScalar(targetSize / maxDim);
  model.rotation.set(rotationX, rotationY, rotationZ);

  const modelBox = new THREE.Box3().setFromObject(model);
  const baseBox = new THREE.Box3().setFromObject(baseModel);
  const baseCenter = baseBox.getCenter(new THREE.Vector3());
  const modelCenter = modelBox.getCenter(new THREE.Vector3());

  model.position.set(
    baseCenter.x - modelCenter.x + offset.x,
    baseBox.max.y - modelBox.min.y + 0.002 + offset.y,
    baseCenter.z - modelCenter.z + offset.z
  );

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(model);
}

function loadDeskModel(path, targetSize, position, label, rotationY = 0, rotationX = 0, rotationZ = 0) {
  const loader = new GLTFLoader();
  loader.load(
    path,
    (gltf) => placeModelOnDesk(gltf.scene, targetSize, position, rotationY, rotationX, rotationZ),
    undefined,
    (err) => console.error(`Failed to load ${label}:`, err)
  );
}

function loadRubiksCube() {
  loadDeskModel("./models/rubiks_cube.glb", RUBIKS_CUBE_SIZE, RUBIKS_CUBE_POSITION, "Rubik's cube", RUBIKS_CUBE_ROTATION);
}

function loadWallet() {
  loadDeskModel(
    "./models/brown_leather_wallet.glb",
    WALLET_SIZE,
    WALLET_POSITION,
    "wallet"
  );
}

function loadCasioWatch() {
  loadDeskModel(
    "./models/casio_f-91w.glb",
    WATCH_SIZE,
    WATCH_POSITION,
    "Casio watch",
    WATCH_ROTATION_Y,
    WATCH_ROTATION_X,
    WATCH_ROTATION_Z
  );
}

function loadBluetoothSpeaker() {
  const loader = new GLTFLoader();
  loader.load(
    "./models/bose_soundlink_mini_ii_-_rawscan.glb",
    (gltf) => {
      speakerMesh = gltf.scene;
      placeModelOnDesk(
        speakerMesh,
        SPEAKER_SIZE,
        SPEAKER_POSITION,
        SPEAKER_ROTATION
      );
    },
    undefined,
    (err) => console.error("Failed to load bluetooth speaker:", err)
  );
}

function loadCap() {
  loadDeskModel("./models/cap.glb", CAP_SIZE, CAP_POSITION, "cap", CAP_ROTATION_Y);
}

function loadNotebookAndPen() {
  const loader = new GLTFLoader();
  loader.load(
    "./models/notebook_and_pen.glb",
    (gltf) => {
      const notebook = gltf.scene;
      placeModelOnDesk(notebook, NOTEBOOK_SIZE, NOTEBOOK_POSITION, NOTEBOOK_ROTATION_Y);
      loader.load(
        "./models/headphones_free.glb",
        (headphonesGltf) => {
          placeModelOnTopOf(
            notebook,
            headphonesGltf.scene,
            HEADPHONES_SIZE,
            HEADPHONES_ROTATION_Y,
            0,
            0,
            HEADPHONES_OFFSET
          );
        },
        undefined,
        (err) => console.error("Failed to load headphones:", err)
      );
    },
    undefined,
    (err) => console.error("Failed to load notebook and pen:", err)
  );
}

function loadCalculator() {
  loadDeskModel(
    "./models/calculator.glb",
    CALCULATOR_SIZE,
    CALCULATOR_POSITION,
    "calculator",
    CALCULATOR_ROTATION_Y
  );
}

function loadFilmCamera() {
  loadDeskModel(
    "./models/vintage_film_camera_olympus.glb",
    FILM_CAMERA_SIZE,
    FILM_CAMERA_POSITION,
    "film camera",
    FILM_CAMERA_ROTATION_Y
  );
}

// Lighting setup
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

// Add directional light for better visibility
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -8;
dirLight.shadow.camera.right = 8;
dirLight.shadow.camera.top = 8;
dirLight.shadow.camera.bottom = -8;
dirLight.shadow.bias = -0.0002;
scene.add(dirLight);

let animDuration = 1200;
let animStartTime = 0;
let animStartQuat, animEndQuat;
let animUseScreenOrientation = false;
let pendingDeskRestore = false;

function animate(t = 0) {
  requestAnimationFrame(animate);

  if (isAnimating) {
    const elapsed = performance.now() - animStartTime;
    const raw = Math.min(elapsed / animDuration, 1);
    const progress = easeInOut(raw);

    camera.position.lerpVectors(animStartPos, animEndPos, progress);
    controls.target.lerpVectors(animStartTarget, animEndTarget, progress);

    if (animUseScreenOrientation) {
      camera.quaternion.slerpQuaternions(animStartQuat, animEndQuat, progress);
      camera.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    } else {
      camera.up.set(0, 1, 0);
      camera.lookAt(controls.target);
    }

    if (raw >= 1) {
      isAnimating = false;
      animUseScreenOrientation = false;
      controls.enableDamping = true;
      if (pendingPortfolioOpen) {
        pendingPortfolioOpen = false;
        showPortfolioOverlay();
      } else if (pendingDeskRestore) {
        pendingDeskRestore = false;
        applyDeskCamera();
        idleOrbit = true;
        idleTime = 0;
      } else {
        camera.up.set(0, 1, 0);
        camera.lookAt(animEndTarget);
        controls.target.copy(animEndTarget);
      }
    }
  }

  if (portfolioOpen && !isAnimating) {
    snapCameraToScreen();
  }

  if (idleOrbit && !isAnimating && !portfolioOpen) {
    idleTime = (idleTime + IDLE_ORBIT_SPEED) % (Math.PI * 2);
    const desk = getDeskCamera();
    const dx = desk.position.x - desk.target.x;
    const dz = desk.position.z - desk.target.z;
    const radius = Math.hypot(dx, dz);
    const baseAzimuth = Math.atan2(dx, dz);
    const angle = -Math.sin(idleTime) * IDLE_ORBIT_AMPLITUDE;
    camera.position.x = desk.target.x + Math.sin(baseAzimuth + angle) * radius;
    camera.position.z = desk.target.z + Math.cos(baseAzimuth + angle) * radius;
    camera.position.y = desk.position.y;
    camera.up.set(0, 1, 0);
    camera.lookAt(desk.target);
    controls.target.copy(desk.target);
  }

  if (!isAnimating && !portfolioOpen && !idleOrbit) {
    controls.update();
  }

  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
}

const desk = createDesk();
scene.add(desk);

createLaptop();
loadRubiksCube();
loadWallet();
loadCasioWatch();
loadBluetoothSpeaker();
loadCap();
loadNotebookAndPen();
loadPhoneCharger();
loadCalculator();
loadFilmCamera();
loadDeskPhotos();

renderer.domElement.style.cursor = "default";
renderer.domElement.addEventListener("mousemove", (e) => {
  if (portfolioOpen) {
    renderer.domElement.style.cursor = "default";
    return;
  }
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(getMouseFromEvent(e), camera);
  const overScreen = screenMesh && raycaster.intersectObjects([screenMesh], false).length > 0;
  const overSpeaker = getSpeakerRaycastHits(raycaster).length > 0;
  renderer.domElement.style.cursor = overScreen || overSpeaker ? "pointer" : "default";
});

// Camera animation state
let isAnimating = false;
let animStartPos, animEndPos, animStartTarget, animEndTarget;
let savedDeskCameraPos = null;
let savedDeskCameraTarget = null;

function animateCameraTo(targetPos, targetLookAt, duration = 1200, options = {}) {
  animStartPos = camera.position.clone();
  animStartTarget = controls.target.clone();
  animStartQuat = camera.quaternion.clone();
  animEndPos = targetPos.clone();
  animEndTarget = targetLookAt.clone();
  animEndQuat = options.quaternion?.clone() ?? animStartQuat.clone();
  animUseScreenOrientation = Boolean(options.quaternion);
  isAnimating = true;
  animDuration = duration;
  animStartTime = performance.now();
  controls.enableDamping = false;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function setPortfolioInteraction(enabled) {
  cssRenderer.domElement.style.pointerEvents = enabled ? "auto" : "none";
  if (portfolioIframe) portfolioIframe.style.pointerEvents = enabled ? "auto" : "none";
  if (portfolioCssObject) {
    portfolioCssObject.element.style.pointerEvents = enabled ? "auto" : "none";
  }
}

function showBackButton() {
  if (backButtonEl) return;
  backButtonEl = document.createElement("button");
  backButtonEl.id = "portfolio-back-btn";
  backButtonEl.innerHTML = "← Back";
  Object.assign(backButtonEl.style, {
    position: "fixed",
    top: isMobile() ? "max(12px, env(safe-area-inset-top))" : "16px",
    left: isMobile() ? "max(12px, env(safe-area-inset-left))" : "16px",
    zIndex: "11",
    padding: "8px 16px", borderRadius: "999px", border: "none",
    background: "rgba(0,0,0,0.6)", color: "#fff",
    fontSize: "24px", cursor: "pointer", backdropFilter: "blur(6px)"
  });
  backButtonEl.addEventListener("click", hidePortfolioOverlay);
  document.body.appendChild(backButtonEl);
}

function hideBackButton() {
  backButtonEl?.remove();
  backButtonEl = null;
}

function showPortfolioOverlay() {
  portfolioOpen = true;
  hideScreenHint();
  welcomeEl.style.opacity = "0";
  snapCameraToScreen();
  setPortfolioInteraction(true);
  showBackButton();
  try {
    portfolioIframe?.contentWindow?.focus();
  } catch (_) {}
}

function hidePortfolioOverlay() {
  portfolioOpen = false;
  setPortfolioInteraction(false);
  hideBackButton();
  pendingDeskRestore = true;
  const desk = getDeskCamera();
  animateCameraTo(desk.position, desk.target, PORTFOLIO_ZOOM_OUT_DURATION);
  controls.enabled = true;
  setTimeout(() => { welcomeEl.style.opacity = "1"; }, PORTFOLIO_ZOOM_OUT_DURATION + 100);
}

renderer.domElement.addEventListener("click", (e) => {
  if (portfolioOpen) return;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(getMouseFromEvent(e), camera);

  if (getSpeakerRaycastHits(raycaster).length > 0) {
    toggleDeskMusic();
    return;
  }

  if (!screenMesh) return;
  const hits = raycaster.intersectObjects([screenMesh], false);
  if (hits.length > 0) {
    hideScreenHint();
    savedDeskCameraPos = camera.position.clone();
    savedDeskCameraTarget = controls.target.clone();
    idleOrbit = false;
    welcomeEl.style.opacity = "0";
    controls.enabled = false;
    pendingPortfolioOpen = true;
    const zoom = getPortfolioZoomCamera();
    animateCameraTo(zoom.position, zoom.target, zoom.duration, {
      quaternion: zoom.quaternion
    });
  }
});

animate();