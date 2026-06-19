const API_BASE = "http://37.60.229.74:8080/api";

export async function generateScriptment(concept: string) {
  const res = await fetch(`${API_BASE}/scriptment/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ concept }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function generateStoryboardFrames(beats: any[]) {
  const res = await fetch(`${API_BASE}/storyboard/generate/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beats }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function generateShootList(scriptment: any) {
  const res = await fetch(`${API_BASE}/shootlist/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scriptment }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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
  scriptment: any;
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

export async function updateProject(id: string, updates: any): Promise<any> {
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
