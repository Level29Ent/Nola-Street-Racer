import * as THREE from "three";
// Camera-local dashboard stays separate from the exterior's opaque cabin shell.
export function createCockpit(scene, camera, renderer, mobile) {
  const dash = new THREE.Group();
  camera.add(dash);
  scene.add(camera);
  dash.visible = false;
  const material = new THREE.MeshStandardMaterial({
    color: "#12252e",
    roughness: 0.65,
  });
  const dashboard = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.35, 0.4),
    material,
  );
  dashboard.position.set(0, -0.55, -0.85);
  dash.add(dashboard);
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 6, 24),
    new THREE.MeshStandardMaterial({ color: "#050c11", metalness: 0.4 }),
  );
  wheel.position.set(-0.35, -0.3, -0.62);
  dash.add(wheel);
  const spoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.025, 0.025),
    material,
  );
  wheel.add(spoke);
  const gaugeCanvas = document.createElement("canvas");
  gaugeCanvas.width = 256;
  gaugeCanvas.height = 96;
  const ctx = gaugeCanvas.getContext("2d");
  const texture = new THREE.CanvasTexture(gaugeCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const gauge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.14),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  gauge.position.set(0.03, -0.3, -0.61);
  dash.add(gauge);
  const mirrorCamera = new THREE.PerspectiveCamera(55, 3.2, 0.2, 250),
    target = new THREE.WebGLRenderTarget(
      mobile ? 256 : 384,
      mobile ? 80 : 120,
      { depthBuffer: true },
    );
  // A real rear-camera texture on a physical camera-local mirror plane.
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.156),
    new THREE.MeshBasicMaterial({ map: target.texture }),
  );
  mirror.position.set(0, 0.25, -0.8);
  mirror.scale.x = -1;
  dash.add(mirror);
  let enabled = false,
    lastSpeed = -1,
    mirrorClock = 0;
  return {
    get enabled() {
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      dash.visible = enabled;
      return enabled;
    },
    update(car, input) {
      dash.visible = enabled;
      const fit = Math.min(1, camera.aspect);
      wheel.scale.set(fit, fit, 1);
      wheel.position.x = -0.3 * fit;
      gauge.scale.set(fit, fit, 1);
      gauge.position.x = 0.1 * fit;
      mirror.scale.set(-fit, fit, 1);
      mirror.position.set(
        fit < 1 ? -0.17 * fit : 0,
        fit < 1 ? 0.04 : 0.25,
        -0.8,
      );
      wheel.rotation.z = -input.steer * 0.7;
      const mph = Math.round(Math.abs(car.speed) * 2.237);
      if (lastSpeed !== mph) {
        lastSpeed = mph;
        ctx.fillStyle = "#04131b";
        ctx.fillRect(0, 0, 256, 96);
        ctx.fillStyle = "#55f5d5";
        ctx.font = "bold 50px monospace";
        ctx.fillText(String(mph).padStart(3, "0"), 15, 62);
        ctx.font = "16px monospace";
        ctx.fillText("MPH / LEVEL 29", 15, 85);
        texture.needsUpdate = true;
      }
      if (enabled) {
        camera.position.set(car.x, 1.65, car.z);
        camera.lookAt(
          car.x + Math.sin(car.heading) * 30,
          1.65,
          car.z + Math.cos(car.heading) * 30,
        );
        camera.fov = 74;
        camera.updateProjectionMatrix();
      }
    },
    renderMirror(dt, car, player, reflection) {
      if (!enabled) return;
      mirrorClock += dt;
      if (mirrorClock < (mobile ? 0.12 : 0.075)) return;
      mirrorClock = 0;
      mirrorCamera.position.set(car.x, 1.9, car.z);
      mirrorCamera.lookAt(
        car.x - Math.sin(car.heading) * 35,
        1.8,
        car.z - Math.cos(car.heading) * 35,
      );
      const old = renderer.getRenderTarget(),
        visible = reflection.visible;
      dash.visible = false;
      player.visible = false;
      reflection.visible = false;
      renderer.setRenderTarget(target);
      renderer.render(scene, mirrorCamera);
      renderer.setRenderTarget(old);
      reflection.visible = visible;
      player.visible = true;
      player.userData.bodyGroup.visible = !enabled;
      dash.visible = true;
    },
  };
}
