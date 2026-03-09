import { Link, useLocation, useSearchParams } from "react-router-dom";
import { LayoutDashboard, PieChart, Landmark, Cpu, Building2, HeartPulse } from "lucide-react";
import "./Sidebar.css";
import   "./Navbarr.css";
export default function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activePath = location.pathname;
  const sector = searchParams.get("sector") || "";
  const normalizedSector = sector.toUpperCase();

  const SectorLink = ({ label, to, icon }) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        normalizedSector === label.toUpperCase() ? "bg-brand-accent/10 text-brand-accent" : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span>{label || "All"}</span>
    </Link>
  );

  return (
    <aside className="hidden md:block w-60 shrink-0 p-4">
      <div className="glass-card p-4">
        <div className="mb-2 text-xs font-semibold text-slate-400">Main</div>
        <NavLink to="/dashboard" label="Dashboard" icon={<LayoutDashboard className="w-4 h-4" />} active={activePath === "/dashboard"} />
        <NavLink to="/portfolio" label="Portfolio" icon={<PieChart className="w-4 h-4" />} active={activePath === "/portfolio"} />

        <div className="mt-4 mb-2 text-xs font-semibold text-slate-400">Sectors</div>
        <SectorLink label="" to="/portfolio" icon={<Landmark className="w-4 h-4" />} />
        <SectorLink label="Banking" to="/portfolio?sector=BANK" icon={<Landmark className="w-4 h-4" />} />
        <SectorLink label="IT" to="/portfolio?sector=IT" icon={<Cpu className="w-4 h-4" />} />
        <SectorLink label="Finance" to="/portfolio?sector=FINANCE" icon={<Building2 className="w-4 h-4" />} />
        <SectorLink label="Healthcare" to="/portfolio?sector=HEALTHCARE" icon={<HeartPulse className="w-4 h-4" />} />
      </div>
    </aside>
  );
}

function NavLink({ to, label, icon, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-brand-accent/10 text-brand-accent" : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
