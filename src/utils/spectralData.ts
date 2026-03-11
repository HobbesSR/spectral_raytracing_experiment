export const wavelengths = Array.from({ length: 81 }, (_, i) => 380 + i * 5);

export const ledData = wavelengths.map((w) => ({
  wavelength: w,
  red: Math.exp(-Math.pow(w - 630, 2) / 200),
  green: Math.exp(-Math.pow(w - 530, 2) / 200),
  blue: Math.exp(-Math.pow(w - 460, 2) / 200),
  cyan: Math.exp(-Math.pow(w - 490, 2) / 50),
  amber: Math.exp(-Math.pow(w - 590, 2) / 50),
}));

export const metamerData = wavelengths.map((w) => {
  const base = 0.5 + 0.3 * Math.sin((w - 400) / 100);
  return {
    wavelength: w,
    spectrumA: base,
    spectrumB: Math.max(0, Math.min(1, base + 0.2 * Math.sin((w - 400) / 15))),
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
    film400nm: 0.5 + 0.5 * Math.cos((4 * Math.PI * nd1) / w),
    film600nm: 0.5 + 0.5 * Math.cos((4 * Math.PI * nd2) / w),
  };
});
