import { useEffect, useRef, useState } from 'react';
import profileData from '../data/portfolio-content.json';

const Projects = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
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

  const featuredProjects = profileData.projects.filter(p => p.featured);
  const otherProjects = profileData.projects.filter(p => !p.featured);

  return (
    <section id="projects" className="section" ref={sectionRef}>
      <h2 className={`section-title ${isVisible ? 'animate-fade-in' : ''}`}>
        Featured <span className="text-gradient">Projects</span>
      </h2>

      {/* Featured Projects */}
      <div className="projects-grid">
        {featuredProjects.map((project, index) => (
          <div
            key={project.id}
            className={`glass-card project-card ${isVisible ? 'animate-fade-in-up' : ''}`}
            style={{
              animationDelay: `${index * 0.15}s`,
            }}
            onMouseEnter={() => setActiveProject(project.id)}
            onMouseLeave={() => setActiveProject(null)}
          >
            {/* Project Image Placeholder */}
            <div style={{
              height: '200px',
              background: `linear-gradient(135deg,
                hsl(${index * 60}, 70%, 50%),
                hsl(${index * 60 + 30}, 70%, 40%))`,
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              overflow: 'hidden',
            }}>
              {index === 0 ? '🤖' : index === 1 ? '🌊' : '🕷️'}
            </div>

            <div className="project-content">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">{project.description}</p>

              <div className="project-tags">
                {project.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="project-tag">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Links */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1rem',
              }}>
                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    🔗 GitHub
                  </a>
                )}
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    🌐 Live Demo
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Other Projects */}
      {otherProjects.length > 0 && (
        <>
          <h3 style={{
            textAlign: 'center',
            marginTop: '4rem',
            marginBottom: '2rem',
            color: 'var(--text-secondary)',
          }}>
            Other Notable Projects
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {otherProjects.map((project, index) => (
              <div
                key={project.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.3s ease-out ${(featuredProjects.length + index) * 0.1}s`,
                }}
              >
                <h4 style={{
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                }}>
                  {project.title}
                </h4>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}>
                  {project.description}
                </p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}>
                  {project.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(168, 85, 247, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--accent-purple)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default Projects;
