/**
 * Moon system data and 3D helpers — named major moons + instanced bulk swarms.
 * Counts reflect NASA/JPL confirmed totals (2024): Jupiter 95, Saturn 146, Uranus 28, Neptune 16.
 */

export const MOON_COUNTS = {
    Earth: 1,
    Mars: 2,
    Jupiter: 95,
    Saturn: 146,
    Uranus: 28,
    Neptune: 16,
};

/** Hero-scene named moons (compact orbits). */
export const HERO_NAMED_MOONS = {
    Earth: [{ name: "Moon", radius: 0.14, orbit: 1.35, speed: 0.09, color: 0xb8b8b8, texture: "2k_moon.jpg" }],
    Mars: [
        { name: "Phobos", radius: 0.045, orbit: 0.62, speed: 0.16, color: 0x8a7560 },
        { name: "Deimos", radius: 0.035, orbit: 0.82, speed: 0.12, color: 0x7a6550 },
    ],
    Jupiter: [
        { name: "Io", radius: 0.11, orbit: 2.35, speed: 0.065, color: 0xddb044 },
        { name: "Europa", radius: 0.1, orbit: 2.75, speed: 0.055, color: 0xc8dae8 },
        { name: "Ganymede", radius: 0.13, orbit: 3.15, speed: 0.048, color: 0x998877 },
        { name: "Callisto", radius: 0.12, orbit: 3.65, speed: 0.042, color: 0x665544 },
        { name: "Amalthea", radius: 0.04, orbit: 1.55, speed: 0.08, color: 0xaa5533 },
        { name: "Himalia", radius: 0.045, orbit: 4.2, speed: 0.018, color: 0x887766 },
    ],
    Saturn: [
        { name: "Mimas", radius: 0.04, orbit: 1.55, speed: 0.072, color: 0xcccccc },
        { name: "Enceladus", radius: 0.055, orbit: 1.85, speed: 0.058, color: 0xeeeeee },
        { name: "Tethys", radius: 0.05, orbit: 2.0, speed: 0.054, color: 0xbbbbbb },
        { name: "Dione", radius: 0.052, orbit: 2.2, speed: 0.05, color: 0xaaaacc },
        { name: "Rhea", radius: 0.065, orbit: 2.15, speed: 0.052, color: 0xaaa899 },
        { name: "Titan", radius: 0.12, orbit: 2.5, speed: 0.046, color: 0xcc9944 },
        { name: "Iapetus", radius: 0.06, orbit: 2.85, speed: 0.038, color: 0x887755 },
        { name: "Hyperion", radius: 0.035, orbit: 3.1, speed: 0.032, color: 0x998877 },
        { name: "Phoebe", radius: 0.032, orbit: 3.6, speed: 0.022, color: 0x554433 },
    ],
    Uranus: [
        { name: "Miranda", radius: 0.045, orbit: 1.25, speed: 0.062, color: 0x8899aa },
        { name: "Ariel", radius: 0.05, orbit: 1.38, speed: 0.056, color: 0x99aabb },
        { name: "Umbriel", radius: 0.05, orbit: 1.48, speed: 0.052, color: 0x667788 },
        { name: "Titania", radius: 0.075, orbit: 1.55, speed: 0.052, color: 0x99aabb },
        { name: "Oberon", radius: 0.07, orbit: 1.95, speed: 0.044, color: 0x8899aa },
    ],
    Neptune: [
        { name: "Proteus", radius: 0.04, orbit: 1.35, speed: 0.055, color: 0x777788 },
        { name: "Triton", radius: 0.095, orbit: 1.65, speed: 0.05, color: 0xbbccdd, retrograde: true },
        { name: "Nereid", radius: 0.03, orbit: 2.8, speed: 0.012, color: 0x889999 },
    ],
};

/** Detail-page named moons (larger orbits for close-up view). */
export const DETAIL_NAMED_MOONS = {
    Earth: [{ name: "Moon", radius: 0.18, orbit: 1.55, speed: 0.55, color: 0xb8b8b8, texture: "2k_moon.jpg" }],
    Mars: [
        { name: "Phobos", radius: 0.06, orbit: 1.05, speed: 1.2, color: 0x8a7560 },
        { name: "Deimos", radius: 0.045, orbit: 1.35, speed: 0.85, color: 0x7a6550 },
    ],
    Jupiter: [
        { name: "Io", radius: 0.14, orbit: 2.1, speed: 0.7, color: 0xddb044 },
        { name: "Europa", radius: 0.12, orbit: 2.45, speed: 0.58, color: 0xc8dae8 },
        { name: "Ganymede", radius: 0.16, orbit: 2.85, speed: 0.48, color: 0x998877 },
        { name: "Callisto", radius: 0.14, orbit: 3.35, speed: 0.4, color: 0x665544 },
        { name: "Amalthea", radius: 0.05, orbit: 1.55, speed: 0.95, color: 0xaa5533 },
        { name: "Himalia", radius: 0.04, orbit: 3.85, speed: 0.22, color: 0x887766 },
    ],
    Saturn: [
        { name: "Mimas", radius: 0.045, orbit: 1.45, speed: 0.82, color: 0xcccccc },
        { name: "Enceladus", radius: 0.07, orbit: 1.75, speed: 0.65, color: 0xeeeeee },
        { name: "Tethys", radius: 0.065, orbit: 1.95, speed: 0.58, color: 0xbbbbbb },
        { name: "Dione", radius: 0.07, orbit: 2.15, speed: 0.52, color: 0xaaaacc },
        { name: "Rhea", radius: 0.085, orbit: 2.45, speed: 0.44, color: 0xaaa899 },
        { name: "Titan", radius: 0.15, orbit: 2.85, speed: 0.42, color: 0xcc9944 },
        { name: "Iapetus", radius: 0.075, orbit: 3.25, speed: 0.32, color: 0x887755 },
        { name: "Hyperion", radius: 0.04, orbit: 3.55, speed: 0.28, color: 0x998877 },
        { name: "Phoebe", radius: 0.035, orbit: 3.95, speed: 0.18, color: 0x554433 },
    ],
    Uranus: [
        { name: "Miranda", radius: 0.055, orbit: 1.35, speed: 0.62, color: 0x8899aa },
        { name: "Ariel", radius: 0.065, orbit: 1.5, speed: 0.56, color: 0x99aabb },
        { name: "Umbriel", radius: 0.065, orbit: 1.65, speed: 0.52, color: 0x667788 },
        { name: "Titania", radius: 0.09, orbit: 1.85, speed: 0.48, color: 0x99aabb },
        { name: "Oberon", radius: 0.085, orbit: 2.15, speed: 0.42, color: 0x8899aa },
    ],
    Neptune: [
        { name: "Proteus", radius: 0.055, orbit: 1.35, speed: 0.55, color: 0x777788 },
        { name: "Triton", radius: 0.11, orbit: 1.7, speed: 0.38, color: 0xbbccdd, retrograde: true },
        { name: "Nereid", radius: 0.035, orbit: 2.45, speed: 0.15, color: 0x889999 },
    ],
};

export const HERO_BULK_ZONES = {
    Jupiter: [
        { count: 16, inner: 1.25, outer: 1.5, size: 0.012, speed: 0.09, retrograde: false },
        { count: 18, inner: 3.8, outer: 4.8, size: 0.01, speed: 0.025, retrograde: false },
        { count: 55, inner: 4.9, outer: 6.2, size: 0.009, speed: 0.012, retrograde: true },
    ],
    Saturn: [
        { count: 20, inner: 1.35, outer: 1.52, size: 0.01, speed: 0.07, retrograde: false },
        { count: 35, inner: 3.0, outer: 3.5, size: 0.009, speed: 0.035, retrograde: false },
        { count: 82, inner: 3.7, outer: 5.5, size: 0.008, speed: 0.015, retrograde: true },
    ],
    Uranus: [
        { count: 8, inner: 1.05, outer: 1.22, size: 0.01, speed: 0.07, retrograde: false },
        { count: 15, inner: 2.2, outer: 3.2, size: 0.009, speed: 0.008, retrograde: true },
    ],
    Neptune: [
        { count: 10, inner: 1.15, outer: 1.32, size: 0.01, speed: 0.06, retrograde: false },
        { count: 3, inner: 2.6, outer: 3.4, size: 0.009, speed: 0.01, retrograde: true },
    ],
};

export const DETAIL_BULK_ZONES = {
    Jupiter: [
        { count: 16, inner: 1.25, outer: 1.48, size: 0.018, speed: 1.1, retrograde: false },
        { count: 18, inner: 3.5, outer: 4.2, size: 0.014, speed: 0.28, retrograde: false },
        { count: 55, inner: 4.3, outer: 5.5, size: 0.012, speed: 0.12, retrograde: true },
    ],
    Saturn: [
        { count: 20, inner: 1.3, outer: 1.42, size: 0.016, speed: 0.9, retrograde: false },
        { count: 35, inner: 2.9, outer: 3.3, size: 0.014, speed: 0.38, retrograde: false },
        { count: 82, inner: 3.6, outer: 5.0, size: 0.012, speed: 0.14, retrograde: true },
    ],
    Uranus: [
        { count: 8, inner: 1.1, outer: 1.28, size: 0.016, speed: 0.75, retrograde: false },
        { count: 15, inner: 2.0, outer: 2.8, size: 0.014, speed: 0.06, retrograde: true },
    ],
    Neptune: [
        { count: 10, inner: 1.1, outer: 1.28, size: 0.016, speed: 0.65, retrograde: false },
        { count: 3, inner: 2.2, outer: 2.9, size: 0.014, speed: 0.08, retrograde: true },
    ],
};

export function createNamedMoons(planetMesh, moonDefs, THREE, loadTexture, textureBase) {
    return moonDefs.map((moonData) => {
        const pivot = new THREE.Object3D();
        planetMesh.add(pivot);

        const material = new THREE.MeshStandardMaterial({
            color: moonData.color,
            roughness: 0.92,
            metalness: 0.02,
            emissive: moonData.color,
            emissiveIntensity: moonData.texture ? 0.06 : 0.12,
        });
        if (moonData.texture) {
            material.map = loadTexture(`${textureBase}${moonData.texture}`);
        }

        const moon = new THREE.Mesh(new THREE.SphereGeometry(moonData.radius, 20, 20), material);
        moon.position.x = moonData.orbit;
        pivot.add(moon);

        return {
            pivot,
            moon,
            speed: moonData.speed,
            angle: Math.random() * Math.PI * 2,
            name: moonData.name,
            retrograde: Boolean(moonData.retrograde),
        };
    });
}

export function createBulkMoonSwarms(planetMesh, zones, THREE) {
    const swarms = [];
    if (!zones?.length) return swarms;

    const geometry = new THREE.SphereGeometry(1, 6, 6);
    const material = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.95,
        metalness: 0.02,
        emissive: 0x333344,
        emissiveIntensity: 0.08,
    });

    zones.forEach((zone) => {
        const instanced = new THREE.InstancedMesh(geometry, material, zone.count);
        const dummy = new THREE.Object3D();
        const states = [];

        for (let i = 0; i < zone.count; i += 1) {
            const orbit = zone.inner + Math.random() * (zone.outer - zone.inner);
            const angle = Math.random() * Math.PI * 2;
            const incline = (Math.random() - 0.5) * 0.35;
            const size = zone.size * (0.65 + Math.random() * 0.7);
            const speed = zone.speed * (0.75 + Math.random() * 0.5);

            dummy.position.set(Math.cos(angle) * orbit, Math.sin(incline) * orbit * 0.08, Math.sin(angle) * orbit);
            dummy.scale.setScalar(size);
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);

            states.push({ angle, orbit, incline, size, speed, retrograde: Boolean(zone.retrograde) });
        }

        instanced.instanceMatrix.needsUpdate = true;
        planetMesh.add(instanced);
        swarms.push({ mesh: instanced, states });
    });

    return swarms;
}

export function animateBulkMoonSwarms(swarms, delta, THREE, speedFactor = 1) {
    const dummy = new THREE.Object3D();
    swarms.forEach(({ mesh, states }) => {
        states.forEach((state, i) => {
            const dir = state.retrograde ? -1 : 1;
            state.angle += state.speed * delta * speedFactor * dir;
            dummy.position.set(
                Math.cos(state.angle) * state.orbit,
                Math.sin(state.incline) * state.orbit * 0.08,
                Math.sin(state.angle) * state.orbit,
            );
            dummy.scale.setScalar(state.size);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    });
}
