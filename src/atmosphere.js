import * as THREE from "three";
import { CSM } from "three/addons/csm/CSM.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function surfaceTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  let n = 123;
  const rand = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = kind === "paint" ? 180 + rand() * 65 : 60 + rand() * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (kind !== "paint") {
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#151515";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(
        rand() * 128,
        rand() * 128,
        20 + rand() * 30,
        4 + rand() * 9,
        rand() * 3,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === "paint" ? 3 : 18, kind === "paint" ? 3 : 18);
  return t;
}
export function brandingTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#071421";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#48efd3";
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 488, 232);
  ctx.save();
  ctx.translate(255, 95);
  ctx.rotate(-0.08);
  ctx.font = "italic 900 82px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#48efd3";
  ctx.fillText("LEVEL 29", 0, 0);
  ctx.restore();
  ctx.fillStyle = "#ffc76b";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ENT. / CRESCENT CITY", 256, 145);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#e2f8ff";
  ctx.fillText("EASTBANK UNDERGROUND", 256, 193);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function createLighting(renderer, scene, camera, mobile) {
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.05);
  scene.environment = env.texture;
  room.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 0.5;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Two camera-relative moonlight cascades; fixed pool of two nearby lamp spot shadows.
  const csm = new CSM({
    camera,
    parent: scene,
    cascades: 2,
    maxFar: 140,
    shadowMapSize: mobile ? 512 : 2048,
    lightDirection: new THREE.Vector3(-0.7, -1, -0.4).normalize(),
    lightIntensity: 1.2,
    shadowBias: -0.00008,
  });
  const registered = new WeakSet();
  function register(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = !o.isReflector && !o.material?.isMeshBasicMaterial;
        o.receiveShadow = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.isMeshStandardMaterial && !registered.has(m)) {
            csm.setupMaterial(m);
            registered.add(m);
            m.addEventListener("dispose", () => csm.shaders.delete(m));
          }
        }
      }
    });
  }
  register(scene);
  const lamps = Array.from({ length: 2 }, () => {
    const l = new THREE.SpotLight("#ffd29b", 90, 30, 0.72, 0.65, 1.5);
    l.castShadow = true;
    l.shadow.mapSize.set(mobile ? 256 : 1024, mobile ? 256 : 1024);
    l.shadow.bias = -0.001;
    l.shadow.normalBias = 0.12;
    scene.add(l, l.target);
    return l;
  });
  let enabled = !mobile,
    lastFov = camera.fov;
  function setQuality(high) {
    enabled = high;
    renderer.shadowMap.enabled = high;
    csm.lights.forEach((l) => {
      l.castShadow = high;
    });
    lamps.forEach((l) => (l.visible = high));
  }
  setQuality(enabled);
  return {
    register,
    setQuality,
    update(car) {
      if (!enabled) return;
      camera.updateMatrixWorld();
      if (Math.abs(lastFov - camera.fov) > 1) {
        lastFov = camera.fov;
        csm.updateFrustums();
      }
      csm.update();
      lamps.forEach((l, i) => {
        const x = Math.floor(car.x / 100) * 100 + (i ? 87 : 13),
          z = Math.floor(car.z / 100) * 100 + (i ? 86 : 14);
        l.position.set(x, 6, z);
        l.target.position.set(x, 0, z);
      });
    },
    resize() {
      csm.updateFrustums();
    },
  };
}
export function createSmoke(scene, mobile) {
  const count = mobile ? 64 : 180,
    positions = new Float32Array(count * 3),
    sizes = new Float32Array(count),
    life = new Float32Array(count),
    velocity = new Float32Array(count * 3);
  let cursor = 0,
    emit = 0;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "#ffffffaa");
  g.addColorStop(1, "#ffffff00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: new THREE.CanvasTexture(canvas) },
      tint: { value: new THREE.Color("#e0dfdc") },
    },
    vertexShader:
      "attribute float size; varying float fade; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=min(90.,size*330./max(1.,-p.z));fade=size>0.?1.:0.;}",
    fragmentShader:
      "uniform sampler2D map;uniform vec3 tint;varying float fade;void main(){gl_FragColor=texture2D(map,gl_PointCoord)*vec4(tint,fade*.42);}",
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  return {
    update(dt, car, input, boost) {
      emit += dt;
      const smoking = (input.handbrake && Math.abs(car.speed) > 6) || boost;
      if (smoking && emit > 0.035) {
        emit = 0;
        for (const side of [-1, 1]) {
          const i = cursor++ % count,
            k = i * 3;
          positions[k] =
            car.x - Math.sin(car.heading) * 2 + Math.cos(car.heading) * side;
          positions[k + 1] = 0.3;
          positions[k + 2] =
            car.z - Math.cos(car.heading) * 2 - Math.sin(car.heading) * side;
          life[i] = 1.7;
          velocity[k] = (Math.random() - 0.5) * 1.2;
          velocity[k + 2] = (Math.random() - 0.5) * 1.2;
        }
      }
      for (let i = 0; i < count; i++) {
        life[i] = Math.max(0, life[i] - dt);
        const k = i * 3;
        sizes[i] = life[i] > 0 ? (1.7 - life[i]) * 1.5 + 0.3 : 0;
        positions[k] += velocity[k] * dt;
        positions[k + 1] += dt * 0.7;
        positions[k + 2] += velocity[k + 2] * dt;
      }
      material.uniforms.tint.value.set(
        Math.abs(car.x) > 480 ? "#ae9471" : "#e0dfdc",
      );
      geometry.attributes.position.needsUpdate =
        geometry.attributes.size.needsUpdate = true;
    },
  };
}
export function createPedestrians(scene) {
  const people = [],
    bodyGeo = new THREE.CapsuleGeometry(0.22, 0.65, 2, 5),
    limbGeo = new THREE.BoxGeometry(0.14, 0.65, 0.15);
  for (let i = 0; i < 24; i++) {
    const group = new THREE.Group(),
      mat = new THREE.MeshStandardMaterial({
        color: ["#2aa998", "#9a5d96", "#dbb66e"][i % 3],
      });
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 1;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 6, 5),
      new THREE.MeshStandardMaterial({ color: "#ae8169" }),
    );
    head.position.y = 1.7;
    group.add(head);
    const legs = [];
    for (const x of [-0.15, 0.15]) {
      const leg = new THREE.Mesh(limbGeo, mat);
      leg.position.set(x, 0.38, 0);
      legs.push(leg);
      group.add(leg);
    }
    const x = ((i % 6) - 3) * 100 + 13,
      z = (Math.floor(i / 6) - 2) * 100 + 16;
    group.position.set(x, 0, z);
    scene.add(group);
    people.push({ group, legs, x, z, phase: i, t: 0, fear: 0 });
  }
  return {
    update(dt, car) {
      for (const p of people) {
        const distance = p.group.position.distanceTo(
          new THREE.Vector3(car.x, 0, car.z),
        );
        p.fear =
          distance < 16 && Math.abs(car.speed) > 5
            ? 2
            : Math.max(0, p.fear - dt);
        p.t += dt * (p.fear ? 2.8 : 0.65);
        p.group.position.z = p.z + Math.sin(p.t) * 27;
        p.group.position.x = p.x + (p.fear ? Math.sign(p.x - car.x) * 3 : 0);
        p.group.rotation.y = Math.cos(p.t) > 0 ? 0 : Math.PI;
        p.legs.forEach(
          (leg, i) => (leg.rotation.x = Math.sin(p.t * 9 + i * Math.PI) * 0.5),
        );
      }
    },
  };
}
