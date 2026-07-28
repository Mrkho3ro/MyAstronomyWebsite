import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import {
    HERO_NAMED_MOONS,
    HERO_BULK_ZONES,
    createNamedMoons,
    createBulkMoonSwarms,
    animateBulkMoonSwarms,
} from "./moon-system.js";

const constellationGeoJson = await fetch("./constellations.lines.json").then((response) => {
    if (!response.ok) throw new Error("Failed to load constellation data");
    return response.json();
});

// "Close Encounter" — near enough to inspect a planet/moon, outside the Sun's corona
const MIN_ZOOM = 8.5;
// "Cosmic Overview" — full solar system through Neptune with constellation backdrop
const MAX_ZOOM = 102;

const TEXTURE_BASE = "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/";
const THREEJS_TEXTURE_BASE = "https://threejs.org/examples/textures/planets/";
const ORBIT_SPEED_FACTOR = 0.22;
const SPHERE_SEGMENTS = 64;

// Sidereal day length in Earth days (negative = retrograde). Scaled so Earth ≈ one spin every ~12 s.
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
const VISUAL_EARTH_ROTATION_SEC = 12;
const BASE_AXIAL_SPEED = (Math.PI * 2) / VISUAL_EARTH_ROTATION_SEC;

function getAxialRotationSpeed(bodyName) {
    const days = AXIAL_ROTATION_DAYS[bodyName];
    if (!days) return BASE_AXIAL_SPEED;
    return (BASE_AXIAL_SPEED / Math.abs(days)) * Math.sign(days);
}
const ORBIT_SCALE = 0.78;
const BODY_SCALE = 1.38;
const ASTEROID_COUNT = 420;
const KUIPER_BELT_COUNT = 280;
const ASTEROID_BELT_VERTICAL_SPREAD = 1.05;
const KUIPER_BELT_VERTICAL_SPREAD = 1.65;

const SCALE_PRESETS = {
    educational: {
        key: "educational",
        buttonLabel: "Real Size",
        earthOrbit: 12.5 * ORBIT_SCALE,
        earthRadius: 0.68 * BODY_SCALE,
        sunRadius: 3.8 * BODY_SCALE,
        maxZoom: MAX_ZOOM,
        note: null,
    },
    real: {
        key: "real",
        buttonLabel: "Educational Size",
        earthOrbit: 20,
        earthRadius: 0.075,
        sunRadius: 8.2,
        maxZoom: 320,
        note: "True scale — distant planets appear very small.",
    },
};

const RADIUS_EARTH_RATIO = {
    Mercury: 0.383,
    Venus: 0.949,
    Earth: 1,
    Mars: 0.532,
    Jupiter: 11.21,
    Saturn: 9.45,
    Uranus: 4.01,
    Neptune: 3.88,
};

const ORBIT_AU = {
    Mercury: 0.39,
    Venus: 0.72,
    Earth: 1,
    Mars: 1.52,
    Jupiter: 5.2,
    Saturn: 9.58,
    Uranus: 19.2,
    Neptune: 30.05,
};

const SKY_SPHERE_MARGIN = 1.4;
const LEGACY_SKY_RADIUS = 182;

function getMaxOrbitExtent(preset) {
    const neptuneOrbit = preset.earthOrbit * ORBIT_AU.Neptune;
    const kuiperOuter = preset.earthOrbit * ORBIT_AU.Neptune * 1.22;
    return Math.max(neptuneOrbit, kuiperOuter);
}

function getEclipticGridExtent(preset) {
    return preset.earthOrbit * ORBIT_AU.Neptune * 1.08;
}

const ECLIPTIC_GRID = {
    lineColor: 0x6495ed,
    fillColor: 0x4a5a8a,
    lineOpacity: { dark: 0.22, light: 0.18 },
    fillOpacity: { dark: 0.045, light: 0.035 },
    divisions: 28,
};

const MAX_ORBIT_EXTENT = Math.max(
    getMaxOrbitExtent(SCALE_PRESETS.educational),
    getMaxOrbitExtent(SCALE_PRESETS.real),
);
const CONSTELLATION_SKY_RADIUS = MAX_ORBIT_EXTENT * SKY_SPHERE_MARGIN;
const SKY_SCALE = CONSTELLATION_SKY_RADIUS / LEGACY_SKY_RADIUS;
// Sky dome sits outside max zoom; keep the full sphere inside the camera far plane.
const CAMERA_FAR = CONSTELLATION_SKY_RADIUS * 2 + SCALE_PRESETS.real.maxZoom;

function scaleSky(value) {
    return value * SKY_SCALE;
}

// Orbital inclination & ascending node (approximate, relative to ecliptic)
const ORBIT_INCLINATION_DEG = {
    Mercury: 7.0,
    Venus: 3.4,
    Earth: 0.0,
    Mars: 1.85,
    Jupiter: 1.3,
    Saturn: 2.5,
    Uranus: 0.77,
    Neptune: 1.77,
};

const ORBIT_ASCENDING_NODE_DEG = {
    Mercury: 48.3,
    Venus: 76.7,
    Earth: 0.0,
    Mars: 49.6,
    Jupiter: 100.5,
    Saturn: 113.7,
    Uranus: 74.0,
    Neptune: 131.8,
};

let activeScalePreset = SCALE_PRESETS.educational;
let asteroidBeltInner = 16.2 * ORBIT_SCALE;
let asteroidBeltOuter = 19.8 * ORBIT_SCALE;
let kuiperBeltInner = 42 * ORBIT_SCALE;
let kuiperBeltOuter = 48 * ORBIT_SCALE;

const SUN_DATA = {
    name: "The Sun",
    slug: "Sun",
    texture: "2k_sun.jpg",
    intro:
        "The Sun is the star at the center of our Solar System—a G-type main-sequence star that provides the light and heat that make life on Earth possible.",
    radiusKm: 696340,
    moonCount: 0,
    avgTempC: 5500,
    isSun: true,
};

const PLANET_SPECS = [
    {
        name: "Mercury",
        slug: "Mercury",
        texture: "2k_mercury.jpg",
        speed: 0.022,
        radiusKm: 2439.7,
        moonCount: 0,
        avgTempC: 167,
        intro:
            "The closest planet to the Sun, Mercury is a small, rocky world with extreme temperatures, ranging from scorching hot days to freezing cold nights.",
    },
    {
        name: "Venus",
        slug: "Venus",
        texture: "2k_venus_surface.jpg",
        speed: 0.018,
        radiusKm: 6051.8,
        moonCount: 0,
        avgTempC: 464,
        intro:
            "Venus is similar in size to Earth but covered in thick, toxic clouds. It's the hottest planet in the Solar System due to its powerful greenhouse effect.",
    },
    {
        name: "Earth",
        slug: "Earth",
        texture: "2k_earth_daymap.jpg",
        normalMap: `${THREEJS_TEXTURE_BASE}earth_normal_2048.jpg`,
        clouds: "2k_earth_clouds.jpg",
        speed: 0.015,
        radiusKm: 6371,
        moonCount: 1,
        avgTempC: 15,
        intro:
            "Our home planet, Earth is the only known place with life. It has liquid water, a breathable atmosphere, and diverse ecosystems.",
    },
    {
        name: "Mars",
        slug: "Mars",
        texture: "2k_mars.jpg",
        speed: 0.012,
        radiusKm: 3389.5,
        moonCount: 2,
        avgTempC: -65,
        intro:
            "Known as the Red Planet, Mars has a dusty surface and signs of ancient water. Scientists study it closely for clues about past life.",
    },
    {
        name: "Jupiter",
        slug: "Jupiter",
        texture: "2k_jupiter.jpg",
        speed: 0.008,
        radiusKm: 69911,
        moonCount: 95,
        avgTempC: -110,
        intro:
            "Jupiter is the largest planet in the Solar System, a gas giant famous for its Great Red Spot—a massive, long-lasting storm.",
    },
    {
        name: "Saturn",
        slug: "Saturn",
        texture: "2k_saturn.jpg",
        speed: 0.006,
        rings: true,
        radiusKm: 58232,
        moonCount: 146,
        avgTempC: -140,
        intro:
            "Saturn is best known for its stunning ring system. It's a gas giant made mostly of hydrogen and helium.",
    },
    {
        name: "Uranus",
        slug: "Uranus",
        texture: "2k_uranus.jpg",
        speed: 0.004,
        radiusKm: 25362,
        moonCount: 28,
        avgTempC: -195,
        intro:
            "Uranus is an ice giant that rotates on its side, making it unique. It has a pale blue color due to methane in its atmosphere.",
    },
    {
        name: "Neptune",
        slug: "Neptune",
        texture: "2k_neptune.jpg",
        speed: 0.003,
        radiusKm: 24622,
        moonCount: 16,
        avgTempC: -200,
        intro:
            "Neptune is the farthest planet from the Sun and is known for its deep blue color and extremely strong winds—the fastest in the Solar System.",
    },
];

function buildPlanetData(preset) {
    return PLANET_SPECS.map((spec) => ({
        ...spec,
        radius: preset.earthRadius * RADIUS_EARTH_RATIO[spec.name],
        orbit: preset.earthOrbit * ORBIT_AU[spec.name],
    }));
}

let PLANET_DATA = buildPlanetData(activeScalePreset);

const canvas = document.getElementById("solar-system-canvas");
const errorBanner = document.getElementById("solar-system-error");
const tooltip = document.getElementById("planet-tooltip");
const tooltipPreview = document.getElementById("planet-tooltip-preview");
const tooltipContent = document.getElementById("planet-tooltip-content");
const tooltipTitle = document.getElementById("planet-tooltip-title");
const tooltipText = document.getElementById("planet-tooltip-text");
const tooltipFacts = document.getElementById("planet-tooltip-facts");
const planetHoverLabel = document.getElementById("planet-hover-label");
const zoomLabelsContainer = document.getElementById("planet-zoom-labels");
const scaleToggleBtn = document.getElementById("scale-toggle-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const scaleNoteEl = document.getElementById("scale-note");
const previewCanvas = document.getElementById("planet-tooltip-canvas");
const heroSection = document.querySelector(".Solar-System-Main-Picture");

const THEME_COLORS = {
    dark: { bg: 0x0a1230, fog: 0x0c1538, fogDensity: 0.0018, exposure: 1.65 },
    light: { bg: 0xd8e4f8, fog: 0xc8d8ef, fogDensity: 0.0008, exposure: 1.15 },
};

let currentTheme = "dark";
let scrollParallax = 0;
const zoomLabelEntries = [];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1230);
scene.fog = new THREE.FogExp2(0x0c1538, 0.0018);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, CAMERA_FAR);
camera.position.set(0, 72, 1.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
if (!renderer.getContext()) {
    if (errorBanner) errorBanner.hidden = false;
    throw new Error("WebGL is not available");
}
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
        patch.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.08)`);
        patch.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.03)`);
        patch.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = patch;
        ctx.fillRect(0, 0, 2048, 1024);
    }

    const texture = new THREE.CanvasTexture(nebulaCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}

function createMilkyWayBandTexture() {
    const bandCanvas = document.createElement("canvas");
    bandCanvas.width = 1024;
    bandCanvas.height = 256;
    const ctx = bandCanvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 1024, 256);
    const gradient = ctx.createLinearGradient(0, 128, 1024, 128);
    gradient.addColorStop(0, "rgba(120,140,200,0)");
    gradient.addColorStop(0.25, "rgba(160,175,220,0.04)");
    gradient.addColorStop(0.5, "rgba(200,210,240,0.08)");
    gradient.addColorStop(0.75, "rgba(150,165,210,0.04)");
    gradient.addColorStop(1, "rgba(120,140,200,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 60, 1024, 136);
    const texture = new THREE.CanvasTexture(bandCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createGalaxyTexture(seed) {
    const size = 128;
    const galaxyCanvas = document.createElement("canvas");
    galaxyCanvas.width = size;
    galaxyCanvas.height = size;
    const ctx = galaxyCanvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    for (let arm = 0; arm < 2; arm += 1) {
        const offset = arm * Math.PI;
        for (let i = 0; i < 120; i += 1) {
            const t = i / 120;
            const angle = offset + t * Math.PI * 1.6 + seed * 0.3;
            const radius = t * size * 0.38;
            const x = cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
            const y = cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
            const alpha = (1 - t) * 0.12;
            ctx.fillStyle = `rgba(180,190,230,${alpha})`;
            ctx.fillRect(x, y, 1.2, 1.2);
        }
    }
    const texture = new THREE.CanvasTexture(galaxyCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createStarLayer(count, innerRadius, outerRadius, size, opacity, brightCount = 0) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseColors = new Float32Array(count * 3);
    const twinklePhases = new Float32Array(count);
    const twinkleSpeeds = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        const isBright = i < brightCount;
        const brightness = isBright ? 0.95 + Math.random() * 0.05 : 0.45 + Math.random() * 0.45;
        const tint = 0.82 + Math.random() * 0.18;
        baseColors[i * 3] = brightness * 0.85 * tint;
        baseColors[i * 3 + 1] = brightness * 0.9 * tint;
        baseColors[i * 3 + 2] = brightness * 1.0 * tint;
        colors[i * 3] = baseColors[i * 3];
        colors[i * 3 + 1] = baseColors[i * 3 + 1];
        colors[i * 3 + 2] = baseColors[i * 3 + 2];
        twinklePhases[i] = Math.random() * Math.PI * 2;
        twinkleSpeeds[i] = 0.25 + Math.random() * 0.9;
        sizes[i] = isBright ? size * (1.8 + Math.random() * 1.2) : size * (0.55 + Math.random() * 0.65);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size,
            vertexColors: true,
            transparent: true,
            opacity,
            sizeAttenuation: true,
            depthWrite: false,
        }),
    );
    points.raycast = () => {};

    return { points, geometry, colors, baseColors, twinklePhases, twinkleSpeeds, count };
}

function createParallaxStarLayers() {
    const group = new THREE.Group();
    const bgLayer = createStarLayer(3200, scaleSky(175), scaleSky(198), 0.42, 0.42, 6);
    const midLayer = createStarLayer(1800, scaleSky(145), scaleSky(175), 0.52, 0.55, 8);
    const fgLayer = createStarLayer(650, scaleSky(95), scaleSky(135), 0.62, 0.62, 5);
    group.add(bgLayer.points);
    group.add(midLayer.points);
    group.add(fgLayer.points);
    return { group, layers: [bgLayer, midLayer, fgLayer], parallaxFactors: [0.12, 0.28, 0.48] };
}

function raDecToSkyPosition(raHours, decDeg, radius) {
    const ra = (raHours / 24) * Math.PI * 2;
    const dec = THREE.MathUtils.degToRad(decDeg);
    const cosDec = Math.cos(dec);
    return new THREE.Vector3(radius * cosDec * Math.cos(ra), radius * Math.sin(dec), radius * cosDec * Math.sin(ra));
}

function lonLatToSkyPosition(lonDeg, latDeg, radius) {
    const raHours = (((lonDeg % 360) + 360) % 360) / 15;
    return raDecToSkyPosition(raHours, latDeg, radius);
}

function createConstellations(geoJson) {
    const group = new THREE.Group();
    group.visible = false;

    // Legacy brightness (1c51283) assumed radius 182; compensate for enlarged sky dome.
    const coreStarSize = 1.35 * SKY_SCALE;
    const glowStarSize = 2.6 * SKY_SCALE;

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xb8d4ff,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        fog: false,
    });

    const vertexKeys = new Set();
    const vertexPositions = [];

    geoJson.features.forEach((feature) => {
        if (feature.geometry?.type !== "MultiLineString") return;
        feature.geometry.coordinates.forEach((lineString) => {
            lineString.forEach(([lon, lat]) => {
                const key = `${lon.toFixed(3)},${lat.toFixed(3)}`;
                if (vertexKeys.has(key)) return;
                vertexKeys.add(key);
                vertexPositions.push(lonLatToSkyPosition(lon, lat, CONSTELLATION_SKY_RADIUS));
            });

            const points = lineString.map(([lon, lat]) => lonLatToSkyPosition(lon, lat, CONSTELLATION_SKY_RADIUS));
            if (points.length < 2) return;
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            line.raycast = () => {};
            group.add(line);
        });
    });

    if (vertexPositions.length > 0) {
        const starGeometry = new THREE.BufferGeometry().setFromPoints(vertexPositions);

        const glowStars = new THREE.Points(
            starGeometry,
            new THREE.PointsMaterial({
                color: 0xcbd5ff,
                size: glowStarSize,
                transparent: true,
                opacity: 0.42,
                sizeAttenuation: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                fog: false,
            }),
        );
        glowStars.raycast = () => {};
        group.add(glowStars);

        const coreStars = new THREE.Points(
            starGeometry.clone(),
            new THREE.PointsMaterial({
                color: 0xeaf2ff,
                size: coreStarSize,
                transparent: true,
                opacity: 0.95,
                sizeAttenuation: true,
                depthWrite: false,
                fog: false,
            }),
        );
        coreStars.raycast = () => {};
        group.add(coreStars);
    }

    return group;
}

let constellationGroup = null;

function createSkyBackground() {
    const group = new THREE.Group();

    const nebulaMaterial = new THREE.MeshBasicMaterial({
        map: createNebulaCanvasTexture(),
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        opacity: 0.16,
    });
    const nebulaSphere = new THREE.Mesh(new THREE.SphereGeometry(scaleSky(190), 64, 32), nebulaMaterial);
    group.add(nebulaSphere);

    const starFieldTexture = loadTexture(`${TEXTURE_BASE}2k_stars_milky_way.jpg`);
    starFieldTexture.mapping = THREE.EquirectangularReflectionMapping;
    const milkyWayMaterial = new THREE.MeshBasicMaterial({
        map: starFieldTexture,
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        opacity: 0.1,
    });
    const starFieldSphere = new THREE.Mesh(new THREE.SphereGeometry(scaleSky(185), 64, 32), milkyWayMaterial);
    group.add(starFieldSphere);

    const milkyWayBand = new THREE.Mesh(
        new THREE.PlaneGeometry(scaleSky(360), scaleSky(90)),
        new THREE.MeshBasicMaterial({
            map: createMilkyWayBandTexture(),
            transparent: true,
            opacity: 0.14,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        }),
    );
    milkyWayBand.position.set(scaleSky(-20), scaleSky(35), scaleSky(-175));
    milkyWayBand.rotation.set(-0.35, 0.55, 0.25);
    group.add(milkyWayBand);

    const galaxyPositions = [
        { pos: [-165, 55, -95], rot: 0.4, seed: 1 },
        { pos: [155, -40, -110], rot: -0.6, seed: 2 },
        { pos: [90, 80, 150], rot: 1.1, seed: 3 },
    ];
    galaxyPositions.forEach(({ pos, rot, seed }) => {
        const galaxy = new THREE.Mesh(
            new THREE.PlaneGeometry(scaleSky(14), scaleSky(14)),
            new THREE.MeshBasicMaterial({
                map: createGalaxyTexture(seed),
                transparent: true,
                opacity: 0.22,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        );
        galaxy.position.set(scaleSky(pos[0]), scaleSky(pos[1]), scaleSky(pos[2]));
        galaxy.rotation.z = rot;
        galaxy.raycast = () => {};
        group.add(galaxy);
    });

    const parallaxStars = createParallaxStarLayers();
    group.add(parallaxStars.group);

    constellationGroup = createConstellations(constellationGeoJson);
    group.add(constellationGroup);

    return { group, nebulaMaterial, milkyWayMaterial, parallaxStars, milkyWayBand, constellationGroup };
}

function createBeltGroup(count, inner, outer, materialOptions, verticalSpread = 0.35) {
    const group = new THREE.Group();
    const asteroidGeometry = new THREE.IcosahedronGeometry(0.06, 0);
    const asteroidMaterial = new THREE.MeshStandardMaterial(materialOptions);

    for (let i = 0; i < count; i += 1) {
        const radius = inner + Math.random() * (outer - inner);
        const angle = Math.random() * Math.PI * 2;
        const scale = 0.45 + Math.random() * 1.1;
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        asteroid.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * verticalSpread, Math.sin(angle) * radius);
        asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        asteroid.scale.setScalar(scale);
        asteroid.userData.beltAngle = angle;
        asteroid.userData.beltRadius = radius;
        asteroid.userData.beltSpeed = 0.004 + Math.random() * 0.006;
        group.add(asteroid);
    }

    return group;
}

function createAsteroidBelt() {
    return createBeltGroup(ASTEROID_COUNT, asteroidBeltInner, asteroidBeltOuter, {
        color: 0x887766,
        roughness: 0.95,
        metalness: 0.08,
        emissive: 0x221100,
        emissiveIntensity: 0.15,
    }, ASTEROID_BELT_VERTICAL_SPREAD);
}

function createKuiperBelt() {
    return createBeltGroup(KUIPER_BELT_COUNT, kuiperBeltInner, kuiperBeltOuter, {
        color: 0x99aabb,
        roughness: 0.98,
        metalness: 0.04,
        emissive: 0x112233,
        emissiveIntensity: 0.08,
    }, KUIPER_BELT_VERTICAL_SPREAD);
}

function createShootingStars() {
    const streaks = [];
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
        duration: 0.55,
        wait: 12 + Math.random() * 8,
        origin: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        length: 0,
    });

    return streaks;
}

function spawnShootingStar(streak) {
    const theta = Math.random() * Math.PI * 2;
    const phi = 0.15 + Math.random() * 0.55;
    const skyRadius = scaleSky(155 + Math.random() * 20);
    streak.origin.set(
        skyRadius * Math.sin(phi) * Math.cos(theta),
        scaleSky(20 + Math.random() * 50),
        skyRadius * Math.sin(phi) * Math.sin(theta),
    );
    streak.direction.set(-0.4 - Math.random() * 0.5, -0.15 - Math.random() * 0.25, -0.3 - Math.random() * 0.4).normalize();
    streak.length = 5 + Math.random() * 8;
    streak.progress = 0;
    streak.duration = 0.4 + Math.random() * 0.35;
    streak.active = true;
    streak.line.material.opacity = 0;
}

function updateShootingStars(streaks, delta) {
    const streak = streaks[0];
    if (!streak) return;

    if (!streak.active) {
        streak.wait -= delta;
        if (streak.wait <= 0) {
            spawnShootingStar(streak);
            streak.wait = 10 + Math.random() * 10;
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
    streak.line.material.opacity = fade * 0.35;
}

function createMoonsForPlanet(planetMesh, planetName) {
    const namedDefs = HERO_NAMED_MOONS[planetName];
    const named = namedDefs
        ? createNamedMoons(planetMesh, namedDefs, THREE, loadTexture, TEXTURE_BASE)
        : [];
    const bulkZones = HERO_BULK_ZONES[planetName];
    const bulkSwarms = bulkZones ? createBulkMoonSwarms(planetMesh, bulkZones, THREE) : [];
    return { named, bulkSwarms };
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
let sunRadius = activeScalePreset.sunRadius;
const sunGeometry = new THREE.SphereGeometry(sunRadius, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
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

sun.add(createSunCorona(sunRadius * 1.37, 0xffcc66, 0.1));
sun.add(createSunCorona(sunRadius * 1.97, 0xff8833, 0.04));

const planetMeshes = [];
const moonEntries = [];
const bulkMoonSwarms = [];
const orbitLines = [];
const orbitGroup = new THREE.Group();
orbitGroup.rotation.x = 0;
scene.add(orbitGroup);

const eclipticGrid = createEclipticGrid(activeScalePreset);
orbitGroup.add(eclipticGrid.group);

let asteroidBeltGroup = createAsteroidBelt();
orbitGroup.add(asteroidBeltGroup);

let kuiperBeltGroup = createKuiperBelt();
orbitGroup.add(kuiperBeltGroup);

function createEclipticGrid(preset) {
    const extent = getEclipticGridExtent(preset);
    const half = extent;
    const divisions = ECLIPTIC_GRID.divisions;
    const step = (extent * 2) / divisions;
    const linePositions = [];

    for (let i = 0; i <= divisions; i += 1) {
        const z = -half + i * step;
        linePositions.push(-half, 0, z, half, 0, z);
    }
    for (let i = 0; i <= divisions; i += 1) {
        const x = -half + i * step;
        linePositions.push(x, 0, -half, x, 0, half);
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        color: ECLIPTIC_GRID.lineColor,
        transparent: true,
        opacity: ECLIPTIC_GRID.lineOpacity.dark,
        depthWrite: false,
    });

    const gridLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    gridLines.renderOrder = -2;
    gridLines.raycast = () => {};

    const fillMaterial = new THREE.MeshBasicMaterial({
        color: ECLIPTIC_GRID.fillColor,
        transparent: true,
        opacity: ECLIPTIC_GRID.fillOpacity.dark,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(extent * 2, extent * 2), fillMaterial);
    fill.rotation.x = -Math.PI / 2;
    fill.renderOrder = -3;
    fill.raycast = () => {};

    const group = new THREE.Group();
    group.add(fill);
    group.add(gridLines);

    return { group, gridLines, fill, lineMaterial, fillMaterial, extent };
}

function updateEclipticGrid(eclipticGrid, preset) {
    const extent = getEclipticGridExtent(preset);
    if (extent === eclipticGrid.extent) return;

    eclipticGrid.extent = extent;
    const half = extent;
    const divisions = ECLIPTIC_GRID.divisions;
    const step = (extent * 2) / divisions;
    const linePositions = [];

    for (let i = 0; i <= divisions; i += 1) {
        const z = -half + i * step;
        linePositions.push(-half, 0, z, half, 0, z);
    }
    for (let i = 0; i <= divisions; i += 1) {
        const x = -half + i * step;
        linePositions.push(x, 0, -half, x, 0, half);
    }

    eclipticGrid.gridLines.geometry.dispose();
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    eclipticGrid.gridLines.geometry = lineGeometry;

    eclipticGrid.fill.geometry.dispose();
    eclipticGrid.fill.geometry = new THREE.PlaneGeometry(extent * 2, extent * 2);
}

function createOrbitPath(radius, parent) {
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
    parent.add(line);
    return line;
}

function applyOrbitPlaneTilt(wrapper, planetName) {
    wrapper.rotation.order = "YXZ";
    wrapper.rotation.y = THREE.MathUtils.degToRad(ORBIT_ASCENDING_NODE_DEG[planetName] || 0);
    wrapper.rotation.x = THREE.MathUtils.degToRad(ORBIT_INCLINATION_DEG[planetName] || 0);
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
    const orbitWrapper = new THREE.Object3D();
    applyOrbitPlaneTilt(orbitWrapper, data.name);
    orbitGroup.add(orbitWrapper);

    const pivot = new THREE.Object3D();
    orbitWrapper.add(pivot);

    const orbitLine = createOrbitPath(data.orbit, orbitWrapper);
    orbitLines.push({ line: orbitLine, planetName: data.name, orbitWrapper });

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

    const { named: moons, bulkSwarms } = createMoonsForPlanet(planet, data.name);
    moonEntries.push(...moons);
    bulkMoonSwarms.push(...bulkSwarms);

    const cloudMesh = planet.children.find((c) => c.isMesh && c.material?.transparent && !c.geometry?.type?.includes("Ring"));

    planetMeshes.push({
        mesh: planet,
        pivot,
        orbitWrapper,
        data,
        cloudMesh: cloudMesh || null,
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
    hidePlanetHoverLabel();
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

function formatRadiusKm(km) {
    if (km >= 10000) return `${Math.round(km).toLocaleString()} km`;
    return `${Math.round(km).toLocaleString()} km`;
}

function formatTemperature(celsius) {
    if (celsius >= 1000) return `~${celsius.toLocaleString()}°C (surface)`;
    return `~${celsius > 0 ? "+" : ""}${celsius}°C`;
}

function formatFacts(data) {
    const moons = data.moonCount === 0 ? "None" : data.moonCount.toLocaleString();
    return `Radius: ${formatRadiusKm(data.radiusKm)} · Moons: ${moons} · Temp: ${formatTemperature(data.avgTempC)}`;
}

function updatePlanetHoverLabel(bodyEntry) {
    if (!planetHoverLabel || !bodyEntry) return;
    planetHoverLabel.textContent = bodyEntry.data.name;
    planetHoverLabel.classList.add("is-visible");
    planetHoverLabel.dataset.body = bodyEntry.data.slug;
}

function hidePlanetHoverLabel() {
    if (!planetHoverLabel) return;
    planetHoverLabel.classList.remove("is-visible");
    planetHoverLabel.textContent = "";
}

const labelProjectVector = new THREE.Vector3();

function positionPlanetHoverLabel(bodyEntry) {
    if (!planetHoverLabel || !bodyEntry) return;
    bodyEntry.mesh.getWorldPosition(labelProjectVector);
    labelProjectVector.project(camera);
    const rect = canvas.getBoundingClientRect();
    const x = ((labelProjectVector.x + 1) / 2) * rect.width;
    const y = ((-labelProjectVector.y + 1) / 2) * rect.height;
    planetHoverLabel.style.left = `${x}px`;
    planetHoverLabel.style.top = `${y - 28}px`;
}

function updateTooltipContent(bodyEntry) {
    tooltipTitle.textContent = bodyEntry.data.name;
    tooltipText.textContent = bodyEntry.data.intro;
    if (tooltipFacts) tooltipFacts.textContent = formatFacts(bodyEntry.data);
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
        updatePlanetHoverLabel(hit);
        positionPlanetHoverLabel(hit);
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
        window.location.href = `planets/${hit.data.slug}.html`;
    }
}

function updateOrbitLineGeometry(line, radius) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
}

function updateBeltRadii(preset) {
    const orbitScale = preset.key === "educational" ? ORBIT_SCALE : preset.earthOrbit / ORBIT_AU.Earth;
    asteroidBeltInner = 16.2 * orbitScale;
    asteroidBeltOuter = 19.8 * orbitScale;
    kuiperBeltInner = preset.earthOrbit * ORBIT_AU.Neptune * 1.08;
    kuiperBeltOuter = preset.earthOrbit * ORBIT_AU.Neptune * 1.22;
}

function rebuildBeltGroup(oldGroup, createFn) {
    orbitGroup.remove(oldGroup);
    oldGroup.traverse((child) => {
        if (child.geometry && child.geometry !== oldGroup.children[0]?.geometry) {
            // shared geometry — disposed once below
        }
    });
    if (oldGroup.children[0]?.geometry) oldGroup.children[0].geometry.dispose();
    if (oldGroup.children[0]?.material) oldGroup.children[0].material.dispose();
    return createFn();
}

function getZoomLabelThreshold() {
    return controls.minDistance + (controls.maxDistance - controls.minDistance) * 0.6;
}

function initZoomLabels() {
    if (!zoomLabelsContainer) return;
    const bodies = [
        { entry: sunEntry, name: "The Sun" },
        ...planetMeshes.map((entry) => ({ entry, name: entry.data.name })),
    ];
    bodies.forEach(({ entry, name }) => {
        const el = document.createElement("span");
        el.className = "Planet-Zoom-Label";
        el.textContent = name;
        zoomLabelsContainer.appendChild(el);
        zoomLabelEntries.push({ entry, el });
    });
}

function updateZoomLabels() {
    if (!zoomLabelsContainer || zoomLabelEntries.length === 0) return;
    const cameraDistance = camera.position.distanceTo(controls.target);
    const show = cameraDistance > getZoomLabelThreshold();
    zoomLabelsContainer.classList.toggle("is-visible", show);
    zoomLabelsContainer.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show) return;

    const rect = canvas.getBoundingClientRect();
    zoomLabelEntries.forEach(({ entry, el }) => {
        entry.mesh.getWorldPosition(labelProjectVector);
        labelProjectVector.project(camera);
        if (labelProjectVector.z > 1) {
            el.style.opacity = "0";
            return;
        }
        const x = ((labelProjectVector.x + 1) / 2) * rect.width;
        const y = ((-labelProjectVector.y + 1) / 2) * rect.height;
        el.style.left = `${x}px`;
        el.style.top = `${y - 10}px`;
        el.style.opacity = "1";
    });
}

function applyScalePreset(presetKey) {
    activeScalePreset = SCALE_PRESETS[presetKey];
    PLANET_DATA = buildPlanetData(activeScalePreset);
    updateBeltRadii(activeScalePreset);

    sunRadius = activeScalePreset.sunRadius;
    sun.geometry.dispose();
    sun.geometry = new THREE.SphereGeometry(sunRadius, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    sun.children
        .filter((child) => child.isMesh && child.material?.transparent && child.material?.blending === THREE.AdditiveBlending)
        .forEach((corona) => {
            sun.remove(corona);
            corona.geometry.dispose();
        });
    sun.add(createSunCorona(sunRadius * 1.37, 0xffcc66, 0.1));
    sun.add(createSunCorona(sunRadius * 1.97, 0xff8833, 0.04));

    planetMeshes.forEach((entry, index) => {
        const data = PLANET_DATA[index];
        entry.data = data;
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = new THREE.SphereGeometry(data.radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
        entry.mesh.position.x = data.orbit;
        if (entry.mesh.children.length) {
            entry.mesh.children.forEach((child) => {
                if (child.isMesh && child.geometry?.type === "SphereGeometry" && child !== entry.mesh) {
                    const isCloud = data.clouds && child.material?.transparent;
                    if (isCloud) {
                        child.geometry.dispose();
                        child.geometry = new THREE.SphereGeometry(data.radius * 1.018, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
                    }
                }
                if (child.isMesh && child.geometry?.type === "RingGeometry") {
                    entry.mesh.remove(child);
                    child.geometry.dispose();
                    child.material.dispose();
                    const ring = createSaturnRing(data.radius, loadTexture(`${TEXTURE_BASE}2k_saturn_ring_alpha.png`));
                    ring.rotation.x = Math.PI / 2;
                    entry.mesh.add(ring);
                }
            });
        }
        updateOrbitLineGeometry(orbitLines[index].line, data.orbit);
    });

    asteroidBeltGroup = rebuildBeltGroup(asteroidBeltGroup, createAsteroidBelt);
    orbitGroup.add(asteroidBeltGroup);
    kuiperBeltGroup = rebuildBeltGroup(kuiperBeltGroup, createKuiperBelt);
    orbitGroup.add(kuiperBeltGroup);

    updateEclipticGrid(eclipticGrid, activeScalePreset);

    controls.maxDistance = activeScalePreset.maxZoom;
    if (camera.position.length() > controls.maxDistance) {
        camera.position.setLength(controls.maxDistance * 0.85);
    }

    if (scaleToggleBtn) {
        scaleToggleBtn.textContent = activeScalePreset.buttonLabel;
        scaleToggleBtn.setAttribute("aria-pressed", presetKey === "real" ? "true" : "false");
    }
    if (scaleNoteEl) {
        scaleNoteEl.textContent = activeScalePreset.note || "";
        scaleNoteEl.hidden = !activeScalePreset.note;
    }
}

function applyTheme(theme) {
    currentTheme = theme;
    const colors = THEME_COLORS[theme];
    scene.background = new THREE.Color(colors.bg);
    scene.fog = new THREE.FogExp2(colors.fog, colors.fogDensity);
    renderer.toneMappingExposure = colors.exposure;
    eclipticGrid.lineMaterial.opacity = ECLIPTIC_GRID.lineOpacity[theme];
    eclipticGrid.fillMaterial.opacity = ECLIPTIC_GRID.fillOpacity[theme];
    document.body.classList.toggle("solar-light-mode", theme === "light");
    if (themeToggleBtn) {
        themeToggleBtn.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
        themeToggleBtn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
}

let constellationsVisible = false;

function applyConstellationVisibility(visible) {
    constellationsVisible = visible;
    const group = constellationGroup ?? skyBackground?.constellationGroup;
    if (group) {
        group.visible = visible;
        group.traverse((child) => {
            child.visible = visible;
        });
    }
    const btn = document.getElementById("constellation-toggle-btn");
    if (btn) {
        btn.textContent = visible ? "★ Constellations" : "Constellations Off";
        btn.setAttribute("aria-pressed", visible ? "true" : "false");
    }
}

function initConstellationToggle() {
    const btn = document.getElementById("constellation-toggle-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        applyConstellationVisibility(!constellationsVisible);
    });
    applyConstellationVisibility(constellationsVisible);
}

function updateScrollParallax() {
    if (!heroSection) return;
    const rect = heroSection.getBoundingClientRect();
    const viewHeight = window.innerHeight || 1;
    const visible = Math.max(0, Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0));
    const visibility = visible / Math.min(rect.height, viewHeight);
    scrollParallax = (1 - visibility) * 0.6 + Math.max(0, -rect.top) / (rect.height + viewHeight) * 0.4;
}

if (scaleToggleBtn) {
    scaleToggleBtn.addEventListener("click", () => {
        const next = activeScalePreset.key === "educational" ? "real" : "educational";
        applyScalePreset(next);
    });
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
}

initConstellationToggle();

window.addEventListener("scroll", updateScrollParallax, { passive: true });
updateScrollParallax();
applyTheme("dark");
if (scaleNoteEl) scaleNoteEl.hidden = true;
initZoomLabels();
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

    skyBackground.group.rotation.y += delta * 0.003;
    skyBackground.group.rotation.x = Math.sin(skyTime * 0.03) * 0.008;
    skyBackground.nebulaMaterial.opacity = 0.14 + Math.sin(skyTime * 0.12) * 0.02;
    skyBackground.milkyWayMaterial.opacity = 0.09 + Math.sin(skyTime * 0.08 + 1.2) * 0.015;

    const cameraParallax = (camera.position.x + camera.position.z) * 0.0004;
    skyBackground.parallaxStars.layers.forEach((layer, index) => {
        const factor = skyBackground.parallaxStars.parallaxFactors[index];
        const offset = scrollParallax * factor * 0.35 + cameraParallax * factor;
        layer.points.rotation.y = offset;
        layer.points.rotation.x = offset * 0.25;
        for (let i = 0; i < layer.count; i += 1) {
            const twinkle = 0.78 + 0.22 * Math.sin(skyTime * layer.twinkleSpeeds[i] + layer.twinklePhases[i]);
            layer.colors[i * 3] = layer.baseColors[i * 3] * twinkle;
            layer.colors[i * 3 + 1] = layer.baseColors[i * 3 + 1] * twinkle;
            layer.colors[i * 3 + 2] = layer.baseColors[i * 3 + 2] * twinkle;
        }
        layer.geometry.attributes.color.needsUpdate = true;
    });

    if (hoveredBody) positionPlanetHoverLabel(hoveredBody);

    sun.rotation.y += getAxialRotationSpeed("Sun") * delta;
    orbitGroup.rotation.y += delta * 0.011;
    orbitGroup.rotation.x = Math.sin(skyTime * 0.07) * 0.012;
    orbitGroup.rotation.z = Math.sin(skyTime * 0.05 + 0.6) * 0.006;

    asteroidBeltOrbit(asteroidBeltGroup);
    asteroidBeltOrbit(kuiperBeltGroup);

    if (hoveredBody === sunEntry) {
        const targetScale = sunEntry.hoverScale;
        sun.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    } else if (sun.scale.x !== 1) {
        sun.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);
    }

    planetMeshes.forEach((entry) => {
        entry.angle += entry.data.speed * ORBIT_SPEED_FACTOR;
        entry.pivot.rotation.y = entry.angle;
        const spin = getAxialRotationSpeed(entry.data.name) * delta;
        entry.mesh.rotation.y += spin;
        if (entry.cloudMesh) entry.cloudMesh.rotation.y += spin * 1.08;
        const targetScale = entry.hoverScale;
        entry.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    });

    moonEntries.forEach((moon) => {
        const dir = moon.retrograde ? -1 : 1;
        moon.angle += moon.speed * ORBIT_SPEED_FACTOR * dir;
        moon.pivot.rotation.y = moon.angle;
    });

    animateBulkMoonSwarms(bulkMoonSwarms, delta, THREE, ORBIT_SPEED_FACTOR);

    updateShootingStars(shootingStars, delta);

    controls.update();
    updateZoomLabels();

    if (pointerInside.active && !isOrbiting) {
        updateHoverFromPointer();
    }

    renderPreview();
    renderer.render(scene, camera);
}

animate();
