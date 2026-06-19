import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Film } from "lucide-react";
import { exploreGenres } from "@/services/api";

interface Variant {
  arc: string;
  label: string;
  description: string;
  color: string;
  beatCount: number;
  summary: string;
  firstBeatDescription: string;
  lastBeatDescription: string;
  scriptment: any;
}

export default function GenreExplorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const concept = (location.state as { concept?: string })?.concept || "";
  const mode = (location.state as { mode?: string })?.mode || "normal";
  const antiTourism = (location.state as { antiTourism?: boolean })?.antiTourism || false;

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArc, setSelectedArc] = useState<string | null>(null);

  const handleExplore = async () => {
    if (!concept) return;
    setLoading(true);
    setError(null);
    try {
      const result = await exploreGenres(concept, mode, antiTourism);
      setVariants(result.variants || []);
    } catch (err: any) {
      setError(err.message || "Failed to explore genres.");
    } finally {
      setLoading(false);
    }
  };

  const selectedVariant = variants.find((v) => v.arc === selectedArc);

  return (
    <div className="min-h-screen pt-14">
      {/* Header */}
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
            <h1 className="font-serif-display text-lg text-[#F0EBE3]">Genre Explorer</h1>
          </div>
          {!loading && variants.length === 0 && (
            <button
              onClick={handleExplore}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-xs font-medium rounded-lg transition-all duration-150"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore All Arcs</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Concept Display */}
        {concept && (
          <div className="mb-8 p-4 bg-[#1A1A1A] border border-white/[0.06] rounded-lg">
            <span className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-wider block mb-1">
              Concept
            </span>
            <p className="text-sm text-[#F0EBE3] italic">"{concept}"</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-6 p-4 bg-[#C8956C]/5 border border-[#C8956C]/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C8956C]" />
              <span className="text-sm text-[#C8956C]">Generating 6 emotional arcs in parallel...</span>
            </div>
            <p className="text-xs text-[#8A8279] mt-1">Each arc highlights a different emotional journey through the same concept.</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && variants.length === 0 && !error && (
          <div className="text-center py-16">
            <Film className="w-12 h-12 text-[#5A544D] mx-auto mb-4" />
            <h2 className="font-serif-display text-xl text-[#8A8279] mb-2">See your concept through 6 different lenses</h2>
            <p className="text-sm text-[#5A544D] mb-6 max-w-[400px] mx-auto">
              Same location, same characters — completely different emotional journeys. Click explore to see the range.
            </p>
            <button
              onClick={handleExplore}
              className="px-5 py-2.5 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-lg transition-all duration-150"
            >
              <Sparkles className="w-4 h-4 inline mr-1.5" />
              Explore All 6 Arcs
            </button>
          </div>
        )}

        {/* Grid of 6 Arcs */}
        {variants.length > 0 && !selectedArc && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map((variant, i) => (
              <motion.div
                key={variant.arc}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                onClick={() => setSelectedArc(variant.arc)}
                className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-5 cursor-pointer hover:bg-[#232323] hover:border-white/[0.12] transition-all duration-150"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: variant.color }}
                  />
                  <h3 className="font-serif-display text-base text-[#F0EBE3]">{variant.label}</h3>
                </div>
                <p className="text-xs text-[#8A8279] mb-3">{variant.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono-tech text-[10px] text-[#C8956C] bg-[#C8956C]/10 px-2 py-0.5 rounded">
                    {variant.beatCount} BEATS
                  </span>
                </div>
                <p className="text-xs text-[#F0EBE3] leading-relaxed line-clamp-3">
                  {variant.firstBeatDescription || variant.summary}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Selected Variant Detail */}
        {selectedVariant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => setSelectedArc(null)}
              className="flex items-center gap-1.5 text-[#8A8279] hover:text-[#F0EBE3] transition-colors duration-150 text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Arcs</span>
            </button>

            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedVariant.color }}
                />
                <h2 className="font-serif-display text-2xl text-[#F0EBE3]">{selectedVariant.label}</h2>
                <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-2 py-1 rounded">
                  {selectedVariant.beatCount} beats
                </span>
              </div>

              <p className="text-sm text-[#8A8279] mb-6">{selectedVariant.description}</p>

              {/* Open in full Scriptment */}
              <button
                onClick={() =>
                  navigate("/scriptment", {
                    state: {
                      scriptment: selectedVariant.scriptment,
                      concept,
                    },
                  })
                }
                className="px-4 py-2 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-lg transition-all duration-150"
              >
                Open Full Scriptment
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
