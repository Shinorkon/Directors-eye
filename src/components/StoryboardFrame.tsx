import { useState } from "react";
import { motion } from "framer-motion";
import type { Beat } from "@/types";

interface StoryboardFrameProps {
  beat: Beat;
  index: number;
  onClick?: () => void;
}

export default function StoryboardFrame({ beat, index, onClick }: StoryboardFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
      className="cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`cinematic-frame bg-[#1A1A1A] transition-all duration-150 ${
          hovered ? "border-[#C8956C] scale-[1.02]" : "border-[#2A2520]"
        }`}
      >
        {beat.storyboardFrame ? (
          <>
            <img
              src={beat.storyboardFrame}
              alt={beat.description}
              className={`w-full h-full object-cover transition-all duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              } ${hovered ? "scale-[1.03]" : "scale-100"}`}
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="absolute inset-0 bg-[#232323] animate-pulse-glow" />
            )}
            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-10">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-[10px] text-[#F0EBE3] tracking-wider">
                  BEAT {beat.beatNumber}
                </span>
                <span className="font-mono-tech text-[10px] text-[#8A8279]">
                  {beat.shotType.toUpperCase()}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-[#1A1A1A] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
            </div>
          </div>
        )}
      </div>
      {/* Beat description below frame */}
      <p className="mt-2 text-xs text-[#8A8279] line-clamp-2 leading-relaxed">
        {beat.description}
      </p>
    </motion.div>
  );
}
