import { Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Home from "@/pages/Home";
import Scriptment from "@/pages/Scriptment";
import ShootList from "@/pages/ShootList";
import Archive from "@/pages/Archive";
import Settings from "@/pages/Settings";
import Gear from "@/pages/Gear";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F0EBE3] relative">
      {/* Film grain overlay */}
      <div className="grain-overlay">
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves={3}
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* Subtle radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200, 149, 108, 0.03), transparent)",
        }}
      />

      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scriptment" element={<Scriptment />} />
        <Route path="/shoot-list" element={<ShootList />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/gear" element={<Gear />} />
      </Routes>
    </div>
  );
}
