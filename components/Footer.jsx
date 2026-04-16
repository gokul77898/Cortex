import profileData from '../data/portfolio-content.json';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="social-links">
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

      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        Designed & Built with ❤️ by{' '}
        <span className="text-gradient">{profileData.profile.name}</span>
      </p>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        © {currentYear} {profileData.profile.name}. All rights reserved.
      </p>

      <div style={{
        marginTop: '1rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
      }}>
        <span>React</span>
        <span>•</span>
        <span>Glassmorphism</span>
        <span>•</span>
        <span>Made with ❤️</span>
      </div>
    </footer>
  );
};

export default Footer;
