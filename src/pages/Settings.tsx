import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2 } from "lucide-react";
import { getSettingsAPI, saveSettingAPI } from "@/services/api";

export default function Settings() {
  const [autoStoryboard, setAutoStoryboard] = useState(true);
  const [autoShootList, setAutoShootList] = useState(true);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from VPS on mount
  useEffect(() => {
    getSettingsAPI()
      .then((settings) => {
        if (settings?.autoStoryboard !== undefined) setAutoStoryboard(settings.autoStoryboard);
        if (settings?.autoShootList !== undefined) setAutoShootList(settings.autoShootList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await Promise.all([
        saveSettingAPI("autoStoryboard", autoStoryboard),
        saveSettingAPI("autoShootList", autoShootList),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to save settings:", err);
    }
  };

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${
        checked ? "bg-[#C8956C]" : "bg-white/[0.1]"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#F0EBE3] transition-transform duration-150 ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );

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
          <h1 className="font-serif-display text-3xl text-[#F0EBE3] mb-8">Settings</h1>

          {/* Generation Settings */}
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <h2 className="font-serif-display text-base text-[#F0EBE3] mb-4">
                Generation
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[#F0EBE3] block">Auto-generate storyboards</span>
                    <span className="text-xs text-[#8A8279]">
                      Generate frames after Scriptment is ready
                    </span>
                  </div>
                  <ToggleSwitch checked={autoStoryboard} onChange={setAutoStoryboard} />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[#F0EBE3] block">Auto-generate shoot list</span>
                    <span className="text-xs text-[#8A8279]">
                      Create shot list after storyboards complete
                    </span>
                  </div>
                  <ToggleSwitch checked={autoShootList} onChange={setAutoShootList} />
                </div>
              </div>
            </div>

            {/* API Settings */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <h2 className="font-serif-display text-base text-[#F0EBE3] mb-4">
                External APIs
              </h2>

              <div className="space-y-3 text-xs text-[#8A8279]">
                <div className="flex items-center justify-between">
                  <span>DeepSeek API (Scriptments)</span>
                  <span className="text-[#C8956C]">Required</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Gemini API (Images — optional)</span>
                  <span className="text-[#7BAE7F]">Optional</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pollinations (Images — fallback)</span>
                  <span className="text-[#7BAE7F]">Free, no key</span>
                </div>
                <p className="text-[#5A544D] mt-2">
                  Configure API keys in <code className="text-[#8A8279]">backend/.env</code>
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5">
              <h2 className="font-serif-display text-base text-[#F0EBE3] mb-3">About</h2>
              <div className="space-y-2 text-xs text-[#8A8279]">
                <p>Director&apos;s Eye v1.0</p>
                <p>All AI processing runs via external APIs — no local GPU required.</p>
                <p>Scriptment generation powered by DeepSeek API.</p>
                <p>Storyboard frames via Gemini or Pollinations.</p>
                <p className="text-[#5A544D] mt-3">Built for solo filmmakers who want to plan before they shoot.</p>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full h-12 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              <span>{saved ? "Saved!" : "Save Settings"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
