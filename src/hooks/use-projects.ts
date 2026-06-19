import { useState, useEffect, useCallback } from "react";
import type { Scriptment } from "@/types";
import { listProjects, saveProject, updateProject, deleteProject } from "@/services/api";

export interface ProjectSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  shot_count: number;
  completed_shots: number;
  hero_frame: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects();
      setProjects(data || []);
    } catch (err: any) {
      console.warn("Failed to load projects:", err);
      setError("Could not load projects from server.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (scriptment: Scriptment, heroFrame?: string) => {
    const result = await saveProject({
      scriptment,
      hero_frame: heroFrame || "",
    });
    await refresh();
    return result;
  }, [refresh]);

  const update = useCallback(async (id: string, updates: {
    title?: string;
    scriptment?: Scriptment;
    completed_shots?: number;
    hero_frame?: string;
  }) => {
    const result = await updateProject(id, updates);
    await refresh();
    return result;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const ok = await deleteProject(id);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  return {
    projects,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
  };
}
