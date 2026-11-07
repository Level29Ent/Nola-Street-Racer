class NolaOpenWorldGame {
    constructor() {
        this.playerMoney = 50000;
        this.currentMaxSpeed = 0.8;
        this.isWalking = false;
        this.walkPos = { x: 0, z: 200 };
        this.timeOfDay = 0; // 0 to 24 hours

        this.generateCatalog();
        this.generateTerritories();
        this.initThree();
        this.initControls();
        this.populateDealershipUI();
        this.populateTerritoriesUI();
        
        this.animate = this.animate.bind(this);
        this.animate();
    }

    generateCatalog() {
        const brands = ["Chevrolet", "Dodge", "Nissan", "Ford", "Toyota", "Cadillac", "Buick", "Mazda", "BMW", "Mercedes"];
        const models = ["Impala", "Hellcat", "Skyline R34", "Mustang GT", "Supra MK4", "Coupe de Ville", "Grand National", "RX-7", "M3 E30", "AMG GT"];
        this.catalog = [];
        for (let i = 1; i <= 100; i++) {
            const brand = brands[i % brands.length];
            const model = models[i % models.length] + ` Mk.${i}`;
            const price = 15000 + (i * 3500);
            const topSpeed = 0.8 + (i * 0.003);
            this.catalog.push({ id: i, name: `${brand} ${model}`, price, topSpeed });
        }
    }

    generateTerritories() {
        const sectorNames = [
            "1. French Quarter", "2. Tremé Underground", "3. St. Claude Corridor", 
            "4. Warehouse District", "5. I-10 Twin Span", "6. Uptown District", 
            "7. Algiers Point", "8. New Orleans East"
        ];
        const bossNames = ["Vance", "Tuba Tone", "Gator", "Captain Roux", "Marcus", "Madame LaLaurie", "Delta Dawg", "Swamp Reaper"];
        
        this.territories = [];
        for (let i = 0; i < 8; i++) {
            this.territories.push({
                id: i, name: sectorNames[i], boss: bossNames[i], racesBeaten: 0, owned: false, safehouseOwned: false, safehouseCost: 40000 + (i * 15000), reward: 25000 + (i * 10000)
            });
        }
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020208);
        this.scene.fog = new THREE.FogExp2(0x020208, 0.004);

        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        // Lighting & Day-to-Night Cycle lights
        this.ambientLight = new THREE.AmbientLight(0x222244, 1.8);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.sunLight.position.set(40, 80, 40);
        this.scene.add(this.sunLight);

        // --- INTERSECTING & PARALLEL STREET GRID ---
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.35 });
        
        const roadNS1 = new THREE.Mesh(new THREE.PlaneGeometry(24, 2500), roadMat);
        roadNS1.rotation.x = -Math.PI / 2;
        this.scene.add(roadNS1);

        const roadNS2 = new THREE.Mesh(new THREE.PlaneGeometry(24, 2500), roadMat);
        roadNS2.rotation.x = -Math.PI / 2;
        roadNS2.position.set(60, 0, 0);
        this.scene.add(roadNS2);

        for (let zPos = -1000; zPos <= 1000; zPos += 200) {
            const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(140, 20), roadMat);
            roadEW.rotation.x = -Math.PI / 2;
            roadEW.position.set(30, 0.01, zPos);
            this.scene.add(roadEW);
        }

        // --- AI TRAFFIC VEHICLES & PEDESTRIANS ---
        this.trafficCars = [];
        const trafficColors = [0xff0000, 0x00ff00, 0xffff00, 0xffffff, 0x333333];
        for (let i = -800; i <= 800; i += 150) {
            const tCar = new THREE.Mesh(
                new THREE.BoxGeometry(1.9, 0.6, 4.2),
                new THREE.MeshStandardMaterial({ color: trafficColors[Math.abs(i) % trafficColors.length], roughness: 0.3, metalness: 0.7 })
            );
            tCar.position.set(i % 2 === 0 ? 6 : -6, 0.5, i);
            this.scene.add(tCar);
            this.trafficCars.push({ mesh: tCar, speed: 0.3 + (Math.random() * 0.4) });
        }

        // --- ENTERABLE BUILDINGS ---
        const bldMat = new THREE.MeshStandardMaterial({ color: 0x2b1d1a, roughness: 0.8 });
        const doorMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

        this.enterableDoors = [];
        for (let zPos = -800; zPos <= 800; zPos += 200) {
            [-35, 95].forEach(xPos => {
                const bld = new THREE.Mesh(new THREE.BoxGeometry(25, 45, 30), bldMat);
                bld.position.set(xPos, 22.5, zPos);
                this.scene.add(bld);

                const door = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 1), doorMat);
                door.position.set(xPos, 4, zPos + 15.1);
                this.scene.add(door);
                this.enterableDoors.push({ x: xPos, z: zPos, name: "NOLA Urban Lounge & Safehouse" });
            });
        }

        // Player Car
        this.carGroup = new THREE.Group();
        this.bodyMat = new THREE.MeshStandardMaterial({ color: 0x8800ff, roughness: 0.15, metalness: 0.85 });
        this.carBodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.4), this.bodyMat);
        this.carBodyMesh.position.y = 0.6;
        this.carGroup.add(this.carBodyMesh);

        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.55, 2.2),
            new THREE.MeshStandardMaterial({ color: 0x08080c, roughness: 0.05, transparent: true, opacity: 0.9 })
        );
        cabin.position.set(0, 1.15, -0.2);
        this.carGroup.add(cabin);

        this.scene.add(this.carGroup);
        this.carGroup.position.set(0, 0, 200);

        // On-Foot Pedestrian Avatar
        this.playerAvatar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 1.8),
            new THREE.MeshStandardMaterial({ color: 0xff007f })
        );
        this.playerAvatar.position.set(0, 0.9, 205);
        this.playerAvatar.visible = false;
        this.scene.add(this.playerAvatar);

        this.speed = 0;
        this.carAngle = 0;
    }

    initControls() {
        this.keys = { forward: false, backward: false, left: false, right: false };
        window.addEventListener('keydown', (e) => {
            this.updateKeys(e, true);
            if (e.key.toLowerCase() === 'f') this.toggleOnFoot();
            if (e.key.toLowerCase() === 'm') toggleModal('smartphone-modal');
            if (e.key === 'Enter') this.checkEnterBuilding();
        });
        window.addEventListener('keyup', (e) => this.updateKeys(e, false));
    }

    updateKeys(e, isDown) {
        switch(e.key.toLowerCase()) {
            case 'w': case 'arrowup': this.keys.forward = isDown; break;
            case 's': case 'arrowdown': this.keys.backward = isDown; break;
            case 'a': case 'arrowleft': this.keys.left = isDown; break;
            case 'd': case 'arrowright': this.keys.right = isDown; break;
        }
    }

    toggleOnFoot() {
        this.isWalking = !this.isWalking;
        if (this.isWalking) {
            this.walkPos.x = this.carGroup.position.x + 3;
            this.walkPos.z = this.carGroup.position.z;
            this.playerAvatar.position.set(this.walkPos.x, 0.9, this.walkPos.z);
            this.playerAvatar.visible = true;
            document.getElementById('mode-status').innerText = `MODE: ON FOOT (Walking)`;
            alert("🚪 Exited vehicle. Walk near a glowing cyan door and press ENTER to go inside!");
        } else {
            this.playerAvatar.visible = false;
            document.getElementById('mode-status').innerText = `MODE: DRIVING VEHICLE`;
            alert("🚗 Entered vehicle.");
        }
    }

    checkEnterBuilding() {
        if (!this.isWalking) return;
        this.enterableDoors.forEach(door => {
            const dist = Math.hypot(this.playerAvatar.position.x - door.x, this.playerAvatar.position.z - door.z);
            if (dist < 8) {
                document.getElementById('interior-title').innerText = door.name;
                toggleModal('interior-modal');
            }
        });
    }

    collectBounty(amount) {
        this.playerMoney += amount;
        document.getElementById('bank-balance').innerText = `BANK: $${this.playerMoney.toLocaleString()}`;
        alert(`Collected royalties! +$${amount.toLocaleString()}`);
    }

    buySafehouse(territoryId) {
        const t = this.territories[territoryId];
        if (this.playerMoney >= t.safehouseCost) {
            this.playerMoney -= t.safehouseCost;
            t.safehouseOwned = true;
            document.getElementById('bank-balance').innerText = `BANK: $${this.playerMoney.toLocaleString()}`;
            alert(`Successfully purchased Safehouse Garage in ${t.name}!`);
            this.populateTerritoriesUI();
        } else {
            alert("Insufficient funds to purchase this safehouse property.");
        }
    }

    populateDealershipUI() {
        const grid = document.getElementById('dealership-grid');
        grid.innerHTML = '';
        this.catalog.forEach(car => {
            const card = document.createElement('div');
            card.className = 'car-card';
            card.innerHTML = `
                <h3>${car.name}</h3>
                <p>Price: $${car.price.toLocaleString()} | Tier ${car.id}</p>
                <button class="btn" id="buy-car-${car.id}">Buy Ride</button>
            `;
            grid.appendChild(card);
            setTimeout(() => {
                const btn = document.getElementById(`buy-car-${car.id}`);
                if (btn) btn.onclick = () => this.buyCar(car);
            }, 0);
        });
    }

    populateTerritoriesUI() {
        const grid = document.getElementById('territory-grid');
        grid.innerHTML = '';
        this.territories.forEach(t => {
            const card = document.createElement('div');
            card.className = 'territory-card';
            card.innerHTML = `
                <h3>${t.name}</h3>
                <p><b>Boss:</b> ${t.boss}</p>
                <p>Status: <span style="color: ${t.owned ? '#00ffcc' : '#ff007f'}">${t.owned ? 'OWNED' : 'Contested'}</span></p>
                <p>Safehouse Garage: <b>${t.safehouseOwned ? 'Purchased' : '$' + t.safehouseCost.toLocaleString()}</b></p>
                ${!t.safehouseOwned ? `<button class="btn" onclick="game.buySafehouse(${t.id})">Buy Safehouse</button>` : ''}
                ${!t.owned ? `<button class="btn" style="background:#00ffcc; color:#000; margin-top:5px;" onclick="game.fightBoss(${t.id})">Fight Boss (${t.boss})</button>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    fightBoss(territoryId) {
        const t = this.territories[territoryId];
        if (this.currentMaxSpeed >= 0.90 || Math.random() > 0.3) {
            t.owned = true;
            this.playerMoney += t.reward;
            document.getElementById('bank-balance').innerText = `BANK: $${this.playerMoney.toLocaleString()}`;
            alert(`Defeated boss ${t.boss} and claimed ${t.name}! +$${t.reward.toLocaleString()}`);
        } else {
            alert(`Boss ${t.boss} defeated you! Upgrade your car at the Workshop.`);
        }
        this.populateTerritoriesUI();
    }

    buyCar(car) {
        if (this.playerMoney >= car.price) {
            this.playerMoney -= car.price;
            this.currentMaxSpeed = car.topSpeed;
            document.getElementById('bank-balance').innerText = `BANK: $${this.playerMoney.toLocaleString()}`;
            document.getElementById('current-car-name').innerText = car.name;
            alert(`Purchased ${car.name}!`);
            toggleModal('dealership-modal');
        } else {
            alert("Insufficient funds!");
        }
    }

    upgradeCar(name, cost, speedBoost) {
        if (this.playerMoney >= cost) {
            this.playerMoney -= cost;
            this.currentMaxSpeed += speedBoost;
            document.getElementById('bank-balance').innerText = `BANK: $${this.playerMoney.toLocaleString()}`;
            alert(`Installed ${name}!`);
            toggleModal('garage-modal');
        } else {
            alert("Insufficient funds!");
        }
    }

    setCarColor(hex, roughness, metalness) {
        this.bodyMat.color.setHex(hex);
        this.bodyMat.roughness = roughness;
        this.bodyMat.metalness = metalness;
        alert("Custom candy paint applied!");
        toggleModal('garage-modal');
    }

    animate() {
        requestAnimationFrame(this.animate);

        // Day-to-night cycle progression
        this.timeOfDay = (this.timeOfDay + 0.05) % 24;
        const hours = Math.floor(this.timeOfDay);
        const mins = Math.floor((this.timeOfDay % 1) * 60);
        document.getElementById('time-status').innerText = `TIME: ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')} (${hours >= 6 && hours < 18 ? 'Day' : 'Night'})`;
        
        // Dynamic lighting adjustments based on time
        if (hours >= 6 && hours < 18) {
            this.sunLight.intensity = 2.5;
            this.ambientLight.intensity = 2.0;
        } else {
            this.sunLight.intensity = 0.3;
            this.ambientLight.intensity = 0.8;
        }

        // Move AI Traffic
        this.trafficCars.forEach(tc => {
            tc.mesh.position.z += tc.speed;
            if (tc.mesh.position.z > 1000) tc.mesh.position.z = -1000;
        });

        if (this.isWalking) {
            const walkSpeed = 0.3;
            if (this.keys.forward) this.walkPos.z -= walkSpeed;
            if (this.keys.backward) this.walkPos.z += walkSpeed;
            if (this.keys.left) this.walkPos.x -= walkSpeed;
            if (this.keys.right) this.walkPos.x += walkSpeed;
            this.playerAvatar.position.set(this.walkPos.x, 0.9, this.walkPos.z);

            this.camera.position.x = this.walkPos.x;
            this.camera.position.z = this.walkPos.z + 8;
            this.camera.position.y = 4;
            this.camera.lookAt(this.walkPos.x, 1, this.walkPos.z);
        } else {
            const acceleration = 0.012;
            const deceleration = 0.008;
            const turnSpeed = 0.045;

            if (this.keys.forward) this.speed = Math.min(this.speed + acceleration, this.currentMaxSpeed);
            else if (this.keys.backward) this.speed = Math.max(this.speed - acceleration, -this.currentMaxSpeed / 3);
            else {
                if (this.speed > 0) this.speed = Math.max(this.speed - deceleration, 0);
                if (this.speed < 0) this.speed = Math.min(this.speed + deceleration, 0);
            }

            if (Math.abs(this.speed) > 0.03) {
                if (this.keys.left) { this.carAngle += turnSpeed * Math.sign(this.speed); this.carGroup.rotation.y = this.carAngle; }
                if (this.keys.right) { this.carAngle -= turnSpeed * Math.sign(this.speed); this.carGroup.rotation.y = this.carAngle; }
            }

            this.carGroup.position.x += Math.sin(this.carAngle) * this.speed;
            this.carGroup.position.z += Math.cos(this.carAngle) * this.speed;

            const targetX = this.carGroup.position.x - Math.sin(this.carAngle) * 11;
            const targetZ = this.carGroup.position.z - Math.cos(this.carAngle) * 11;
            this.camera.position.x += (targetX - this.camera.position.x) * 0.15;
            this.camera.position.z += (targetZ - this.camera.position.z) * 0.15;
            this.camera.position.y = this.carGroup.position.y + 3.8;
            this.camera.lookAt(this.carGroup.position.x, this.carGroup.position.y + 0.8, this.carGroup.position.z - 4);

            const realMph = Math.round((Math.abs(this.speed) / this.currentMaxSpeed) * 155);
            document.getElementById('speedometer').innerText = `SPEED: ${realMph} MPH`;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

const game = new NolaOpenWorldGame();
window.game = game;
