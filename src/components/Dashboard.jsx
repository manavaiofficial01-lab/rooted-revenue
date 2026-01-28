import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../supabase';

const Dashboard = ({ onLogout, user, children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchNotificationHistory();
  }, [user?.username]);

  useEffect(() => {
    if (showHistory) {
      markAllAsRead();
    }
  }, [showHistory]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendBrowserNotification = (message, type) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Rooted Revenue Announcement", {
        body: message,
        icon: "/favicon.ico"
      });
    }
  };

  const fetchNotificationHistory = async () => {
    if (!user?.username) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, notification_reads(*)')
        .or(`target_username.eq.${user.username},is_global.eq.true`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const processedData = data?.map(notif => {
        const isRead = notif.notification_reads?.some(r => r.username === user.username);
        return { ...notif, is_unread: !isRead };
      }) || [];

      setHistory(processedData);
      setUnreadCount(processedData.filter(h => h.is_unread).length);

      // Track 'received' status for 1-to-1 notifications
      const receivedIds = data?.filter(n => !n.is_global && n.target_username === user.username && n.status === 'sent').map(n => n.id);
      if (receivedIds?.length > 0) {
        await supabase.from('notifications').update({ status: 'received', received_at: new Date().toISOString() }).in('id', receivedIds);
      }
    } catch (err) {
      console.error('History fetch failed:', err);
    }
  };

  useEffect(() => {
    if (!user?.username) return;

    // Direct fetch on mount
    fetchNotificationHistory();

    // Set up polling every 5 minutes
    const pollInterval = setInterval(() => {
      fetchNotificationHistory();
    }, 5 * 60 * 1000); // 300,000ms

    return () => clearInterval(pollInterval);
  }, [user?.username]);

  const markAllAsRead = async () => {
    if (!user?.username || history.length === 0) return;

    const unreadIds = history.filter(h => h.is_unread).map(h => h.id);
    if (unreadIds.length === 0) return;

    try {
      const inserts = unreadIds.map(notifId => ({
        notification_id: notifId,
        username: user.username
      }));

      const { error } = await supabase
        .from('notification_reads')
        .insert(inserts);

      if (error && error.code !== '23505') throw error; // Ignore unique constraint errors

      // Update 'seen' status for 1-to-1 notifications
      const personalUnreadIds = history.filter(h => h.is_unread && !h.is_global && h.target_username === user.username).map(h => h.id);
      if (personalUnreadIds.length > 0) {
        await supabase.from('notifications').update({ status: 'seen', seen_at: new Date().toISOString() }).in('id', personalUnreadIds);
      }

      setHistory(prev => prev.map(h => ({ ...h, is_unread: false })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all announcements from your view? (This will not delete them for others)')) {
      setHistory([]);
      setUnreadCount(0);
    }
  };

  const showToaster = (message, type) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navLinks = [
    { id: 'summary', path: '/summary', label: 'Summary', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg> },
    { id: 'client-login', path: '/client-login', label: 'Client Login', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg> },
    { id: 'tracking', path: '/client-tracking', label: 'Client Tracking', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg> },
    { id: 'policy', path: '/policy-sheet', label: 'Policy Sheet', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
    { id: 'emi', path: '/emi-calculator', label: 'EMI Calculator', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="14.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="8" y1="14" x2="8" y2="14.01"></line><line x1="16" y1="18" x2="16" y2="18.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line><line x1="8" y1="18" x2="8" y2="18.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="8" y1="10" x2="8" y2="10.01"></line><line x1="16" y1="10" x2="16" y2="10.01"></line></svg> },
  ];

  const activeLabel = navLinks.find(l => window.location.pathname === l.path)?.label || 'Console';

  return (
    <div className="dash-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-blob"></div>
          <span>Rooted Revenue</span>
        </div>

        <nav className="nav-group">
          {navLinks.map(link => (
            <NavLink
              key={link.id}
              to={link.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="icon-wrap">{link.icon}</span>
              <span className="label-text">{link.label}</span>
              <div className="active-glow-anchor"></div>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-glass">
            <div className="av-hex">{initials}</div>
            <div className="prof-info">
              <span className="p-name">{displayName}</span>
              <span className="p-status">Online</span>
            </div>
          </div>

          <div className="utility-row">
            <button className="util-btn" onClick={toggleTheme} title="Appearance">
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              )}
            </button>
            <button className="util-btn logout" onClick={onLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="viewport">
        <header className="mobile-header">
          <div className="sidebar-brand">
            <div className="brand-blob"></div>
            <span>Rooted Revenue</span>
          </div>
          <button className="util-btn logout" onClick={onLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </header>

        <header className="viewport-head desktop-only">
          <div className="head-left">
            <span className="date-tag">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <h1>{activeLabel}</h1>
          </div>
          <div className="head-right">
            <div className="notification-bell" onClick={() => { setShowHistory(!showHistory); setUnreadCount(0); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              {unreadCount > 0 && <div className="bell-dot">{unreadCount}</div>}
            </div>

            {showHistory && (
              <div className="notification-modal-overlay" onClick={() => setShowHistory(false)}>
                <div className="notification-modal animate-pop" onClick={e => { e.stopPropagation(); markAllAsRead(); }}>
                  <div className="modal-header">
                    <div className="h-left">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                      <h3>Office Announcements</h3>
                    </div>
                    <div className="h-right-actions">
                      {history.length > 0 && (
                        <button className="clear-all-btn" onClick={handleClearHistory}>Clear All</button>
                      )}
                      <button className="close-x" onClick={() => setShowHistory(false)}>×</button>
                    </div>
                  </div>
                  <div className="modal-content-area">
                    {history.length === 0 ? (
                      <div className="empty-notif">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.2, marginBottom: '1rem' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg>
                        <p>No recent announcements found.</p>
                      </div>
                    ) : (
                      <div className="history-stack">
                        {history.map(h => (
                          <div key={h.id} className={`history-card ${h.type} ${h.is_unread ? 'is-unread' : ''}`}>
                            <div className="h-meta">
                              <span className="h-type">{h.is_global ? 'OFFICE BROADCAST' : 'PERSONAL ASSIGNMENT'}</span>
                              <div className="h-right-meta">
                                {h.is_unread && <span className="unread-dot"></span>}
                                <span className="h-time">{new Date(h.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <p className="h-msg">{h.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="view-scroll-area">
          {children}
        </div>

        <nav className="mobile-nav">
          {navLinks.map(link => (
            <NavLink
              key={link.id}
              to={link.path}
              className={({ isActive }) => `m-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="icon-wrap">{link.icon}</span>
              <span className="label-text">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="toaster-container">
          {notifications.map(n => (
            <div key={n.id} className={`toaster-item ${n.type}`}>
              <div className="t-icon">
                {n.type === 'info' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>}
                {n.type === 'success' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
                {n.type === 'warning' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                {n.type === 'error' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
              </div>
              <div className="t-content">{n.message}</div>
              <button className="t-close" onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}>×</button>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        .dash-container {
          display: flex; height: 100vh; width: 100vw;
          background: var(--bg-main); color: var(--text-main);
          font-family: 'Outfit', sans-serif; overflow: hidden;
        }

        .sidebar {
          width: 240px; background: rgba(255, 255, 255, 0.01);
          border-right: 1px solid var(--border-light);
          display: flex; flex-direction: column; padding: 1.5rem 1rem;
        }

        .sidebar-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 2.5rem; }
        .brand-blob { width: 18px; height: 18px; background: var(--primary); border-radius: 5px; transform: rotate(45deg); box-shadow: 0 0 10px var(--primary-glow); }
        .sidebar-brand span { font-size: 1rem; font-weight: 300; letter-spacing: -0.01em; }

        .nav-group { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .nav-link {
          display: flex; align-items: center; gap: 12px; padding: 0.75rem 0.9rem;
          border-radius: 12px; color: var(--text-muted); cursor: pointer;
          transition: 0.3s; font-size: 0.85rem;
          text-decoration: none;
          position: relative;
        }
        .nav-link:hover { background: rgba(255, 255, 255, 0.02); color: var(--text-main); transform: translateX(3px); }
        .nav-link.active { background: rgba(129, 140, 248, 0.08); color: var(--primary); }
        
        .nav-link.active::before { content: ''; position: absolute; left: -10px; top: 30%; bottom: 30%; width: 3px; background: var(--primary); border-radius: 0 4px 4px 0; }

        .sidebar-footer { margin-top: auto; display: flex; flex-direction: column; gap: 0.75rem; }
        .profile-glass { display: flex; align-items: center; gap: 10px; padding: 0.6rem; background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-light); border-radius: 14px; }
        .av-hex { width: 32px; height: 32px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; border-radius: 8px; }
        .prof-info { display: flex; flex-direction: column; }
        .p-name { font-size: 0.8rem; font-weight: 300; }
        .p-status { font-size: 0.6rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; }

        .utility-row { display: flex; gap: 8px; }
        .util-btn { display: flex; align-items: center; justify-content: center; height: 36px; padding: 0 12px; background: transparent; border: 1px solid var(--border-light); border-radius: 10px; color: var(--text-muted); cursor: pointer; transition: 0.3s; }
        .util-btn:hover { background: rgba(255, 255, 255, 0.03); color: var(--text-main); }
        .util-btn.logout:hover { color: #ef4444; border-color: #ef4444; }

        .viewport { flex: 1; display: flex; flex-direction: column; background: radial-gradient(circle at top right, rgba(129, 140, 248, 0.02), transparent 40%); width: 100%; border-radius: 0; overflow: hidden; }
        .viewport-head { padding: 2rem 3rem; display: flex; justify-content: space-between; align-items: center; }
        .head-left h1 { font-size: 1.8rem; font-weight: 200; letter-spacing: -0.02em; }
        .head-left .date-tag { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); display: block; margin-bottom: 0.25rem; }

        .notification-bell { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; transition: 0.3s; position: relative; }
        .notification-bell:hover { background: rgba(255, 255, 255, 0.02); color: var(--text-main); border-color: var(--primary); }
        .bell-dot { 
            position: absolute; top: -5px; right: -5px; width: 18px; height: 18px; 
            background: #ef4444; border-radius: 50%; color: white; font-size: 0.65rem;
            display: flex; align-items: center; justify-content: center; font-weight: 600;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); border: 2px solid var(--bg-main);
        }

        .notification-modal-overlay {
            position: fixed; inset: 0; 
            background: rgba(0, 0, 0, 0.4); 
            backdrop-filter: blur(12px); 
            display: flex; align-items: center; justify-content: center; 
            z-index: 2000; animation: fadeIn 0.3s ease;
        }

        .notification-modal {
            width: 100%; max-width: 500px; max-height: 80vh;
            background: var(--bg-side); border: 1px solid var(--border-light); 
            border-radius: 28px; box-shadow: 0 40px 100px rgba(0,0,0,0.5);
            display: flex; flex-direction: column; overflow: hidden;
            animation: modalScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalScaleUp { 
            from { opacity: 0; transform: scale(0.9) translateY(20px); } 
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .notification-modal .modal-header { 
            padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-light); 
            display: flex; justify-content: space-between; align-items: center; 
            background: rgba(255,255,255,0.01); 
        }
        .h-right-actions { display: flex; align-items: center; gap: 1.5rem; }
        .clear-all-btn { background: none; border: 1px solid var(--border-light); color: var(--text-muted); padding: 5px 12px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; transition: 0.3s; }
        .clear-all-btn:hover { color: #ef4444; border-color: #ef4444; }
        
        .modal-header .h-left { display: flex; align-items: center; gap: 12px; }
        .modal-header h3 { font-size: 1.1rem; font-weight: 300; letter-spacing: -0.01em; }
        .modal-header .close-x { background: none; border: none; color: var(--text-muted); font-size: 1.8rem; cursor: pointer; transition: 0.3s; }
        .modal-header .close-x:hover { color: #ef4444; }
        
        .modal-content-area { overflow-y: auto; padding: 1.5rem 2rem; }
        .history-stack { display: flex; flex-direction: column; gap: 1rem; }
        .empty-notif { text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 4rem 0; display: flex; flex-direction: column; align-items: center; }
        
        .history-card { 
            padding: 1.25rem; border-radius: 18px; 
            background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); 
            border-left: 4px solid transparent; transition: 0.3s;
            position: relative;
        }
        .history-card:hover { transform: translateX(4px); background: rgba(255,255,255,0.02); }
        .history-card.is-unread { background: rgba(129, 140, 248, 0.05); border-color: rgba(129, 140, 248, 0.2); }
        
        .h-right-meta { display: flex; align-items: center; gap: 8px; }
        .unread-dot { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; box-shadow: 0 0 8px var(--primary); }

        .history-card.info { border-left-color: var(--primary); }
        .history-card.success { border-left-color: #10b981; }
        .history-card.warning { border-left-color: #f59e0b; }
        .history-card.error { border-left-color: #ef4444; }
        
        .h-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
        .h-type { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 500; }
        .h-time { font-size: 0.6rem; color: var(--text-muted); }
        .h-msg { font-size: 0.9rem; line-height: 1.6; color: var(--text-main); font-weight: 300; }

        .view-scroll-area { flex: 1; padding: 0 3rem 3rem; overflow-y: auto; scrollbar-width: thin; }
        .mobile-header, .mobile-nav { display: none; }

        @media (max-width: 1100px) {
          .sidebar { width: 80px; padding: 1.5rem 0.75rem; }
          .sidebar-brand span, .nav-link .label-text, .profile-glass .prof-info, .sidebar-footer { display: none; }
          .sidebar-brand { justify-content: center; }
          .nav-link { justify-content: center; }
          .viewport-head { padding: 1.5rem 2rem; }
          .view-scroll-area { padding: 0 2rem 2rem; }
        }

        @media (max-width: 768px) {
          .dash-container { flex-direction: column; }
          .sidebar { display: none; }
          .mobile-header { 
            display: flex; justify-content: space-between; align-items: center; 
            padding: 1rem 1.5rem; background: var(--bg-side); 
            border-bottom: 1px solid var(--border-light); z-index: 100;
          }
          .mobile-nav { 
            display: flex; justify-content: space-around; align-items: center; 
            padding: 0.6rem 0.5rem; background: var(--bg-side); 
            border-top: 1px solid var(--border-light); z-index: 100;
          }
          .m-nav-link { 
            display: flex; flex-direction: column; align-items: center; gap: 4px; 
            color: var(--text-muted); text-decoration: none; font-size: 0.6rem;
            flex: 1; padding: 0.4rem; transition: 0.3s;
          }
          .m-nav-link.active { color: var(--primary); }
          .desktop-only { display: none; }
          .view-scroll-area { padding: 1.5rem; padding-bottom: 5rem; }
          .viewport { background: var(--bg-main); flex: 1; }
        }

        .toaster-container {
          position: fixed; top: 2rem; right: 2rem;
          display: flex; flex-direction: column; gap: 1rem;
          z-index: 1000; pointer-events: none;
        }
        .toaster-item {
          pointer-events: auto; width: 320px; padding: 1rem 1.2rem;
          background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(15px);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 16px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          animation: toastSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .t-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .toaster-item.info .t-icon { background: rgba(99, 102, 241, 0.1); color: #818cf8; }
        .toaster-item.success .t-icon { background: rgba(16, 185, 129, 0.1); color: #34d399; }
        .toaster-item.warning .t-icon { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
        .toaster-item.error .t-icon { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        
        .t-content { font-size: 0.85rem; color: #f1f5f9; line-height: 1.4; flex: 1; }
        .t-close { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem; padding: 0 4px; }
        
        @keyframes toastSlide {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        @media (max-width: 480px) {
          .toaster-container { right: 1rem; left: 1rem; top: 1rem; }
          .toaster-item { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
