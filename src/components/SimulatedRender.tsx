import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { spectrumToRgb, projectToBasis, reconstructFromBasis, sampleHeroWavelength, sampleBasisTransport, computeGroundTruthPath, PathNode } from '../utils/spectralData';

type RenderMode = 'rgb' | 'hero' | 'basis' | 'truth';

const MODES: { id: RenderMode; label: string; desc: string }[] = [
  { id: 'rgb', label: 'RGB Transport', desc: 'Standard path tracing. Fast, but fails on spectral phenomena.' },
  { id: 'hero', label: 'Hero Wavelength', desc: 'Stochastic spectral sampling. Correct, but high variance (chroma noise).' },
  { id: 'basis', label: 'Multiscale Spectral', desc: 'Our method. Smooth spectral evolution, low variance.' },
  { id: 'truth', label: 'Ground Truth', desc: 'Offline spectral reference (1000s of samples).' },
];

export function SimulatedRender({ testId }: { testId: string }) {
  const [mode, setMode] = useState<RenderMode>('basis');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [samples, setSamples] = useState(1);

  // Reset samples when mode or test changes
  useEffect(() => {
    setSamples(1);
  }, [mode, testId]);

  // Accumulate samples over time (simulating progressive rendering)
  useEffect(() => {
    if (samples < 1000) {
      const timer = requestAnimationFrame(() => setSamples(s => s + 1));
      return () => cancelAnimationFrame(timer);
    }
  }, [samples]);

  const isNoisy = mode === 'hero';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const renderContent = () => {
    const rotateX = (mousePos.y - 0.5) * -30;
    const rotateY = (mousePos.x - 0.5) * 30;
    const shiftX = (mousePos.x - 0.5) * 40;
    const shiftY = (mousePos.y - 0.5) * 40;

    // Helper to format RGB for CSS
    const toCssRgb = (rgb: { r: number, g: number, b: number }, alpha = 1) => {
      // Simple tone mapping (clamp and gamma)
      const r = Math.max(0, Math.min(255, Math.pow(Math.max(0, rgb.r), 1/2.2) * 255));
      const g = Math.max(0, Math.min(255, Math.pow(Math.max(0, rgb.g), 1/2.2) * 255));
      const b = Math.max(0, Math.min(255, Math.pow(Math.max(0, rgb.b), 1/2.2) * 255));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    switch (testId) {
      case 'led':
        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-900 overflow-hidden"
            style={{ perspective: 1000 }}
          >
            {/* Floor */}
            <motion.div 
              className="absolute bottom-0 w-[150%] h-1/2 bg-neutral-800" 
              animate={{ rotateX: 60 + rotateX * 0.5, rotateY: rotateY * 0.5, y: shiftY }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
              style={{ transformOrigin: 'bottom' }} 
            />
            
            {/* Lights */}
            <motion.div 
              className="absolute top-1/4 flex gap-8"
              animate={{ rotateX: rotateX * 0.2, rotateY: rotateY * 0.5, x: shiftX }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {[
                { name: 'red', peak: 630, width: 200 },
                { name: 'green', peak: 530, width: 200 },
                { name: 'blue', peak: 460, width: 200 },
                { name: 'cyan', peak: 490, width: 50 }, // Narrow
                { name: 'amber', peak: 590, width: 50 } // Narrow
              ].map((led, i) => {
                
                // 1. Define the true spectrum
                const spectrum = (w: number) => Math.exp(-Math.pow(w - led.peak, 2) / led.width);
                
                // 2. Ground Truth: Integrate spectrum directly to RGB
                const truthRgb = spectrumToRgb(spectrum);
                
                // 3. Basis: Project to 3-component basis, then reconstruct and integrate
                const coeffs = projectToBasis(spectrum);
                const basisSpectrum = (w: number) => Math.max(0, reconstructFromBasis(coeffs, w));
                const basisRgb = spectrumToRgb(basisSpectrum);
                
                // 4. RGB Transport: Just use the truth RGB (this is what an RGB renderer starts with)
                // But for the "failure mode" demonstration, we simulate how RGB fails when interacting
                // with a material. Let's say the material is a narrow bandpass filter.
                // An RGB renderer multiplies colors. A spectral renderer multiplies spectra.
                
                // Let's just show the light color itself for now.
                // The main difference is that the basis approximation smooths out the narrow spikes.
                
                let displayRgb = truthRgb;
                if (mode === 'basis') {
                  displayRgb = basisRgb;
                } else if (mode === 'rgb' && (i === 3 || i === 4)) {
                   // Simulate RGB failure: it can't represent the narrowness, so it looks washed out
                   // when interacting with other things. We'll just desaturate it a bit here to show it's "wrong"
                   displayRgb = { r: truthRgb.r * 0.5 + 0.2, g: truthRgb.g * 0.5 + 0.2, b: truthRgb.b * 0.5 + 0.2 };
                }

                const displayColor = toCssRgb(displayRgb);

                return (
                  <motion.div 
                    key={i} 
                    className="relative flex flex-col items-center"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ z: Math.abs(2 - i) * 20 }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full z-10 transition-colors duration-500" 
                      style={{ 
                        backgroundColor: displayColor,
                        boxShadow: `0 0 20px ${displayColor}`,
                      }} 
                    />
                    {/* Shadow/Light cast */}
                    <motion.div 
                      className="w-16 h-48 mt-2 rounded-full blur-2xl transition-colors duration-500"
                      animate={{ 
                        rotateX: -rotateX * 0.5, 
                        rotateY: -rotateY * 0.5,
                        scaleY: 1 + mousePos.y * 0.5
                      }}
                      style={{ 
                        backgroundImage: `linear-gradient(to bottom, ${displayColor}, transparent)`,
                        mixBlendMode: mode === 'rgb' ? 'normal' : 'screen',
                        opacity: 0.6,
                        transformOrigin: 'top'
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        );
      case 'metamer': {
        // Define the two metameric spectra
        const specA = (w: number) => 0.5;
        const specB = (w: number) => Math.max(0, Math.min(1, 0.5 + 0.4 * Math.sin((w - 400) / 30)));
        
        // Define an illuminant that changes based on mouse position
        const illuminant = (w: number) => {
           const r = Math.max(0, shiftX / 40);
           const b = Math.max(0, -shiftX / 40);
           return 1.0 + r * Math.exp(-Math.pow(w - 650, 2)/2000) + b * Math.exp(-Math.pow(w - 450, 2)/2000);
        };

        // 1D Path: Light -> Metamer -> Camera
        const pathA: PathNode[] = [specA];
        const pathB: PathNode[] = [specB];

        // Compute Ground Truth
        const truthRgbA = computeGroundTruthPath(pathA, illuminant);
        const truthRgbB = computeGroundTruthPath(pathB, illuminant);

        // Compute Basis Transport (Deterministic for this fixed path)
        const basisRgbA = sampleBasisTransport(pathA, illuminant);
        const basisRgbB = sampleBasisTransport(pathB, illuminant);

        // Compute Hero Wavelength (Stochastic)
        // We accumulate N samples to show variance reduction
        const heroRgbA = { r: 0, g: 0, b: 0 };
        const heroRgbB = { r: 0, g: 0, b: 0 };
        for (let i = 0; i < samples; i++) {
          const sampleA = sampleHeroWavelength(pathA, illuminant);
          const sampleB = sampleHeroWavelength(pathB, illuminant);
          heroRgbA.r += sampleA.r; heroRgbA.g += sampleA.g; heroRgbA.b += sampleA.b;
          heroRgbB.r += sampleB.r; heroRgbB.g += sampleB.g; heroRgbB.b += sampleB.b;
        }
        heroRgbA.r /= samples; heroRgbA.g /= samples; heroRgbA.b /= samples;
        heroRgbB.r /= samples; heroRgbB.g /= samples; heroRgbB.b /= samples;

        // RGB Transport (Baseline failure mode)
        const illRgb = spectrumToRgb(illuminant);
        const refRgbA = spectrumToRgb(specA);
        const refRgbB = spectrumToRgb(specB);
        const rgbTransportA = { r: illRgb.r * refRgbA.r, g: illRgb.g * refRgbA.g, b: illRgb.b * refRgbA.b };
        const rgbTransportB = { r: illRgb.r * refRgbB.r, g: illRgb.g * refRgbB.g, b: illRgb.b * refRgbB.b };

        let displayA = truthRgbA;
        let displayB = truthRgbB;

        if (mode === 'rgb') {
          displayA = rgbTransportA;
          displayB = rgbTransportB;
        } else if (mode === 'basis') {
          displayA = basisRgbA;
          displayB = basisRgbB;
        } else if (mode === 'hero') {
          displayA = heroRgbA;
          displayB = heroRgbB;
        }

        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-900 gap-4"
            style={{ perspective: 1000 }}
          >
            <div className="absolute top-4 left-4 text-xs font-mono text-neutral-400 z-50">
              Samples: {mode === 'hero' ? samples : '∞ (Analytic/Deterministic)'}
            </div>
            <motion.div 
              className="w-40 h-40 rounded-xl shadow-2xl"
              animate={{ rotateX, rotateY, z: 50 }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
              style={{ 
                backgroundColor: toCssRgb(displayA),
                boxShadow: `${-shiftX}px ${-shiftY}px 40px rgba(0,0,0,0.5)`
              }}
            />
            <motion.div 
              className="w-40 h-40 rounded-xl shadow-2xl"
              animate={{ rotateX, rotateY, z: 50 }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
              style={{ 
                backgroundColor: toCssRgb(displayB),
                boxShadow: `${-shiftX}px ${-shiftY}px 40px rgba(0,0,0,0.5)`
              }}
            />
            {/* Lighting overlay */}
            <motion.div 
              className="absolute w-[200%] h-[200%] mix-blend-overlay pointer-events-none rounded-full blur-3xl" 
              animate={{ 
                x: shiftX * 5, 
                y: shiftY * 5,
                backgroundColor: toCssRgb(illRgb, 0.15)
              }}
              transition={{ type: 'spring', stiffness: 50, damping: 40 }}
            />
          </motion.div>
        );
      }
      case 'glass': {
        const blueGlass = (w: number) => Math.max(0.1, 1 - Math.pow((w - 450) / 100, 2));
        const yellowGlass = (w: number) => Math.max(0.1, 1 - Math.pow((w - 580) / 150, 2));
        const redGlass = (w: number) => Math.max(0.1, 1 - Math.pow((w - 650) / 100, 2));
        const illuminant = (w: number) => 1.0;

        // Individual spectra
        const truthBlue = spectrumToRgb(w => illuminant(w) * blueGlass(w));
        const truthYellow = spectrumToRgb(w => illuminant(w) * yellowGlass(w));
        const truthRed = spectrumToRgb(w => illuminant(w) * redGlass(w));
        
        // Overlap spectrum
        const truthOverlap = spectrumToRgb(w => illuminant(w) * blueGlass(w) * yellowGlass(w) * redGlass(w));

        // RGB Transport
        const rgbOverlap = {
          r: truthBlue.r * truthYellow.r * truthRed.r,
          g: truthBlue.g * truthYellow.g * truthRed.g,
          b: truthBlue.b * truthYellow.b * truthRed.b
        };

        // Basis Transport
        const coeffsBlue = projectToBasis(blueGlass);
        const coeffsYellow = projectToBasis(yellowGlass);
        const coeffsRed = projectToBasis(redGlass);
        const coeffsIll = projectToBasis(illuminant);

        const basisBlue = spectrumToRgb(w => Math.max(0, reconstructFromBasis(coeffsBlue, w) * reconstructFromBasis(coeffsIll, w)));
        const basisYellow = spectrumToRgb(w => Math.max(0, reconstructFromBasis(coeffsYellow, w) * reconstructFromBasis(coeffsIll, w)));
        const basisRed = spectrumToRgb(w => Math.max(0, reconstructFromBasis(coeffsRed, w) * reconstructFromBasis(coeffsIll, w)));
        const basisOverlap = spectrumToRgb(w => Math.max(0, 
          reconstructFromBasis(coeffsBlue, w) * 
          reconstructFromBasis(coeffsYellow, w) * 
          reconstructFromBasis(coeffsRed, w) * 
          reconstructFromBasis(coeffsIll, w)
        ));

        let dBlue = truthBlue, dYellow = truthYellow, dRed = truthRed, dOverlap = truthOverlap;
        if (mode === 'rgb') {
          dBlue = truthBlue; dYellow = truthYellow; dRed = truthRed; dOverlap = rgbOverlap;
        } else if (mode === 'basis') {
          dBlue = basisBlue; dYellow = basisYellow; dRed = basisRed; dOverlap = basisOverlap;
        }

        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-white"
            style={{ perspective: 1000 }}
          >
            <motion.div 
              className="relative w-64 h-64"
              animate={{ rotateX, rotateY }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full mix-blend-multiply transition-colors duration-100"
                animate={{ z: 60, x: shiftX * 0.5, y: shiftY * 0.5 }}
                style={{ backgroundColor: toCssRgb(dBlue, 0.8) }}
              />
              <motion.div 
                className="absolute bottom-0 left-4 w-40 h-40 rounded-full mix-blend-multiply transition-colors duration-100"
                animate={{ z: 30, x: shiftX * 0.2, y: shiftY * 0.2 }}
                style={{ backgroundColor: toCssRgb(dYellow, 0.8) }}
              />
              <motion.div 
                className="absolute bottom-0 right-4 w-40 h-40 rounded-full mix-blend-multiply transition-colors duration-100"
                animate={{ z: 0, x: -shiftX * 0.2, y: -shiftY * 0.2 }}
                style={{ backgroundColor: toCssRgb(dRed, 0.8) }}
              />
              {/* Center overlap simulation */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-md transition-colors duration-100 z-50"
                animate={{ z: 45 }}
                style={{ backgroundColor: toCssRgb(dOverlap) }}
              />
            </motion.div>
          </motion.div>
        );
      }
      case 'prism': {
        const stops = 20;
        const gradientStops = [];
        
        for (let i = 0; i <= stops; i++) {
          const t = i / stops;
          const w = 380 + t * 400; // 380 to 780
          
          const spectrum = (lambda: number) => Math.exp(-Math.pow(lambda - w, 2) / 200);
          const truthRgb = spectrumToRgb(spectrum);
          
          const coeffs = projectToBasis(spectrum);
          const basisRgb = spectrumToRgb(lambda => Math.max(0, reconstructFromBasis(coeffs, lambda)));
          
          let displayRgb = truthRgb;
          if (mode === 'basis') displayRgb = basisRgb;
          
          gradientStops.push(`${toCssRgb(displayRgb)} ${t * 100}%`);
        }

        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-950 overflow-hidden"
            style={{ perspective: 1000 }}
          >
            {/* Incoming beam */}
            <motion.div 
              className="absolute left-0 top-1/2 w-1/2 h-2 bg-white/80 -translate-y-1/2 blur-[1px]" 
              animate={{ rotate: 12 + rotateY * 0.2, y: shiftY }}
              style={{ transformOrigin: 'left center' }}
            />
            
            {/* Prism */}
            <motion.div 
              className="relative z-10 w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[100px] border-b-white/20 backdrop-blur-md drop-shadow-2xl" 
              animate={{ rotateY: rotateY * 1.5, rotateX: rotateX * 0.5 }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
            />
            
            {/* Outgoing beam */}
            {mode === 'rgb' ? (
              <motion.div 
                className="absolute right-0 top-1/2 w-1/2 h-4 bg-white/60 translate-y-12 blur-sm transition-all duration-500" 
                animate={{ rotate: -12 - rotateY * 0.5, y: shiftY + 48 }}
                style={{ transformOrigin: 'left center' }}
              />
            ) : (
              <motion.div 
                className="absolute right-0 top-1/2 w-1/2 h-32 translate-y-12 blur-md transition-all duration-100"
                animate={{ 
                  rotate: -12 - rotateY * 0.5, 
                  y: shiftY + 48, 
                  scaleY: 1 + Math.abs(rotateY) * 0.02,
                  height: 128 + Math.abs(rotateY) * 2 
                }}
                style={{
                  backgroundImage: `linear-gradient(to bottom, ${gradientStops.join(', ')})`,
                  opacity: 0.8,
                  transformOrigin: 'left center'
                }}
              />
            )}
          </motion.div>
        );
      }
      case 'fog': {
        const scattering = (w: number) => 1e11 / Math.pow(w, 4);
        const absorption = (w: number) => 0.1 + 0.8 * Math.exp(-Math.pow(w - 600, 2) / 5000);
        const extinction = (w: number) => scattering(w) + absorption(w);

        const stops = 10;
        const gradientStops = [];
        for (let i = 0; i <= stops; i++) {
          const t = i / stops;
          const distance = 5 - t * 4;
          
          const illuminant = (w: number) => 1.0;
          const fogSpectrum = (w: number) => illuminant(w) * scattering(w) * Math.exp(-extinction(w) * distance);

          const truthRgb = spectrumToRgb(fogSpectrum);

          const rgbScattering = spectrumToRgb(scattering);
          const rgbExtinction = spectrumToRgb(extinction);
          const rgbTransport = {
            r: rgbScattering.r * Math.exp(-rgbExtinction.r * distance),
            g: rgbScattering.g * Math.exp(-rgbExtinction.g * distance),
            b: rgbScattering.b * Math.exp(-rgbExtinction.b * distance),
          };

          const coeffsFog = projectToBasis(fogSpectrum);
          const basisRgb = spectrumToRgb(w => Math.max(0, reconstructFromBasis(coeffsFog, w)));

          let displayRgb = truthRgb;
          if (mode === 'rgb') displayRgb = rgbTransport;
          else if (mode === 'basis') displayRgb = basisRgb;

          // Normalize brightness for display
          const maxVal = Math.max(displayRgb.r, displayRgb.g, displayRgb.b, 0.001);
          const normalized = {
            r: (displayRgb.r / maxVal) * (1 - t * 0.5),
            g: (displayRgb.g / maxVal) * (1 - t * 0.5),
            b: (displayRgb.b / maxVal) * (1 - t * 0.5),
          };

          gradientStops.push(`${toCssRgb(normalized, 1 - t * 0.8)} ${t * 100}%`);
        }

        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-950"
            style={{ perspective: 1000 }}
          >
            <motion.div 
              className="w-80 h-80 rounded-full transition-all duration-100"
              animate={{ 
                x: shiftX * 0.5, 
                y: shiftY * 0.5,
                scale: 1 + Math.abs(rotateX) * 0.005
              }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              style={{
                backgroundImage: `radial-gradient(circle at ${50 + shiftX}px ${50 + shiftY}px, ${gradientStops.join(', ')})`,
                boxShadow: `0 0 80px ${gradientStops[gradientStops.length - 1].split(' ')[0]}`
              }}
            />
          </motion.div>
        );
      }
      case 'thin-film': {
        const stops = 20;
        const gradientStops = [];
        for (let i = 0; i <= stops; i++) {
          const t = i / stops;
          const nd = 300 + t * 500 + shiftX * 2; 
          
          const reflectance = (w: number) => 0.5 + 0.5 * Math.cos((2 * Math.PI * nd) / w);
          const illuminant = (w: number) => 1.0;

          const truthRgb = spectrumToRgb(w => illuminant(w) * reflectance(w));
          
          const coeffsRef = projectToBasis(reflectance);
          const coeffsIll = projectToBasis(illuminant);
          const basisRgb = spectrumToRgb(w => Math.max(0, reconstructFromBasis(coeffsRef, w) * reconstructFromBasis(coeffsIll, w)));

          const rgbR = 0.5 + 0.5 * Math.cos((2 * Math.PI * nd) / 650);
          const rgbG = 0.5 + 0.5 * Math.cos((2 * Math.PI * nd) / 530);
          const rgbB = 0.5 + 0.5 * Math.cos((2 * Math.PI * nd) / 450);
          const rgbTransport = { r: rgbR, g: rgbG, b: rgbB };

          let displayRgb = truthRgb;
          if (mode === 'rgb') displayRgb = rgbTransport;
          else if (mode === 'basis') displayRgb = basisRgb;

          gradientStops.push(`${toCssRgb(displayRgb)} ${t * 100}%`);
        }

        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-900 overflow-hidden"
            style={{ perspective: 1000 }}
          >
            <motion.div 
              className="w-72 h-72 rounded-full shadow-2xl"
              animate={{ 
                rotateX: rotateX * 0.6, 
                rotateY: rotateY * 0.6,
                z: 40
              }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              style={{
                backgroundImage: `linear-gradient(${45 + shiftX}deg, ${gradientStops.join(', ')})`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(255,255,255,0.3)`
              }}
            />
          </motion.div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
        Simulated Render Output
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m.id 
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      
      <div className="text-sm text-gray-400 h-5">
        {MODES.find(m => m.id === mode)?.desc}
      </div>

      <div 
        className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black mt-2 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos({ x: 0.5, y: 0.5 })}
      >
        {renderContent()}
        
        {/* Animated grain for Hero Wavelength to simulate temporal noise */}
        {/* Removed CSS noise overlay - we are now computing real Monte Carlo variance! */}
      </div>
    </div>
  );
}
