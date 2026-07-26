import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

// "Close Encounter" — near enough to inspect a planet/moon, outside the Sun's corona
const MIN_ZOOM = 8.5;
// "Cosmic Overview" — full solar system through Neptune with constellation backdrop
const MAX_ZOOM = 102;
const CONSTELLATION_SKY_RADIUS = 182;

const TEXTURE_BASE = "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/";
const THREEJS_TEXTURE_BASE = "https://threejs.org/examples/textures/planets/";
const ORBIT_SPEED_FACTOR = 0.22;
const SPHERE_SEGMENTS = 64;
const ORBIT_SCALE = 0.78;
const BODY_SCALE = 1.38;
const ASTEROID_BELT_INNER = 16.2 * ORBIT_SCALE;
const ASTEROID_BELT_OUTER = 19.8 * ORBIT_SCALE;
const ASTEROID_COUNT = 420;

const MOONS_BY_PLANET = {
    Earth: [{ name: "Moon", radius: 0.14, orbit: 1.35, speed: 0.09, color: 0xb8b8b8 }],
    Mars: [
        { name: "Phobos", radius: 0.045, orbit: 0.62, speed: 0.16, color: 0x8a7560 },
        { name: "Deimos", radius: 0.035, orbit: 0.82, speed: 0.12, color: 0x7a6550 },
    ],
    Jupiter: [
        { name: "Io", radius: 0.11, orbit: 2.35, speed: 0.065, color: 0xddb044 },
        { name: "Europa", radius: 0.1, orbit: 2.75, speed: 0.055, color: 0xc8dae8 },
        { name: "Ganymede", radius: 0.13, orbit: 3.15, speed: 0.048, color: 0x998877 },
        { name: "Callisto", radius: 0.12, orbit: 3.65, speed: 0.042, color: 0x665544 },
    ],
    Saturn: [
        { name: "Titan", radius: 0.12, orbit: 2.5, speed: 0.046, color: 0xcc9944 },
        { name: "Enceladus", radius: 0.055, orbit: 1.85, speed: 0.058, color: 0xeeeeee },
    ],
    Uranus: [{ name: "Titania", radius: 0.075, orbit: 1.55, speed: 0.052, color: 0x99aabb }],
    Neptune: [{ name: "Triton", radius: 0.095, orbit: 1.65, speed: 0.05, color: 0xbbccdd }],
};

const SUN_DATA = {
    name: "The Sun",
    slug: "Sun",
    texture: "2k_sun.jpg",
    intro:
        "The Sun is the star at the center of our Solar System—a G-type main-sequence star that provides the light and heat that make life on Earth possible.",
    isSun: true,
};

const PLANET_DATA = [
    {
        name: "Mercury",
        slug: "Mercury",
        texture: "2k_mercury.jpg",
        radius: 0.42 * BODY_SCALE,
        orbit: 7.5 * ORBIT_SCALE,
        speed: 0.022,
        intro:
            "The closest planet to the Sun, Mercury is a small, rocky world with extreme temperatures, ranging from scorching hot days to freezing cold nights.",
    },
    {
        name: "Venus",
        slug: "Venus",
        texture: "2k_venus_surface.jpg",
        radius: 0.64 * BODY_SCALE,
        orbit: 10 * ORBIT_SCALE,
        speed: 0.018,
        intro:
            "Venus is similar in size to Earth but covered in thick, toxic clouds. It's the hottest planet in the Solar System due to its powerful greenhouse effect.",
    },
    {
        name: "Earth",
        slug: "Earth",
        texture: "2k_earth_daymap.jpg",
        normalMap: `${THREEJS_TEXTURE_BASE}earth_normal_2048.jpg`,
        clouds: "2k_earth_clouds.jpg",
        radius: 0.68 * BODY_SCALE,
        orbit: 12.5 * ORBIT_SCALE,
        speed: 0.015,
        intro:
            "Our home planet, Earth is the only known place with life. It has liquid water, a breathable atmosphere, and diverse ecosystems.",
    },
    {
        name: "Mars",
        slug: "Mars",
        texture: "2k_mars.jpg",
        radius: 0.53 * BODY_SCALE,
        orbit: 15 * ORBIT_SCALE,
        speed: 0.012,
        intro:
            "Known as the Red Planet, Mars has a dusty surface and signs of ancient water. Scientists study it closely for clues about past life.",
    },
    {
        name: "Jupiter",
        slug: "Jupiter",
        texture: "2k_jupiter.jpg",
        radius: 1.65 * BODY_SCALE,
        orbit: 21 * ORBIT_SCALE,
        speed: 0.008,
        intro:
            "Jupiter is the largest planet in the Solar System, a gas giant famous for its Great Red Spot—a massive, long-lasting storm.",
    },
    {
        name: "Saturn",
        slug: "Saturn",
        texture: "2k_saturn.jpg",
        radius: 1.38 * BODY_SCALE,
        orbit: 27 * ORBIT_SCALE,
        speed: 0.006,
        rings: true,
        intro:
            "Saturn is best known for its stunning ring system. It's a gas giant made mostly of hydrogen and helium.",
    },
    {
        name: "Uranus",
        slug: "Uranus",
        texture: "2k_uranus.jpg",
        radius: 1.0 * BODY_SCALE,
        orbit: 33 * ORBIT_SCALE,
        speed: 0.004,
        intro:
            "Uranus is an ice giant that rotates on its side, making it unique. It has a pale blue color due to methane in its atmosphere.",
    },
    {
        name: "Neptune",
        slug: "Neptune",
        texture: "2k_neptune.jpg",
        radius: 0.96 * BODY_SCALE,
        orbit: 39 * ORBIT_SCALE,
        speed: 0.003,
        intro:
            "Neptune is the farthest planet from the Sun and is known for its deep blue color and extremely strong winds—the fastest in the Solar System.",
    },
];

const canvas = document.getElementById("solar-system-canvas");
const tooltip = document.getElementById("planet-tooltip");
const tooltipPreview = document.getElementById("planet-tooltip-preview");
const tooltipContent = document.getElementById("planet-tooltip-content");
const tooltipTitle = document.getElementById("planet-tooltip-title");
const tooltipText = document.getElementById("planet-tooltip-text");
const previewCanvas = document.getElementById("planet-tooltip-canvas");
const heroSection = document.querySelector(".Solar-System-Main-Picture");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1230);
scene.fog = new THREE.FogExp2(0x0c1538, 0.0018);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
camera.position.set(0, 78, 1.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = MIN_ZOOM;
controls.maxDistance = MAX_ZOOM;
controls.zoomSpeed = 0.85;
controls.rotateSpeed = 0.65;
controls.enableZoom = true;
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
};
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
};
controls.update();

const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = "anonymous";

function loadTexture(path) {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createNebulaCanvasTexture() {
    const nebulaCanvas = document.createElement("canvas");
    nebulaCanvas.width = 2048;
    nebulaCanvas.height = 1024;
    const ctx = nebulaCanvas.getContext("2d");

    const baseGradient = ctx.createRadialGradient(1120, 520, 80, 1024, 512, 980);
    baseGradient.addColorStop(0, "#2a3d7a");
    baseGradient.addColorStop(0.28, "#1a2555");
    baseGradient.addColorStop(0.58, "#101a3f");
    baseGradient.addColorStop(1, "#060a18");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, 2048, 1024);

    const nebulaColors = [
        [90, 50, 160],
        [40, 80, 180],
        [120, 40, 140],
        [30, 100, 200],
        [70, 60, 170],
    ];

    for (let i = 0; i < 14; i += 1) {
        const x = 200 + Math.random() * 1648;
        const y = 120 + Math.random() * 784;
        const radius = 180 + Math.random() * 420;
        const [r, g, b] = nebulaColors[i % nebulaColors.length];
        const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
        patch.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.22)`);
        patch.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.08)`);
        patch.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = patch;
        ctx.fillRect(0, 0, 2048, 1024);
    }

    const texture = new THREE.CanvasTexture(nebulaCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}

function raDecToSkyPosition(raHours, decDeg, radius) {
    const ra = (raHours / 24) * Math.PI * 2;
    const dec = THREE.MathUtils.degToRad(decDeg);
    const cosDec = Math.cos(dec);
    return new THREE.Vector3(radius * cosDec * Math.cos(ra), radius * Math.sin(dec), radius * cosDec * Math.sin(ra));
}

const CONSTELLATION_DEFS = [
    {
        name: "Orion",
        stars: [
            { id: "betelgeuse", ra: 5.92, dec: 7.41, size: 1.35 },
            { id: "bellatrix", ra: 5.45, dec: 6.35, size: 1.05 },
            { id: "alnitak", ra: 5.68, dec: -1.94, size: 1.1 },
            { id: "alnilam", ra: 5.6, dec: -1.2, size: 1.15 },
            { id: "mintaka", ra: 5.53, dec: -0.3, size: 1.05 },
            { id: "rigel", ra: 5.24, dec: -8.2, size: 1.3 },
            { id: "saiph", ra: 5.8, dec: -9.67, size: 1.0 },
        ],
        lines: [
            ["betelgeuse", "bellatrix"],
            ["bellatrix", "mintaka"],
            ["betelgeuse", "alnitak"],
            ["alnitak", "alnilam"],
            ["alnilam", "mintaka"],
            ["mintaka", "rigel"],
            ["alnilam", "rigel"],
            ["bellatrix", "saiph"],
            ["saiph", "rigel"],
        ],
    },
    {
        name: "Ursa Major",
        stars: [
            { id: "dubhe", ra: 11.06, dec: 61.75, size: 1.2 },
            { id: "merak", ra: 11.03, dec: 56.38, size: 1.0 },
            { id: "phecda", ra: 11.9, dec: 53.69, size: 1.0 },
            { id: "megrez", ra: 12.26, dec: 57.03, size: 0.95 },
            { id: "alioth", ra: 12.9, dec: 55.96, size: 1.1 },
            { id: "mizar", ra: 13.4, dec: 54.93, size: 1.05 },
            { id: "alkaid", ra: 13.79, dec: 49.31, size: 1.0 },
        ],
        lines: [
            ["dubhe", "merak"],
            ["merak", "phecda"],
            ["phecda", "megrez"],
            ["megrez", "alioth"],
            ["alioth", "mizar"],
            ["mizar", "alkaid"],
            ["megrez", "dubhe"],
        ],
    },
    {
        name: "Cassiopeia",
        stars: [
            { id: "caph", ra: 0.15, dec: 59.15, size: 1.05 },
            { id: "schedar", ra: 0.68, dec: 56.54, size: 1.15 },
            { id: "gammaCas", ra: 0.95, dec: 60.72, size: 1.1 },
            { id: "ruchbah", ra: 1.43, dec: 60.24, size: 0.95 },
            { id: "segin", ra: 1.91, dec: 63.67, size: 0.9 },
        ],
        lines: [
            ["caph", "schedar"],
            ["schedar", "gammaCas"],
            ["gammaCas", "ruchbah"],
            ["ruchbah", "segin"],
        ],
    },
    {
        name: "Scorpius",
        stars: [
            { id: "antares", ra: 16.49, dec: -26.43, size: 1.35 },
            { id: "graffias", ra: 16.09, dec: -19.8, size: 0.95 },
            { id: "dschubba", ra: 16.0, dec: -22.62, size: 1.0 },
            { id: "sargas", ra: 17.62, dec: -42.99, size: 1.0 },
            { id: "shaula", ra: 17.56, dec: -37.1, size: 1.1 },
            { id: "lesath", ra: 17.53, dec: -37.3, size: 0.85 },
        ],
        lines: [
            ["graffias", "dschubba"],
            ["dschubba", "antares"],
            ["antares", "shaula"],
            ["shaula", "lesath"],
            ["shaula", "sargas"],
        ],
    },
    {
        name: "Cygnus",
        stars: [
            { id: "deneb", ra: 20.69, dec: 45.28, size: 1.25 },
            { id: "sadr", ra: 20.37, dec: 40.26, size: 1.1 },
            { id: "gienah", ra: 20.18, dec: 33.97, size: 1.0 },
            { id: "deltaCyg", ra: 19.86, dec: 45.13, size: 0.95 },
            { id: "albireo", ra: 19.51, dec: 27.96, size: 1.05 },
        ],
        lines: [
            ["deneb", "sadr"],
            ["sadr", "albireo"],
            ["sadr", "gienah"],
            ["deneb", "deltaCyg"],
            ["deltaCyg", "sadr"],
        ],
    },
    {
        name: "Leo",
        stars: [
            { id: "regulus", ra: 10.14, dec: 11.97, size: 1.2 },
            { id: "algieba", ra: 10.33, dec: 19.84, size: 1.0 },
            { id: "zosma", ra: 11.24, dec: 20.52, size: 0.95 },
            { id: "denebola", ra: 11.86, dec: 14.57, size: 1.1 },
            { id: "chertan", ra: 11.42, dec: 15.43, size: 0.9 },
        ],
        lines: [
            ["regulus", "chertan"],
            ["chertan", "denebola"],
            ["regulus", "algieba"],
            ["algieba", "zosma"],
            ["zosma", "denebola"],
        ],
    },
];

function createConstellations() {
    const group = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x8eb4e8,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
    });
    const brightPositions = [];
    const brightColors = [];

    CONSTELLATION_DEFS.forEach((constellation) => {
        const starMap = new Map();
        constellation.stars.forEach((star) => {
            const position = raDecToSkyPosition(star.ra, star.dec, CONSTELLATION_SKY_RADIUS);
            starMap.set(star.id, position);
            brightPositions.push(position.x, position.y, position.z);
            brightColors.push(0.92, 0.95, 1.0);
        });

        constellation.lines.forEach(([fromId, toId]) => {
            const from = starMap.get(fromId);
            const to = starMap.get(toId);
            if (!from || !to) return;
            const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
            const line = new THREE.Line(geometry, lineMaterial);
            line.raycast = () => {};
            group.add(line);
        });
    });

    const brightGeometry = new THREE.BufferGeometry();
    brightGeometry.setAttribute("position", new THREE.Float32BufferAttribute(brightPositions, 3));
    brightGeometry.setAttribute("color", new THREE.Float32BufferAttribute(brightColors, 3));

    const brightStars = new THREE.Points(
        brightGeometry,
        new THREE.PointsMaterial({
            size: 1.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.72,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
    );
    brightStars.raycast = () => {};
    group.add(brightStars);

    return group;
}

function createSkyBackground() {
    const group = new THREE.Group();

    const nebulaMaterial = new THREE.MeshBasicMaterial({
        map: createNebulaCanvasTexture(),
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        opacity: 0.92,
    });
    const nebulaSphere = new THREE.Mesh(new THREE.SphereGeometry(190, 64, 32), nebulaMaterial);
    group.add(nebulaSphere);

    const starFieldTexture = loadTexture(`${TEXTURE_BASE}2k_stars_milky_way.jpg`);
    starFieldTexture.mapping = THREE.EquirectangularReflectionMapping;
    const milkyWayMaterial = new THREE.MeshBasicMaterial({
        map: starFieldTexture,
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        opacity: 0.48,
    });
    const starFieldSphere = new THREE.Mesh(new THREE.SphereGeometry(185, 64, 32), milkyWayMaterial);
    group.add(starFieldSphere);

    group.add(createConstellations());

    return { group, nebulaMaterial, milkyWayMaterial };
}

function createAsteroidBelt() {
    const group = new THREE.Group();
    const asteroidGeometry = new THREE.IcosahedronGeometry(0.06, 0);
    const asteroidMaterial = new THREE.MeshStandardMaterial({
        color: 0x887766,
        roughness: 0.95,
        metalness: 0.08,
        emissive: 0x221100,
        emissiveIntensity: 0.15,
    });

    for (let i = 0; i < ASTEROID_COUNT; i += 1) {
        const radius = ASTEROID_BELT_INNER + Math.random() * (ASTEROID_BELT_OUTER - ASTEROID_BELT_INNER);
        const angle = Math.random() * Math.PI * 2;
        const scale = 0.45 + Math.random() * 1.1;
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        asteroid.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 0.35, Math.sin(angle) * radius);
        asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        asteroid.scale.setScalar(scale);
        asteroid.userData.beltAngle = angle;
        asteroid.userData.beltRadius = radius;
        asteroid.userData.beltSpeed = 0.004 + Math.random() * 0.006;
        group.add(asteroid);
    }

    return group;
}

function createShootingStars() {
    const count = 6;
    const streaks = [];

    for (let i = 0; i < count; i += 1) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: 0xddeeff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        scene.add(line);

        streaks.push({
            line,
            positions,
            active: false,
            progress: 0,
            duration: 0.55 + Math.random() * 0.35,
            wait: 2 + Math.random() * 8 + i * 1.5,
            origin: new THREE.Vector3(),
            direction: new THREE.Vector3(),
            length: 0,
        });
    }

    return streaks;
}

function spawnShootingStar(streak) {
    const theta = Math.random() * Math.PI * 2;
    const phi = 0.15 + Math.random() * 0.55;
    const skyRadius = 155 + Math.random() * 20;
    streak.origin.set(
        skyRadius * Math.sin(phi) * Math.cos(theta),
        20 + Math.random() * 50,
        skyRadius * Math.sin(phi) * Math.sin(theta),
    );
    streak.direction.set(-0.4 - Math.random() * 0.5, -0.15 - Math.random() * 0.25, -0.3 - Math.random() * 0.4).normalize();
    streak.length = 8 + Math.random() * 14;
    streak.progress = 0;
    streak.duration = 0.45 + Math.random() * 0.4;
    streak.active = true;
    streak.line.material.opacity = 0;
}

function updateShootingStars(streaks, delta) {
    streaks.forEach((streak) => {
        if (!streak.active) {
            streak.wait -= delta;
            if (streak.wait <= 0) {
                spawnShootingStar(streak);
                streak.wait = 4 + Math.random() * 10;
            }
            return;
        }

        streak.progress += delta / streak.duration;
        const t = streak.progress;
        if (t >= 1) {
            streak.active = false;
            streak.line.material.opacity = 0;
            return;
        }

        const head = streak.origin.clone().addScaledVector(streak.direction, streak.length * t);
        const tail = streak.origin.clone().addScaledVector(streak.direction, streak.length * (t - 0.35));
        streak.positions[0] = tail.x;
        streak.positions[1] = tail.y;
        streak.positions[2] = tail.z;
        streak.positions[3] = head.x;
        streak.positions[4] = head.y;
        streak.positions[5] = head.z;
        streak.line.geometry.attributes.position.needsUpdate = true;

        const fade = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;
        streak.line.material.opacity = fade * 0.55;
    });
}

function createMoonsForPlanet(planetMesh, planetName) {
    const moonDefs = MOONS_BY_PLANET[planetName];
    if (!moonDefs) return [];

    return moonDefs.map((moonData) => {
        const pivot = new THREE.Object3D();
        planetMesh.add(pivot);

        const moonMaterial = new THREE.MeshStandardMaterial({
            color: moonData.color,
            roughness: 0.92,
            metalness: 0.02,
            emissive: moonData.color,
            emissiveIntensity: 0.12,
        });
        const moon = new THREE.Mesh(new THREE.SphereGeometry(moonData.radius, 24, 24), moonMaterial);
        moon.position.x = moonData.orbit;
        pivot.add(moon);

        return {
            pivot,
            moon,
            speed: moonData.speed,
            angle: Math.random() * Math.PI * 2,
            name: moonData.name,
        };
    });
}

const skyBackground = createSkyBackground();
scene.add(skyBackground.group);

const shootingStars = createShootingStars();

const ambient = new THREE.AmbientLight(0x445577, 0.55);
scene.add(ambient);

const hemisphere = new THREE.HemisphereLight(0x6688bb, 0x111122, 0.48);
scene.add(hemisphere);

const sunLight = new THREE.PointLight(0xfff2cc, 9.5, 320, 1.1);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x7799dd, 0.48);
fillLight.position.set(-35, 25, -45);
scene.add(fillLight);

const keyLight = new THREE.DirectionalLight(0xaabbee, 0.35);
keyLight.position.set(25, 45, 20);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8866cc, 0.22);
rimLight.position.set(40, -10, 30);
scene.add(rimLight);

const sunTexture = loadTexture(`${TEXTURE_BASE}2k_sun.jpg`);
const sunGeometry = new THREE.SphereGeometry(3.8 * BODY_SCALE, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
const sunMaterial = new THREE.MeshStandardMaterial({
    map: sunTexture,
    emissive: 0xffaa44,
    emissiveMap: sunTexture,
    emissiveIntensity: 3.1,
    roughness: 1,
    metalness: 0,
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
const sunEntry = {
    mesh: sun,
    data: SUN_DATA,
    baseScale: 1,
    hoverScale: 1,
    isSun: true,
};
sun.userData.bodyEntry = sunEntry;
scene.add(sun);

const sunCoreLight = new THREE.PointLight(0xffcc66, 5.2, 55, 1.8);
sun.add(sunCoreLight);

function createSunCorona(radius, color, opacity) {
    const corona = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 48, 48),
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
    );
    corona.raycast = () => {};
    return corona;
}

sun.add(createSunCorona(5.2 * BODY_SCALE, 0xffcc66, 0.14));
sun.add(createSunCorona(7.5 * BODY_SCALE, 0xff8833, 0.06));

const starCount = 4200;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starBaseColors = new Float32Array(starCount * 3);
const starTwinklePhases = new Float32Array(starCount);
const starTwinkleSpeeds = new Float32Array(starCount);

for (let i = 0; i < starCount; i += 1) {
    const radius = 70 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const tint = 0.82 + Math.random() * 0.18;
    starBaseColors[i * 3] = 0.85 * tint;
    starBaseColors[i * 3 + 1] = 0.9 * tint;
    starBaseColors[i * 3 + 2] = 1.0 * tint;
    starColors[i * 3] = starBaseColors[i * 3];
    starColors[i * 3 + 1] = starBaseColors[i * 3 + 1];
    starColors[i * 3 + 2] = starBaseColors[i * 3 + 2];
    starTwinklePhases[i] = Math.random() * Math.PI * 2;
    starTwinkleSpeeds[i] = 0.4 + Math.random() * 1.6;
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
        size: 0.65,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        sizeAttenuation: true,
        depthWrite: false,
    }),
);
scene.add(stars);

const planetMeshes = [];
const moonEntries = [];
const orbitGroup = new THREE.Group();
orbitGroup.rotation.x = 0;
scene.add(orbitGroup);

const asteroidBeltGroup = createAsteroidBelt();
orbitGroup.add(asteroidBeltGroup);

function createOrbitPath(radius) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x4a5a9e,
        transparent: true,
        opacity: 0.52,
    });
    const line = new THREE.LineLoop(geometry, material);
    orbitGroup.add(line);
}

function createSaturnRing(planetRadius, ringTexture) {
    const inner = planetRadius * 1.35;
    const outer = planetRadius * 2.2;
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
            opacity: 0.88,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
    );
}

PLANET_DATA.forEach((data) => {
    const pivot = new THREE.Object3D();
    orbitGroup.add(pivot);

    createOrbitPath(data.orbit);

    const planetMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.06,
        map: loadTexture(`${TEXTURE_BASE}${data.texture}`),
        emissive: 0x111122,
        emissiveIntensity: 0.08,
    });

    if (data.normalMap) {
        planetMaterial.normalMap = loadTexture(data.normalMap);
        planetMaterial.normalScale = new THREE.Vector2(0.65, 0.65);
    }

    const planet = new THREE.Mesh(new THREE.SphereGeometry(data.radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS), planetMaterial);
    planet.position.x = data.orbit;
    pivot.add(planet);

    if (data.clouds) {
        const cloudMaterial = new THREE.MeshStandardMaterial({
            map: loadTexture(`${TEXTURE_BASE}${data.clouds}`),
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
        });
        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(data.radius * 1.018, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
            cloudMaterial,
        );
        planet.add(clouds);
    }

    if (data.rings) {
        const ring = createSaturnRing(data.radius, loadTexture(`${TEXTURE_BASE}2k_saturn_ring_alpha.png`));
        ring.rotation.x = Math.PI / 2;
        planet.add(ring);
    }

    const moons = createMoonsForPlanet(planet, data.name);
    moonEntries.push(...moons);

    planetMeshes.push({
        mesh: planet,
        pivot,
        data,
        baseScale: 1,
        hoverScale: 1,
        angle: Math.random() * Math.PI * 2,
        isSun: false,
    });
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerInside = { active: false, clientX: 0, clientY: 0 };
const clickableMeshes = [sun];
let hoveredBody = null;
let isOrbiting = false;
let orbitDragMoved = false;

controls.addEventListener("start", () => {
    isOrbiting = true;
    orbitDragMoved = false;
    clearHoverState();
});

controls.addEventListener("change", () => {
    if (isOrbiting) orbitDragMoved = true;
});

controls.addEventListener("end", () => {
    isOrbiting = false;
});

planetMeshes.forEach((entry) => {
    entry.mesh.traverse((child) => {
        if (child.isMesh) {
            child.userData.bodyEntry = entry;
            clickableMeshes.push(child);
        }
    });
});

function findBodyFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData?.bodyEntry) return current.userData.bodyEntry;
        const match = planetMeshes.find((entry) => entry.mesh === current);
        if (match) return match;
        if (current === sun) return sunEntry;
        current = current.parent;
    }
    return null;
}

const PREVIEW_SIZE = 96;
const previewRenderer = new THREE.WebGLRenderer({
    canvas: previewCanvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
});
previewRenderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE, false);
previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
previewRenderer.toneMappingExposure = 1.35;

const previewScene = new THREE.Scene();
const previewCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
previewCamera.position.set(0, 0.15, 3.2);
previewCamera.lookAt(0, 0, 0);

const previewAmbient = new THREE.AmbientLight(0x556688, 0.55);
previewScene.add(previewAmbient);
const previewKeyLight = new THREE.DirectionalLight(0xffffff, 1.35);
previewKeyLight.position.set(2.5, 1.8, 3.5);
previewScene.add(previewKeyLight);
const previewFillLight = new THREE.DirectionalLight(0x8899cc, 0.45);
previewFillLight.position.set(-2, -0.5, 1.5);
previewScene.add(previewFillLight);

const previewPlanetGroup = new THREE.Group();
previewScene.add(previewPlanetGroup);

const previewPlanetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.06,
        emissive: 0x111122,
        emissiveIntensity: 0.08,
    }),
);
previewPlanetGroup.add(previewPlanetMesh);

let previewClouds = null;
let previewRing = null;
let previewActive = false;
let previewBodyEntry = null;
let tooltipVisible = false;
let tooltipHideTimer = null;
let tooltipSwitchTimer = null;
const TOOLTIP_SWITCH_MS = 140;
const TOOLTIP_HIDE_MS = 320;

function clearPreviewExtras() {
    if (previewClouds) {
        previewPlanetMesh.remove(previewClouds);
        previewClouds.geometry.dispose();
        previewClouds.material.dispose();
        previewClouds = null;
    }
    if (previewRing) {
        previewPlanetMesh.remove(previewRing);
        previewRing.geometry.dispose();
        previewRing.material.dispose();
        previewRing = null;
    }
}

function resetPreviewPlanetMaterial() {
    const material = previewPlanetMesh.material;
    material.emissive = new THREE.Color(0x111122);
    material.emissiveMap = null;
    material.emissiveIntensity = 0.08;
    material.needsUpdate = true;
}

function setPreviewSun() {
    resetPreviewPlanetMaterial();
    clearPreviewExtras();

    const material = previewPlanetMesh.material;
    const sunPreviewTexture = loadTexture(`${TEXTURE_BASE}${SUN_DATA.texture}`);
    material.map = sunPreviewTexture;
    material.emissive = new THREE.Color(0xffaa44);
    material.emissiveMap = sunPreviewTexture;
    material.emissiveIntensity = 2.8;
    material.normalMap = null;
    material.needsUpdate = true;

    previewPlanetGroup.rotation.set(0, 0, 0);
    previewBodyEntry = sunEntry;
    previewActive = true;
}

function setPreviewPlanet(bodyEntry) {
    const { data } = bodyEntry;
    resetPreviewPlanetMaterial();
    const material = previewPlanetMesh.material;
    material.map = loadTexture(`${TEXTURE_BASE}${data.texture}`);
    material.needsUpdate = true;

    if (data.normalMap) {
        material.normalMap = loadTexture(data.normalMap);
        material.normalScale = new THREE.Vector2(0.65, 0.65);
    } else {
        material.normalMap = null;
    }

    clearPreviewExtras();

    if (data.clouds) {
        previewClouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.018, 48, 48),
            new THREE.MeshStandardMaterial({
                map: loadTexture(`${TEXTURE_BASE}${data.clouds}`),
                transparent: true,
                opacity: 0.42,
                depthWrite: false,
            }),
        );
        previewPlanetMesh.add(previewClouds);
    }

    if (data.rings) {
        previewRing = createSaturnRing(1, loadTexture(`${TEXTURE_BASE}2k_saturn_ring_alpha.png`));
        previewRing.rotation.x = Math.PI / 2;
        previewPlanetMesh.add(previewRing);
    }

    previewPlanetGroup.rotation.set(0.18, 0, 0.08);
    previewBodyEntry = bodyEntry;
    previewActive = true;
}

function setPreviewBody(bodyEntry) {
    if (bodyEntry.isSun) {
        setPreviewSun();
        return;
    }
    setPreviewPlanet(bodyEntry);
}

function renderPreview() {
    if (!previewActive || !tooltipVisible) return;
    previewPlanetGroup.rotation.y += 0.012;
    if (previewClouds) previewClouds.rotation.y += 0.0015;
    previewRenderer.render(previewScene, previewCamera);
}

function resizeRenderer() {
    const width = heroSection.clientWidth;
    const height = heroSection.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function setPointerFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function clearHoverState() {
    if (hoveredBody) {
        hoveredBody.hoverScale = 1;
        hoveredBody = null;
    }
    canvas.style.cursor = "default";
    hideTooltip();
}

function positionTooltip(clientX, clientY) {
    const rect = heroSection.getBoundingClientRect();
    let left = clientX - rect.left + 18;
    let top = clientY - rect.top + 18;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    requestAnimationFrame(() => {
        const tipRect = tooltip.getBoundingClientRect();
        const heroRect = heroSection.getBoundingClientRect();
        if (left + tipRect.width > heroRect.width - 12) {
            left = clientX - rect.left - tipRect.width - 18;
        }
        if (top + tipRect.height > heroRect.height - 12) {
            top = clientY - rect.top - tipRect.height - 18;
        }
        tooltip.style.left = `${Math.max(12, left)}px`;
        tooltip.style.top = `${Math.max(12, top)}px`;
    });
}

function updateTooltipContent(bodyEntry) {
    tooltipTitle.textContent = bodyEntry.data.name;
    tooltipText.textContent = bodyEntry.data.intro;
    setPreviewBody(bodyEntry);
    tooltipPreview.classList.toggle("is-sun", Boolean(bodyEntry.isSun));
    tooltipPreview.classList.add("is-active");
}

function switchTooltipBody(bodyEntry, clientX, clientY) {
    tooltipContent.classList.add("is-switching");
    tooltipPreview.classList.remove("is-active");
    tooltipPreview.classList.add("is-switching");

    if (tooltipSwitchTimer) clearTimeout(tooltipSwitchTimer);
    tooltipSwitchTimer = setTimeout(() => {
        updateTooltipContent(bodyEntry);
        tooltipPreview.classList.remove("is-switching");
        tooltipContent.classList.remove("is-switching");
        positionTooltip(clientX, clientY);
    }, TOOLTIP_SWITCH_MS);
}

function showTooltip(bodyEntry, clientX, clientY) {
    if (tooltipHideTimer) {
        clearTimeout(tooltipHideTimer);
        tooltipHideTimer = null;
    }

    const isSwitch = tooltipVisible && previewBodyEntry && previewBodyEntry !== bodyEntry;

    if (isSwitch) {
        switchTooltipBody(bodyEntry, clientX, clientY);
        positionTooltip(clientX, clientY);
        return;
    }

    if (tooltipVisible && previewBodyEntry === bodyEntry) {
        positionTooltip(clientX, clientY);
        return;
    }

    updateTooltipContent(bodyEntry);
    tooltip.classList.remove("is-hiding");
    tooltip.classList.add("is-visible");
    tooltip.setAttribute("aria-hidden", "false");
    tooltipVisible = true;
    positionTooltip(clientX, clientY);

    requestAnimationFrame(() => {
        tooltipPreview.classList.add("is-active");
    });
}

function hideTooltip() {
    if (!tooltipVisible) return;

    tooltip.classList.remove("is-visible");
    tooltip.classList.add("is-hiding");
    tooltip.setAttribute("aria-hidden", "true");
    tooltipVisible = false;
    previewActive = false;
    previewBodyEntry = null;
    tooltipPreview.classList.remove("is-active", "is-switching", "is-sun");
    tooltipContent.classList.remove("is-switching");

    if (tooltipSwitchTimer) {
        clearTimeout(tooltipSwitchTimer);
        tooltipSwitchTimer = null;
    }

    if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(() => {
        tooltip.classList.remove("is-hiding");
        tooltip.style.left = "";
        tooltip.style.top = "";
        tooltipHideTimer = null;
    }, TOOLTIP_HIDE_MS);
}

function updateHoverFromPointer() {
    if (!pointerInside.active || isOrbiting) {
        clearHoverState();
        return;
    }

    setPointerFromClient(pointerInside.clientX, pointerInside.clientY);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, false);

    const hit = intersects.length > 0 ? findBodyFromObject(intersects[0].object) : null;

    if (hit) {
        if (hit !== hoveredBody) {
            if (hoveredBody) hoveredBody.hoverScale = 1;
            hoveredBody = hit;
            hoveredBody.hoverScale = hit.isSun ? 1.12 : 1.35;
        }
        canvas.style.cursor = "pointer";
        showTooltip(hit, pointerInside.clientX, pointerInside.clientY);
    } else {
        clearHoverState();
    }
}

function onPointerMove(event) {
    pointerInside.active = true;
    pointerInside.clientX = event.clientX;
    pointerInside.clientY = event.clientY;
    updateHoverFromPointer();
}

function onPointerLeave() {
    pointerInside.active = false;
    clearHoverState();
}

function handleClick(event) {
    if (orbitDragMoved) {
        orbitDragMoved = false;
        return;
    }

    setPointerFromClient(event.clientX, event.clientY);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, false);
    if (intersects.length === 0) return;

    const hit = findBodyFromObject(intersects[0].object);
    if (hit) {
        window.open(`planets/${hit.data.slug}.html`, "_blank", "noopener,noreferrer");
    }
}

canvas.addEventListener("pointerenter", onPointerMove);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerleave", onPointerLeave);
canvas.addEventListener("pointercancel", onPointerLeave);
canvas.addEventListener("click", handleClick);

window.addEventListener("resize", resizeRenderer);
resizeRenderer();

let lastFrameTime = performance.now();
let skyTime = 0;

function asteroidBeltOrbit(beltGroup) {
    beltGroup.children.forEach((asteroid) => {
        asteroid.userData.beltAngle += asteroid.userData.beltSpeed * ORBIT_SPEED_FACTOR;
        const angle = asteroid.userData.beltAngle;
        const radius = asteroid.userData.beltRadius;
        asteroid.position.x = Math.cos(angle) * radius;
        asteroid.position.z = Math.sin(angle) * radius;
        asteroid.rotation.y += 0.004;
    });
}

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    skyTime += delta;

    skyBackground.group.rotation.y += delta * 0.004;
    skyBackground.group.rotation.x = Math.sin(skyTime * 0.03) * 0.012;
    skyBackground.nebulaMaterial.opacity = 0.88 + Math.sin(skyTime * 0.18) * 0.04;
    skyBackground.milkyWayMaterial.opacity = 0.44 + Math.sin(skyTime * 0.11 + 1.2) * 0.05;

    for (let i = 0; i < starCount; i += 1) {
        const twinkle = 0.55 + 0.45 * Math.sin(skyTime * starTwinkleSpeeds[i] + starTwinklePhases[i]);
        starColors[i * 3] = starBaseColors[i * 3] * twinkle;
        starColors[i * 3 + 1] = starBaseColors[i * 3 + 1] * twinkle;
        starColors[i * 3 + 2] = starBaseColors[i * 3 + 2] * twinkle;
    }
    starGeometry.attributes.color.needsUpdate = true;

    sun.rotation.y += 0.0006;
    orbitGroup.rotation.y += delta * 0.011;
    orbitGroup.rotation.x = Math.sin(skyTime * 0.07) * 0.012;
    orbitGroup.rotation.z = Math.sin(skyTime * 0.05 + 0.6) * 0.006;

    asteroidBeltOrbit(asteroidBeltGroup);

    if (hoveredBody === sunEntry) {
        const targetScale = sunEntry.hoverScale;
        sun.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    } else if (sun.scale.x !== 1) {
        sun.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);
    }

    planetMeshes.forEach((entry) => {
        entry.angle += entry.data.speed * ORBIT_SPEED_FACTOR;
        entry.pivot.rotation.y = entry.angle;
        entry.mesh.rotation.y += 0.002;
        const targetScale = entry.hoverScale;
        entry.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    });

    moonEntries.forEach((moon) => {
        moon.angle += moon.speed * ORBIT_SPEED_FACTOR;
        moon.pivot.rotation.y = moon.angle;
    });

    updateShootingStars(shootingStars, delta);

    controls.update();

    if (pointerInside.active && !isOrbiting) {
        updateHoverFromPointer();
    }

    renderPreview();
    renderer.render(scene, camera);
}

animate();
