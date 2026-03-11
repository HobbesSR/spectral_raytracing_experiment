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

// Simple 3-component basis (e.g., low-frequency polynomials or cosines)
export function projectToBasis(spectrum: (w: number) => number) {
  let c0 = 0, c1 = 0, c2 = 0;
  for (const w of wavelengths) {
    const val = spectrum(w);
    // Basis 0: flat
    c0 += val;
    // Basis 1: linear slope
    c1 += val * ((w - 580) / 200);
    // Basis 2: quadratic curve
    c2 += val * (Math.pow((w - 580) / 200, 2) - 0.5);
  }
  return [c0 / wavelengths.length, c1 / wavelengths.length, c2 / wavelengths.length];
}

export function reconstructFromBasis(coeffs: number[], w: number) {
  const b0 = 1;
  const b1 = (w - 580) / 200;
  const b2 = Math.pow((w - 580) / 200, 2) - 0.5;
  return coeffs[0] * b0 + coeffs[1] * b1 + coeffs[2] * b2;
}

export const ledData = wavelengths.map((w) => ({
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
