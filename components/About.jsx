import { useEffect, useRef, useState } from 'react';
import profileData from '../data/portfolio-content.json';

const About = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="section" ref={sectionRef}>
      <h2 className={`section-title ${isVisible ? 'animate-fade-in' : ''}`}>
        About <span className="text-gradient">Me</span>
      </h2>

      <div className={`about-grid ${isVisible ? 'animate-fade-in-up' : ''}`}>
        <div className="about-image glass-card">
          <div style={{
            width: '100%',
            height: '400px',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8rem',
            borderRadius: 'var(--radius-lg)',
          }}>
            👨‍💻
          </div>
        </div>

        <div className="about-text">
          <h3 style={{
            fontSize: '1.5rem',
            marginBottom: '1rem',
            color: 'var(--accent-cyan)',
          }}>
            {profileData.profile.title}
          </h3>

          {profileData.experience.map((exp, index) => (
            <div
              key={index}
              className="glass-card"
              style={{
                padding: '1.5rem',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: 'linear-gradient(180deg, var(--accent-purple), var(--accent-cyan))',
              }} />
              <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                {exp.role}
              </h4>
              <p style={{ color: 'var(--accent-cyan)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {exp.company} • {exp.period}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {exp.description}
              </p>
            </div>
          ))}

          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Let's Connect
            </h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {Object.entries(profileData.social).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card"
                  style={{
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                  }}
                >
                  {platform === 'github' && '🔗'}
                  {platform === 'linkedin' && '💼'}
                  {platform === 'twitter' && '🐦'}
                  {platform === 'portfolio' && '🌐'}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
