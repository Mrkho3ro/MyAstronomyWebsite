import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const TEXTURE_BASE = "https://threejs.org/examples/textures/planets/";
const ORBIT_SPEED_FACTOR = 0.22;
const SPHERE_SEGMENTS = 64;

const PLANET_DATA = [
    {
        name: "Mercury",
        slug: "Mercury",
        color: 0xb5b5b5,
        texture: "mercury.jpg",
        radius: 0.35,
        orbit: 7.5,
        speed: 0.022,
        intro:
            "The closest planet to the Sun, Mercury is a small, rocky world with extreme temperatures, ranging from scorching hot days to freezing cold nights.",
    },
    {
        name: "Venus",
        slug: "Venus",
        color: 0xe6c87a,
        texture: "venus.jpg",
        radius: 0.55,
        orbit: 10,
        speed: 0.018,
        intro:
            "Venus is similar in size to Earth but covered in thick, toxic clouds. It's the hottest planet in the Solar System due to its powerful greenhouse effect.",
    },
    {
        name: "Earth",
        slug: "Earth",
        color: 0x4f8fdb,
        texture: "earth_atmos_2048.jpg",
        radius: 0.58,
        orbit: 12.5,
        speed: 0.015,
        intro:
            "Our home planet, Earth is the only known place with life. It has liquid water, a breathable atmosphere, and diverse ecosystems.",
    },
    {
        name: "Mars",
        slug: "Mars",
        color: 0xc1440e,
        texture: "mars_1k_color.jpg",
        radius: 0.45,
        orbit: 15,
        speed: 0.012,
        intro:
            "Known as the Red Planet, Mars has a dusty surface and signs of ancient water. Scientists study it closely for clues about past life.",
    },
    {
        name: "Jupiter",
        slug: "Jupiter",
        color: 0xc88b3a,
        texture: "jupiter.jpg",
        radius: 1.4,
        orbit: 21,
        speed: 0.008,
        intro:
            "Jupiter is the largest planet in the Solar System, a gas giant famous for its Great Red Spot—a massive, long-lasting storm.",
    },
    {
        name: "Saturn",
        slug: "Saturn",
        color: 0xe8d5a3,
        texture: "saturn.jpg",
        radius: 1.15,
        orbit: 27,
        speed: 0.006,
        rings: true,
        intro:
            "Saturn is best known for its stunning ring system. It's a gas giant made mostly of hydrogen and helium.",
    },
    {
        name: "Uranus",
        slug: "Uranus",
        color: 0x73c2fb,
        texture: "uranus.jpg",
        radius: 0.85,
        orbit: 33,
        speed: 0.004,
        intro:
            "Uranus is an ice giant that rotates on its side, making it unique. It has a pale blue color due to methane in its atmosphere.",
    },
    {
        name: "Neptune",
        slug: "Neptune",
        color: 0x3f54ba,
        texture: "neptune.jpg",
        radius: 0.82,
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
scene.background = new THREE.Color(0x020412);
scene.fog = new THREE.FogExp2(0x020412, 0.006);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
camera.position.set(0, 38, 62);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const textureLoader = new THREE.TextureLoader();

function loadTexture(path) {
    const texture = textureLoader.load(`${TEXTURE_BASE}${path}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const ambient = new THREE.AmbientLight(0x1a2844, 0.25);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xfff0cc, 3.2, 220, 1.35);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x4466aa, 0.18);
fillLight.position.set(-30, 20, -40);
scene.add(fillLight);

const sunGeometry = new THREE.SphereGeometry(3.2, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: loadTexture("sun.jpg"),
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

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

sun.add(createGlowSprite(0xffaa44, 0.45, 14));
sun.add(createGlowSprite(0xff6622, 0.2, 22));

const starCount = 2500;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);

for (let i = 0; i < starCount; i += 1) {
    const radius = 90 + Math.random() * 140;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const tint = 0.75 + Math.random() * 0.25;
    starColors[i * 3] = 0.72 * tint;
    starColors[i * 3 + 1] = 0.82 * tint;
    starColors[i * 3 + 2] = 1.0 * tint;
    starSizes[i] = 0.15 + Math.random() * 0.55;
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
starGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
        size: 0.4,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
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
        color: 0x2a3a6e,
        transparent: true,
        opacity: 0.45,
    });
    const line = new THREE.LineLoop(geometry, material);
    scene.add(line);
}

PLANET_DATA.forEach((data) => {
    const pivot = new THREE.Object3D();
    orbitGroup.add(pivot);

    createOrbitPath(data.orbit);

    const planetMaterial = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.85,
        metalness: 0.05,
        map: loadTexture(data.texture),
    });

    const planet = new THREE.Mesh(new THREE.SphereGeometry(data.radius, SPHERE_SEGMENTS, SPHERE_SEGMENTS), planetMaterial);
    planet.position.x = data.orbit;
    pivot.add(planet);

    if (data.rings) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(data.radius * 1.35, data.radius * 2.15, 96),
            new THREE.MeshStandardMaterial({
                color: 0xd4c59a,
                map: loadTexture("saturnringcolor.jpg"),
                transparent: true,
                opacity: 0.75,
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.05,
            }),
        );
        ring.rotation.x = Math.PI / 2.4;
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
        const targetScale = entry.hoverScale;
        entry.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    });

    if (pointerInside.active) {
        updateHoverFromPointer();
    }

    renderer.render(scene, camera);
}

animate();
