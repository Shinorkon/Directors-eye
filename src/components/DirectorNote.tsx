import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface DirectorNoteProps {
  /** The text to be spoken aloud */
  text: string;
  /** Optional label for the button */
  label?: string;
  /** Optional className for styling */
  className?: string;
}

export default function DirectorNote({ text, label, className = "" }: DirectorNoteProps) {
  const [state, setState] = useState<"idle" | "speaking" | "paused">("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [supported] = useState(() => "speechSynthesis" in window);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setState("idle");
  }, []);

  const speak = useCallback(() => {
    if (!supported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes("Samantha")) ||
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Female")) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setState("speaking");
    utterance.onend = () => setState("idle");
    utterance.onpause = () => setState("paused");
    utterance.onresume = () => setState("speaking");
    utterance.onerror = () => setState("idle");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, supported]);

  const toggle = useCallback(() => {
    if (state === "speaking") {
      stop();
    } else {
      speak();
    }
  }, [state, speak, stop]);

  if (!supported) return null;

  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ${
        state === "speaking"
          ? "bg-[#C8956C]/20 text-[#C8956C] border border-[#C8956C]/30"
          : "bg-white/[0.04] text-[#8A8279] hover:text-[#F0EBE3] hover:bg-white/[0.08] border border-transparent"
      } ${className}`}
      title={state === "speaking" ? "Stop" : "Play director note"}
    >
      {state === "speaking" ? (
        <>
          <VolumeX className="w-3.5 h-3.5" />
          <span className="font-mono-tech text-[10px]">Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" />
          <span className="font-mono-tech text-[10px]">{label || "Director Note"}</span>
        </>
      )}
    </motion.button>
  );
}
