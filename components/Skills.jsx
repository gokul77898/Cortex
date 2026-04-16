import { useEffect, useRef, useState } from 'react';
import profileData from '../data/portfolio-content.json';

const Skills = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const categoryIcons = {
    'Frontend': '🎨',
    'Backend': '⚙️',
    'AI/ML': '🤖',
    'DevOps & Tools': '🛠️',
  };

  return (
    <section id="skills" className="section" ref={sectionRef}>
      <h2 className={`section-title ${isVisible ? 'animate-fade-in' : ''}`}>
        My <span className="text-gradient">Skills</span>
      </h2>

      <div className="skills-grid">
        {profileData.skills.map((category, catIndex) => (
          <div
            key={catIndex}
            className={`glass-card skill-card ${isVisible ? 'animate-fade-in-up' : ''}`}
            style={{
              animationDelay: `${catIndex * 0.1}s`,
              opacity: isVisible ? 1 : 0,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '2rem' }}>
                {categoryIcons[category.category] || '💡'}
              </span>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
              }}>
                {category.category}
              </h3>
            </div>

            {category.items.map((skill, skillIndex) => (
              <div
                key={skillIndex}
                style={{ marginBottom: '1.25rem' }}
              >
                <div className="skill-name">
                  <span>{skill.name}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>
                    {skill.level}%
                  </span>
                </div>
                <div className="skill-bar">
                  <div
                    className="skill-progress"
                    style={{
                      width: isVisible ? `${skill.level}%` : '0%',
                      transition: `width 1s ease-out ${skillIndex * 0.1}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Additional Skills Cloud */}
      <div style={{
        marginTop: '4rem',
        textAlign: 'center',
      }}>
        <h3 style={{
          marginBottom: '2rem',
          color: 'var(--text-secondary)',
        }}>
          Technologies I Work With
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.75rem',
        }}>
          {[
            'React', 'Node.js', 'TypeScript', 'Python', 'Docker',
            'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
            'AWS', 'GCP', 'Kubernetes', 'CI/CD', 'Git',
            'Tailwind', 'Next.js', 'FastAPI', 'LangChain', 'OpenAI'
          ].map((tech, index) => (
            <span
              key={index}
              className="glass-card"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.3s ease-out ${index * 0.05}s`,
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
