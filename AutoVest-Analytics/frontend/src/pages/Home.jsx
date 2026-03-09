import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingUp, Shield, BarChart3, Zap, Cpu, Building2, HeartPulse } from "lucide-react";
import "./Home.css";

export default function Home() {
  return (
    <div className="home">
      <section className="hero container">
        <div className="hero-content">
          <div className="hero-head">
            <div className="kicker">Trusted Financial Advisory</div>
            <h1 className="hero-title">Smart Stock Analytics Dashboard</h1>
            <p className="hero-subtitle">Track, Analyze & Manage Your Investments</p>
            <div className="cta-row">
              <Link to="/portfolio" className="btn-primary">
                <span>Explore Sectors</span> <ArrowUpRight className="icon-16" />
              </Link>
              <Link to="/dashboard" className="btn-ghost">
                <span>View My Portfolio</span> <Zap className="icon-16 accent" />
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&q=80&w=480"
              alt="Market analytics"
              className="hero-img float-slow"
            />
          </div>
        </div>
      </section>

      <section id="sectors" className="section container">
        <h2 className="section-title">Sectors We Cover</h2>
        <div className="sectors-grid">
          <SectorPreview image="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=600" label="IT" icon={<Cpu className="icon-16" />} />
          <SectorPreview image="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=600" label="Finance" icon={<Building2 className="icon-16" />} />
          <SectorPreview image="https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&q=80&w=600" label="Healthcare" icon={<HeartPulse className="icon-16" />} />
        </div>
      </section>

      <section id="benefits" className="section container">
        <h2 className="section-title">Why AutoVest</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><TrendingUp className="icon-16" /></div>
            <h3 className="feature-title">Real-time Stock Tracking</h3>
            <p className="feature-desc">Live signals and valuations across IT, Finance and Healthcare.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Shield className="icon-16" /></div>
            <h3 className="feature-title">Sector-wise Analysis</h3>
            <p className="feature-desc">Compare sectors and identify opportunities fast.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><BarChart3 className="icon-16" /></div>
            <h3 className="feature-title">Portfolio Insights</h3>
            <p className="feature-desc">Clear performance metrics and risk view.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>&copy; 2026 AutoVest Analytics. Empowering the next generation of investors.</p>
      </footer>
    </div>
  );
}

function SectorPreview({ image, label, icon }) {
  return (
    <div className="sector-card">
      <img src={image} alt={label} />
      <div className="sector-overlay" />
      <div className="sector-label">
        <span className="sector-icon">{icon}</span>
        <span className="sector-text">{label}</span>
      </div>
    </div>
  );
}

function FeatureCard({ image, icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{description}</p>
    </div>
  );
}