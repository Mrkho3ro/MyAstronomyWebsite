import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const PLANET_DATA = [
    {
        name: "Mercury",
        slug: "Mercury",
        color: 0xb5b5b5,
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
scene.fog = new THREE.FogExp2(0x020412, 0.008);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
camera.position.set(0, 38, 62);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const ambient = new THREE.AmbientLight(0x334466, 0.35);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xffcc66, 2.8, 200, 1.4);
scene.add(sunLight);

const sunGeometry = new THREE.SphereGeometry(3.2, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }),
);
sunGlow.scale.set(18, 18, 1);
sun.add(sunGlow);

const starGeometry = new THREE.BufferGeometry();
const starCount = 1200;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i += 1) {
    const radius = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);
}
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xcbd5ff, size: 0.35, transparent: true, opacity: 0.85 }),
);
scene.add(stars);

const planetMeshes = [];
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

PLANET_DATA.forEach((data) => {
    const pivot = new THREE.Object3D();
    orbitGroup.add(pivot);

    const orbitLine = new THREE.Mesh(
        new THREE.RingGeometry(data.orbit - 0.03, data.orbit + 0.03, 96),
        new THREE.MeshBasicMaterial({ color: 0x1a2550, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);

    const planet = new THREE.Mesh(
        new THREE.SphereGeometry(data.radius, 32, 32),
        new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.65,
            metalness: 0.15,
            emissive: data.color,
            emissiveIntensity: 0.08,
        }),
    );
    planet.position.x = data.orbit;
    pivot.add(planet);

    if (data.rings) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(data.radius * 1.35, data.radius * 2.1, 64),
            new THREE.MeshBasicMaterial({
                color: 0xd4c59a,
                transparent: true,
                opacity: 0.55,
                side: THREE.DoubleSide,
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
const clickableMeshes = [];
let hoveredPlanet = null;

planetMeshes.forEach((entry) => {
    entry.mesh.traverse((child) => {
        if (child.isMesh) clickableMeshes.push(child);
    });
});

function findPlanetFromObject(object) {
    let current = object;
    while (current) {
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

function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function showTooltip(planetEntry, event) {
    tooltip.hidden = false;
    tooltipTitle.textContent = planetEntry.data.name;
    tooltipText.textContent = planetEntry.data.intro;

    const rect = heroSection.getBoundingClientRect();
    let left = event.clientX - rect.left + 18;
    let top = event.clientY - rect.top + 18;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    requestAnimationFrame(() => {
        const tipRect = tooltip.getBoundingClientRect();
        const heroRect = heroSection.getBoundingClientRect();
        if (left + tipRect.width > heroRect.width - 12) {
            left = event.clientX - rect.left - tipRect.width - 18;
        }
        if (top + tipRect.height > heroRect.height - 12) {
            top = event.clientY - rect.top - tipRect.height - 18;
        }
        tooltip.style.left = `${Math.max(12, left)}px`;
        tooltip.style.top = `${Math.max(12, top)}px`;
    });
}

function hideTooltip() {
    tooltip.hidden = true;
}

function updateHover(event) {
    setPointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes);

    if (intersects.length > 0) {
        const hit = findPlanetFromObject(intersects[0].object);
        if (hit && hit !== hoveredPlanet) {
            if (hoveredPlanet) hoveredPlanet.hoverScale = 1;
            hoveredPlanet = hit;
            hoveredPlanet.hoverScale = 1.35;
            canvas.style.cursor = "pointer";
            showTooltip(hit, event);
        } else if (hit) {
            showTooltip(hit, event);
        }
    } else if (hoveredPlanet) {
        hoveredPlanet.hoverScale = 1;
        hoveredPlanet = null;
        canvas.style.cursor = "default";
        hideTooltip();
    }
}

function handleClick(event) {
    setPointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes);
    if (intersects.length === 0) return;

    const hit = findPlanetFromObject(intersects[0].object);
    if (hit) {
        window.open(`planets/${hit.data.slug}.html`, "_blank", "noopener,noreferrer");
    }
}

canvas.addEventListener("mousemove", updateHover);
canvas.addEventListener("mouseleave", () => {
    if (hoveredPlanet) hoveredPlanet.hoverScale = 1;
    hoveredPlanet = null;
    canvas.style.cursor = "default";
    hideTooltip();
});
canvas.addEventListener("click", handleClick);

window.addEventListener("resize", resizeRenderer);
resizeRenderer();

function animate() {
    requestAnimationFrame(animate);

    sun.rotation.y += 0.002;
    orbitGroup.rotation.y += 0.0004;

    planetMeshes.forEach((entry) => {
        entry.angle += entry.data.speed;
        entry.pivot.rotation.y = entry.angle;
        const targetScale = entry.hoverScale;
        entry.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    });

    renderer.render(scene, camera);
}

animate();
