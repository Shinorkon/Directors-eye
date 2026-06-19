import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Film, Plus, Trash2, Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";

export default function Archive() {
  const navigate = useNavigate();
  const { projects, loading, remove } = useProjects();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await remove(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#8A8279]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading projects...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Film className="w-16 h-16 text-[#5A544D] mx-auto mb-4" />
          <h2 className="font-serif-display text-2xl text-[#5A544D] mb-2">No projects yet</h2>
          <p className="text-sm text-[#8A8279] mb-6 max-w-[300px] mx-auto">
            Your first cinematic story starts with a single idea.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-lg transition-all duration-150"
          >
            Create First Project
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-serif-display text-3xl text-[#F0EBE3]">Projects</h1>
            <span className="font-mono-tech text-[10px] text-[#C8956C] bg-[#C8956C]/10 px-2 py-1 rounded">
              {projects.length}
            </span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#C8956C] hover:bg-[#D4A67E] text-[#0F0F0F] text-sm font-medium rounded-lg transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onClick={() =>
                navigate("/scriptment", {
                  state: { projectId: project.id },
                })
              }
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg overflow-hidden cursor-pointer group hover:bg-[#232323] hover:border-white/[0.12] transition-all duration-150 relative"
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[#8A8279] hover:text-red-400 hover:bg-black/60"
                title="Delete project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Hero Frame */}
              <div className="aspect-video bg-[#232323] overflow-hidden">
                {project.hero_frame ? (
                  <img
                    src={project.hero_frame}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-8 h-8 text-[#3A3530]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-serif-display text-base text-[#F0EBE3] mb-1 truncate">
                  {project.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tech text-[10px] text-[#8A8279]">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono-tech text-[10px] text-[#5A544D]">
                    {project.shot_count} shots
                  </span>
                  {project.completed_shots > 0 && (
                    <span className="font-mono-tech text-[10px] text-[#7BAE7F]">
                      {project.completed_shots}/{project.shot_count} done
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
