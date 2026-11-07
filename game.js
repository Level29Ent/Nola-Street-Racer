import { generateDealershipCatalog } from './cars.js';

export class NolaStreetRacerGame {
    constructor() {
        this.playerMoney = 50000;
        this.currentMaxSpeed = 1.3;
        this.catalog = generateDealershipCatalog();
        this.initThree();
        this.initControls();
        this.animate = this.animate.bind(this);
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020206);
        this.scene.fog = new THREE.FogExp2(0x020206, 0.010);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x0d0d1a, 2.0);
        this.scene.add(ambientLight);

        const moonLight = new THREE.DirectionalLight(0x4060ff, 2.5);
        moonLight.position.set(40, 80, 40);
        moonLight.castShadow = true;
        this.scene.add(moonLight);

        // Road & Environment
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 900),
            new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.3, metalness: 0.2 })
        );
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        this.scene.add(road);

        // Player Car
        this.carGroup = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8800ff, roughness: 0.15, metalness: 0.85 });
        this.carBodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.8), bodyMat);
        this.carBodyMesh.position.y = 0.65;
        this.carGroup.add(this.carBodyMesh);
        this.scene.add(this.carGroup);
        this.carGroup.position.set(0, 0, 180);

        this.speed = 0;
        this.carAngle = 0;
    }

    initControls() {
        this.keys = { forward: false, backward: false, left: false, right: false, drift: false };
        window.addEventListener('keydown', (e) => this.updateKeys(e, true));
        window.addEventListener('keyup', (e) => this.updateKeys(e, false));
    }

    updateKeys(e, isDown) {
        switch(e.key.toLowerCase()) {
            case 'w': case 'arrowup': this.keys.forward = isDown; break;
            case 's': case 'arrowdown': this.keys.backward = isDown; break;
            case 'a': case 'arrowleft': this.keys.left = isDown; break;
            case 'd': case 'arrowright': this.keys.right = isDown; break;
            case ' ': this.keys.drift = isDown; break;
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        const acceleration = 0.018;
        const deceleration = 0.012;
        const turnSpeed = 0.038;

        if (this.keys.forward) this.speed = Math.min(this.speed + acceleration, this.currentMaxSpeed);
        else if (this.keys.backward) this.speed = Math.max(this.speed - acceleration, -this.currentMaxSpeed / 3);
        else {
            if (this.speed > 0) this.speed = Math.max(this.speed - deceleration, 0);
            if (this.speed < 0) this.speed = Math.min(this.speed + deceleration, 0);
        }

        let currentTurn = turnSpeed;
        if (this.keys.drift) currentTurn *= 1.7;

        if (Math.abs(this.speed) > 0.05) {
            if (this.keys.left) { this.carAngle += currentTurn * Math.sign(this.speed); this.carGroup.rotation.y = this.carAngle; }
            if (this.keys.right) { this.carAngle -= currentTurn * Math.sign(this.speed); this.carGroup.rotation.y = this.carAngle; }
        }

        this.carGroup.position.x += Math.sin(this.carAngle) * this.speed;
        this.carGroup.position.z += Math.cos(this.carAngle) * this.speed;

        if (this.carGroup.position.z < -400) this.carGroup.position.z = 400;
        if (this.carGroup.position.z > 400) this.carGroup.position.z = -400;
        this.carGroup.position.x = Math.max(Math.min(this.carGroup.position.x, 13), -13);

        // Camera follow
        const targetX = this.carGroup.position.x - Math.sin(this.carAngle) * 13;
        const targetZ = this.carGroup.position.z - Math.cos(this.carAngle) * 13;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.12;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.12;
        this.camera.position.y = this.carGroup.position.y + 4.5;
        this.camera.lookAt(this.carGroup.position.x, this.carGroup.position.y + 1, this.carGroup.position.z - 4);

        this.renderer.render(this.scene, this.camera);
    }
}
