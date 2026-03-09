import { useEffect, useRef, useState } from "react";
import "./StatsCard.css";
import "./Navbarr.css"

export default function StatsCard({ title, value, suffix = "", accent = "neutral" }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const startTs = performance.now();
    const step = (ts) => {
      const progress = Math.min(1, (ts - startTs) / duration);
      setDisplay(Math.round((start + (value - start) * progress) * 100) / 100);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  const accentColor = accent === "opportunity" ? "text-opportunity"
    : accent === "overvalued" ? "text-overvalued" : "text-neutral";

  return (
    <div className="card-glass p-4">
      <div className="text-sm text-neutral">{title}</div>
      <div ref={ref} className={`text-2xl font-semibold ${accentColor}`}>
        {display}{suffix}
      </div>
    </div>
  );
}