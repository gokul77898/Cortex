import { useState, useEffect, useRef } from 'react';
import profileData from '../data/portfolio-content.json';

const Contact = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });

    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <section id="contact" className="section" ref={sectionRef}>
      <h2 className={`section-title ${isVisible ? 'animate-fade-in' : ''}`}>
        Get In <span className="text-gradient">Touch</span>
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '3rem',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        {/* Contact Info */}
        <div className={isVisible ? 'animate-fade-in-up' : ''}>
          <h3 style={{
            fontSize: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            Let's work together
          </h3>

          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
          }}>
            I'm always open to discussing new projects, creative ideas,
            or opportunities to be part of your vision.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>📧</span>
              <div>
                <p style={{ fontWeight: '600' }}>Email</p>
                <a
                  href={`mailto:${profileData.profile.email}`}
                  style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}
                >
                  {profileData.profile.email}
                </a>
              </div>
            </div>

            <div className="glass-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
              <div>
                <p style={{ fontWeight: '600' }}>Location</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {profileData.profile.location}
                </p>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Find me on
            </h4>
            <div className="social-links" style={{ justifyContent: 'flex-start' }}>
              {Object.entries(profileData.social).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  title={platform}
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

        {/* Contact Form */}
        <form
          className={`contact-form glass-card ${isVisible ? 'animate-fade-in-up' : ''}`}
          onSubmit={handleSubmit}
          style={{
            padding: '2rem',
            animationDelay: '0.2s',
          }}
        >
          {submitted ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
            }}>
              <span style={{ fontSize: '4rem' }}>✅</span>
              <h3 style={{ marginTop: '1rem' }}>Message Sent!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                I'll get back to you soon.
              </p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <textarea
                  name="message"
                  placeholder="Your Message"
                  className="form-input"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-pulse">Sending...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    Send Message
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default Contact;
