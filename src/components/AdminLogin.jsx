import { useState } from 'react';
import { supabase } from '../../supabase';

const AdminLogin = ({ onLoginSuccess }) => {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Hardcoded credentials as requested
            if (id === 'admin' && password === 'password123') {
                onLoginSuccess({ id: 'admin', role: 'admin', name: 'Super Admin' });
            } else {
                throw new Error('Authentication failed. Invalid Admin ID or Password.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-wrapper">
            <div className="admin-auth-card">
                <div className="auth-header">
                    <h1>Admin Control</h1>
                    <p>Enter administrative credentials to access the internal management portal.</p>
                </div>

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="form-group">
                        <label>Admin ID</label>
                        <input
                            type="text"
                            placeholder="Enter ID"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Access Password</label>
                        <div className="password-wrap">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
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

                    <button type="submit" disabled={loading} className="btn-admin-submit">
                        {loading ? 'Authenticating...' : 'Access Portal'}
                    </button>
                </form>
            </div>

            <style>{`
                .admin-login-wrapper {
                    width: 100vw; height: 100vh;
                    display: flex; align-items: center; justify-content: center;
                    background: #020617; font-family: 'Outfit';
                }
                .admin-auth-card {
                    width: 100%; max-width: 420px;
                    padding: 3rem; background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05); border-radius: 24px;
                    backdrop-filter: blur(20px);
                }
                .auth-header h1 { font-size: 1.8rem; letter-spacing: -0.04em; margin-bottom: 0.5rem; color: #fff; }
                .auth-header p { font-size: 0.9rem; color: #94a3b8; line-height: 1.6; margin-bottom: 2.5rem; }
                
                .form-group { margin-bottom: 1.5rem; }
                .form-group label { display: block; font-size: 0.7rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.6rem; letter-spacing: 0.1em; }
                .form-group input { 
                    width: 100%; padding: 1rem; background: rgba(255,255,255,0.03); 
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
                    color: #fff; outline: none; transition: 0.3s;
                }
                .form-group input:focus { border-color: #6366f1; background: rgba(255,255,255,0.05); }

                .password-wrap { position: relative; display: flex; align-items: center; }
                .password-eye { position: absolute; right: 0.75rem; background: none; border: none; color: #64748b; cursor: pointer; display: flex; padding: 0.5rem; transition: 0.3s; }
                .password-eye:hover { color: #fff; }
                
                .alert-red { padding: 0.8rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 10px; font-size: 0.85rem; margin-bottom: 1.5rem; border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .btn-admin-submit { 
                    width: 100%; padding: 1rem; background: #6366f1; color: #fff; 
                    border: none; border-radius: 12px; font-weight: 500; cursor: pointer;
                    transition: 0.3s;
                }
                .btn-admin-submit:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2); }

                @media (max-width: 480px) {
                    .admin-auth-card { padding: 2rem 1.5rem; width: 90%; }
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
