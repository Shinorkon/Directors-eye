import { motion } from "framer-motion";
import type { Beat } from "@/types";
import { emotionalToneColors } from "@/data/demo";

interface BeatCardProps {
  beat: Beat;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export default function BeatCard({ beat, isActive, onClick, index }: BeatCardProps) {
  const toneColor = emotionalToneColors[beat.emotionalTone] || "bg-[#4A5568]";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08, ease: [0, 0, 0.2, 1] }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg border p-4 transition-all duration-150 ${
        isActive
          ? "bg-[#232323] border-l-2 border-l-[#C8956C] border-t-transparent border-r-transparent border-b-transparent"
          : "bg-[#1A1A1A] border-white/[0.06] hover:bg-[#232323] hover:border-white/[0.12]"
      }`}
    >
      {/* Timeline dot */}
      <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2A2520] border border-[#3A3530]" />

      <div className="flex items-start gap-3">
        {/* Beat number */}
        <span className="font-mono-tech text-[10px] text-[#C8956C] bg-[#C8956C]/10 px-2 py-0.5 rounded shrink-0 mt-0.5">
          {beat.beatNumber}
        </span>

        <div className="flex-1 min-w-0">
          {/* Shot type + emotion */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono-tech text-[10px] text-[#8A8279] bg-white/[0.04] px-1.5 py-0.5 rounded">
              {beat.shotType}
            </span>
            <span className={`text-[10px] text-white/80 px-1.5 py-0.5 rounded ${toneColor}`}>
              {beat.emotionalTone}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-[#F0EBE3] leading-snug mb-1.5">{beat.description}</p>

          {/* Motivation */}
          <p className="text-xs text-[#8A8279] leading-relaxed">{beat.motivation}</p>

          {/* Lens indicator */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="font-mono-tech text-[10px] text-[#5A544D]">
              {beat.recommendedLens === "Find X9" ? "Find X9" : `Meike ${beat.recommendedLens}`}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
