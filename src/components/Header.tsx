import { Film, Sliders, Camera, Aperture } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { path: "/", icon: Aperture, label: "Create" },
    { path: "/archive", icon: Film, label: "Projects" },
    { path: "/settings", icon: Sliders, label: "Settings" },
    { path: "/gear", icon: Camera, label: "Gear" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 transition-all duration-300 ${
        scrolled
          ? "bg-[#0F0F0F]/90 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <Link to="/" className="flex items-center gap-2 group">
        <Aperture className="w-5 h-5 text-[#C8956C] transition-transform duration-300 group-hover:rotate-90" />
        <span className="font-serif-display text-lg text-[#F0EBE3] tracking-tight">
          Director&apos;s Eye
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`relative p-2.5 rounded-lg transition-all duration-150 group ${
                isActive
                  ? "text-[#C8956C]"
                  : "text-[#8A8279] hover:text-[#F0EBE3] hover:bg-white/[0.04]"
              }`}
              title={label}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#C8956C] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
