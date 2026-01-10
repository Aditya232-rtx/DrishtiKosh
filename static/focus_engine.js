/**
 * Three.js 3D Focus Engine
 * Creates and manages the 3D forest world
 */
class ForestWorld {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0f2fe);
        this.scene.fog = new THREE.FogExp2(0xe0f2fe, 0.01);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Replace canvas or append renderer canvas
        if (this.container.tagName === 'CANVAS') {
            // If container is a canvas, replace it
            this.container.parentNode.replaceChild(this.renderer.domElement, this.container);
            this.container = this.renderer.domElement;
        } else {
            // Otherwise append to container
            this.container.appendChild(this.renderer.domElement);
        }

        // Controls - check if OrbitControls is available
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        } else if (typeof OrbitControls !== 'undefined') {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        } else {
            console.warn('OrbitControls not available, using basic camera');
            this.controls = null;
        }
        
        if (this.controls) {
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 5;
            this.controls.maxDistance = 30;
            this.controls.maxPolarAngle = Math.PI / 2.2;
        }

        // Lighting
        this.setupLighting();

        // Platform
        this.createPlatform();

        // Forest storage
        this.trees = [];
        this.activeSessionTree = null;
        this.sessionProgress = 0;

        // Animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0x7dd3fc, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        // Accent lights for soft feel
        const accentLight1 = new THREE.PointLight(0xbae6fd, 0.4, 20);
        accentLight1.position.set(-5, 3, -5);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0x7dd3fc, 0.4, 20);
        accentLight2.position.set(5, 3, 5);
        this.scene.add(accentLight2);
    }

    createPlatform() {
        // Create hexagonal platform
        const hexShape = new THREE.Shape();
        const radius = 8;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                hexShape.moveTo(x, y);
            } else {
                hexShape.lineTo(x, y);
            }
        }
        hexShape.closePath();

        const geometry = new THREE.ExtrudeGeometry(hexShape, {
            depth: 0.5,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.2,
            bevelSegments: 3
        });

        const material = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            emissive: 0xe0f2fe,
            emissiveIntensity: 0.1
        });

        this.platform = new THREE.Mesh(geometry, material);
        this.platform.rotation.x = -Math.PI / 2;
        this.platform.position.y = -0.5;
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);

        // Add subtle edge effect
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x7dd3fc,
            linewidth: 1
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.rotation.x = -Math.PI / 2;
        edges.position.y = -0.3;
        this.scene.add(edges);
    }

    createProceduralTree(x = 0, z = 0, scale = 1) {
        const treeGroup = new THREE.Group();

        // Trunk (Cylinder)
        const trunkHeight = 1.5 * scale;
        const trunkRadius = 0.15 * scale;
        const trunkGeometry = new THREE.CylinderGeometry(
            trunkRadius,
            trunkRadius * 1.2,
            trunkHeight,
            6
        );
        const trunkMaterial = new THREE.MeshLambertMaterial({
            color: 0x8b4513,
            emissive: 0x000000,
            emissiveIntensity: 0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Leaves (Cones) - Multiple layers for low-poly look
        const leafLayers = 2 + Math.floor(Math.random() * 2); // 2-3 layers
        for (let i = 0; i < leafLayers; i++) {
            const layerHeight = trunkHeight + (i * 0.8 * scale);
            const layerRadius = (0.8 - i * 0.15) * scale;
            const layerSegments = 6; // Low poly = 6 segments

            const leafGeometry = new THREE.ConeGeometry(
                layerRadius,
                1.2 * scale,
                layerSegments
            );
            const leafMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(
                    0.55 + Math.random() * 0.05, // Sky blue hue variation
                    0.4 + Math.random() * 0.2,
                    0.7 + Math.random() * 0.2
                ),
                emissive: 0xbae6fd,
                emissiveIntensity: 0.05 + Math.random() * 0.05
            });
            const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
            leaves.position.y = layerHeight;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            treeGroup.add(leaves);
        }

        // Position tree
        treeGroup.position.set(x, 0, z);
        treeGroup.scale.set(0, 0, 0); // Start at scale 0 for growth animation

        // Add subtle rotation for variety
        treeGroup.rotation.y = Math.random() * Math.PI * 2;

        return treeGroup;
    }

    addTreeToForest(x, z, scale = 1, animate = true) {
        const tree = this.createProceduralTree(x, z, scale);
        this.scene.add(tree);
        this.trees.push(tree);

        if (animate) {
            // Animate tree growth
            const targetScale = 1;
            const duration = 1000; // 1 second
            const startTime = Date.now();
            const startScale = 0;

            const animateGrowth = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                const currentScale = startScale + (targetScale - startScale) * easeProgress;
                tree.scale.set(currentScale, currentScale, currentScale);

                if (progress < 1) {
                    requestAnimationFrame(animateGrowth);
                }
            };

            animateGrowth();
        } else {
            tree.scale.set(1, 1, 1);
        }

        return tree;
    }

    startSessionTree(duration) {
        // Clear any existing session tree
        if (this.activeSessionTree) {
            this.scene.remove(this.activeSessionTree);
        }

        // Create new session tree at center
        this.activeSessionTree = this.createProceduralTree(0, 0, 1);
        this.activeSessionTree.scale.set(0, 0, 0);
        this.scene.add(this.activeSessionTree);
        this.sessionProgress = 0;
    }

    updateSessionProgress(progress) {
        // progress is 0-100
        if (!this.activeSessionTree) return;

        const scale = progress / 100;
        this.activeSessionTree.scale.set(scale, scale, scale);
        this.sessionProgress = progress;
    }

    completeSession() {
        if (!this.activeSessionTree) return;

        // Finalize the tree
        this.activeSessionTree.scale.set(1, 1, 1);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(this.activeSessionTree.position);
        glow.position.y = 2;
        this.scene.add(glow);

        // Animate glow
        const animateGlow = () => {
            glow.scale.x += 0.02;
            glow.scale.y += 0.02;
            glow.scale.z += 0.02;
            glow.material.opacity -= 0.01;
            
            if (glow.material.opacity > 0) {
                requestAnimationFrame(animateGlow);
            } else {
                this.scene.remove(glow);
            }
        };
        animateGlow();
    }

    clearSessionTree() {
        if (this.activeSessionTree) {
            this.scene.remove(this.activeSessionTree);
            this.activeSessionTree = null;
        }
        this.sessionProgress = 0;
    }

    loadForest(forestData) {
        // Clear existing trees
        this.trees.forEach(tree => this.scene.remove(tree));
        this.trees = [];

        // Arrange trees in a grid/spiral pattern
        const treesPerRow = Math.ceil(Math.sqrt(forestData.length));
        const spacing = 2.5;
        const startX = -(treesPerRow - 1) * spacing / 2;
        const startZ = -(treesPerRow - 1) * spacing / 2;

        forestData.forEach((treeData, index) => {
            const row = Math.floor(index / treesPerRow);
            const col = index % treesPerRow;
            const x = startX + col * spacing;
            const z = startZ + row * spacing;
            
            // Scale based on duration (longer sessions = bigger trees)
            const scale = 0.7 + (treeData.duration / 50) * 0.5;
            this.addTreeToForest(x, z, scale, true);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Rotate platform slowly
        if (this.platform) {
            this.platform.rotation.z += 0.001;
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        // Cleanup
        this.renderer.dispose();
        window.removeEventListener('resize', this.onWindowResize);
    }
}
