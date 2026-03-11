/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lightbulb,
  Palette,
  Layers,
  Triangle,
  CloudFog,
  Activity,
  Box,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { SpectralChart } from "./components/SpectralChart";
import { SimulatedRender } from "./components/SimulatedRender";
import {
  ledData,
  metamerData,
  glassData,
  prismData,
  fogData,
  thinFilmData,
} from "./utils/spectralData";

const TESTS = [
  {
    id: "led",
    title: "Narrowband Light Array",
    icon: Lightbulb,
    description:
      "A horizontal strip of small rectangular emitters with Gaussian spectral emission curves.",
    tests: ["Colored shadows", "Spectral interactions with materials"],
    rgbFailure:
      "RGB cannot represent narrow spectra, causing smeared colors and incorrect material interactions.",
    data: ledData,
    lines: [
      { key: "red", color: "#ef4444", name: "Red LED" },
      { key: "green", color: "#22c55e", name: "Green LED" },
      { key: "blue", color: "#3b82f6", name: "Blue LED" },
      { key: "cyan", color: "#06b6d4", name: "Cyan LED" },
      { key: "amber", color: "#f59e0b", name: "Amber LED" },
    ],
    yAxisLabel: "Emission E(λ)",
  },
  {
    id: "metamer",
    title: "Metamer Wall",
    icon: Palette,
    description:
      "Two adjacent squares designed to be metamers under white light but diverge under colored lighting.",
    tests: ["Color illusion", "Divergence under colored lights"],
    rgbFailure:
      "RGB rendering cannot distinguish metamers and fails completely when lighting changes.",
    data: metamerData,
    lines: [
      { key: "spectrumA", color: "#a855f7", name: "Spectrum A" },
      { key: "spectrumB", color: "#ec4899", name: "Spectrum B" },
    ],
    yAxisLabel: "Reflectance R(λ)",
  },
  {
    id: "glass",
    title: "Tinted Glass Stack",
    icon: Layers,
    description:
      "A stack of 3 thin slabs (blue, yellow, red) defined by exponential attenuation.",
    tests: [
      "Wavelength-dependent absorption",
      "Multiplicative spectral transport",
    ],
    rgbFailure:
      "RGB models handle multiplicative spectral transport very poorly, leading to incorrect stack colors.",
    data: glassData,
    lines: [
      { key: "blueGlass", color: "#3b82f6", name: "Blue Glass" },
      { key: "yellowGlass", color: "#eab308", name: "Yellow Glass" },
      { key: "redGlass", color: "#ef4444", name: "Red Glass" },
      { key: "stack", color: "#ffffff", name: "Combined Stack" },
    ],
    yAxisLabel: "Transmission T(λ)",
  },
  {
    id: "prism",
    title: "Dispersion Prism",
    icon: Triangle,
    description:
      "A triangular prism with a wavelength-dependent refractive index.",
    tests: ["Spectral splitting", "Caustic color gradients"],
    rgbFailure:
      "RGB cannot natively simulate dispersion without hacks, leading to inconsistent behavior.",
    data: prismData,
    lines: [
      {
        key: "refractiveIndex",
        color: "#8b5cf6",
        name: "Refractive Index n(λ)",
      },
    ],
    yAxisLabel: "Index n(λ)",
  },
  {
    id: "fog",
    title: "Participating Medium",
    icon: CloudFog,
    description:
      "A sphere filled with fog exhibiting Rayleigh scattering and yellowish absorption.",
    tests: [
      "Spectral volumetric transport",
      "Exponential attenuation differences",
    ],
    rgbFailure:
      "RGB often looks wrong here due to the non-linear nature of volumetric attenuation.",
    data: fogData,
    lines: [
      { key: "scattering", color: "#60a5fa", name: "Scattering σ_s(λ)" },
      { key: "absorption", color: "#fbbf24", name: "Absorption σ_a(λ)" },
    ],
    yAxisLabel: "Coefficient σ(λ)",
  },
  {
    id: "thin-film",
    title: "Thin-Film Interference",
    icon: Sparkles,
    description:
      "A microscopically thin layer of oil on water, creating iridescent colors due to wave interference.",
    tests: [
      "Phase-dependent spectral modulation",
      "High-frequency spectral oscillations",
    ],
    rgbFailure:
      "RGB renderers completely miss the wave nature of light, requiring non-physical hacks to fake iridescence, which break under novel lighting.",
    data: thinFilmData,
    lines: [
      { key: "film400nm", color: "#ec4899", name: "Reflectance (nd=400nm)" },
      { key: "film600nm", color: "#06b6d4", name: "Reflectance (nd=600nm)" },
    ],
    yAxisLabel: "Reflectance R(λ)",
  },
];

export default function App() {
  const [activeTest, setActiveTest] = useState(TESTS[0]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-[#121212] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 text-white mb-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h1 className="font-semibold text-lg tracking-tight">
              Spectral Torture Chamber
            </h1>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            A canonical test scene for spectral rendering, isolating failure
            modes of RGB transport.
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Stress Tests
          </div>
          <ul className="space-y-1 px-2">
            {TESTS.map((test) => {
              const Icon = test.icon;
              const isActive = activeTest.id === test.id;
              return (
                <li key={test.id}>
                  <button
                    onClick={() => setActiveTest(test)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-gray-500"}`}
                    />
                    <span className="font-medium">{test.title}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/5 bg-[#0f0f0f]">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Box className="w-4 h-4" />
            <span>Multiscale Transport PoC</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <activeTest.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-white tracking-tight">
                    {activeTest.title}
                  </h2>
                  <p className="text-gray-400 mt-1">{activeTest.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#121212] border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    What this tests
                  </h3>
                  <ul className="space-y-3">
                    {activeTest.tests.map((t, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-emerald-500/50 mt-0.5">•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    RGB Failure Mode
                  </h3>
                  <p className="text-sm text-red-200/70 leading-relaxed">
                    {activeTest.rgbFailure}
                  </p>
                </div>
              </div>

              <div className="bg-[#121212] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
                  Spectral Profile
                </h3>
                <p className="text-xs text-gray-500 mb-6">
                  Interactive visualization of the procedural spectral functions
                  used in this test.
                </p>
                <SpectralChart
                  data={activeTest.data}
                  lines={activeTest.lines}
                  yAxisLabel={activeTest.yAxisLabel}
                />
              </div>

              <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                  Expected Outcome with Multiscale Transport
                </h3>
                <p className="text-sm text-emerald-200/70 leading-relaxed">
                  By decoupling spatial transport (rays) from spectral evolution
                  (cones), this test will render with
                  <strong> correct spectral behavior</strong> and{" "}
                  <strong>much lower chromatic noise</strong> compared to
                  hero-wavelength sampling, while maintaining stable temporal
                  behavior at low sample counts.
                </p>
              </div>

              <SimulatedRender testId={activeTest.id} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
