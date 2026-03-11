import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { spectrumToRgb, projectToBasis, reconstructFromBasis } from '../utils/spectralData';

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
      const r = Math.max(0, Math.min(255, Math.pow(rgb.r, 1/2.2) * 255));
      const g = Math.max(0, Math.min(255, Math.pow(rgb.g, 1/2.2) * 255));
      const b = Math.max(0, Math.min(255, Math.pow(rgb.b, 1/2.2) * 255));
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
        // Center: D65-ish (flat). Edges: Colored.
        const illuminant = (w: number) => {
           const r = Math.max(0, shiftX / 40); // Reddish if mouse right
           const b = Math.max(0, -shiftX / 40); // Blueish if mouse left
           return 1.0 + r * Math.exp(-Math.pow(w - 650, 2)/2000) + b * Math.exp(-Math.pow(w - 450, 2)/2000);
        };

        // Calculate reflected spectra
        const reflectedA = (w: number) => specA(w) * illuminant(w);
        const reflectedB = (w: number) => specB(w) * illuminant(w);

        // Ground Truth RGB
        const truthRgbA = spectrumToRgb(reflectedA);
        const truthRgbB = spectrumToRgb(reflectedB);

        // RGB Transport: Multiply RGB of illuminant by RGB of reflectance
        const illRgb = spectrumToRgb(illuminant);
        const refRgbA = spectrumToRgb(specA);
        const refRgbB = spectrumToRgb(specB);
        const rgbTransportA = { r: illRgb.r * refRgbA.r, g: illRgb.g * refRgbA.g, b: illRgb.b * refRgbA.b };
        const rgbTransportB = { r: illRgb.r * refRgbB.r, g: illRgb.g * refRgbB.g, b: illRgb.b * refRgbB.b };

        // Basis Transport
        const coeffsA = projectToBasis(specA);
        const coeffsB = projectToBasis(specB);
        const coeffsIll = projectToBasis(illuminant);
        // Very crude basis multiplication (just multiply coeffs for demo)
        const basisReflectedA = (w: number) => Math.max(0, reconstructFromBasis(coeffsA, w) * reconstructFromBasis(coeffsIll, w));
        const basisReflectedB = (w: number) => Math.max(0, reconstructFromBasis(coeffsB, w) * reconstructFromBasis(coeffsIll, w));
        const basisRgbA = spectrumToRgb(basisReflectedA);
        const basisRgbB = spectrumToRgb(basisReflectedB);

        let displayA = truthRgbA;
        let displayB = truthRgbB;

        if (mode === 'rgb') {
          displayA = rgbTransportA;
          displayB = rgbTransportB;
        } else if (mode === 'basis') {
          displayA = basisRgbA;
          displayB = basisRgbB;
        }

        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-900 gap-4"
            style={{ perspective: 1000 }}
          >
            <motion.div 
              className="w-40 h-40 rounded-xl transition-colors duration-100 shadow-2xl"
              animate={{ rotateX, rotateY, z: 50 }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
              style={{ 
                backgroundColor: toCssRgb(displayA),
                boxShadow: `${-shiftX}px ${-shiftY}px 40px rgba(0,0,0,0.5)`
              }}
            />
            <motion.div 
              className="w-40 h-40 rounded-xl transition-colors duration-100 shadow-2xl"
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
      case 'glass':
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
                className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full mix-blend-multiply transition-colors duration-500"
                animate={{ z: 60, x: shiftX * 0.5, y: shiftY * 0.5 }}
                style={{ backgroundColor: mode === 'rgb' ? 'rgba(0,255,255,0.5)' : (mode === 'basis' ? 'rgba(0,190,240,0.75)' : 'rgba(0,200,255,0.8)') }}
              />
              <motion.div 
                className="absolute bottom-0 left-4 w-40 h-40 rounded-full mix-blend-multiply transition-colors duration-500"
                animate={{ z: 30, x: shiftX * 0.2, y: shiftY * 0.2 }}
                style={{ backgroundColor: mode === 'rgb' ? 'rgba(255,255,0,0.5)' : (mode === 'basis' ? 'rgba(240,190,0,0.75)' : 'rgba(255,200,0,0.8)') }}
              />
              <motion.div 
                className="absolute bottom-0 right-4 w-40 h-40 rounded-full mix-blend-multiply transition-colors duration-500"
                animate={{ z: 0, x: -shiftX * 0.2, y: -shiftY * 0.2 }}
                style={{ backgroundColor: mode === 'rgb' ? 'rgba(255,0,255,0.5)' : (mode === 'basis' ? 'rgba(240,0,90,0.75)' : 'rgba(255,0,100,0.8)') }}
              />
              {/* Center overlap simulation */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full blur-md transition-colors duration-500"
                animate={{ z: 45 }}
                style={{ backgroundColor: mode === 'rgb' ? '#8b7355' : (mode === 'basis' ? '#1a1a1a' : '#000000') }}
              />
            </motion.div>
          </motion.div>
        );
      case 'prism':
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
                className="absolute right-0 top-1/2 w-1/2 h-32 translate-y-12 blur-md transition-all duration-500"
                animate={{ 
                  rotate: -12 - rotateY * 0.5, 
                  y: shiftY + 48, 
                  scaleY: 1 + Math.abs(rotateY) * 0.02,
                  // The spectrum spreads out more as the prism rotates
                  height: 128 + Math.abs(rotateY) * 2 
                }}
                style={{
                  backgroundImage: mode === 'basis' 
                    ? 'linear-gradient(to bottom, #ef4444, #d97706, #22c55e, #0ea5e9, #9333ea)' // Slightly banded/muted for basis
                    : 'linear-gradient(to bottom, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7)', // Perfect spectrum for truth
                  opacity: 0.8,
                  transformOrigin: 'left center'
                }}
              />
            )}
          </motion.div>
        );
      case 'fog':
        return (
          <motion.div 
            className="relative w-full h-full flex items-center justify-center bg-neutral-950"
            style={{ perspective: 1000 }}
          >
            <motion.div 
              className="w-80 h-80 rounded-full transition-all duration-500"
              animate={{ 
                x: shiftX * 0.5, 
                y: shiftY * 0.5,
                scale: 1 + Math.abs(rotateX) * 0.005
              }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              style={{
                backgroundImage: mode === 'rgb' 
                  ? `radial-gradient(circle at ${50 + shiftX}px ${50 + shiftY}px, rgba(255,255,255,0.8) 0%, rgba(100,100,100,0.2) 100%)`
                  : (mode === 'basis' 
                      ? `radial-gradient(circle at ${50 + shiftX}px ${50 + shiftY}px, rgba(250,240,190,0.85) 0%, rgba(190,140,50,0.55) 40%, rgba(60,110,190,0.2) 100%)`
                      : `radial-gradient(circle at ${50 + shiftX}px ${50 + shiftY}px, rgba(255,250,200,0.9) 0%, rgba(200,150,50,0.6) 40%, rgba(50,100,200,0.2) 100%)`),
                boxShadow: mode === 'rgb'
                  ? '0 0 40px rgba(255,255,255,0.1)'
                  : (mode === 'basis' ? '0 0 70px rgba(60,110,190,0.25)' : '0 0 80px rgba(50,100,200,0.3)')
              }}
            />
          </motion.div>
        );
      case 'thin-film':
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
                backgroundImage: mode === 'rgb'
                  ? `linear-gradient(${45 + shiftX}deg, #ec4899, #eab308, #06b6d4)` // Fake, static rainbow texture
                  : (mode === 'basis'
                    ? `repeating-radial-gradient(circle at ${50 + shiftX}% ${50 + shiftY}%, #1e3a8a 0%, #06b6d4 8%, #eab308 16%, #ef4444 24%, #ec4899 32%, #8b5cf6 40%)`
                    : `repeating-radial-gradient(circle at ${50 + shiftX}% ${50 + shiftY}%, #1e3a8a 0%, #06b6d4 5%, #eab308 10%, #ef4444 15%, #ec4899 20%, #8b5cf6 25%)`),
                backgroundSize: mode === 'rgb' ? '100% 100%' : `${150 + Math.abs(shiftX)}% ${150 + Math.abs(shiftY)}%`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(255,255,255,0.3)`
              }}
            />
          </motion.div>
        );
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
        
        {/* Noise overlay for Hero Wavelength */}
        {isNoisy && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-50 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        )}
        
        {/* Animated grain for Hero Wavelength to simulate temporal noise */}
        {isNoisy && (
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge"
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px'
            }}
          />
        )}
      </div>
    </div>
  );
}
