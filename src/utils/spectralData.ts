export const wavelengths = Array.from({ length: 81 }, (_, i) => 380 + i * 5);

// Standard CIE 1931 2-deg color matching functions (approximate analytical fit)
export function getXYZ(wavelength: number) {
  const x =
    1.056 * Math.exp(-0.5 * Math.pow((wavelength - 599.8) / 37.9, 2)) +
    0.362 * Math.exp(-0.5 * Math.pow((wavelength - 442.0) / 16.0, 2)) -
    0.065 * Math.exp(-0.5 * Math.pow((wavelength - 501.1) / 20.4, 2));
  const y =
    0.821 * Math.exp(-0.5 * Math.pow((wavelength - 568.8) / 46.9, 2)) +
    0.286 * Math.exp(-0.5 * Math.pow((wavelength - 530.9) / 16.3, 2));
  const z =
    1.217 * Math.exp(-0.5 * Math.pow((wavelength - 437.0) / 11.8, 2)) +
    0.681 * Math.exp(-0.5 * Math.pow((wavelength - 459.0) / 26.0, 2));
  return { x, y, z };
}

// Convert XYZ to linear sRGB
export function xyzToRgb(x: number, y: number, z: number) {
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return { r, g, b };
}

// Integrate a spectrum to RGB
export function spectrumToRgb(spectrum: (w: number) => number) {
  let X = 0, Y = 0, Z = 0;
  for (const w of wavelengths) {
    const val = spectrum(w);
    const cmf = getXYZ(w);
    X += val * cmf.x;
    Y += val * cmf.y;
    Z += val * cmf.z;
  }
  // Normalize by integral of Y (approx)
  const norm = 1 / 106.8; 
  return xyzToRgb(X * norm, Y * norm, Z * norm);
}

const N_BASIS = 12;
const WAVELENGTH_MIN = 380;
const WAVELENGTH_RANGE = 400;

// Precompute orthogonal basis constants for the discrete wavelength domain
const BASIS_NORMS = Array.from({ length: N_BASIS }, (_, k) => {
  return wavelengths.reduce((sum, w) => {
    const bk = Math.cos((k * Math.PI * (w - WAVELENGTH_MIN)) / WAVELENGTH_RANGE);
    return sum + bk * bk;
  }, 0);
});

// N-term discrete cosine basis
export function projectToBasis(spectrum: (w: number) => number) {
  const coeffs = new Array(N_BASIS).fill(0);
  for (const w of wavelengths) {
    const val = spectrum(w);
    for (let k = 0; k < N_BASIS; k++) {
      const bk = Math.cos((k * Math.PI * (w - WAVELENGTH_MIN)) / WAVELENGTH_RANGE);
      coeffs[k] += val * bk;
    }
  }
  return coeffs.map((c, k) => c / BASIS_NORMS[k]);
}

// ... existing imports/code ...

export function reconstructFromBasis(coeffs: number[], w: number) {
  let sum = 0;
  for (let k = 0; k < coeffs.length; k++) {
    const bk = Math.cos((k * Math.PI * (w - WAVELENGTH_MIN)) / WAVELENGTH_RANGE);
    sum += coeffs[k] * bk;
  }
  return sum;
}

// --- 1D Path Tracer for Variance Comparison ---

// A simple 1D path (e.g., Light -> Bounce 1 -> Bounce 2 -> Camera)
// We define the spectral reflectance at each bounce.
export type PathNode = (w: number) => number;

// 1. Hero Wavelength Sampling
// Picks a random wavelength, evaluates the path throughput for that wavelength,
// and multiplies by the CMF for that wavelength.
// Returns a single RGB sample.
export function sampleHeroWavelength(path: PathNode[], light: (w: number) => number): { r: number, g: number, b: number } {
  // Pick a random wavelength uniformly from the visible spectrum
  const w = WAVELENGTH_MIN + Math.random() * WAVELENGTH_RANGE;
  
  // Evaluate path throughput at this wavelength
  let throughput = light(w);
  for (const node of path) {
    throughput *= node(w);
  }
  
  // Multiply by CMF and PDF (PDF = 1 / WAVELENGTH_RANGE)
  const cmf = getXYZ(w);
  const pdf = 1 / WAVELENGTH_RANGE;
  const X = (throughput * cmf.x) / pdf;
  const Y = (throughput * cmf.y) / pdf;
  const Z = (throughput * cmf.z) / pdf;
  
  const norm = 1 / 106.8;
  return xyzToRgb(X * norm, Y * norm, Z * norm);
}

// 2. Multiscale Spectral (Basis) Transport
// Projects each node into the basis, multiplies the basis coefficients (crude spectral product),
// and integrates the final reconstructed spectrum.
// Returns a single RGB sample (deterministic for a fixed path).
export function sampleBasisTransport(path: PathNode[], light: (w: number) => number): { r: number, g: number, b: number } {
  // In a real renderer, the spatial path would be sampled stochastically.
  // Here, the path is fixed, so the basis transport is deterministic.
  
  let currentCoeffs = projectToBasis(light);
  
  for (const node of path) {
    const nodeCoeffs = projectToBasis(node);
    // Multiply reconstructed spectra and project back (spectral product in basis space)
    // For a cosine basis, this could be done analytically, but we'll do it numerically for simplicity
    const productSpectrum = (w: number) => {
      return Math.max(0, reconstructFromBasis(currentCoeffs, w)) * Math.max(0, reconstructFromBasis(nodeCoeffs, w));
    };
    currentCoeffs = projectToBasis(productSpectrum);
  }
  
  const finalSpectrum = (w: number) => Math.max(0, reconstructFromBasis(currentCoeffs, w));
  return spectrumToRgb(finalSpectrum);
}

// 3. Ground Truth
// Numerically integrates the exact path throughput over all wavelengths.
export function computeGroundTruthPath(path: PathNode[], light: (w: number) => number): { r: number, g: number, b: number } {
  const finalSpectrum = (w: number) => {
    let throughput = light(w);
    for (const node of path) {
      throughput *= node(w);
    }
    return throughput;
  };
  return spectrumToRgb(finalSpectrum);
}

export const ledData = wavelengths.map((w) => ({
// ... rest of existing code ...
  wavelength: w,
  red: Math.exp(-Math.pow(w - 630, 2) / 200),
  green: Math.exp(-Math.pow(w - 530, 2) / 200),
  blue: Math.exp(-Math.pow(w - 460, 2) / 200),
  cyan: Math.exp(-Math.pow(w - 490, 2) / 50),
  amber: Math.exp(-Math.pow(w - 590, 2) / 50),
}));

export const metamerData = wavelengths.map((w) => {
  const baseA = 0.5;
  const baseB = 0.5 + 0.4 * Math.sin((w - 400) / 30);
  
  return {
    wavelength: w,
    spectrumA: baseA,
    spectrumB: Math.max(0, Math.min(1, baseB)),
  };
});

export const glassData = wavelengths.map((w) => {
  const blue = Math.max(0.1, 1 - Math.pow((w - 450) / 100, 2));
  const yellow = Math.max(0.1, 1 - Math.pow((w - 580) / 150, 2));
  const red = Math.max(0.1, 1 - Math.pow((w - 650) / 100, 2));
  return {
    wavelength: w,
    blueGlass: blue,
    yellowGlass: yellow,
    redGlass: red,
    stack: blue * yellow * red,
  };
});

export const prismData = wavelengths.map((w) => ({
  wavelength: w,
  refractiveIndex: 1.5 + 20000 / Math.pow(w, 2),
}));

export const fogData = wavelengths.map((w) => ({
  wavelength: w,
  scattering: 1e11 / Math.pow(w, 4),
  absorption: 0.1 + 0.8 * Math.exp(-Math.pow(w - 600, 2) / 5000),
}));

export const thinFilmData = wavelengths.map((w) => {
  const nd1 = 400; // Optical thickness 400nm
  const nd2 = 600; // Optical thickness 600nm
  return {
    wavelength: w,
    // Corrected formula: 2 * pi * nd / lambda
    film400nm: 0.5 + 0.5 * Math.cos((2 * Math.PI * nd1) / w),
    film600nm: 0.5 + 0.5 * Math.cos((2 * Math.PI * nd2) / w),
  };
});
