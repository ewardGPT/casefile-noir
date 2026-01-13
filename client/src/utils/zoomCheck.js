export function zoomCheck(scene, opts = {}) {
    const {
        expected = null,     // number or null
        min = null,          // number or null
        max = null,          // number or null
        label = "CameraZoom",
        tolerance = 0.03,
    } = opts;

    if (!scene?.cameras?.main) {
        console.warn(`[${label}] No main camera found.`);
        return false;
    }

    const cam = scene.cameras.main;
    const z = cam.zoom;

    const okRange =
        (min == null || z >= min) &&
        (max == null || z <= max);

    const okExpected =
        expected == null || Math.abs(z - expected) <= tolerance;

    const ok = okRange && okExpected;

    const msg =
        `[${label}] zoom=${z.toFixed(3)} ` +
        `(expected=${expected ?? "n/a"}, min=${min ?? "n/a"}, max=${max ?? "n/a"})`;

    if (ok) {
        console.log("✅ " + msg);
    } else {
        console.warn("❌ " + msg);
    }

    return ok;
}
