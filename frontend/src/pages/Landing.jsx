import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, ClipboardList, Layers3, ScanLine, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import './Landing.css';

const capabilities = [
  {
    number: '01',
    icon: <Building2 size={23} strokeWidth={1.6} aria-hidden="true" />,
    title: 'Institution workspaces',
    description: 'Keep institutional context and team access connected as you move between projects.',
    label: 'Platform foundation',
  },
  {
    number: '02',
    icon: <Users size={23} strokeWidth={1.6} aria-hidden="true" />,
    title: 'Patient records',
    description: 'Manage patient records within your institution, with role-aware access to the workspace.',
    label: 'Patient management',
  },
  {
    number: '03',
    icon: <ScanLine size={23} strokeWidth={1.6} aria-hidden="true" />,
    title: 'Imaging workspace',
    description: 'Explore MRI visualization and experimental segmentation tools in a patient-centered workflow.',
    label: 'Research tools',
  },
  {
    number: '04',
    icon: <ClipboardList size={23} strokeWidth={1.6} aria-hidden="true" />,
    title: 'Research workflow',
    description: 'Bring model exploration, feedback, and reporting concepts into one evolving platform.',
    label: 'In development',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const entryPath = user ? '/select-org' : '/login';

  return (
    <div className="nv-landing">
      <a className="nv-skip-link" href="#main-content">Skip to content</a>

      <header className="nv-header">
        <div className="nv-header-inner">
          <Link className="nv-wordmark" to="/" aria-label="NeuroVision home">
            <span className="nv-mark"><Layers3 size={19} strokeWidth={1.9} aria-hidden="true" /></span>
            <span>NeuroVision<span className="nv-wordmark-dot">.</span></span>
          </Link>
          <nav className="nv-navigation" aria-label="Main navigation">
            <a href="#capabilities">Platform</a>
            <a href="#workflow">How it works</a>
            <a href="#about">About</a>
          </nav>
          <Link className="nv-header-cta" to={entryPath}>
            <span>{user ? 'My workspace' : 'Sign in'}</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="nv-hero" aria-labelledby="nv-hero-title">
          <div className="nv-container nv-hero-grid">
            <div className="nv-hero-copy">
              <div className="nv-eyebrow"><span className="nv-eyebrow-line" /> Clinical research software</div>
              <h1 id="nv-hero-title">A clearer home for <em>clinical imaging</em> work.</h1>
              <p className="nv-hero-description">
                Patient records, institutional workspaces, and experimental imaging tools—
                organized in one place for research teams.
              </p>
              <div className="nv-hero-actions">
                <Link className="nv-button nv-button-primary" to={entryPath}>
                  {user ? 'Open your workspace' : 'Explore the platform'} <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="nv-text-link" href="#capabilities">See what is inside <ArrowUpRight size={16} aria-hidden="true" /></a>
              </div>
              <p className="nv-hero-note"><ShieldCheck size={15} aria-hidden="true" /> Research software in active development. Not for clinical diagnosis.</p>
            </div>

            <div className="nv-preview" aria-label="Illustrative layout of a NeuroVision patient workspace">
              <div className="nv-preview-top">
                <span className="nv-preview-logo"><Layers3 size={17} aria-hidden="true" /> NV / Workspace</span>
                <span className="nv-preview-example">INTERFACE PREVIEW</span>
              </div>
              <div className="nv-preview-body">
                <div className="nv-preview-aside" aria-hidden="true">
                  <span className="nv-preview-aside-active"><span>01</span> Overview</span>
                  <span><span>02</span> Patients</span>
                  <span><span>03</span> Imaging</span>
                  <span><span>04</span> Reports</span>
                </div>
                <div className="nv-preview-main">
                  <div className="nv-preview-overline">PATIENT WORKSPACE / EXAMPLE</div>
                  <h2>Keep the important work together.</h2>
                  <p>One place to find your patient context and move between tools.</p>
                  <div className="nv-preview-document">
                    <div className="nv-preview-document-head">
                      <span><span className="nv-preview-square" /> Workspace overview</span>
                      <span className="nv-preview-pill">Illustrative</span>
                    </div>
                    <div className="nv-preview-document-row"><span>01</span><strong>Patient information</strong><span>Organize</span></div>
                    <div className="nv-preview-document-row"><span>02</span><strong>Imaging workspace</strong><span>Explore</span></div>
                    <div className="nv-preview-document-row"><span>03</span><strong>Research notes</strong><span>Review</span></div>
                  </div>
                </div>
              </div>
              <div className="nv-preview-bottom"><span>BUILT AROUND A CONTINUOUS WORKFLOW</span><span>NEUROVISION / 2026</span></div>
            </div>
          </div>
          <div className="nv-hero-index nv-container"><span>01 / INTRODUCTION</span><span>SCROLL TO EXPLORE ↓</span></div>
        </section>

        <section id="capabilities" className="nv-section nv-capabilities">
          <div className="nv-container">
            <div className="nv-section-heading">
              <span className="nv-section-kicker">WHAT'S INSIDE</span>
              <div><h2>Purposeful tools.<br /><em>One connected space.</em></h2><p>Start with the essentials. Move between institution, patient, and research context without losing your place.</p></div>
            </div>
            <div className="nv-feature-grid">
              {capabilities.map((item) => (
                <article className="nv-feature" key={item.number}>
                  <div className="nv-feature-top"><span>{item.number}</span>{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="nv-feature-footer">{item.label}<ArrowUpRight size={17} aria-hidden="true" /></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="nv-section nv-workflow">
          <div className="nv-container nv-workflow-grid">
            <div className="nv-workflow-copy">
              <span className="nv-section-kicker">A SIMPLER WORKFLOW</span>
              <h2>Designed around the work, <em>not the buzzwords.</em></h2>
              <p>NeuroVision is being built as a practical workspace for institutions managing patient context alongside imaging research.</p>
              <Link className="nv-text-link" to={entryPath}>Go to your workspace <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="nv-steps">
              <div className="nv-step"><span>01</span><div><h3>Choose your institution</h3><p>Open the workspace you are authorized to use.</p></div><Building2 size={20} aria-hidden="true" /></div>
              <div className="nv-step"><span>02</span><div><h3>Find your patient record</h3><p>Keep record details and related tools in the same context.</p></div><Users size={20} aria-hidden="true" /></div>
              <div className="nv-step"><span>03</span><div><h3>Explore research tools</h3><p>Review experimental visualization and analysis workflows as they develop.</p></div><ScanLine size={20} aria-hidden="true" /></div>
            </div>
          </div>
        </section>

        <section id="about" className="nv-about">
          <div className="nv-container nv-about-grid">
            <span className="nv-section-kicker">ABOUT THIS PROJECT</span>
            <div>
              <h2>Built for clarity.<br />Evolving with research.</h2>
              <p>NeuroVision is an evolving clinical-imaging research project. Features are being developed incrementally; model outputs and demonstrations should not be used for medical decisions.</p>
            </div>
            <Link className="nv-button nv-button-light" to={entryPath}>Enter the workspace <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <footer className="nv-footer">
        <div className="nv-container nv-footer-inner">
          <span className="nv-wordmark"><span className="nv-mark"><Layers3 size={16} aria-hidden="true" /></span>NeuroVision.</span>
          <span>Clinical imaging research platform · Not for diagnostic use</span>
          <a href="#main-content">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
