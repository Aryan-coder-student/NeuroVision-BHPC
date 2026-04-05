import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, ScanLine, MessageSquare, Database, ChevronRight, Activity, Cpu } from 'lucide-react';

const CountUp = ({ to }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = parseFloat(to);
    const duration = 2000;
    const incrementTime = 30;
    const steps = duration / incrementTime;
    const stepValue = end / steps;

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);
    return () => clearInterval(timer);
  }, [to, isInView]);

  return <span ref={ref}>{Number.isInteger(parseFloat(to)) ? Math.floor(count) : count.toFixed(1)}</span>;
};

export default function Landing() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate premium loader
    const to = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(to);
  }, []);

  return (
    <div style={{ background: '#000000', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* ── Global Preloader ── */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.6 }}
            style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="network-spinner" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <motion.header 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ delay: 1.2, duration: 0.8, type: 'spring' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brain size={24} style={{ color: 'var(--text-bright)' }} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.1em' }}>NEUROVISION</span>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/login')}
          style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 24px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Sign In
        </motion.button>
      </motion.header>

      {/* ── Background Parallax Layer ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.1) 0%, rgba(147,51,234,0.05) 30%, #000000 60%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px', opacity: 0.5,
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)'
        }} />
      </div>

      {/* ── Main Content ── */}
      <main style={{ position: 'relative', zIndex: 10, paddingTop: 160 }}>
        
        {/* HERO SECTION */}
        <motion.section 
          style={{ opacity: opacityHero, y: yHero, minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px' }}
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.8 }}
            style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24, border: '1px solid rgba(6,182,212,0.3)', padding: '6px 16px', background: 'rgba(6,182,212,0.05)' }}>
            Clinical Platform 2.0
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, duration: 1, type: 'spring' }}
            className="title-glow" style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 800, lineHeight: 1.1, textAlign: 'center', letterSpacing: '-0.04em', marginBottom: 32 }}
          >
            NEUROVISION<br/>PRECISION
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }}
            style={{ fontSize: 20, color: 'var(--text-muted)', maxWidth: 640, textAlign: 'center', lineHeight: 1.6, marginBottom: 56 }}
          >
            A high-fidelity framework for neural analytics. Seamlessly integrate multi-modal AI segmentations and VQA directly into your surgical workflow.
          </motion.p>
          <motion.button 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.0, duration: 0.8 }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            style={{ background: '#fff', color: '#000', border: 'none', padding: '18px 48px', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            Deploy Workflow <ArrowRight size={18} />
          </motion.button>
        </motion.section>

        {/* CAROUSEL SECTION */}
        <section style={{ padding: '100px 0', overflow: 'hidden' }}>
          <div style={{ paddingLeft: 'max(48px, calc(50vw - 600px))', marginBottom: 48 }}>
            <h2 className="text-gradient" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>Platform Subsystems</h2>
          </div>
          
          {/* Framer Motion Draggable Carousel */}
          <motion.div 
            drag="x" dragConstraints={{ right: 0, left: -1000 }}
            style={{ display: 'flex', gap: 24, paddingLeft: 'max(48px, calc(50vw - 600px))', cursor: 'grab' }}
            whileTap={{ cursor: 'grabbing' }}
          >
            {[
              { icon: <ScanLine size={32}/>, title: '3D Segmentation', desc: 'Real-time WebGL NIfTI rendering powered by optimized U-Net models for precise volumetric extraction.', metric: '0.94 DICE', color: 'var(--neon-blue)' },
              { icon: <MessageSquare size={32}/>, title: 'Diagnostic VQA', desc: 'Multimodal transformer querying against MRI slices backed by proprietary literature weights.', metric: '91.5% F1', color: 'var(--neon-cyan)' },
              { icon: <Database size={32}/>, title: 'Federated Registry', desc: 'Secure PHI-scrubbed contribution endpoints with immutable trails for decentralized training.', metric: 'HIPAA', color: 'var(--neon-purple)' },
              { icon: <Activity size={32}/>, title: 'Pathology Reports', desc: 'Automated synthesis of clinical metrics into standardized narrative reporting for EHR ingestion.', metric: 'HL7 / FHIR', color: '#ffffff' },
            ].map((card, i) => (
              <motion.div key={i} className="glass-panel" style={{ minWidth: 400, padding: 48, display: 'flex', flexDirection: 'column' }}
                whileHover={{ y: -10, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: card.color }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div style={{ color: card.color, marginBottom: 32 }}>{card.icon}</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>{card.title}</h3>
                <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, flexGrow: 1 }}>{card.desc}</p>
                <div style={{ marginTop: 32, fontSize: 12, fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.05em', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span>METRIC</span>
                  <span style={{ color: card.color }}>{card.metric}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* STATISTICS SECTION */}
        <section style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48 }}>
          {[
            { label: 'Volumetric Accuracy', val: '99', suffix: '.8%' },
            { label: 'Global Models Deployed', val: '14', suffix: '+' },
            { label: 'Inference Latency', val: '400', suffix: 'ms' },
            { label: 'Federated Datasets', val: '1.2', suffix: 'M' }
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.03em', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CountUp to={stat.val} />
                <span className="text-gradient" style={{ fontSize: 32, marginLeft: 4 }}>{stat.suffix}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
            </div>
          ))}
        </section>

        {/* TESTIMONIALS */}
        <section style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: 64, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-cyan), var(--neon-purple))' }} />
            <Cpu size={48} style={{ color: 'var(--neon-cyan)', marginBottom: 32, opacity: 0.5 }} />
            <p style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6, marginBottom: 32 }}>
              "NeuroVision's federated infrastructure has fundamentally altered our pre-operative planning. The 3D-UNet pipeline delivers boundary estimates with a precision that borders on clairvoyance."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>SC</div>
              <div>
                <div style={{ fontWeight: 700 }}>Dr. Sarah Chen</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chief of Neurosurgery, Pan-Global Medical</div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section style={{ padding: '120px 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 32 }}>Ready for the next iteration?</h2>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/login')}
            style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '16px 40px', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            Initialize Workspace
          </motion.button>
        </section>

      </main>
    </div>
  );
}
