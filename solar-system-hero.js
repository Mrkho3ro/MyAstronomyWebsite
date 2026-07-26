import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const TEXTURE_BASE = "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/";
const THREEJS_TEXTURE_BASE = "https://threejs.org/examples/textures/planets/";
const ORBIT_SPEED_FACTOR = 0.22;
const SPHERE_SEGMENTS = 64;

const PLANET_DATA = [
    {
        name: "Mercury",
        slug: "Mercury",
        texture: "2k_mercury.jpg",
        radius: 0.42,
        orbit: 7.5,
        speed: 0.022,
        intro:
            "The closest planet to the Sun, Mercury is a small, rocky world with extreme temperatures, ranging from scorching hot days to freezing cold nights.",
    },
    {
        name: "Venus",
        slug: "Venus",
        texture: "2k_venus_surface.jpg",
        radius: 0.64,
        orbit: 10,
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
        radius: 0.68,
        orbit: 12.5,
        speed: 0.015,
        intro:
            "Our home planet, Earth is the only known place with life. It has liquid water, a breathable atmosphere, and diverse ecosystems.",
    },
    {
        name: "Mars",
        slug: "Mars",
        texture: "2k_mars.jpg",
        radius: 0.53,
        orbit: 15,
        speed: 0.012,
        intro:
            "Known as the Red Planet, Mars has a dusty surface and signs of ancient water. Scientists study it closely for clues about past life.",
    },
    {
        name: "Jupiter",
        slug: "Jupiter",
        texture: "2k_jupiter.jpg",
        radius: 1.65,
        orbit: 21,
        speed: 0.008,
        intro:
            "Jupiter is the largest planet in the Solar System, a gas giant famous for its Great Red Spot—a massive, long-lasting storm.",
    },
    {
        name: "Saturn",
        slug: "Saturn",
        texture: "2k_saturn.jpg",
        radius: 1.38,
        orbit: 27,
        speed: 0.006,
        rings: true,
        intro:
            "Saturn is best known for its stunning ring system. It's a gas giant made mostly of hydrogen and helium.",
    },
    {
        name: "Uranus",
        slug: "Uranus",
        texture: "2k_uranus.jpg",
        radius: 1.0,
        orbit: 33,
        speed: 0.004,
        intro:
            "Uranus is an ice giant that rotates on its side, making it unique. It has a pale blue color due to methane in its atmosphere.",
    },
    {
        name: "Neptune",
        slug: "Neptune",
        texture: "2k_neptune.jpg",
        radius: 0.96,
        orbit: 39,
        speed: 0.003,
        intro:
            "Neptune is the farthest planet from the Sun and is known for its deep blue color and extremely strong winds—the fastest in the Solar System.",
    },
];

const canvas = document.getElementById("solar-system-canvas");
const tooltip = document.getElementById("planet-tooltip");
const tooltipTitle = document.getElementById("planet-tooltip-title");
const tooltipText = document.getElementById("planet-tooltip-text");
const heroSection = document.querySelector(".Solar-System-Main-Picture");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1230);
scene.fog = new THREE.FogExp2(0x0c1538, 0.0018);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
camera.position.set(0, 38, 62);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;

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

    for (let i = 0; i < 10; i += 1) {
        const x = 200 + Math.random() * 1648;
        const y = 120 + Math.random() * 784;
        const radius = 180 + Math.random() * 420;
        const [r, g, b] = nebulaColors[i % nebulaColors.length];
        const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
        patch.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.32)`);
        patch.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.12)`);
        patch.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = patch;
        ctx.fillRect(0, 0, 2048, 1024);
    }

    const texture = new THREE.CanvasTexture(nebulaCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}

function createSkyBackground() {
    const group = new THREE.Group();

    const nebulaSphere = new THREE.Mesh(
        new THREE.SphereGeometry(190, 64, 32),
        new THREE.MeshBasicMaterial({
            map: createNebulaCanvasTexture(),
            side: THREE.BackSide,
            depthWrite: false,
        }),
    );
    group.add(nebulaSphere);

    const starFieldTexture = loadTexture(`${TEXTURE_BASE}2k_stars_milky_way.jpg`);
    starFieldTexture.mapping = THREE.EquirectangularReflectionMapping;
    const starFieldSphere = new THREE.Mesh(
        new THREE.SphereGeometry(185, 64, 32),
        new THREE.MeshBasicMaterial({
            map: starFieldTexture,
            side: THREE.BackSide,
            depthWrite: false,
            transparent: true,
            opacity: 0.55,
        }),
    );
    group.add(starFieldSphere);

    return group;
}

scene.add(createSkyBackground());

const ambient = new THREE.AmbientLight(0x334466, 0.42);
scene.add(ambient);

const hemisphere = new THREE.HemisphereLight(0x5577bb, 0x111122, 0.38);
scene.add(hemisphere);

const sunLight = new THREE.PointLight(0xfff2cc, 5.5, 260, 1.2);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x6688cc, 0.32);
fillLight.position.set(-35, 25, -45);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x8866cc, 0.15);
rimLight.position.set(40, -10, 30);
scene.add(rimLight);

const sunTexture = loadTexture(`${TEXTURE_BASE}2k_sun.jpg`);
const sunGeometry = new THREE.SphereGeometry(3.8, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
const sunMaterial = new THREE.MeshStandardMaterial({
    map: sunTexture,
    emissive: 0xffaa44,
    emissiveMap: sunTexture,
    emissiveIntensity: 1.6,
    roughness: 1,
    metalness: 0,
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const sunCoreLight = new THREE.PointLight(0xffcc66, 2.5, 40, 2);
sun.add(sunCoreLight);

function createGlowSprite(color, opacity, scale) {
    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        }),
    );
    sprite.scale.set(scale, scale, 1);
    return sprite;
}

sun.add(createGlowSprite(0xffcc66, 0.55, 16));
sun.add(createGlowSprite(0xff7722, 0.28, 26));
sun.add(createGlowSprite(0x6644ff, 0.08, 42));

const starCount = 4200;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i += 1) {
    const radius = 70 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const tint = 0.82 + Math.random() * 0.18;
    starColors[i * 3] = 0.85 * tint;
    starColors[i * 3 + 1] = 0.9 * tint;
    starColors[i * 3 + 2] = 1.0 * tint;
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
        size: 0.65,
        vertexColors: true,
        transparent: true,
        opacity: 0.98,
        sizeAttenuation: true,
        depthWrite: false,
    }),
);
scene.add(stars);

const planetMeshes = [];
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

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
    scene.add(line);
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
        roughness: 0.88,
        metalness: 0.04,
        map: loadTexture(`${TEXTURE_BASE}${data.texture}`),
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
        ring.rotation.x = Math.PI / 2.35;
        planet.add(ring);
    }

    planetMeshes.push({
        mesh: planet,
        pivot,
        data,
        baseScale: 1,
        hoverScale: 1,
        angle: Math.random() * Math.PI * 2,
    });
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerInside = { active: false, clientX: 0, clientY: 0 };
const clickableMeshes = [];
let hoveredPlanet = null;

planetMeshes.forEach((entry) => {
    entry.mesh.traverse((child) => {
        if (child.isMesh) {
            child.userData.planetEntry = entry;
            clickableMeshes.push(child);
        }
    });
});

function findPlanetFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData?.planetEntry) return current.userData.planetEntry;
        const match = planetMeshes.find((entry) => entry.mesh === current);
        if (match) return match;
        current = current.parent;
    }
    return null;
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
    if (hoveredPlanet) {
        hoveredPlanet.hoverScale = 1;
        hoveredPlanet = null;
    }
    canvas.style.cursor = "default";
    hideTooltip();
}

function showTooltip(planetEntry, clientX, clientY) {
    tooltip.hidden = false;
    tooltipTitle.textContent = planetEntry.data.name;
    tooltipText.textContent = planetEntry.data.intro;

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

function hideTooltip() {
    tooltip.hidden = true;
    tooltip.style.left = "";
    tooltip.style.top = "";
}

function updateHoverFromPointer() {
    if (!pointerInside.active) {
        clearHoverState();
        return;
    }

    setPointerFromClient(pointerInside.clientX, pointerInside.clientY);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, false);

    const hit = intersects.length > 0 ? findPlanetFromObject(intersects[0].object) : null;

    if (hit) {
        if (hit !== hoveredPlanet) {
            if (hoveredPlanet) hoveredPlanet.hoverScale = 1;
            hoveredPlanet = hit;
            hoveredPlanet.hoverScale = 1.35;
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
    setPointerFromClient(event.clientX, event.clientY);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, false);
    if (intersects.length === 0) return;

    const hit = findPlanetFromObject(intersects[0].object);
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

function animate() {
    requestAnimationFrame(animate);

    sun.rotation.y += 0.0006;
    orbitGroup.rotation.y += 0.00008;

    planetMeshes.forEach((entry) => {
        entry.angle += entry.data.speed * ORBIT_SPEED_FACTOR;
        entry.pivot.rotation.y = entry.angle;
        entry.mesh.rotation.y += 0.002;
        const targetScale = entry.hoverScale;
        entry.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    });

    if (pointerInside.active) {
        updateHoverFromPointer();
    }

    renderer.render(scene, camera);
}

animate();
