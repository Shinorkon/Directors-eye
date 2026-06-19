import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Save, Check, Loader2 } from "lucide-react";
import { defaultGear } from "@/data/demo";
import { getGearAPI, saveGearAPI } from "@/services/api";

export default function Gear() {
  const [gear, setGear] = useState(defaultGear);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from VPS on mount
  useEffect(() => {
    getGearAPI()
      .then((data) => {
        if (data?.profile) {
          setGear(data.profile);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await saveGearAPI(gear);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to save gear:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-[#8A8279]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-[480px] mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Camera className="w-6 h-6 text-[#C8956C]" />
            <h1 className="font-serif-display text-3xl text-[#F0EBE3]">Your Gear</h1>
          </div>

          <div className="space-y-5">
            {/* Camera */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <label className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider block mb-2">
                Camera Body
              </label>
              <select
                value={gear.camera}
                onChange={(e) => setGear({ ...gear, camera: e.target.value })}
                className="w-full bg-[#232323] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-[#F0EBE3] focus:outline-none focus:border-[#C8956C] transition-colors"
              >
                <option>Sony a6700</option>
                <option>Sony FX30</option>
                <option>Sony a7 IV</option>
                <option>Fujifilm X-T5</option>
                <option>Canon R7</option>
              </select>
              <p className="mt-1 text-xs text-[#8A8279]">{gear.cameraSpecs}</p>
            </div>

            {/* Lens A */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <label className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider block mb-2">
                Primary Lens
              </label>
              <select
                value={gear.lensA}
                onChange={(e) => setGear({ ...gear, lensA: e.target.value })}
                className="w-full bg-[#232323] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-[#F0EBE3] focus:outline-none focus:border-[#C8956C] transition-colors"
              >
                <option>Meike 33mm f/1.4</option>
                <option>Sigma 30mm f/1.4</option>
                <option>Sony 35mm f/1.8 OSS</option>
                <option>Viltrox 33mm f/1.4</option>
              </select>
              <p className="mt-1 text-xs text-[#8A8279]">{gear.lensASpecs}</p>
            </div>

            {/* Lens B */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <label className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider block mb-2">
                Secondary Lens
              </label>
              <select
                value={gear.lensB}
                onChange={(e) => setGear({ ...gear, lensB: e.target.value })}
                className="w-full bg-[#232323] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-[#F0EBE3] focus:outline-none focus:border-[#C8956C] transition-colors"
              >
                <option>Meike 55mm f/1.4</option>
                <option>Sigma 56mm f/1.4</option>
                <option>Sony 50mm f/1.8 OSS</option>
                <option>Viltrox 56mm f/1.4</option>
              </select>
              <p className="mt-1 text-xs text-[#8A8279]">{gear.lensBSpecs}</p>
            </div>

            {/* Secondary Camera Toggle */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#F0EBE3] block">Enable Secondary Camera</span>
                  <span className="text-xs text-[#8A8279]">
                    Use {gear.secondary} for B-roll and wide shots
                  </span>
                </div>
                <button
                  onClick={() =>
                    setGear({ ...gear, secondaryEnabled: !gear.secondaryEnabled })
                  }
                  className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${
                    gear.secondaryEnabled ? "bg-[#C8956C]" : "bg-white/[0.1]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#F0EBE3] transition-transform duration-150 ${
                      gear.secondaryEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full h-12 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-150"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Gear Profile</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
