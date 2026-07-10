import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Compass, Sun, Moon, Cloud, Eye,
  Palette, Waves, Zap, CheckCircle2,
  Clock, ShieldBan, Landmark,
  Tag, Calendar, AlertCircle
} from "lucide-react";
import { analyzeLocationPhoto, saveScoutLocation } from "@/services/api";
import ImageUpload from "@/components/ImageUpload";
import type { ScoutAnalysis } from "@/types";

export default function Scout() {
  const [imageB64, setImageB64] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [gpsPrivacy, setGpsPrivacy] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScoutAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImage = (b64: string, previewUrl: string) => {
    setImageB64(b64);
    setPreview(previewUrl);
    setAnalysis(null);
    setSaved(false);
    setError(null);
  };

  const handleClear = () => {
    setImageB64("");
    setPreview(null);
    setAnalysis(null);
    setSaved(false);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!imageB64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeLocationPhoto(imageB64, country, placeName, gpsPrivacy);
      setAnalysis(result as ScoutAnalysis);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysis || !imageB64) return;
    setSaving(true);
    try {
      await saveScoutLocation({
        image_base64: imageB64,
        country: country || analysis.suggested_country,
        place_name: placeName || analysis.suggested_place_name,
        description: analysis.proposed_description,
        keywords: analysis.proposed_keywords,
        vibe: analysis.proposed_vibe,
        best_times: analysis.proposed_best_times,
        textures: analysis.proposed_textures,
        anti_tourism_description: analysis.proposed_anti_tourism_description,
        gps_lat: analysis.gps_lat,
        gps_lng: analysis.gps_lng,
        captured_at: analysis.exif?.captured_at || "",
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const moodIcon = (mood: string) => {
    switch (mood) {
      case "hopeful":
      case "joyful":
        return <Sun size={16} className="text-amber-400" />;
      case "melancholy":
      case "contemplative":
        return <Cloud size={16} className="text-blue-400" />;
      case "tense":
        return <Moon size={16} className="text-violet-400" />;
      default:
        return <Eye size={16} className="text-white/50" />;
    }
  };

  return (
    <div className="min-h-screen pt-14 pb-24">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="pt-12 pb-8 px-6">
        <div className="max-w-[640px] mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono-tech text-[10px] text-[#5A544D] uppercase tracking-[0.1em] mb-6"
          >
            Location Scout
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif-display text-4xl text-[#F0EBE3] leading-[1.1] tracking-tight mb-4"
          >
            Find a place.<br />
            <span className="text-[#C8956C]">Let AI read the scene.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-[#8A8279] leading-relaxed max-w-[420px] mx-auto"
          >
            Snap a photo of any location. AI analyses lighting, mood, textures, and writes a
            cinematic brief — saved to your location knowledge base.
          </motion.p>
        </div>
      </section>

      {/* ── Capture ───────────────────────────────────────── */}
      <section className="px-6 pb-8">
        <div className="max-w-[640px] mx-auto">
          <ImageUpload
            onImage={handleImage}
            onClear={handleClear}
            preview={preview}
            label="Snap a location photo — street, interior, landscape"
          />

          {/* Optional context fields */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country (optional)"
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-[#F0EBE3] placeholder:text-[#5A544D] focus:outline-none focus:border-[#C8956C] transition-colors"
            />
            <input
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Place name (optional)"
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-[#F0EBE3] placeholder:text-[#5A544D] focus:outline-none focus:border-[#C8956C] transition-colors"
            />
          </div>

          {/* GPS privacy toggle */}
          <div className="mt-3 flex items-center justify-between bg-[#1A1A1A] border border-white/[0.06] rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <ShieldBan className={`w-4 h-4 ${gpsPrivacy ? "text-[#C8956C]" : "text-[#5A544D]"}`} />
              <div>
                <span className="text-sm text-[#F0EBE3] block">GPS Privacy</span>
                <span className="text-xs text-[#8A8279]">
                  Strip GPS coordinates before sending to AI
                </span>
              </div>
            </div>
            <button
              onClick={() => setGpsPrivacy(!gpsPrivacy)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${
                gpsPrivacy ? "bg-[#C8956C]" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#F0EBE3] transition-transform duration-150 ${
                  gpsPrivacy ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!imageB64 || analyzing}
            className="w-full mt-4 h-12 bg-gradient-to-r from-[#C8956C] to-[#B8855E] hover:from-[#D4A67E] hover:to-[#C8956C] text-[#0F0F0F] font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0F0F0F]/30 border-t-[#0F0F0F] rounded-full animate-spin" />
                <span className="text-sm">Analysing scene...</span>
              </>
            ) : (
              <>
                <Compass size={18} />
                <span className="text-sm font-medium">Analyze Location</span>
              </>
            )}
          </button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-300">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Analysis Result ────────────────────────────────── */}
      <AnimatePresence>
        {analysis && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="px-6 pb-8"
          >
            <div className="max-w-[640px] mx-auto bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-[#C8956C]" />
                  <span className="text-xs font-mono-tech text-[#C8956C] uppercase tracking-wider">
                    Scene Analysis
                  </span>
                </div>
                {analysis.gps_lat && (
                  <span className="text-[10px] text-[#5A544D] font-mono-tech">
                    {analysis.gps_lat.toFixed(4)}, {analysis.gps_lng?.toFixed(4)}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-sm text-[#D4CFC4] leading-relaxed">
                  {analysis.scene_description}
                </p>
              </div>

              {/* Data grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/[0.04]">
                {/* Lighting */}
                <div className="bg-[#1A1A1A] p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5A544D]">
                    <Sun size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Light</span>
                  </div>
                  <p className="text-xs text-[#D4CFC4] leading-tight">{analysis.lighting_conditions}</p>
                </div>

                {/* Mood */}
                <div className="bg-[#1A1A1A] p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5A544D]">
                    {moodIcon(analysis.mood)}
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Mood</span>
                  </div>
                  <p className="text-xs text-[#D4CFC4] capitalize">{analysis.mood}</p>
                </div>

                {/* Time of Day */}
                <div className="bg-[#1A1A1A] p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5A544D]">
                    <Clock size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Time</span>
                  </div>
                  <p className="text-xs text-[#D4CFC4] capitalize">{analysis.time_of_day}</p>
                </div>

                {/* Location Type */}
                <div className="bg-[#1A1A1A] p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5A544D]">
                    <Landmark size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Type</span>
                  </div>
                  <p className="text-xs text-[#D4CFC4] capitalize">{analysis.location_type}</p>
                </div>

                {/* Vibe */}
                <div className="bg-[#1A1A1A] p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5A544D]">
                    <Zap size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Vibe</span>
                  </div>
                  <p className="text-xs text-[#D4CFC4]">{analysis.proposed_vibe}</p>
                </div>

                {/* Best Times */}
                <div className="bg-[#1A1A1A] p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5A544D]">
                    <Calendar size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Best</span>
                  </div>
                  <p className="text-xs text-[#D4CFC4]">
                    {analysis.proposed_best_times?.slice(0, 2).join(", ")}
                  </p>
                </div>
              </div>

              {/* Colors & Textures */}
              <div className="px-5 py-4 border-t border-white/[0.06] space-y-3">
                {/* Colors */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[#5A544D]">
                    <Palette size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Dominant Colors</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.dominant_colors?.map((color: string) => (
                      <span
                        key={color}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono-tech bg-white/[0.04] text-[#8A8279] border border-white/[0.06]"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Textures */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[#5A544D]">
                    <Waves size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Textures</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.proposed_textures?.map((t: string) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono-tech bg-white/[0.04] text-[#8A8279] border border-white/[0.06]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[#5A544D]">
                    <Tag size={12} />
                    <span className="text-[10px] uppercase tracking-wider font-mono-tech">Keywords</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.proposed_keywords?.map((kw: string) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#C8956C]/10 text-[#C8956C] border border-[#C8956C]/20"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="px-5 py-4 border-t border-white/[0.06]">
                {saved ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-[#C8956C]">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">Saved to Location KB</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-11 bg-[#C8956C]/10 hover:bg-[#C8956C]/20 border border-[#C8956C]/30 hover:border-[#C8956C]/50 text-[#C8956C] font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-30"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#C8956C]/30 border-t-[#C8956C] rounded-full animate-spin" />
                        <span className="text-sm">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span className="text-sm">Save to Location Knowledge Base</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
