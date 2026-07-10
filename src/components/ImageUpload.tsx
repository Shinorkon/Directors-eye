import { useState, useRef, useCallback } from "react";
import { Camera, X, Zap, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImage: (base64: string, previewUrl: string) => void;
  onClear: () => void;
  preview: string | null;
  compact?: boolean;
  label?: string;
}

const MAX_DIM = 1024;
const QUALITY = 0.85;

function resizeCanvas(
  file: File
): Promise<{ base64: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= MAX_DIM && height <= MAX_DIM) {
        // Already small enough, just convert
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", QUALITY);
        resolve({ base64, previewUrl: base64 });
        return;
      }

      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", QUALITY);
      resolve({ base64, previewUrl: base64 });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageUpload({
  onImage,
  onClear,
  preview,
  compact = false,
  label = "Drop a photo or tap to capture",
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setIsProcessing(true);
      try {
        const { base64, previewUrl } = await resizeCanvas(file);
        onImage(base64, previewUrl);
      } catch {
        // silently fail — user can retry
      } finally {
        setIsProcessing(false);
      }
    },
    [onImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Preview state ────────────────────────────────────────
  if (preview) {
    return (
      <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40">
        <img
          src={preview}
          alt="Preview"
          className={cn(
            "w-full object-cover rounded-2xl",
            compact ? "h-32" : "h-48 sm:h-56"
          )}
        />
        {/* Overlay on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute top-3 right-3 bg-black/70 hover:bg-red-600 
                     text-white rounded-full p-2 transition-all duration-200
                     opacity-0 group-hover:opacity-100 backdrop-blur-sm"
        >
          <X size={16} />
        </button>
        <div
          className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t 
                        from-black/80 to-transparent flex items-end px-4 pb-2"
        >
          <span className="text-xs text-white/60 font-medium tracking-wide">
            SCENE PHOTO ATTACHED
          </span>
        </div>
      </div>
    );
  }

  // ── Drop zone ─────────────────────────────────────────────
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-default transition-all duration-300",
        compact ? "h-32 px-4" : "h-48 sm:h-56 px-6",
        isDragOver
          ? "border-amber-400 bg-amber-400/10 scale-[1.02]"
          : "border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]",
        isProcessing && "opacity-50 pointer-events-none"
      )}
    >
      {/* Hidden: camera capture */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Hidden: gallery / file picker */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {isProcessing ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/50 font-medium">Processing...</span>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInput.current?.click();
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200",
                "hover:bg-amber-400/10 hover:text-amber-400 text-white/40"
              )}
              title="Take a photo"
            >
              <Camera size={compact ? 20 : 24} />
              <span className="text-[10px] font-medium tracking-wide uppercase">Capture</span>
            </button>

            <span className="text-white/15 text-xs font-light">or</span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInput.current?.click();
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200",
                "hover:bg-amber-400/10 hover:text-amber-400 text-white/40"
              )}
              title="Choose from gallery"
            >
              <ImageIcon size={compact ? 20 : 24} />
              <span className="text-[10px] font-medium tracking-wide uppercase">Attach</span>
            </button>
          </div>

          {/* Drag hint */}
          <p className="text-xs text-white/30">{label}</p>

          {/* AI pill */}
          <span className="flex items-center gap-1.5 text-[10px] text-white/30 bg-white/5 rounded-full px-3 py-1">
            <Zap size={10} />
            Analyzed by AI
          </span>
        </>
      )}
    </div>
  );
}
