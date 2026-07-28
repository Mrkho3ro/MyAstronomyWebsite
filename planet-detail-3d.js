import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const TEXTURE_BASE = "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/";
const THREEJS_TEXTURE_BASE = "https://threejs.org/examples/textures/planets/";

const AXIAL_ROTATION_DAYS = {
    Sun: 25.38,
    Mercury: 58.646,
    Venus: -243.025,
    Earth: 1.0,
    Mars: 1.025957,
    Jupiter: 0.41354,
    Saturn: 0.44401,
    Uranus: 0.71833,
    Neptune: 0.67125,
};
const VISUAL_EARTH_ROTATION_SEC = 10;
const BASE_AXIAL_SPEED = (Math.PI * 2) / VISUAL_EARTH_ROTATION_SEC;

function getAxialRotationSpeed(bodyName) {
    const days = AXIAL_ROTATION_DAYS[bodyName];
    if (!days) return BASE_AXIAL_SPEED;
    return (BASE_AXIAL_SPEED / Math.abs(days)) * Math.sign(days);
}

const PLANET_CONFIGS = {
    Sun: {
        name: "Sun",
        texture: "2k_sun.jpg",
        radius: 1.8,
        isSun: true,
        cameraZ: 5.5,
        moons: [],
    },
    Mercury: {
        name: "Mercury",
        texture: "2k_mercury.jpg",
        radius: 0.55,
        cameraZ: 2.8,
        moons: [],
    },
    Venus: {
        name: "Venus",
        texture: "2k_venus_surface.jpg",
        radius: 0.72,
        cameraZ: 3.2,
        moons: [],
    },
    Earth: {
        name: "Earth",
        texture: "2k_earth_daymap.jpg",
        normalMap: `${THREEJS_TEXTURE_BASE}earth_normal_2048.jpg`,
        clouds: "2k_earth_clouds.jpg",
        radius: 0.75,
        cameraZ: 3.4,
        moons: [{ name: "Moon", radius: 0.18, orbit: 1.55, speed: 0.55, color: 0xb8b8b8 }],
    },
    Mars: {
        name: "Mars",
        texture: "2k_mars.jpg",
        radius: 0.62,
        cameraZ: 3.0,
        moons: [
            { name: "Phobos", radius: 0.06, orbit: 1.05, speed: 1.2, color: 0x8a7560 },
            { name: "Deimos", radius: 0.045, orbit: 1.35, speed: 0.85, color: 0x7a6550 },
        ],
    },
    Jupiter: {
        name: "Jupiter",
        texture: "2k_jupiter.jpg",
        radius: 1.35,
        cameraZ: 5.2,
        moons: [
            { name: "Io", radius: 0.14, orbit: 2.1, speed: 0.7, color: 0xddb044 },
            { name: "Europa", radius: 0.12, orbit: 2.45, speed: 0.58, color: 0xc8dae8 },
            { name: "Ganymede", radius: 0.16, orbit: 2.85, speed: 0.48, color: 0x998877 },
            { name: "Callisto", radius: 0.14, orbit: 3.35, speed: 0.4, color: 0x665544 },
        ],
    },
    Saturn: {
        name: "Saturn",
        texture: "2k_saturn.jpg",
        rings: true,
        radius: 1.15,
        cameraZ: 5.8,
        tilt: 0.42,
        moons: [
            { name: "Enceladus", radius: 0.07, orbit: 1.75, speed: 0.65, color: 0xeeeeee },
            { name: "Titan", radius: 0.15, orbit: 2.35, speed: 0.42, color: 0xcc9944 },
        ],
    },
    Uranus: {
        name: "Uranus",
        texture: "2k_uranus.jpg",
        radius: 0.95,
        cameraZ: 4.2,
        tilt: 1.55,
        moons: [
            { name: "Titania", radius: 0.09, orbit: 1.65, speed: 0.52, color: 0x99aabb },
            { name: "Oberon", radius: 0.085, orbit: 2.05, speed: 0.44, color: 0x8899aa },
        ],
    },
    Neptune: {
        name: "Neptune",
        texture: "2k_neptune.jpg",
        radius: 0.92,
        cameraZ: 4.0,
        moons: [{ name: "Triton", radius: 0.11, orbit: 1.7, speed: 0.38, color: 0xbbccdd }],
    },
};

const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = "anonymous";

function loadTexture(path) {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createSaturnRing(planetRadius, ringTexture) {
    const inner = planetRadius * 1.35;
    const outer = planetRadius * 2.15;
    const geometry = new THREE.RingGeometry(inner, outer, 128);
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        const y = position.getY(i);
        const distance = Math.sqrt(x * x + y * y);
        uv.setXY(i, (distance - inner) / (outer - inner), 0.5);
    }
    return new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
            map: ringTexture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
    );
}

function createMoons(planetMesh, moonDefs) {
    return moonDefs.map((moonData) => {
        const pivot = new THREE.Object3D();
        planetMesh.add(pivot);
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(moonData.radius, 32, 32),
            new THREE.MeshStandardMaterial({
                color: moonData.color,
                roughness: 0.9,
                metalness: 0.02,
                emissive: moonData.color,
                emissiveIntensity: 0.1,
            }),
        );
        moon.position.x = moonData.orbit;
        pivot.add(moon);
        return { pivot, speed: moonData.speed, angle: Math.random() * Math.PI * 2 };
    });
}

function initPlanetDetailViewer(canvas) {
    const planetKey = canvas.dataset.planet;
    const config = PLANET_CONFIGS[planetKey];
    if (!config) {
        console.error(`Unknown planet: ${planetKey}`);
        return;
    }

    const container = canvas.parentElement;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040810);
    scene.fog = new THREE.FogExp2(0x040810, 0.08);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, config.tilt ? 0.6 : 0.2, config.cameraZ);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = config.isSun ? 1.4 : 1.55;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = config.radius * 2.2;
    controls.maxDistance = config.cameraZ * 2.2;
    controls.target.set(0, 0, 0);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
        const r = 18 + Math.random() * 12;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ size: 0.06, color: 0xffffff, transparent: true, opacity: 0.65, depthWrite: false }),
    );
    scene.add(stars);

    const bodyGroup = new THREE.Group();
    if (config.tilt) bodyGroup.rotation.z = config.tilt;
    scene.add(bodyGroup);

    let bodyMesh;
    let cloudMesh = null;

    if (config.isSun) {
        const sunTexture = loadTexture(`${TEXTURE_BASE}${config.texture}`);
        bodyMesh = new THREE.Mesh(
            new THREE.SphereGeometry(config.radius, 64, 64),
            new THREE.MeshStandardMaterial({
                map: sunTexture,
                emissive: 0xffaa44,
                emissiveMap: sunTexture,
                emissiveIntensity: 3.2,
                roughness: 1,
                metalness: 0,
            }),
        );
        const sunLight = new THREE.PointLight(0xffcc66, 4, 30, 1.5);
        bodyMesh.add(sunLight);
        scene.add(new THREE.AmbientLight(0x332211, 0.25));
    } else {
        scene.add(new THREE.AmbientLight(0x334466, 0.45));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
        keyLight.position.set(4, 2, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x6688bb, 0.35);
        fillLight.position.set(-3, -1, 2);
        scene.add(fillLight);

        const material = new THREE.MeshStandardMaterial({
            map: loadTexture(`${TEXTURE_BASE}${config.texture}`),
            roughness: 0.78,
            metalness: 0.05,
        });
        if (config.normalMap) {
            material.normalMap = loadTexture(config.normalMap);
            material.normalScale = new THREE.Vector2(0.6, 0.6);
        }
        bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 64, 64), material);

        if (config.clouds) {
            cloudMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.radius * 1.018, 64, 64),
                new THREE.MeshStandardMaterial({
                    map: loadTexture(`${TEXTURE_BASE}${config.clouds}`),
                    transparent: true,
                    opacity: 0.42,
                    depthWrite: false,
                }),
            );
            bodyMesh.add(cloudMesh);
        }

        if (config.rings) {
            const ring = createSaturnRing(config.radius, loadTexture(`${TEXTURE_BASE}2k_saturn_ring_alpha.png`));
            ring.rotation.x = Math.PI / 2;
            bodyMesh.add(ring);
        }
    }

    bodyGroup.add(bodyMesh);
    const moonEntries = createMoons(bodyMesh, config.moons || []);

    function resize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", resize);
    resize();

    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const spin = getAxialRotationSpeed(config.name) * delta;
        bodyMesh.rotation.y += spin;
        if (cloudMesh) cloudMesh.rotation.y += spin * 1.08;

        moonEntries.forEach((moon) => {
            moon.angle += moon.speed * delta;
            moon.pivot.rotation.y = moon.angle;
        });

        stars.rotation.y += delta * 0.015;
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

document.querySelectorAll("[data-planet]").forEach((canvas) => {
    if (canvas.tagName === "CANVAS") initPlanetDetailViewer(canvas);
});
