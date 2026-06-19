import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Download } from "lucide-react";
import { defaultGear } from "@/data/demo";
import type { Scriptment } from "@/types";
import { generateShootList } from "@/services/api";

export default function ShootList() {
  const location = useLocation();
  const navigate = useNavigate();
  const scriptment = (location.state as { scriptment?: Scriptment })?.scriptment;
  const [completedShots, setCompletedShots] = useState<Set<number>>(new Set());
  const [shots, setShots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scriptment) {
      setLoading(true);
      generateShootList(scriptment)
        .then((result) => {
          setShots(result.shots);
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to generate shoot list. Using scriptment data only.");
          // Fallback: use beats directly
          const allBeats = scriptment.acts.flatMap((a) => a.beats);
          setShots(allBeats.map((b) => ({ ...b, cameraSettings: null })));
        })
        .finally(() => setLoading(false));
    }
  }, [scriptment]);

  if (!scriptment) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8A8279] mb-4">No project loaded.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-[#C8956C] text-[#0F0F0F] text-sm rounded-lg"
          >
            Start New Project
          </button>
        </div>
      </div>
    );
  }

  const allBeats = scriptment.acts.flatMap((act) => act.beats);
  const completed = completedShots.size;
  const total = allBeats.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const toggleShot = (beatNum: number) => {
    setCompletedShots((prev) => {
      const next = new Set(prev);
      if (next.has(beatNum)) next.delete(beatNum);
      else next.add(beatNum);
      return next;
    });
  };

  // Group shots by act
  const shotsByAct: Record<number, any[]> = {};
  shots.forEach((shot) => {
    const actNum = scriptment.acts.find((a) =>
      a.beats.some((b) => b.beatNumber === shot.beatNumber)
    )?.actNumber || 1;
    if (!shotsByAct[actNum]) shotsByAct[actNum] = [];
    shotsByAct[actNum].push(shot);
  });

  return (
    <div className="min-h-screen pt-14">
      {/* Progress Bar */}
      <div className="fixed top-14 left-0 right-0 h-0.5 bg-white/[0.04] z-40">
        <motion.div
          className="h-full bg-[#C8956C]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/scriptment", { state: { concept: "back" } })}
            className="flex items-center gap-1.5 text-[#8A8279] hover:text-[#F0EBE3] transition-colors duration-150 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scriptment</span>
          </button>

          <h1 className="font-serif-display text-3xl text-[#F0EBE3] mb-1">Shoot List</h1>
          <p className="text-sm text-[#8A8279] mb-4">{scriptment.title}</p>

          <div className="flex items-center gap-3">
            <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-2 py-1 rounded">
              {total} SHOTS
            </span>
            <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-2 py-1 rounded">
              ~{total * 15} MIN
            </span>
            <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-2 py-1 rounded">
              {scriptment.acts.length} SCENES
            </span>
            <span className="font-mono-tech text-[10px] text-[#C8956C]">
              {completed}/{total} done
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-3 bg-[#C8956C]/5 border border-[#C8956C]/20 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-[#C8956C]/30 border-t-[#C8956C] rounded-full animate-spin" />
              <span className="text-xs text-[#C8956C]">Generating camera settings...</span>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
          >
            <span className="text-xs text-yellow-300">{error}</span>
          </motion.div>
        )}

        {/* Gear Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5 mb-8"
        >
          <h2 className="font-serif-display text-base text-[#F0EBE3] mb-3">Your Gear</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase block mb-1">
                Camera
              </span>
              <span className="font-mono-tech text-xs text-[#F0EBE3]">{defaultGear.camera}</span>
              <span className="text-[10px] text-[#8A8279] block">{defaultGear.cameraSpecs}</span>
            </div>
            <div>
              <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase block mb-1">
                Lens A
              </span>
              <span className="font-mono-tech text-xs text-[#F0EBE3]">{defaultGear.lensA}</span>
              <span className="text-[10px] text-[#8A8279] block">{defaultGear.lensASpecs}</span>
            </div>
            <div>
              <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase block mb-1">
                Lens B
              </span>
              <span className="font-mono-tech text-xs text-[#F0EBE3]">{defaultGear.lensB}</span>
              <span className="text-[10px] text-[#8A8279] block">{defaultGear.lensBSpecs}</span>
            </div>
            <div>
              <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase block mb-1">
                Secondary
              </span>
              <span className="font-mono-tech text-xs text-[#F0EBE3]">{defaultGear.secondary}</span>
              <span className="text-[10px] text-[#8A8279] block">B-roll, wide shots</span>
            </div>
          </div>
        </motion.div>

        {/* Shot List */}
        {scriptment.acts.map((act, actIndex) => {
          const actShots = shotsByAct[act.actNumber] || [];
          return (
            <div key={act.actNumber} className="mb-8">
              <h3 className="font-serif-display text-lg text-[#F0EBE3] mb-4 flex items-center gap-2">
                <span className="font-mono-tech text-[10px] text-[#C8956C]">ACT {act.actNumber}</span>
                <span>{act.title}</span>
              </h3>

              <div className="space-y-3">
                {actShots.map((shot, shotIndex) => {
                  const isCompleted = completedShots.has(shot.beatNumber);
                  return (
                    <motion.div
                      key={shot.beatNumber}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: actIndex * 0.1 + shotIndex * 0.05 }}
                      className={`bg-[#1A1A1A] border rounded-lg p-4 transition-all duration-150 ${
                        isCompleted
                          ? "border-[#7BAE7F]/30"
                          : "border-white/[0.06]"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        {shot.storyboardFrame && (
                          <div className="w-[120px] shrink-0">
                            <div className="cinematic-frame aspect-[2.39/1] bg-[#232323]">
                              <img
                                src={shot.storyboardFrame}
                                alt={shot.description}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tech text-[10px] text-[#C8956C]">
                                SHOT {shot.beatNumber}
                              </span>
                              <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-1.5 py-0.5 rounded">
                                {shot.shotType}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleShot(shot.beatNumber)}
                              className={`p-1 rounded transition-all duration-150 ${
                                isCompleted
                                  ? "bg-[#7BAE7F]/20 text-[#7BAE7F]"
                                  : "text-[#5A544D] hover:text-[#F0EBE3] hover:bg-white/[0.04]"
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>

                          <p
                            className={`text-sm mb-3 transition-opacity duration-150 ${
                              isCompleted ? "text-[#8A8279] line-through" : "text-[#F0EBE3]"
                            }`}
                          >
                            {shot.description}
                          </p>

                          {/* Settings Grid */}
                          {shot.cameraSettings && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                              {[
                                { label: "Lens", value: shot.cameraSettings.lens },
                                { label: "Aperture", value: shot.cameraSettings.aperture },
                                { label: "Shutter", value: shot.cameraSettings.shutter },
                                { label: "ISO", value: shot.cameraSettings.iso },
                                { label: "White Balance", value: shot.cameraSettings.whiteBalance },
                                { label: "Profile", value: shot.cameraSettings.pictureProfile },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider block">
                                    {label}
                                  </span>
                                  <span className="font-mono-tech text-xs text-[#F0EBE3]">
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {shot.cameraSettings?.composition && (
                            <p className="mt-2 text-[11px] text-[#8A8279] italic">
                              {shot.cameraSettings.composition}
                            </p>
                          )}

                          {shot.cameraSettings?.notes && (
                            <p className="mt-1 text-[10px] text-[#5A544D]">
                              Note: {shot.cameraSettings.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Export FAB */}
        <div className="fixed bottom-6 right-6">
          <button className="flex items-center gap-2 px-4 py-3 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-full shadow-lg shadow-[#C8956C]/20 transition-all duration-150 hover:scale-105">
            <Download className="w-4 h-4" />
            <span>Export Field Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
}
