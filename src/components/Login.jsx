import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Query the custom 'users' table for email and password matching
      const { data, error: tableError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (tableError || !data) {
        throw new Error('Invalid email or password.');
      }

      setSuccess(true);
      // Pass the custom user object to App.jsx after a short delay
      setTimeout(() => {
        onLoginSuccess(data);
      }, 800);
    } catch (err) {
      setError(err.message === 'JSON object requested, multiple (or no) rows returned'
        ? 'Invalid email or password.'
        : err.message || 'Access denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <button className="theme-toggle-fixed" onClick={toggleTheme}>
        {theme === 'light' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        )}
      </button>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-image-side">
            <img src="/auth_hero.png" alt="Revenue Analysis" className="hero-img" />
            <div className="image-caption">
              <div className="badge-light">
                <span className="dot"></span>
                Daily Progress Tracker
              </div>
            </div>
          </div>

          <div className="auth-form-side">
            <div className="auth-header">
              <h1>Sign in to Dashboard</h1>
              <p>Secure access to your revenue tracking and reporting portal.</p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Security Password</label>
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-eye"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="alert-red">{error}</div>}
              {success && <div className="alert-green">Verification successful. Redirecting...</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn-submit"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Experiencing issues? <a href="#">Contact Infrastructure Support</a></p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-main);
          position: relative;
        }

        .theme-toggle-fixed {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid var(--border-medium);
          background: var(--bg-side);
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .auth-container {
          width: 100%;
          max-width: 1000px;
          padding: 2rem;
        }

        .auth-card {
          display: flex;
          min-height: 620px;
          background: var(--bg-side);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 30px rgba(0,0,0,0.03);
          border: 1px solid var(--border-light);
        }

        .auth-image-side {
          flex: 1.1;
          position: relative;
          background: #020617;
        }

        .hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
        }

        .image-caption {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          z-index: 2;
        }

        .badge-light {
          background: rgba(255, 255, 255, 0.95);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .badge-light .dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
        }

        .auth-form-side {
          flex: 1;
          padding: 4rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .auth-header {
          margin-bottom: 3rem;
        }

        .auth-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: var(--text-main);
        }

        .auth-header p {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .form-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: var(--bg-subtle);
          border: 1px solid var(--border-medium);
          border-radius: 6px;
          color: var(--text-main);
          font-size: 0.9rem;
          transition: var(--transition-fast);
          outline: none;
        }

        .form-input:focus {
          border-color: var(--primary);
          background: var(--bg-side);
        }

        .password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-eye {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
        }

        .alert-red {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.05);
          color: #ef4444;
          font-size: 0.85rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }

        .alert-green {
          padding: 0.75rem;
          background: rgba(16, 185, 129, 0.05);
          color: #10b981;
          font-size: 0.85rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .btn-submit {
          width: 100%;
          padding: 1rem;
          background: var(--primary);
          color: var(--text-on-primary);
          border: none;
          border-radius: 6px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .btn-submit:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .auth-footer {
          margin-top: 2.5rem;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .auth-footer a {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        @media (max-width: 800px) {
          .auth-container { padding: 1rem; }
          .auth-card { flex-direction: column; min-height: auto; width: 100%; border-radius: 20px; }
          .auth-image-side { min-height: 180px; flex: none; }
          .auth-form-side { padding: 2.5rem 1.5rem; }
          .auth-header h1 { font-size: 1.6rem; }
          .theme-toggle-fixed { top: 1rem; right: 1rem; width: 38px; height: 38px; }
        }
      `}</style>
    </div>
  );
};

export default Login;
