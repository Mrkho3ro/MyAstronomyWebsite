import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const TEXTURE_BASE = "https://cdn.jsdelivr.net/gh/elymas/solar-simulator@main/public/textures/";
const THREEJS_TEXTURE_BASE = "https://threejs.org/examples/textures/planets/";

/** Mean radii relative to Earth (true scale among planets). */
const RADIUS_EARTH = {
    Mercury: 0.383,
    Venus: 0.949,
    Earth: 1,
    Mars: 0.532,
    Jupiter: 11.21,
    Saturn: 9.45,
    Uranus: 4.01,
    Neptune: 3.88,
};

/** Sun is ~109 Earth radii; displayed much smaller so the strip stays readable. */
const SUN_DISPLAY_EARTH_RADII = 18;

const BODIES = [
    {
        name: "Sun",
        slug: "Sun",
        texture: "2k_sun.jpg",
        radiusEarth: SUN_DISPLAY_EARTH_RADII,
        isSun: true,
        reducedScale: true,
    },
    { name: "Mercury", slug: "Mercury", texture: "2k_mercury.jpg", radiusEarth: RADIUS_EARTH.Mercury },
    { name: "Venus", slug: "Venus", texture: "2k_venus_surface.jpg", radiusEarth: RADIUS_EARTH.Venus },
    {
        name: "Earth",
        slug: "Earth",
        texture: "2k_earth_daymap.jpg",
        clouds: "2k_earth_clouds.jpg",
        normalMap: `${THREEJS_TEXTURE_BASE}earth_normal_2048.jpg`,
        radiusEarth: RADIUS_EARTH.Earth,
    },
    { name: "Mars", slug: "Mars", texture: "2k_mars.jpg", radiusEarth: RADIUS_EARTH.Mars },
    { name: "Jupiter", slug: "Jupiter", texture: "2k_jupiter.jpg", radiusEarth: RADIUS_EARTH.Jupiter },
    {
        name: "Saturn",
        slug: "Saturn",
        texture: "2k_saturn.jpg",
        rings: true,
        radiusEarth: RADIUS_EARTH.Saturn,
    },
    { name: "Uranus", slug: "Uranus", texture: "2k_uranus.jpg", radiusEarth: RADIUS_EARTH.Uranus, tilt: 1.55 },
    { name: "Neptune", slug: "Neptune", texture: "2k_neptune.jpg", radiusEarth: RADIUS_EARTH.Neptune },
];

const AXIAL_DAYS = {
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
const BASE_SPIN = (Math.PI * 2) / 14;

function axialSpeed(name) {
    const days = AXIAL_DAYS[name];
    if (!days) return BASE_SPIN;
    return (BASE_SPIN / Math.abs(days)) * Math.sign(days);
}

const canvas = document.getElementById("planet-size-compare-canvas");
const wrapper = document.getElementById("planet-size-compare");
const errorEl = document.getElementById("planet-size-compare-error");

if (!canvas || !wrapper) {
    throw new Error("Planet size compare container missing");
}

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
    const geometry = new THREE.RingGeometry(inner, outer, 96);
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060a18);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
camera.position.set(0, 1.2, 28);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
if (!renderer.getContext()) {
    if (errorEl) errorEl.hidden = false;
    throw new Error("WebGL is not available");
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;

scene.add(new THREE.AmbientLight(0x556688, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
keyLight.position.set(4, 6, 10);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x7799cc, 0.4);
fillLight.position.set(-6, -2, 4);
scene.add(fillLight);

const UNIT = 0.11;
const GAP = 0.55;
const entries = [];
const labelEls = [];

const labelsRow = document.createElement("div");
labelsRow.className = "Planet-Size-Compare-Labels";
labelsRow.setAttribute("aria-hidden", "true");
wrapper.insertBefore(labelsRow, canvas.nextSibling);

let cursorX = 0;
BODIES.forEach((spec, index) => {
    const radius = spec.radiusEarth * UNIT;
    const halfSpan = radius * (spec.rings ? 2.2 : 1);
    if (index === 0) {
        cursorX = halfSpan;
    } else {
        const prev = entries[index - 1];
        const prevHalf = prev.radius * (prev.spec.rings ? 2.2 : 1);
        cursorX += prevHalf + GAP + halfSpan;
    }

    const group = new THREE.Group();
    group.position.x = cursorX;
    group.userData.slug = spec.slug;
    group.userData.name = spec.name;

    let mesh;
    if (spec.isSun) {
        const sunTex = loadTexture(`${TEXTURE_BASE}${spec.texture}`);
        mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 48, 48),
            new THREE.MeshStandardMaterial({
                map: sunTex,
                emissive: 0xffaa44,
                emissiveMap: sunTex,
                emissiveIntensity: 2.8,
                roughness: 1,
                metalness: 0,
            }),
        );
        mesh.add(new THREE.PointLight(0xffcc66, 1.8, radius * 8, 2));
    } else {
        const material = new THREE.MeshStandardMaterial({
            map: loadTexture(`${TEXTURE_BASE}${spec.texture}`),
            roughness: 0.78,
            metalness: 0.05,
            emissive: 0x111122,
            emissiveIntensity: 0.06,
        });
        if (spec.normalMap) {
            material.normalMap = loadTexture(spec.normalMap);
            material.normalScale = new THREE.Vector2(0.55, 0.55);
        }
        mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), material);

        if (spec.clouds) {
            const clouds = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 1.018, 40, 40),
                new THREE.MeshStandardMaterial({
                    map: loadTexture(`${TEXTURE_BASE}${spec.clouds}`),
                    transparent: true,
                    opacity: 0.4,
                    depthWrite: false,
                }),
            );
            mesh.add(clouds);
            group.userData.clouds = clouds;
        }

        if (spec.rings) {
            const ring = createSaturnRing(radius, loadTexture(`${TEXTURE_BASE}2k_saturn_ring_alpha.png`));
            ring.rotation.x = Math.PI / 2;
            mesh.add(ring);
        }

        if (spec.tilt) {
            group.rotation.z = spec.tilt * 0.35;
        }
    }

    group.add(mesh);
    mesh.userData.slug = spec.slug;
    mesh.userData.compareEntry = true;
    scene.add(group);

    const label = document.createElement("button");
    label.type = "button";
    label.className = "Planet-Size-Compare-Label";
    label.textContent = spec.reducedScale ? `${spec.name}*` : spec.name;
    label.dataset.slug = spec.slug;
    label.setAttribute("aria-label", `Open ${spec.name} detail page`);
    labelsRow.appendChild(label);
    labelEls.push(label);

    entries.push({ group, mesh, spec, radius, x: cursorX });
});

const totalWidth = cursorX + entries[entries.length - 1].radius * 1.2;
const midX = totalWidth / 2;
entries.forEach((entry) => {
    entry.group.position.x -= midX;
    entry.x = entry.group.position.x;
});

camera.position.z = Math.max(22, totalWidth * 0.72);
camera.lookAt(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let dragMoved = false;
let pointerDown = false;
const pointerStart = { x: 0, y: 0 };

function resize() {
    const width = wrapper.clientWidth;
    const height = Math.max(220, Math.min(320, Math.round(width * 0.28)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    positionLabels();
}

function positionLabels() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const tmp = new THREE.Vector3();
    entries.forEach((entry, i) => {
        tmp.set(entry.x, -entry.radius - 0.35, 0);
        tmp.project(camera);
        const lx = ((tmp.x + 1) / 2) * width;
        const ly = ((-tmp.y + 1) / 2) * height;
        const el = labelEls[i];
        el.style.left = `${lx}px`;
        el.style.top = `${Math.min(height - 8, ly + 8)}px`;
    });
}

function setPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function pickBody(clientX, clientY) {
    setPointer(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    const meshes = entries.map((e) => e.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData?.slug) obj = obj.parent;
    if (obj?.userData?.slug) {
        return entries.find((e) => e.spec.slug === obj.userData.slug) ?? null;
    }
    return entries.find((e) => e.mesh === hits[0].object || hits[0].object.parent === e.mesh) ?? null;
}

function navigateTo(slug) {
    window.location.href = `planets/${slug}.html`;
}

function clearHover() {
    if (hovered) {
        hovered.group.scale.setScalar(1);
        hovered = null;
    }
    canvas.style.cursor = "default";
    labelEls.forEach((el) => el.classList.remove("is-hovered"));
}

canvas.addEventListener("pointermove", (event) => {
    if (pointerDown) {
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        if (Math.hypot(dx, dy) > 6) dragMoved = true;
    }
    const hit = pickBody(event.clientX, event.clientY);
    if (hit !== hovered) {
        clearHover();
        if (hit) {
            hovered = hit;
            hit.group.scale.setScalar(1.08);
            canvas.style.cursor = "pointer";
            const idx = entries.indexOf(hit);
            if (idx >= 0) labelEls[idx].classList.add("is-hovered");
        }
    }
});

canvas.addEventListener("pointerleave", () => {
    pointerDown = false;
    clearHover();
});

canvas.addEventListener("pointerdown", (event) => {
    pointerDown = true;
    dragMoved = false;
    pointerStart.x = event.clientX;
    pointerStart.y = event.clientY;
});

canvas.addEventListener("pointerup", (event) => {
    pointerDown = false;
    if (dragMoved) {
        dragMoved = false;
        return;
    }
    const hit = pickBody(event.clientX, event.clientY);
    if (hit) navigateTo(hit.spec.slug);
});

labelEls.forEach((el) => {
    el.addEventListener("click", () => navigateTo(el.dataset.slug));
});

window.addEventListener("resize", resize);
resize();

let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    entries.forEach((entry) => {
        const spin = axialSpeed(entry.spec.name) * delta;
        entry.mesh.rotation.y += spin;
        if (entry.group.userData.clouds) {
            entry.group.userData.clouds.rotation.y += spin * 1.08;
        }
    });

    positionLabels();
    renderer.render(scene, camera);
}

animate();
