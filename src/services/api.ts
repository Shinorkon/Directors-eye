import type { Scriptment, Beat } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function generateScriptment(
  concept: string,
  mode?: string,
  antiTourism?: boolean
): Promise<Scriptment> {
  const res = await fetch(`${API_BASE}/scriptment/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      concept,
      mode: mode || "normal",
      anti_tourism: antiTourism || false,
    }),
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
  const res = await fetch(`/health`);
  if (!res.ok) return null;
  return res.json();
}

// ─── Project Persistence ─────────────────────────────────────────

export async function listProjects(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) return [];
  return res.json();
}

export async function getProject(id: string): Promise<any | null> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveProject(project: {
  id?: string;
  scriptment: Scriptment;
  hero_frame?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: project.id || "",
      scriptment: project.scriptment,
      hero_frame: project.hero_frame || "",
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateProject(
  id: string,
  updates: {
    title?: string;
    scriptment?: Scriptment;
    completed_shots?: number;
    hero_frame?: string;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteProject(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
  });
  return res.ok;
}

// ─── Settings & Gear ─────────────────────────────────────────────

export async function getSettingsAPI(): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) return {};
  return res.json();
}

export async function saveSettingAPI(key: string, value: any): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getGearAPI(): Promise<any | null> {
  const res = await fetch(`${API_BASE}/gear`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveGearAPI(profile: any): Promise<any> {
  const res = await fetch(`${API_BASE}/gear`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Genre Explorer ──────────────────────────────────────────────

export async function exploreGenres(
  concept: string,
  mode?: string,
  antiTourism?: boolean
): Promise<{ variants: any[] }> {
  const res = await fetch(`${API_BASE}/explore/genres`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      concept,
      mode: mode || "normal",
      anti_tourism: antiTourism || false,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Locations ───────────────────────────────────────────────────

export async function listLocations(): Promise<any> {
  const res = await fetch(`${API_BASE}/locations`);
  if (!res.ok) return {};
  return res.json();
}
