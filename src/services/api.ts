import type { Scriptment, Beat } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export async function generateScriptment(concept: string): Promise<Scriptment> {
  const res = await fetch(`${API_BASE}/scriptment/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ concept }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function generateStoryboardFrames(beats: Beat[]) {
  const res = await fetch(`${API_BASE}/storyboard/generate/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beats }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ frames: string[]; count: number }>;
}

export async function generateShootList(scriptment: Scriptment) {
  const res = await fetch(`${API_BASE}/shootlist/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scriptment }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ shots: any[]; total: number }>;
}

export async function speakDirectorNote(params: {
  shotNumber: number;
  description: string;
  compositionTip: string;
  noteType?: string;
}) {
  const res = await fetch(`${API_BASE}/voice/director-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ audio_base64: string; format: string }>;
}

export async function checkBackendStatus() {
  const res = await fetch(`${API_BASE.replace("/api", "")}/health`);
  if (!res.ok) return null;
  return res.json();
}
