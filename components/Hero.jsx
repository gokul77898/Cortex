import { useState, useEffect } from 'react';
import profileData from '../data/portfolio-content.json';

const Hero = () => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const roles = [
    'Full-Stack Developer',
    'AI Engineer',
    'Open Source Contributor',
    'Problem Solver',
  ];

  useEffect(() => {
    const currentRole = roles[currentIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentRole.length) {
          setDisplayText(currentRole.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % roles.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentIndex]);

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero">
      {/* Animated particles */}
      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
            }}
          />
        ))}
      </div>

      <div className="hero-content">
        <p className="hero-greeting animate-fade-in">Welcome to my universe</p>

        <h1 className="hero-title">
          Hi, I'm <span className="text-gradient">{profileData.profile.name}</span>
        </h1>

        <h2 className="hero-subtitle">
          <span className="typewriter">{displayText}</span>
          <span className="cursor">|</span>
        </h2>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.25rem',
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem'
        }}>
          {profileData.profile.bio}
        </p>

        <div className="hero-cta">
          <button
            className="btn btn-primary"
            onClick={() => scrollTo('projects')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 9a9 9 0 0 1 9-9h2a9 9 0 0 1 9 9v6a9 9 0 0 1-9 9H9a9 9 0 0 1-9-9V9z"/>
              <path d="M9 12h6M12 9v6"/>
            </svg>
            View My Work
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => scrollTo('contact')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Get In Touch
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '3rem',
          marginTop: '4rem',
          flexWrap: 'wrap'
        }}>
          {Object.entries(profileData.stats).map(([key, value]) => (
            <div key={key} className="stat-item" style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {value}
              </div>
              <div style={{
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontSize: '0.875rem'
              }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="scroll-indicator animate-pulse" style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M19 12l-7 7-7-7"/>
        </svg>
      </div>

      <style>{`
        .cursor {
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .typewriter {
          color: var(--accent-cyan);
        }
      `}</style>
    </section>
  );
};

export default Hero;
