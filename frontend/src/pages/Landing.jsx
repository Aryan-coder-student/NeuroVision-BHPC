import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, FileText, ScanLine, Shield, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import config from '../config';
import './Landing.css';

const capabilities = [
  {
    number: '01',
    icon: Users,
    title: 'Patient records',
    description: 'Create and review patient records inside your organization’s workspace, with access controlled by membership and role.',
    status: 'Available in workspace',
  },
  {
    number: '02',
    icon: ScanLine,
    title: 'Imaging workspace',
    description: 'Explore the segmentation viewer and image-based question-answering tools as part of the research workflow.',
    status: 'Research tools',
  },
  {
    number: '03',
    icon: FileText,
    title: 'Review and reporting',
    description: 'Keep imaging tools and report workflows connected to patient context. Persistent clinical reporting remains in development.',
    status: 'In development',
  },
];

const workflow = [
  { count: '01', title: 'Sign in', body: 'Use your registered account to enter the platform.' },
  { count: '02', title: 'Choose a workspace', body: 'Access the institution you belong to, with its own patient records.' },
  { count: '03', title: 'Open a patient', body: 'Move from the patient record to the available imaging and review tools.' },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspacePath = user ? '/select-org' : '/login';

  useEffect(() => {
    if (!config.isMainDomain) navigate('/dashboard', { replace: true });
  }, [navigate]);

  if (!config.isMainDomain) return null;

  return (
    <div className="landing">
      <a className="landing-skip" href="#landing-main">Skip to content</a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link className="landing-brand" to="/" aria-label="NeuroVision home">
            <span className="landing-brand-mark" aria-hidden="true"><ScanLine size={23} strokeWidth={1.8} /></span>
            <span className="landing-brand-name">NeuroVision<span className="landing-brand-sub">Imaging workspace</span></span>
          </Link>
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#workflow">How it works</a>
            <a href="#about">About</a>
          </nav>
          <Link className="landing-nav-cta" to={workspacePath}>
            {user ? 'Open workspace' : 'Sign in'} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="landing-main">
        <section className="landing-hero landing-container" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow"><span className="landing-eyebrow-line" /> A workspace for brain imaging research</p>
            <h1 id="landing-title">Clarity for the work behind every scan.</h1>
            <p className="landing-hero-intro">
              Patient records, imaging tools, and research workflows in one organized place.
              Built for teams that need to focus on the case—not the interface.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-button-primary" to={workspacePath}>
                {user ? 'Enter your workspace' : 'Sign in to your workspace'}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className="landing-text-link" href="#platform">
                Explore the platform <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <p className="landing-hero-footnote">Research and development platform · Not for clinical diagnosis</p>
          </div>

          <div className="landing-preview" aria-label="Illustration of NeuroVision workspace layout">
            <div className="landing-preview-top">
              <span className="landing-preview-mark"><ScanLine size={17} aria-hidden="true" /> NeuroVision</span>
              <span className="landing-preview-caption">WORKSPACE PREVIEW</span>
            </div>
            <div className="landing-preview-content">
              <div className="landing-preview-heading">
                <span className="landing-preview-kicker">ORGANIZATION / PATIENTS</span>
                <strong>Patient workspace</strong>
                <span>Records and related tools in context</span>
              </div>
              <div className="landing-preview-columns">
                <div className="landing-preview-list">
                  <div className="landing-preview-list-title">Patient registry <span>EXAMPLE</span></div>
                  <div className="landing-preview-record active">
                    <span className="landing-preview-initials">01</span>
                    <span><strong>Sample record 01</strong><small>Example patient</small></span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </div>
                  <div className="landing-preview-record">
                    <span className="landing-preview-initials">02</span>
                    <span><strong>Sample record 02</strong><small>Example patient</small></span>
                  </div>
                  <div className="landing-preview-record">
                    <span className="landing-preview-initials">03</span>
                    <span><strong>Sample record 03</strong><small>Example patient</small></span>
                  </div>
                </div>
                <div className="landing-preview-detail">
                  <div className="landing-preview-detail-header">
                    <span>WORKSPACE TOOLS</span>
                    <span className="landing-preview-status">Research environment</span>
                  </div>
                  <div className="landing-preview-detail-row"><Users size={18} aria-hidden="true" /><span>Patient overview</span><ArrowUpRight size={15} aria-hidden="true" /></div>
                  <div className="landing-preview-detail-row"><ScanLine size={18} aria-hidden="true" /><span>Segmentation viewer</span><ArrowUpRight size={15} aria-hidden="true" /></div>
                  <div className="landing-preview-detail-row"><FileText size={18} aria-hidden="true" /><span>Review notes</span><ArrowUpRight size={15} aria-hidden="true" /></div>
                  <div className="landing-preview-detail-footer">Illustrative layout · No real patient data</div>
                </div>
              </div>
            </div>
            <div className="landing-preview-bottom"><span>NEUROVISION / RESEARCH</span><span>01 — 03</span></div>
          </div>
        </section>

        <section id="platform" className="landing-capabilities" aria-labelledby="landing-capabilities-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div><p className="landing-section-tag">THE PLATFORM</p><h2 id="landing-capabilities-title">A place for the whole workflow.</h2></div>
              <p>Designed around patient context and practical research tasks, rather than dashboards for their own sake.</p>
            </div>
            <div className="landing-feature-grid">
              {capabilities.map(({ number, icon: Icon, title, description, status }) => (
                <article className="landing-feature" key={number}>
                  <span className="landing-feature-number">{number} / 03</span>
                  <span className="landing-feature-icon"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="landing-feature-status">{status}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="landing-workflow landing-container" aria-labelledby="landing-workflow-title">
          <div className="landing-workflow-heading"><p className="landing-section-tag">A SIMPLE START</p><h2 id="landing-workflow-title">From sign-in to patient context.</h2></div>
          <div className="landing-steps">
            {workflow.map(step => (
              <div className="landing-step" key={step.count}>
                <span>{step.count}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="landing-about" aria-labelledby="landing-about-title">
          <div className="landing-container landing-about-inner">
            <div><span className="landing-about-icon"><Building2 size={23} aria-hidden="true" /></span><p className="landing-section-tag">BUILT WITH CARE</p><h2 id="landing-about-title">Structure before spectacle.</h2></div>
            <div>
              <p>NeuroVision is an evolving, multi-tenant research platform for organizing patient data and exploring brain imaging workflows.</p>
              <p className="landing-about-disclaimer"><Shield size={17} aria-hidden="true" /> It is not a certified medical device and must not be used to make clinical decisions.</p>
              <Link className="landing-button landing-button-light" to={workspacePath}>{user ? 'Open your workspace' : 'Sign in'}<ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand"><ScanLine size={19} aria-hidden="true" /><strong>NeuroVision</strong></div>
          <span>Brain imaging research workspace</span>
          <a href="#landing-main">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
