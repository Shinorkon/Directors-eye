import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare, LayoutGrid, ListChecks, AlertCircle, ShieldBan, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { samplePrompts } from "@/data/demo";
import { generateScriptment, generateStoryboardFrames, saveProject } from "@/services/api";

const MODES = [
  { id: "normal", label: "Normal", icon: "🎬", desc: "Full creative freedom" },
  { id: "solo_crew", label: "Solo Crew", icon: "🎒", desc: "You + one helper, one lens" },
  { id: "minimal", label: "Minimal", icon: "📦", desc: "Natural light, no gimbal" },
  { id: "guerrilla", label: "Guerrilla", icon: "🏃", desc: "Single prime, handheld" },
  { id: "studio", label: "Studio", icon: "💡", desc: "Controlled interior, tripod" },
];

export default function Home() {
  const [concept, setConcept] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState("normal");
  const [antiTourism, setAntiTourism] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Generate Scriptment with mode & anti-tourism options
      const scriptment = await generateScriptment(concept, mode, antiTourism);

      // 2. Generate storyboard frames via external image API
      const allBeats = scriptment.acts.flatMap((a: any) => a.beats);
      let frames: string[] = [];

      if (allBeats.length > 0) {
        try {
          const frameResult = await generateStoryboardFrames(allBeats);
          frames = frameResult.frames;
        } catch (frameErr) {
          console.warn("Frame generation failed, continuing without frames:", frameErr);
        }
      }

      // 3. Attach frames to beats
      allBeats.forEach((beat: any, i: number) => {
        if (frames[i]) {
          beat.storyboardFrame = `data:image/png;base64,${frames[i]}`;
        }
      });

      // 4. Auto-save to VPS (fire-and-forget)
      saveProject({ scriptment, hero_frame: frames[0] ? `data:image/png;base64,${frames[0]}` : "" })
        .then(() => console.log("[Save] Project saved to VPS"))
        .catch((err) => console.warn("[Save] Failed to save project:", err));

      // 5. Navigate to Scriptment page
      navigate("/scriptment", { state: { scriptment, mode, antiTourism } });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate scriptment. Please check your API key configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setConcept(prompt);
  };

  return (
    <div className="min-h-screen pt-14">
      {/* Hero Section */}
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-[640px] mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-[0.1em] mb-6"
          >
            Your Personal Film Director
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-serif-display text-5xl text-[#F0EBE3] leading-[1.1] tracking-tight mb-4"
          >
            Turn sparks into stories.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-[#8A8279] leading-relaxed max-w-[480px] mx-auto"
          >
            Describe your cinematic idea. Director&apos;s Eye will plan the shots, compose the
            frames, and build your shoot list — calibrated for your gear.
          </motion.p>
        </div>
      </section>

      {/* Input Section */}
      <section className="px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-[640px] mx-auto"
        >
          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </motion.div>
          )}

          <div className="relative">
            <textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="A 60-second film about solitude at dawn. A fisherman prepares his boat as the first light hits the water. He looks up — a brief moment of peace before the day begins..."
              disabled={isGenerating}
              className="w-full min-h-[140px] bg-[#1A1A1A] border border-white/[0.06] rounded-xl p-4 text-sm text-[#F0EBE3] placeholder:text-[#5A544D] resize-none focus:outline-none focus:border-[#C8956C] transition-colors duration-150 disabled:opacity-50 scrollbar-thin"
            />
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="font-mono-tech text-[10px] text-[#5A544D]">
                {concept.length > 0 && `${concept.length} chars`}
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider">Shoot Mode</span>
              {mode !== "normal" && (
                <span className="text-[10px] text-[#C8956C] bg-[#C8956C]/10 px-1.5 py-0.5 rounded font-mono-tech">
                  {MODES.find((m) => m.id === mode)?.label} — saves tokens
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  disabled={isGenerating}
                  className={`px-3 py-2 rounded-lg text-xs transition-all duration-150 border ${
                    mode === m.id
                      ? "bg-[#C8956C]/20 border-[#C8956C]/40 text-[#C8956C]"
                      : "bg-[#1A1A1A] border-white/[0.06] text-[#8A8279] hover:text-[#F0EBE3] hover:border-white/[0.12]"
                  } disabled:opacity-30`}
                  title={m.desc}
                >
                  <span className="mr-1">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anti-Tourism Toggle */}
          <div className="mt-3 flex items-center justify-between bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <ShieldBan className={`w-4 h-4 ${antiTourism ? "text-[#C8956C]" : "text-[#5A544D]"}`} />
              <div>
                <span className="text-sm text-[#F0EBE3] block">Anti-Tourism Mode</span>
                <span className="text-xs text-[#8A8279]">
                  Strip tourism language — focus on honest, gritty reality
                </span>
              </div>
            </div>
            <button
              onClick={() => setAntiTourism(!antiTourism)}
              disabled={isGenerating}
              className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${
                antiTourism ? "bg-[#C8956C]" : "bg-white/[0.1]"
              } disabled:opacity-30`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#F0EBE3] transition-transform duration-150 ${
                  antiTourism ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!concept.trim() || isGenerating}
            className="w-full mt-4 h-12 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#C8956C]"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0F0F0F]/30 border-t-[#0F0F0F] rounded-full animate-spin" />
                <span className="text-sm font-medium">Directing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Generate Scriptment</span>
              </>
            )}
          </button>

          {/* Explore Genres Button */}
          {concept.trim().length >= 10 && !isGenerating && (
            <button
              onClick={() =>
                navigate("/explore", {
                  state: { concept, mode, antiTourism },
                })
              }
              className="w-full mt-2 h-11 bg-[#1A1A1A] hover:bg-[#232323] border border-white/[0.06] hover:border-white/[0.12] text-[#8A8279] hover:text-[#F0EBE3] font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-150"
            >
              <Film className="w-4 h-4" />
              <span className="text-sm">Explore All Genres</span>
            </button>
          )}
        </motion.div>
      </section>

      {/* Quick Prompts */}
      <section className="px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-[640px] mx-auto flex flex-wrap justify-center gap-2"
        >
          {samplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              className="px-4 py-2 bg-[#1A1A1A] border border-white/[0.06] rounded-full text-xs text-[#8A8279] hover:text-[#F0EBE3] hover:border-white/[0.12] transition-all duration-150"
            >
              {prompt}
            </button>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-[800px] mx-auto"
        >
          <h2 className="font-serif-display text-2xl text-[#F0EBE3] text-center mb-8">
            From idea to shoot plan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "1. Describe",
                desc: "Type your cinematic idea in plain language. No formatting needed — just describe what you want to feel.",
              },
              {
                icon: LayoutGrid,
                title: "2. Visualize",
                desc: "AI generates a structured Scriptment with story beats and cinematic storyboard frames via external APIs.",
              },
              {
                icon: ListChecks,
                title: "3. Shoot",
                desc: "Receive a detailed shoot list calibrated for your Sony a6700 and Meike lenses — exact settings for every shot.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-6"
              >
                <Icon className="w-8 h-8 text-[#C8956C] mb-4" />
                <h3 className="font-serif-display text-lg text-[#F0EBE3] mb-2">{title}</h3>
                <p className="text-xs text-[#8A8279] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 pb-8 text-center">
        <p className="font-mono-tech text-[10px] text-[#5A544D]">
          Scriptment generation via DeepSeek/Grok/OpenAI/Gemini. Storyboard frames via Gemini / Pollinations. No local AI required.
        </p>
      </footer>
    </div>
  );
}
