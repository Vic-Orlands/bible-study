import * as THREE from "three";
import { WIDTH, HEIGHT, LEAVES, SEGMENTS, ROWS, bendPage } from "./bible-page-geometry";

const DURATION = 7.2;

const REVELATION_22 = [
  "And he shewed me a pure river of water of life, clear as crystal, proceeding out of the throne of God and of the Lamb.",
  "In the midst of the street of it, and on either side of the river, was there the tree of life, which bare twelve manner of fruits, and yielded her fruit every month: and the leaves of the tree were for the healing of the nations.",
  "And there shall be no more curse: but the throne of God and of the Lamb shall be in it; and his servants shall serve him:",
  "And they shall see his face; and his name shall be in their foreheads.",
  "And there shall be no night there; and they need no candle, neither light of the sun; for the Lord God giveth them light: and they shall reign for ever and ever.",
  "And he said unto me, These sayings are faithful and true: and the Lord God of the holy prophets sent his angel to shew unto his servants the things which must shortly be done.",
  "Behold, I come quickly: blessed is he that keepeth the sayings of the prophecy of this book.",
  "And I John saw these things, and heard them. And when I had heard and seen, I fell down to worship before the feet of the angel which shewed me these things.",
  "Then saith he unto me, See thou do it not: for I am thy fellowservant, and of thy brethren the prophets, and of them which keep the sayings of this book: worship God.",
  "And he saith unto me, Seal not the sayings of the prophecy of this book: for the time is at hand.",
  "He that is unjust, let him be unjust still: and he which is filthy, let him be filthy still: and he that is righteous, let him be righteous still: and he that is holy, let him be holy still.",
  "And, behold, I come quickly; and my reward is with me, to give every man according as his work shall be.",
  "I am Alpha and Omega, the beginning and the end, the first and the last.",
  "Blessed are they that do his commandments, that they may have right to the tree of life, and may enter in through the gates into the city.",
  "For without are dogs, and sorcerers, and whoremongers, and murderers, and idolaters, and whosoever loveth and maketh a lie.",
  "I Jesus have sent mine angel to testify unto you these things in the churches. I am the root and the offspring of David, and the bright and morning star.",
  "And the Spirit and the bride say, Come. And let him that heareth say, Come. And let him that is athirst come. And whosoever will, let him take the water of life freely.",
  "For I testify unto every man that heareth the words of the prophecy of this book, If any man shall add unto these things, God shall add unto him the plagues that are written in this book:",
  "And if any man shall take away from the words of the book of this prophecy, God shall take away his part out of the book of life, and out of the holy city, and from the things which are written in this book.",
  "He which testifieth these things saith, Surely I come quickly. Amen. Even so, come, Lord Jesus.",
  "The grace of our Lord Jesus Christ be with you all. Amen.",
];


type Spring = { position: number; velocity: number };

function spring(state: Spring, target: number, dt: number, stiffness = 95) {
  const acceleration = stiffness * (target - state.position) - 19 * state.velocity;
  state.velocity += acceleration * dt;
  state.position += state.velocity * dt;
}

function smoothstep(start: number, end: number, time: number) {
  const t = THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D) => void,
  options?: { mipmaps?: boolean },
) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = 768 * scale;
  canvas.height = 1024 * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas textures are unavailable");
  ctx.scale(scale, scale);
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (options?.mipmaps === false) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  } else {
    texture.anisotropy = 8;
  }
  return texture;
}

function leatherTexture() {
  return canvasTexture((ctx) => {
    ctx.fillStyle = "#3a2218";
    ctx.fillRect(0, 0, 768, 1024);
    let seed = 147;
    const noise = () => {
      seed = Math.imul(1664525, seed) + 1013904223 | 0;
      return (seed >>> 0) / 4294967296;
    };
    for (let i = 0; i < 90000; i++) {
      const x = noise() * 768;
      const y = noise() * 1024;
      ctx.fillStyle = i % 2 ? "#ffffff09" : "#00000018";
      ctx.fillRect(x, y, 1.3, 1.3);
    }
    const gutter = ctx.createLinearGradient(0, 0, 90, 0);
    gutter.addColorStop(0, "#1f120990");
    gutter.addColorStop(0.4, "#1f120900");
    gutter.addColorStop(0.6, "#1f120960");
    gutter.addColorStop(1, "#1f120900");
    ctx.fillStyle = gutter;
    ctx.fillRect(0, 0, 90, 1024);
    ctx.strokeStyle = "#a5946455";
    ctx.lineWidth = 2;
    ctx.strokeRect(53, 42, 672, 940);
    ctx.strokeStyle = "#a5946428";
    ctx.strokeRect(63, 52, 652, 920);
    const gold = ctx.createLinearGradient(270, 250, 490, 720);
    gold.addColorStop(0, "#f1dfab");
    gold.addColorStop(0.35, "#b49b60");
    gold.addColorStop(0.65, "#e4cf97");
    gold.addColorStop(1, "#97804c");
    ctx.fillStyle = gold;
    ctx.fillRect(379, 254, 10, 214);
    ctx.fillRect(322, 318, 124, 10);
    ctx.textAlign = "center";
    ctx.font = "42px Georgia";
    ctx.fillText("HOLY BIBLE", 384, 632);
    ctx.font = "13px Georgia";
    ctx.letterSpacing = "5px";
    ctx.fillText("THE WORD OF LIFE", 384, 686);
    ctx.letterSpacing = "0px";
    ctx.fillRect(366, 826, 36, 1);
  });
}

function paperTexture(pageNumber: number, reverse = false, finalChapter = false) {
  const texture = canvasTexture((ctx) => {
    ctx.fillStyle = "#fcf6eb";
    ctx.fillRect(0, 0, 768, 1024);
    for (let i = 0; i < 16000; i++) {
      ctx.fillStyle = i % 2 ? "#927c5310" : "#ffffff35";
      ctx.fillRect((i * 137.31) % 768, (i * 79.17) % 1024, 1, 1);
    }
    const gutter = ctx.createLinearGradient(reverse ? 768 : 0, 0, reverse ? 613 : 155, 0);
    gutter.addColorStop(0, "#74664b40");
    gutter.addColorStop(0.28, "#a8987518");
    gutter.addColorStop(1, "#a8987500");
    ctx.fillStyle = gutter;
    ctx.fillRect(reverse ? 613 : 0, 0, 155, 1024);
    ctx.fillStyle = "#66614f";
    ctx.textAlign = "center";
    ctx.font = "16px Georgia";
    ctx.letterSpacing = "3px";
    ctx.fillText(finalChapter ? "THE REVELATION OF ST. JOHN" : "THE BOOK OF GENESIS", 400, 76);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#aaa18b";
    ctx.fillRect(92, 100, 592, 1);
    ctx.fillStyle = "#514c3e";
    ctx.font = "30px Georgia";
    ctx.fillText(finalChapter ? "The River of Life" : "The Creation", 398, 156);
    ctx.font = "15px Georgia";
    ctx.fillText(finalChapter ? "CHAPTER 22" : "CHAPTER I", 398, 192);
    const verses = finalChapter ? REVELATION_22 : [
      "In the beginning God created the heaven and the earth.",
      "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
      "And God said, Let there be light: and there was light.",
      "And God saw the light, that it was good: and God divided the light from the darkness.",
      "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
      "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.",
      "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.",
      "And God called the firmament Heaven. And the evening and the morning were the second day.",
      "And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.",
      "And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good.",
      "And God said, Let the earth bring forth grass, the herb yielding seed, and the fruit tree yielding fruit after his kind, whose seed is in itself, upon the earth: and it was so.",
      "And the earth brought forth grass, and herb yielding seed after his kind, and the tree yielding fruit, whose seed was in itself, after his kind: and God saw that it was good.",
      "And the evening and the morning were the third day.",
    ];
    ctx.textAlign = "left";
    let textLines: string[] = [];
    let fontSize = 18;
    for (; fontSize >= 10; fontSize--) {
      ctx.font = `${fontSize}px Georgia`;
      textLines = [];
      for (let i = 0; i < verses.length; i++) {
        const words = `${i + 1} ${verses[i]}`.split(" ");
        let line = "";
        for (const word of words) {
          if (ctx.measureText(`${line}${word}`).width > 269) {
            textLines.push(line.trim());
            line = "";
          }
          line += `${word} `;
        }
        textLines.push(line.trim());
      }
      if (Math.ceil(textLines.length / 2) * fontSize * 1.38 <= 640) break;
    }
    const linesPerColumn = Math.ceil(textLines.length / 2);
    const lineHeight = fontSize * 1.38;
    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.45;
    ctx.lineJoin = "round";
    textLines.forEach((line, index) => {
      const column = Math.floor(index / linesPerColumn);
      const x = 92 + column * 316;
      const y = 240 + (index % linesPerColumn) * lineHeight;
      ctx.strokeText(line, x, y);
      ctx.fillText(line, x, y);
    });
    ctx.textAlign = "center";
    ctx.font = "15px Georgia";
    ctx.fillStyle = "#8d8571";
    ctx.fillText(finalChapter ? "REVELATION 22" : String(pageNumber), 394, 958);
  }, { mipmaps: false });
  if (reverse) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -1;
    texture.offset.x = 1;
  }
  return texture;
}

function coverGeometry() {
  const shape = new THREE.Shape();
  const w = WIDTH + 0.085;
  const h = HEIGHT / 2 + 0.065;
  const r = 0.065;
  shape.moveTo(0, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(0, h);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.012,
    curveSegments: 10,
  });
}


export function createBibleScene(host: HTMLDivElement, onComplete: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const book = new THREE.Group();
  scene.add(book);
  scene.add(new THREE.HemisphereLight(0xfffaeb, 0x71675c, 2.6));

  const key = new THREE.DirectionalLight(0xffeed4, 3.5);
  key.position.set(-3, 5, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.018;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8e1d8, 1.6);
  fill.position.set(4, -1, 4);
  scene.add(fill);

  const textures = [leatherTexture(), paperTexture(1), paperTexture(2, true), paperTexture(1240, true, true)];
  const leather = new THREE.MeshStandardMaterial({ color: "#25140b", roughness: 0.84 });
  const lining = new THREE.MeshBasicMaterial({ color: "#ebd5b3" });
  lining.toneMapped = false;
  const paper = new THREE.MeshBasicMaterial({ map: textures[1], side: THREE.FrontSide });
  paper.toneMapped = false;
  const paperBack = new THREE.MeshBasicMaterial({ map: textures[2], side: THREE.BackSide });
  paperBack.toneMapped = false;
  const lastPageBack = new THREE.MeshBasicMaterial({ map: textures[3], side: THREE.BackSide });
  lastPageBack.toneMapped = false;

  const makeCover = () => {
    const group = new THREE.Group();
    const cover = new THREE.Mesh(coverGeometry(), leather);
    cover.castShadow = true;
    cover.receiveShadow = true;
    group.add(cover);
    return group;
  };
  const backCover = makeCover();
  backCover.position.z = -0.06;
  const backLining = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH - 0.035, HEIGHT - 0.035), lining,
  );
  backLining.position.set(WIDTH / 2, 0, 0.06);
  backLining.receiveShadow = true;
  backCover.add(backLining);
  book.add(backCover);
  const frontCover = makeCover();
  const coverFace = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH + 0.035, HEIGHT + 0.07),
    new THREE.MeshStandardMaterial({ map: textures[0], roughness: 0.8, metalness: 0.12 }),
  );
  coverFace.position.set((WIDTH + 0.035) / 2, 0, 0.058);
  frontCover.add(coverFace);
  const insideCover = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH - 0.035, HEIGHT - 0.035), lining);
  insideCover.rotation.y = Math.PI;
  insideCover.position.set(WIDTH / 2, 0, -0.014);
  frontCover.add(insideCover);
  book.add(frontCover);

  const makeLeaf = (index: number) => {
    const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, SEGMENTS, ROWS);
    const front = new THREE.Mesh(geometry, paper);
    const back = new THREE.Mesh(geometry, index === LEAVES - 1 ? lastPageBack : paperBack);
    front.castShadow = true;
    front.frustumCulled = false;
    back.frustumCulled = false;
    book.add(front, back);
    return { geometry, position: 0, velocity: 0 };
  };
  const leaves = Array.from({ length: LEAVES }, (_, index) => makeLeaf(index));
  leaves.forEach((leaf, index) => bendPage(leaf.geometry, 0, index));

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
  shadow.position.z = -0.65;
  shadow.receiveShadow = true;
  scene.add(shadow);

  const coverSpring: Spring = { position: 0, velocity: 0 };
  const tiltX: Spring = { position: 0, velocity: 0 };
  const tiltY: Spring = { position: 0, velocity: 0 };
  const pointer = new THREE.Vector2();
  let elapsed = 0;
  let lastTime = 0;
  let frame = 0;
  let disposed = false;

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.position.set(0, 0.12, Math.max(11.4, 8.2 / camera.aspect));
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const rect = host.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5);
  };
  const leave = () => pointer.set(0, 0);
  const visibility = () => { lastTime = 0; };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", visibility);

  const render = (now: number) => {
    if (disposed) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 1 / 60;
    lastTime = now;
    if (!document.hidden) elapsed += dt;
    const steps = Math.ceil(dt / (1 / 120));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      spring(coverSpring, smoothstep(0.65, 2.15, elapsed), step, 110);
      spring(tiltX, pointer.y * 0.055, step);
      spring(tiltY, pointer.x * 0.09, step);
      leaves.forEach((leaf, index) => {
        const start = 1.75 + index * 0.205;
        spring(leaf, smoothstep(start, start + 1.25, elapsed), step);
      });
    }
    const opening = coverSpring.position;
    frontCover.rotation.y = -Math.PI * opening;
    frontCover.position.z = THREE.MathUtils.lerp(0.15, 0.012, opening);
    book.position.set(-WIDTH / 2 * (1 - opening), 0.15, 0);
    book.rotation.set(-0.18 - opening * 0.34 + tiltX.position, -0.18 + opening * 0.1 + tiltY.position, 0.075);
    leaves.forEach((leaf, index) => {
      bendPage(leaf.geometry, leaf.position, index);
    });
    renderer.render(scene, camera);
    if (elapsed >= DURATION) {
      onComplete();
      return;
    }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", visibility);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        const entries = Array.isArray(object.material) ? object.material : [object.material];
        entries.forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    key.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
