import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Download, X } from "lucide-react";
import { sampleScriptment } from "@/data/demo";
import type { Beat, Scriptment } from "@/types";
import BeatCard from "@/components/BeatCard";
import StoryboardFrame from "@/components/StoryboardFrame";
import { generateScriptment, generateStoryboardFrames } from "@/services/api";

export default function Scriptment() {
  const location = useLocation();
  const navigate = useNavigate();
  const passedScriptment = (location.state as { scriptment?: Scriptment })?.scriptment;
  const passedConcept = (location.state as { concept?: string })?.concept || "";

  const [scriptment, setScriptment] = useState<Scriptment>(passedScriptment || sampleScriptment);
  const [activeBeat, setActiveBeat] = useState(1);
  const [lightboxBeat, setLightboxBeat] = useState<Beat | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState(scriptment.title);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<Record<number, HTMLDivElement>>({});

  // Auto-trigger storyboard generation if we have a real scriptment without frames
  useEffect(() => {
    if (passedScriptment && !passedScriptment.acts.some(a => a.beats.some(b => b.storyboardFrame))) {
      setIsGenerating(true);
      setError(null);

      const allBeats = passedScriptment.acts.flatMap((a) => a.beats);
      generateStoryboardFrames(allBeats)
        .then((result) => {
          const updated = { ...passedScriptment };
          let frameIdx = 0;
          updated.acts.forEach((act) => {
            act.beats.forEach((beat) => {
              if (result.frames[frameIdx]) {
                beat.storyboardFrame = `data:image/png;base64,${result.frames[frameIdx]}`;
              }
              frameIdx++;
            });
          });
          setScriptment(updated);
          setTitle(updated.title);
        })
        .catch((err) => {
          console.warn("Frame generation failed:", err);
          setError("Storyboard frames could not be generated. You can still view the Scriptment.");
        })
        .finally(() => setIsGenerating(false));
    }
  }, [passedScriptment]);

  const allBeats = scriptment.acts.flatMap((act) => act.beats);

  const handleBeatClick = (beatNum: number) => {
    setActiveBeat(beatNum);
    const frameEl = document.getElementById(`frame-${beatNum}`);
    if (frameEl && gridRef.current) {
      frameEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleRegenerate = async () => {
    if (!passedConcept) return;
    setIsGenerating(true);
    setError(null);
    try {
      const newScriptment = await generateScriptment(passedConcept);
      const beats = newScriptment.acts.flatMap((a: any) => a.beats);
      if (beats.length > 0) {
        const frames = await generateStoryboardFrames(beats);
        beats.forEach((beat: any, i: number) => {
          if (frames.frames[i]) {
            beat.storyboardFrame = `data:image/png;base64,${frames.frames[i]}`;
          }
        });
      }
      setScriptment(newScriptment);
      setTitle(newScriptment.title);
    } catch (err: any) {
      setError(err.message || "Regeneration failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-14">
      {/* Header Bar */}
      <div className="sticky top-14 z-40 bg-[#0F0F0F]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-[#8A8279] hover:text-[#F0EBE3] transition-colors duration-150 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent font-serif-display text-lg text-[#F0EBE3] focus:outline-none focus:text-[#C8956C] transition-colors border-b border-transparent focus:border-[#C8956C]/30 pb-0.5"
            />
          </div>

          <div className="flex items-center gap-2">
            {passedConcept && (
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8A8279] hover:text-[#F0EBE3] hover:bg-white/[0.04] rounded-lg transition-all duration-150 disabled:opacity-30"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span>Regenerate</span>
              </button>
            )}
            <button
              onClick={() => navigate("/shoot-list", { state: { scriptment: { ...scriptment, title } } })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-white/[0.06] text-xs text-[#F0EBE3] hover:bg-[#232323] hover:border-white/[0.12] rounded-lg transition-all duration-150"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Shoot List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
          >
            <span className="text-xs text-yellow-300">{error}</span>
          </motion.div>
        )}

        {/* Progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-3 bg-[#C8956C]/5 border border-[#C8956C]/20 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-[#C8956C]/30 border-t-[#C8956C] rounded-full animate-spin" />
              <span className="text-xs text-[#C8956C]">
                Generating storyboard frames via external API...
              </span>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column — Beat Timeline */}
          <div className="lg:w-[40%] lg:sticky lg:top-28 lg:self-start">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-white/[0.06]" />

              <div className="space-y-3">
                {scriptment.acts.map((act) => (
                  <div key={act.actNumber}>
                    <div className="mb-2 px-4">
                      <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider">
                        Act {act.actNumber} — {act.title}
                      </span>
                    </div>
                    {act.beats.map((beat, i) => (
                      <div
                        key={beat.beatNumber}
                        ref={(el) => {
                          if (el) beatRefs.current[beat.beatNumber] = el;
                        }}
                        className="mb-3 ml-6"
                      >
                        <BeatCard
                          beat={beat}
                          isActive={activeBeat === beat.beatNumber}
                          onClick={() => handleBeatClick(beat.beatNumber)}
                          index={i + act.beats.length * (act.actNumber - 1)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column — Storyboard Grid */}
          <div className="lg:w-[60%]" ref={gridRef}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allBeats.map((beat, i) => (
                <div key={beat.beatNumber} id={`frame-${beat.beatNumber}`}>
                  <StoryboardFrame
                    beat={beat}
                    index={i}
                    onClick={() => setLightboxBeat(beat)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxBeat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => setLightboxBeat(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Frame */}
              <div className="cinematic-frame bg-[#1A1A1A]">
                {lightboxBeat.storyboardFrame ? (
                  <img
                    src={lightboxBeat.storyboardFrame}
                    alt={lightboxBeat.description}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5A544D] text-xs">
                    No frame generated
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono-tech text-[10px] text-[#C8956C]">
                      BEAT {lightboxBeat.beatNumber}
                    </span>
                    <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {lightboxBeat.shotType}
                    </span>
                  </div>
                  <p className="text-sm text-[#F0EBE3] mb-1">{lightboxBeat.description}</p>
                  <p className="text-xs text-[#8A8279]">{lightboxBeat.motivation}</p>
                </div>
                <button
                  onClick={() => setLightboxBeat(null)}
                  className="p-2 text-[#8A8279] hover:text-[#F0EBE3] hover:bg-white/[0.04] rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
