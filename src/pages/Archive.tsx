import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Plus } from "lucide-react";
import { sampleProject } from "@/data/demo";
import type { Project } from "@/types";

export default function Archive() {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>([sampleProject]);

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
                  state: { concept: project.title },
                })
              }
              className="bg-[#1A1A1A] border border-white/[0.06] rounded-lg overflow-hidden cursor-pointer group hover:bg-[#232323] hover:border-white/[0.12] transition-all duration-150"
            >
              {/* Hero Frame */}
              <div className="aspect-video bg-[#232323] overflow-hidden">
                <img
                  src={project.heroFrame}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-serif-display text-base text-[#F0EBE3] mb-1 truncate">
                  {project.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tech text-[10px] text-[#8A8279]">
                    {project.createdAt}
                  </span>
                  <span className="font-mono-tech text-[10px] text-[#5A544D]">
                    {project.shotCount} shots
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
