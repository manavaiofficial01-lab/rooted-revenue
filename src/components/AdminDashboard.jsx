import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { BANK_LOGOS } from '../constants/banks';
import ReportsExport from './ReportsExport';

const AdminDashboard = ({ onLogout }) => {
    const QUESTION_MAP = {
        q1: "Gold Loan",
        q2: "Active CC",
        q3: "Pay Slips",
        q4: "CIBIL 700+",
        q5: "Salary 25k+",
        q6: "PF/PT Deduct",
        q7: "Address Proof",
        q8: "Cheque Bounce"
    };

    const [activeTab, setActiveTab] = useState('employees');
    const [employees, setEmployees] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('admin_theme') || 'dark');
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [empLogins, setEmpLogins] = useState([]);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [policySearchQuery, setPolicySearchQuery] = useState('');
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationForm, setNotificationForm] = useState({ target: 'all', message: '', type: 'info' });
    const [sendingNotification, setSendingNotification] = useState(false);
    const [sentNotifications, setSentNotifications] = useState([]);

    // Custom Dropdown States
    const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

    const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'Agent', phone: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [officeStats, setOfficeStats] = useState({ totalDisbursement: 0, totalLeads: 0, totalDisbursedCount: 0 });
    const [allLogins, setAllLogins] = useState([]);

    useEffect(() => {
        fetchData();
        fetchSentNotifications();

        // Polling for data and engagement tracking every 5 minutes
        const pollInterval = setInterval(() => {
            fetchData();
            fetchSentNotifications();
        }, 5 * 60 * 1000); // 300,000ms

        return () => clearInterval(pollInterval);
    }, []);

    const fetchSentNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, notification_reads(*)')
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            setSentNotifications(data || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    const handleDeleteNotification = async (id) => {
        if (!confirm('Are you sure you want to retract this broadcast? This will remove it for all agents.')) return;
        try {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
            setSentNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('admin_theme', newTheme);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase.from('users').select('*').order('username');
            const { data: policyData } = await supabase.from('policy_sheet').select('*').order('id');
            const { data: leadData } = await supabase.from('client_logins').select('*').order('created_at', { ascending: false });

            const performance = leadData?.reduce((acc, lead) => {
                const name = lead.loginned_by || 'Unknown';
                if (!acc[name]) {
                    acc[name] = { disbursement: 0, leads: 0, disbursed: 0, follow_up: 0, rejected: 0 };
                }
                acc[name].leads += 1;
                if (lead.status === 'disbursed') {
                    acc[name].disbursement += parseFloat(lead.eligibility || 0);
                    acc[name].disbursed += 1;
                } else if (lead.status === 'follow_up') {
                    acc[name].follow_up += 1;
                } else if (lead.status === 'rejected') {
                    acc[name].rejected += 1;
                }
                return acc;
            }, {}) || {};

            const totals = leadData?.reduce((acc, lead) => {
                acc.totalLeads += 1;
                if (lead.status === 'disbursed') {
                    acc.totalDisbursement += parseFloat(lead.eligibility || 0);
                    acc.totalDisbursedCount += 1;
                }
                return acc;
            }, { totalDisbursement: 0, totalLeads: 0, totalDisbursedCount: 0 });

            setOfficeStats(totals);

            setEmployees(userData?.map(u => ({
                ...u,
                stats: performance[u.username] || { disbursement: 0, leads: 0, disbursed: 0, follow_up: 0, rejected: 0 }
            })) || []);
            setPolicies(policyData || []);
            setAllLogins(leadData || []);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployeeLogins = async (username) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('client_logins')
                .select('*')
                .eq('loginned_by', username)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmpLogins(data || []);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeClick = (emp) => {
        setSelectedEmployee(emp);
        fetchEmployeeLogins(emp.username);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await supabase.from('users').update(userForm).eq('id', editingUser.id);
            } else {
                await supabase.from('users').insert([userForm]);
            }
            setShowUserModal(false);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleOpenClientAudit = (client) => {
        setSelectedClient(client);
        setShowClientModal(true);
    };

    const handleOpenPolicy = (policy) => {
        setSelectedPolicy({ ...policy });
        setShowPolicyModal(true);
    };

    const handleSavePolicy = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('policy_sheet').update(selectedPolicy).eq('id', selectedPolicy.id);
            if (error) throw error;
            setPolicies(prev => prev.map(p => p.id === selectedPolicy.id ? selectedPolicy : p));
            setShowPolicyModal(false);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAddPolicy = async () => {
        const newPolicy = {
            bank_name: 'New Bank',
            income: '0',
            cibil: '700',
            tenor: 60,
            irr: '12%',
            pf_pt: 'REQUIRED',
            foir: '0.6',
            bt: 'Allowed',
            cc_bt: 'Allowed'
        };
        try {
            const { data, error } = await supabase.from('policy_sheet').insert([newPolicy]).select();
            if (error) throw error;
            if (data) {
                setPolicies([...policies, data[0]]);
                handleOpenPolicy(data[0]);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const filteredPolicies = policies.filter(p =>
        p.bank_name?.toLowerCase().includes(policySearchQuery.toLowerCase())
    );

    const getStatsByPeriod = (logins) => {
        const now = new Date();
        const stats = {
            today: 0,
            week: 0,
            month: 0
        };

        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        logins.forEach(l => {
            const date = new Date(l.created_at);
            if (date >= startOfDay) stats.today++;
            if (date >= startOfWeek) stats.week++;
            if (date >= startOfMonth) stats.month++;
        });

        return stats;
    };

    const periodStats = selectedEmployee ? getStatsByPeriod(empLogins) : null;

    const filteredEmployees = employees.filter(emp =>
        emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`admin-container theme-${theme}`}>
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <img src="/logo.webp" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <span>Manager Console</span>
                </div>

                <nav className="admin-nav">
                    <div className="nav-group">
                        <label>Management</label>
                        <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => { setActiveTab('employees'); setSelectedEmployee(null); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            Human Capital
                        </button>
                    </div>

                    <div className="nav-group">
                        <label>Operations</label>
                        <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => { setActiveTab('clients'); setSelectedEmployee(null); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
                            Client Database
                        </button>
                    </div>

                    <div className="nav-group">
                        <label>Configuration</label>
                        <button className={activeTab === 'policies' ? 'active' : ''} onClick={() => { setActiveTab('policies'); setSelectedEmployee(null); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                            Lending Master
                        </button>
                    </div>

                    <div className="nav-group">
                        <label>Communication</label>
                        <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => { setActiveTab('notifications'); setSelectedEmployee(null); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            Announcements
                        </button>
                    </div>

                    <div className="nav-group">
                        <label>Analytics</label>
                        <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => { setActiveTab('reports'); setSelectedEmployee(null); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Reports & Export
                        </button>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle" onClick={toggleTheme} title="Toggle Appearance">
                        {theme === 'dark' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        )}
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button className="admin-logout" onClick={onLogout}>
                        Exit Portal
                    </button>
                </div>
            </aside>

            <header className="admin-mobile-header">
                <div className="admin-brand">
                    <div className="blob"></div>
                    <span>Manager</span>
                </div>
                <button className="logout-btn" onClick={onLogout}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
            </header>

            <main className="admin-viewport">
                {activeTab === 'employees' && !selectedEmployee && (
                    <div className="admin-view">
                        <header className="view-head">
                            <div className="head-text">
                                <h1>Executive Dashboard</h1>
                                <p>Real-time oversight of branch performance and conversion funnel.</p>
                            </div>
                            <div className="head-actions">
                                <div className="search-box">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    <input
                                        type="text"
                                        placeholder="Search agents..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button className="add-btn" onClick={() => { setEditingUser(null); setUserForm({ username: '', email: '', password: '', role: 'Agent', phone: '' }); setShowUserModal(true); }}>
                                    + Onboard Agent
                                </button>
                            </div>
                        </header>

                        <div className="global-stats-row">
                            <div className="g-stat-card">
                                <label>Total Office Volume</label>
                                <div className="g-val-row">
                                    <span className="g-val">₹{(officeStats.totalDisbursement / 100000).toFixed(1)}L</span>
                                    <span className="g-trend">Total Disbursement</span>
                                </div>
                            </div>
                            <div className="g-stat-card">
                                <label>Leads Captured</label>
                                <div className="g-val-row">
                                    <span className="g-val">{officeStats.totalLeads}</span>
                                    <span className="g-trend">In Funnel</span>
                                </div>
                            </div>
                            <div className="g-stat-card">
                                <label>Global Conversion</label>
                                <div className="g-val-row">
                                    <span className="g-val">
                                        {officeStats.totalLeads > 0 ? ((officeStats.totalDisbursedCount / officeStats.totalLeads) * 100).toFixed(1) : 0}%
                                    </span>
                                    <span className="g-trend">Avg. Office Rate</span>
                                </div>
                            </div>
                        </div>

                        <div className="employee-grid">
                            {filteredEmployees.map(emp => (
                                <div key={emp.id} className="employee-card interactive" onClick={() => handleEmployeeClick(emp)}>
                                    <div className="emp-top">
                                        <div className="emp-avatar">
                                            {emp.profile_pic ? (
                                                <img src={emp.profile_pic} alt={emp.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                                            ) : (
                                                emp.username.charAt(0)
                                            )}
                                            <div className="online-dot"></div>
                                        </div>
                                        <div className="emp-info">
                                            <h3>{emp.username}</h3>
                                            <span>{emp.email}</span>
                                        </div>
                                        <button className="edit-emp-btn" onClick={(e) => { e.stopPropagation(); setEditingUser(emp); setUserForm({ ...emp }); setShowUserModal(true); }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        </button>
                                    </div>
                                    <div className="emp-card-content">
                                        <div className="emp-primary-stats">
                                            <div className="p-stat">
                                                <label>Disbursement Volume</label>
                                                <p>₹{(emp.stats.disbursement / 100000).toFixed(1)}L</p>
                                            </div>
                                            <div className="p-stat">
                                                <label>Conversion</label>
                                                <p className="highlight-text">
                                                    {emp.stats.leads > 0 ? ((emp.stats.disbursed / emp.stats.leads) * 100).toFixed(1) : 0}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="emp-funnel">
                                            <div className="funnel-item">
                                                <span>Total Leads</span>
                                                <div className="funnel-bar"><div className="fill" style={{ width: '100%' }}></div><span>{emp.stats.leads}</span></div>
                                            </div>
                                            <div className="funnel-item">
                                                <span>Follow-ups</span>
                                                <div className="funnel-bar"><div className="fill blue" style={{ width: `${(emp.stats.follow_up / (emp.stats.leads || 1)) * 100}%` }}></div><span>{emp.stats.follow_up}</span></div>
                                            </div>
                                            <div className="funnel-item">
                                                <span>Disbursed</span>
                                                <div className="funnel-bar"><div className="fill green" style={{ width: `${(emp.stats.disbursed / (emp.stats.leads || 1)) * 100}%` }}></div><span>{emp.stats.disbursed}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="global-activity-section">
                            <div className="section-header">
                                <h2>Recent Office Activity</h2>
                                <p>Live feed of client logins and application status across all agents.</p>
                            </div>
                            <div className="activity-list">
                                {allLogins.slice(0, 10).map(login => (
                                    <div key={login.id} className="activity-row">
                                        <div className="act-main">
                                            <span className="act-client">{login.client_name || 'Anonymous Client'}</span>
                                            <span className="act-meta">{login.loan_type?.replace('_', ' ')} • ₹{parseFloat(login.salary).toLocaleString()} Salary</span>
                                        </div>
                                        <div className="act-agent">
                                            <span className="act-label">Managed by</span>
                                            <span className="act-name">{login.loginned_by}</span>
                                        </div>
                                        <div className="act-status">
                                            <span className={`status-pill ${login.status}`}>{login.status}</span>
                                            <span className="act-date">{new Date(login.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(login.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'employees' && selectedEmployee && (
                    <div className="admin-view detail-view">
                        <header className="view-head">
                            <button className="back-link" onClick={() => setSelectedEmployee(null)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                Back to Global View
                            </button>
                            <div className="emp-expand-header">
                                <div className="emp-expand-avatar">
                                    {selectedEmployee.profile_pic ? (
                                        <img src={selectedEmployee.profile_pic} alt={selectedEmployee.username} />
                                    ) : (
                                        selectedEmployee.username.charAt(0)
                                    )}
                                </div>
                                <div className="head-text">
                                    <h1>{selectedEmployee.username}'s Performance</h1>
                                    <p>Granular lifecycle tracking and intelligence audit.</p>
                                </div>
                            </div>
                        </header>

                        <div className="periodic-stats-row">
                            <div className="p-stat-card">
                                <label>Daily Performance</label>
                                <span className="val">{periodStats.today}</span>
                                <span className="sub">Applications Today</span>
                            </div>
                            <div className="p-stat-card">
                                <label>Weekly Velocity</label>
                                <span className="val">{periodStats.week}</span>
                                <span className="sub">Applications this Week</span>
                            </div>
                            <div className="p-stat-card">
                                <label>Monthly Volume</label>
                                <span className="val">{periodStats.month}</span>
                                <span className="sub">Applications this Month</span>
                            </div>
                            <div className="p-stat-card highlight">
                                <label>Conversion Rate</label>
                                <span className="val">
                                    {selectedEmployee.stats.leads > 0
                                        ? ((selectedEmployee.stats.disbursed / selectedEmployee.stats.leads) * 100).toFixed(1)
                                        : 0}%
                                </span>
                                <span className="sub">Lead to Disbursement Ratio</span>
                            </div>
                        </div>

                        <div className="periodic-stats-row status-lifecycle">
                            <div className="p-stat-card follow-up">
                                <label>Active Follow-ups</label>
                                <span className="val">{selectedEmployee.stats.follow_up}</span>
                                <span className="sub">Leads In Progress</span>
                            </div>
                            <div className="p-stat-card disbursed">
                                <label>Disbursed Leads</label>
                                <span className="val">{selectedEmployee.stats.disbursed}</span>
                                <span className="sub">Successfully Converted</span>
                            </div>
                            <div className="p-stat-card rejected">
                                <label>Rejected Cases</label>
                                <span className="val">{selectedEmployee.stats.rejected}</span>
                                <span className="sub">Not Eligible / Declined</span>
                            </div>
                        </div>

                        <div className="login-history-section">
                            <div className="history-header">
                                <h3>Operational Log</h3>
                                <p>Direct audit of question-answer cycles and lead quality.</p>
                            </div>
                            <div className="history-list">
                                {empLogins.filter(login => login.loan_type === 'personal_loan').map(login => {
                                    const qs = typeof login.questions === 'string' ? JSON.parse(login.questions) : (login.questions || {});
                                    return (
                                        <div key={login.id} className="history-item">
                                            <div className="h-top">
                                                <div className="h-main">
                                                    <div className="h-name-row">
                                                        <span className="h-client">{login.client_name}</span>
                                                        <span className="h-type-badge">{login.loan_type?.replace('_', ' ')}</span>
                                                    </div>
                                                    <span className="h-meta">{login.company_name} • ₹{parseFloat(login.salary).toLocaleString()} Salary</span>
                                                </div>
                                                <div className="h-status">
                                                    <span className={`status-tag ${login.status}`}>{login.status}</span>
                                                    <span className="h-date">{new Date(login.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="h-qa-grid">
                                                {Object.entries(qs).map(([key, val]) => {
                                                    if (key === 'reasons' || key === 'results' || key === 'probable') return null;
                                                    return (
                                                        <div key={key} className="qa-pill-detailed">
                                                            <div className="qa-label-wrap">
                                                                <span className="q-id">{key.toUpperCase()}</span>
                                                                <span className="q-text">{QUESTION_MAP[key] || key}</span>
                                                            </div>
                                                            <span className={`a-val ${val === 'Yes' ? 'pass' : 'fail'}`}>{val}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="h-results-row">
                                                <div className="res-group">
                                                    <span className="res-mini-label">Matches:</span>
                                                    <div className="res-mini-tags">
                                                        {qs.results?.map(r => <span key={r} className="res-mini-tag">{r}</span>)}
                                                        {!qs.results?.length && <span className="none-text">None</span>}
                                                    </div>
                                                </div>
                                                <div className="res-group">
                                                    <span className="res-mini-label">Probable:</span>
                                                    <div className="res-mini-tags">
                                                        {qs.probable?.map(p => <span key={p} className="res-mini-tag secondary">{p}</span>)}
                                                        {!qs.probable?.length && <span className="none-text">None</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {empLogins.length === 0 && (
                                    <div className="empty-history">
                                        <div className="empty-icon">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                                        </div>
                                        <h3>No application records</h3>
                                        <p>This agent hasn't initiated any personal loan flows yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="admin-view">
                        <header className="view-head">
                            <div className="head-text">
                                <h1>Policy Master</h1>
                                <p>Manage bank thresholds and internal lending protocols.</p>
                            </div>
                            <div className="head-actions">
                                <div className="search-box">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    <input
                                        type="text"
                                        placeholder="Search bank..."
                                        value={policySearchQuery}
                                        onChange={(e) => setPolicySearchQuery(e.target.value)}
                                    />
                                </div>
                                <button className="add-btn secondary" onClick={handleAddPolicy}>
                                    + Add New Partner
                                </button>
                            </div>
                        </header>

                        <div className="policy-grid">
                            {filteredPolicies.map(p => (
                                <div key={p.id} className="policy-card interactive" onClick={() => handleOpenPolicy(p)}>
                                    <div className="p-card-head">
                                        <div className="bank-avatar">
                                            {BANK_LOGOS[p.bank_name] ? <img src={BANK_LOGOS[p.bank_name]} alt={p.bank_name} /> : p.bank_name?.charAt(0)}
                                        </div>
                                        <div className="bank-info">
                                            <h3>{p.bank_name}</h3>
                                            <span>Min Income: ₹{p.income}</span>
                                        </div>
                                        <div className="irr-badge">{p.irr}</div>
                                    </div>
                                    <div className="p-card-body">
                                        <div className="p-mini-stat">
                                            <label>CIBIL</label>
                                            <p>{p.cibil}</p>
                                        </div>
                                        <div className="p-mini-stat">
                                            <label>Tenor</label>
                                            <p>{p.tenor}m</p>
                                        </div>
                                        <div className="p-mini-stat">
                                            <label>BT Status</label>
                                            <p>{p.bt || 'NA'}</p>
                                        </div>
                                    </div>
                                    <button className="edit-action">Configure Rules →</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="admin-view">
                        <header className="view-head">
                            <div className="head-text">
                                <h1>Client Database</h1>
                                <p>Central registry of all authenticated applications and lead lifecycles.</p>
                            </div>
                            <div className="head-actions">
                                <div className="search-box">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    <input
                                        type="text"
                                        placeholder="Search by client name..."
                                        value={clientSearchQuery}
                                        onChange={(e) => setClientSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </header>

                        <div className="client-master-list">
                            <div className="client-list-header">
                                <span className="col-client">Recipient</span>
                                <span className="col-agent">Assigned To</span>
                                <span className="col-loan">Loan Profile</span>
                                <span className="col-status align-right">Current Phase</span>
                            </div>
                            <div className="client-rows">
                                {allLogins
                                    .filter(c => c.client_name?.toLowerCase().includes(clientSearchQuery.toLowerCase()))
                                    .map(client => {
                                        const cqs = typeof client.questions === 'string' ? JSON.parse(client.questions) : (client.questions || {});
                                        return (
                                            <div key={client.id} className="client-item-row">
                                                <div className="c-info-wrap col-client pointer" onClick={() => handleOpenClientAudit(client)}>
                                                    <div className="c-avatar-mini">{client.client_name?.charAt(0) || 'A'}</div>
                                                    <div className="c-info">
                                                        <span className="c-name">{client.client_name || 'Anonymous'}</span>
                                                        <span className="c-sub">Portal Entry: {new Date(client.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="c-agent col-agent">
                                                    <div className="c-agent-pill">
                                                        <div className="a-dot"></div>
                                                        <span>{client.loginned_by}</span>
                                                    </div>
                                                </div>

                                                <div className="c-type col-loan">
                                                    <div className="loan-brief">
                                                        <span className="c-val">{client.loan_type?.replace('_', ' ')}</span>
                                                        <div className="match-pills">
                                                            {cqs.results?.length > 0 && <span className="match-tag result">{cqs.results.length} Match</span>}
                                                            {cqs.probable?.length > 0 && <span className="match-tag probable">{cqs.probable.length} Probable</span>}
                                                            {(!cqs.results?.length && !cqs.probable?.length) && <span className="match-tag none">No Match</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="c-status col-status">
                                                    <div className="status-container">
                                                        <span className={`status-pill filled ${client.status}`}>{client.status}</span>
                                                        <button className="row-action-btn" onClick={() => handleOpenClientAudit(client)}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="admin-view">
                        <header className="view-head">
                            <div className="head-text">
                                <h1>Communication Hub</h1>
                                <p>Orchestrate office-wide broadcasts and track engagement in real-time.</p>
                            </div>
                        </header>

                        <div className="notifications-layout">
                            {/* Composer Side */}
                            <div className="composer-container glass-card">
                                <div className="composer-head">
                                    <div className="c-icon-bg">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.5 1.5" /><path d="M7 11l5-5" /></svg>
                                    </div>
                                    <div className="c-title">
                                        <h3>New Broadcast</h3>
                                        <p>Reach your team instantly</p>
                                    </div>
                                </div>

                                <form className="broadcast-form-premium" onSubmit={async (e) => {
                                    e.preventDefault();
                                    setSendingNotification(true);
                                    try {
                                        const { data, error } = await supabase.from('notifications').insert([{
                                            message: notificationForm.message,
                                            target_username: notificationForm.target === 'all' ? null : notificationForm.target,
                                            is_global: notificationForm.target === 'all',
                                            type: notificationForm.type,
                                            created_by: 'Admin'
                                        }]).select();

                                        if (error) throw error;
                                        setNotificationForm({ ...notificationForm, message: '' });
                                        fetchSentNotifications();
                                    } catch (err) {
                                        alert(err.message);
                                    } finally {
                                        setSendingNotification(false);
                                    }
                                }}>
                                    <div className="form-row-n">
                                        <div className="input-group-n">
                                            <label>Audience Target</label>
                                            <div className="custom-dropdown-wrap">
                                                <div className={`custom-select-trigger ${showAudienceDropdown ? 'active' : ''}`} onClick={() => { setShowAudienceDropdown(!showAudienceDropdown); setShowPriorityDropdown(false); }}>
                                                    <span>{notificationForm.target === 'all' ? 'Global (All Office)' : notificationForm.target}</span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                                </div>
                                                {showAudienceDropdown && (
                                                    <div className="custom-options-panel animate-pop">
                                                        <div className="option-item" onClick={() => { setNotificationForm({ ...notificationForm, target: 'all' }); setShowAudienceDropdown(false); }}>Global (All Office)</div>
                                                        {employees.map(emp => (
                                                            <div key={emp.id} className="option-item" onClick={() => { setNotificationForm({ ...notificationForm, target: emp.username }); setShowAudienceDropdown(false); }}>{emp.username}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="input-group-n">
                                            <label>Priority Level</label>
                                            <div className="custom-dropdown-wrap">
                                                <div className={`custom-select-trigger ${showPriorityDropdown ? 'active' : ''}`} onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowAudienceDropdown(false); }}>
                                                    <span className={`p-indicator ${notificationForm.type}`}></span>
                                                    <span>{notificationForm.type.charAt(0).toUpperCase() + notificationForm.type.slice(1)}</span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                                </div>
                                                {showPriorityDropdown && (
                                                    <div className="custom-options-panel animate-pop">
                                                        <div className="option-item" onClick={() => { setNotificationForm({ ...notificationForm, type: 'info' }); setShowPriorityDropdown(false); }}><span className="p-indicator info"></span> Information</div>
                                                        <div className="option-item" onClick={() => { setNotificationForm({ ...notificationForm, type: 'success' }); setShowPriorityDropdown(false); }}><span className="p-indicator success"></span> Success Event</div>
                                                        <div className="option-item" onClick={() => { setNotificationForm({ ...notificationForm, type: 'warning' }); setShowPriorityDropdown(false); }}><span className="p-indicator warning"></span> System Alert</div>
                                                        <div className="option-item" onClick={() => { setNotificationForm({ ...notificationForm, type: 'error' }); setShowPriorityDropdown(false); }}><span className="p-indicator error"></span> Emergency</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="input-group-n full" style={{ marginTop: '0.5rem' }}>
                                        <label>Broadcast Message</label>
                                        <textarea
                                            rows="5"
                                            placeholder="Write something professional or urgent..."
                                            value={notificationForm.message}
                                            onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="dispatch-action-area">
                                        <button className="premium-dispatch-btn" disabled={sendingNotification}>
                                            <span>{sendingNotification ? 'Processing...' : 'Dispatch Announcement'}</span>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Tracking Side */}
                            <div className="tracking-container glass-card">
                                <div className="tracking-head">
                                    <h3>Engagement Tracker</h3>
                                    <button className="refresh-mini" onClick={fetchSentNotifications} title="Refresh Live Status">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                                    </button>
                                </div>

                                <div className="sent-notif-list">
                                    {sentNotifications.length === 0 ? (
                                        <div className="empty-tracking">
                                            <p>No messages dispatched in the last 24h.</p>
                                        </div>
                                    ) : (
                                        sentNotifications.map(sn => {
                                            const readCount = sn.notification_reads?.length || 0;
                                            const totalTarget = sn.is_global ? employees.length : 1;
                                            return (
                                                <div key={sn.id} className={`sent-notif-card ${sn.type}`}>
                                                    <div className="sn-top">
                                                        <span className="sn-type">{sn.is_global ? 'OFFICE BROADCAST' : `TARGET: ${sn.target_username}`}</span>
                                                        <div className="sn-top-actions">
                                                            {!sn.is_global && (
                                                                <div className={`status-tag-mini ${sn.status}`}>
                                                                    {sn.status === 'sent' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                                                    {sn.status === 'received' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>}
                                                                    {sn.status === 'seen' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                                                                    <span>{sn.status}</span>
                                                                </div>
                                                            )}
                                                            <div className="read-status-badge">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                <span>{readCount}/{totalTarget} Seen</span>
                                                            </div>
                                                            <button className="del-btn-mini" onClick={() => handleDeleteNotification(sn.id)}>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="sn-msg">{sn.message}</p>
                                                    <div className="sn-details">
                                                        <span className="sn-time">{new Date(sn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <div className="viewer-dots">
                                                            {sn.notification_reads?.map(r => (
                                                                <div key={r.id} className="v-dot" title={`${r.username} viewed at ${new Date(r.read_at).toLocaleTimeString()}`}>
                                                                    {r.username.charAt(0).toUpperCase()}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <style>{`
                            .notifications-layout { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; margin-top: 1rem; }
                            
                            .glass-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow); color: var(--text); }
                            
                            .composer-container { padding: 2.5rem; }
                            .composer-head { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; color: var(--text); }
                            .c-icon-bg { width: 50px; height: 50px; border-radius: 14px; background: var(--primary-glow); color: var(--primary); display: flex; align-items: center; justify-content: center; }
                            .c-title h3 { font-size: 1.4rem; font-weight: 300; margin-bottom: 2px; color: var(--text); }
                            .c-title p { font-size: 0.85rem; color: var(--text-muted); }

                            .broadcast-form-premium { display: flex; flex-direction: column; gap: 1.5rem; }
                            .form-row-n { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                            .input-group-n { display: flex; flex-direction: column; gap: 8px; position: relative; }
                            .input-group-n label { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.1em; margin-left: 0.4rem; margin-bottom: 2px; }
                            
                            .custom-dropdown-wrap { position: relative; width: 100%; }
                            .custom-select-trigger { 
                                background: var(--input-bg); border: 1px solid var(--border); 
                                border-radius: 14px; padding: 1rem 1.2rem; color: var(--text-main); font-family: 'Outfit';
                                display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s;
                                min-height: 54px;
                            }
                            .custom-select-trigger:hover, .custom-select-trigger.active { border-color: var(--primary); background: var(--input-bg); }
                            .custom-select-trigger svg { transition: 0.3s; opacity: 0.5; }
                            .custom-select-trigger.active svg { transform: rotate(180deg); opacity: 1; color: var(--primary); }

                            .custom-options-panel { 
                                position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: var(--bg-side); 
                                border: 1px solid var(--border-light); border-radius: 16px; z-index: 100; overflow: hidden;
                                box-shadow: 0 20px 50px rgba(0,0,0,0.4); backdrop-filter: blur(20px);
                            }
                            .option-item { 
                                padding: 0.8rem 1.2rem; cursor: pointer; transition: 0.2s; font-size: 0.9rem; color: var(--text-muted);
                                display: flex; align-items: center; gap: 10px;
                            }
                            .option-item:hover { background: var(--input-bg); color: var(--text); padding-left: 1.5rem; }
                            
                            .p-indicator { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
                            .p-indicator.info { background: var(--primary); box-shadow: 0 0 10px var(--primary); }
                            .p-indicator.success { background: #10b981; box-shadow: 0 0 10px #10b981; }
                            .p-indicator.warning { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
                            .p-indicator.error { background: #ef4444; box-shadow: 0 0 10px #ef4444; }

                            .input-group-n textarea { 
                                background: var(--input-bg); border: 1px solid var(--border); 
                                border-radius: 16px; padding: 1.2rem; color: var(--text-main); font-family: 'Outfit'; outline: none; transition: 0.3s;
                                font-size: 1rem; line-height: 1.6;
                            }
                            .input-group-n textarea:focus { border-color: var(--primary); background: var(--input-bg); }
                            .input-group-n textarea::placeholder { color: var(--text-muted); opacity: 0.5; }

                            .dispatch-action-area { margin-top: 1rem; display: flex; justify-content: center; width: 100%; }
                            .premium-dispatch-btn { 
                                width: 100%; padding: 1.2rem; border-radius: 18px; background: var(--primary); color: white; border: none; font-size: 1.1rem; font-weight: 500; cursor: pointer;
                                display: flex; align-items: center; justify-content: center; gap: 12px; transition: 0.4s; box-shadow: 0 10px 25px var(--primary-glow);
                                font-family: 'Outfit';
                            }
                            .premium-dispatch-btn:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 20px 50px var(--primary-glow); filter: brightness(1.1); }
                            .premium-dispatch-btn:active { transform: translateY(-1px); }
                            .premium-dispatch-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                            /* Tracking Styles */
                            .tracking-container { padding: 2rem; display: flex; flex-direction: column; max-height: 700px; }
                            .tracking-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
                            .tracking-head h3 { font-size: 1rem; font-weight: 300; }
                            .refresh-mini { background: none; border: 1px solid var(--border-light); color: var(--text-muted); width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
                            .refresh-mini:hover { color: var(--primary); border-color: var(--primary); }

                            .sent-notif-list { overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; padding-right: 0.5rem; }
                            .sent-notif-card { padding: 1.2rem; border-radius: 18px; border: 1px solid var(--border); background: var(--card-bg); transition: 0.3s; }
                            .sent-notif-card:hover { background: var(--input-bg); }
                            
                            .sn-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
                            .sn-top-actions { display: flex; align-items: center; gap: 12px; }
                            .sn-type { font-size: 0.55rem; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; background: var(--input-bg); color: var(--text-muted); }
                            .status-tag-mini { display: flex; align-items: center; gap: 4px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
                            .status-tag-mini.sent { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                            .status-tag-mini.received { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
                            .status-tag-mini.seen { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                            .read-status-badge { display: flex; align-items: center; gap: 5px; font-size: 0.65rem; color: var(--accent); font-weight: 500; }
                            
                            .del-btn-mini { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: 0.3s; }
                            .del-btn-mini:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
                            .sn-msg { font-size: 0.85rem; line-height: 1.5; color: var(--text-main); margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                            
                            .sn-details { display: flex; justify-content: space-between; align-items: center; }
                            .sn-time { font-size: 0.6rem; color: var(--text-muted); }
                            
                            .viewer-dots { display: flex; gap: -5px; }
                            .v-dot { 
                                width: 22px; height: 22px; border-radius: 50%; background: var(--primary); 
                                color: white; display: flex; align-items: center; justify-content: center; 
                                font-size: 0.6rem; font-weight: 600; border: 2px solid var(--bg-side);
                                margin-left: -8px; transition: 0.3s;
                            }
                            .v-dot:first-child { margin-left: 0; }
                            .v-dot:hover { transform: translateY(-3px); z-index: 10; }

                            @media (max-width: 1200px) {
                                .notifications-layout { grid-template-columns: 1fr; }
                                .tracking-container { max-height: none; }
                            }
                        `}</style>
                    </div>
                )}

                {activeTab === 'reports' && <ReportsExport allLogins={allLogins} />}
            </main>

            {showUserModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal animate-pop">
                        <h2>{editingUser ? 'Update Employee' : 'Onboard Employee'}</h2>
                        <form onSubmit={handleSaveUser}>
                            <div className="modal-input">
                                <label>Username (Identity)</label>
                                <input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required />
                            </div>
                            <div className="modal-input">
                                <label>Corporate Email</label>
                                <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                            </div>
                            <div className="modal-input">
                                <label>Phone (Optional)</label>
                                <input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
                            </div>
                            <div className="modal-input">
                                <label>Credential (Password)</label>
                                <div className="password-wrap">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
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
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowUserModal(false)}>Discard</button>
                                <button type="submit" className="save-btn">Confirm Details</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPolicyModal && selectedPolicy && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal policy-modal animate-pop">
                        <div className="modal-header">
                            <div className="modal-title-wrap">
                                <div className="bank-avatar">
                                    {BANK_LOGOS[selectedPolicy.bank_name] ? <img src={BANK_LOGOS[selectedPolicy.bank_name]} alt={selectedPolicy.bank_name} /> : selectedPolicy.bank_name?.charAt(0)}
                                </div>
                                <div>
                                    <h2>{selectedPolicy.bank_name}</h2>
                                    <p>Configure Partner Protocol</p>
                                </div>
                            </div>
                            <button className="close-modal" onClick={() => setShowPolicyModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSavePolicy} className="policy-form">
                            <div className="form-scrollable">
                                <div className="form-section">
                                    <label className="section-label">Financial Thresholds</label>
                                    <div className="form-grid">
                                        <div className="modal-input">
                                            <label>Partner Name</label>
                                            <input value={selectedPolicy.bank_name || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, bank_name: e.target.value })} required />
                                        </div>
                                        <div className="modal-input">
                                            <label>Min Income</label>
                                            <input value={selectedPolicy.income || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, income: e.target.value })} />
                                        </div>
                                        <div className="modal-input">
                                            <label>IRR (Interest)</label>
                                            <input value={selectedPolicy.irr || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, irr: e.target.value })} />
                                        </div>
                                        <div className="modal-input">
                                            <label>Max Tenor (Mon)</label>
                                            <input type="number" value={selectedPolicy.tenor || 0} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, tenor: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <label className="section-label">Lending Rules & Compliance</label>
                                    <div className="form-grid">
                                        <div className="modal-input">
                                            <label>CIBIL Minimum</label>
                                            <input value={selectedPolicy.cibil || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, cibil: e.target.value })} />
                                        </div>
                                        <div className="modal-input">
                                            <label>BT Status</label>
                                            <input value={selectedPolicy.bt || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, bt: e.target.value })} />
                                        </div>
                                        <div className="modal-input">
                                            <label>PF/PT Status</label>
                                            <input value={selectedPolicy.pf_pt || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, pf_pt: e.target.value })} />
                                        </div>
                                        <div className="modal-input">
                                            <label>FOIR Ratio</label>
                                            <input value={selectedPolicy.foir || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, foir: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <label className="section-label">Exceptions & Special Cases</label>
                                    <div className="modal-input">
                                        <label>Obligation Exceptions (Intelligence)</label>
                                        <textarea
                                            rows="3"
                                            value={selectedPolicy.obligation_exception || ''}
                                            onChange={(e) => setSelectedPolicy({ ...selectedPolicy, obligation_exception: e.target.value })}
                                        />
                                    </div>
                                    <div className="modal-input">
                                        <label>CC BT Policy</label>
                                        <input value={selectedPolicy.cc_bt || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, cc_bt: e.target.value })} />
                                    </div>
                                    <div className="modal-input">
                                        <label>Residence Proof</label>
                                        <input value={selectedPolicy.residence_proof || ''} onChange={(e) => setSelectedPolicy({ ...selectedPolicy, residence_proof: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowPolicyModal(false)}>Discard</button>
                                <button type="submit" className="save-btn">Update Partner Details</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showClientModal && selectedClient && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal audit-modal animate-pop">
                        <div className="modal-header">
                            <div className="modal-title-wrap">
                                <div className="c-avatar-mini">{selectedClient.client_name?.charAt(0)}</div>
                                <div>
                                    <h2>Application Audit: {selectedClient.client_name}</h2>
                                    <p>Detailed Lead Logic & Verification</p>
                                </div>
                            </div>
                            <button className="close-modal" onClick={() => setShowClientModal(false)} style={{ fontSize: '1.2rem', padding: '10px' }}>×</button>
                        </div>

                        <div className="audit-content">
                            <div className="audit-section">
                                <label className="section-label">Qualified Responses</label>
                                <div className="h-qa-grid">
                                    {Object.entries(typeof selectedClient.questions === 'string' ? JSON.parse(selectedClient.questions) : (selectedClient.questions || {})).map(([key, val]) => {
                                        if (['reasons', 'results', 'probable'].includes(key)) return null;
                                        return (
                                            <div key={key} className="qa-pill-detailed">
                                                <div className="qa-label-wrap">
                                                    <span className="q-id">{key.toUpperCase()}</span>
                                                    <span className="q-text">{QUESTION_MAP[key] || key}</span>
                                                </div>
                                                <span className={`a-val ${val === 'Yes' ? 'pass' : 'fail'}`}>{val}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="audit-grid-split">
                                <div className="audit-box">
                                    <label className="section-label">System Matches (Results)</label>
                                    <div className="match-list">
                                        {(typeof selectedClient.questions === 'string' ? JSON.parse(selectedClient.questions) : (selectedClient.questions || {})).results?.map(r => (
                                            <div key={r} className="match-item result">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                {r}
                                            </div>
                                        ))}
                                        {!(typeof selectedClient.questions === 'string' ? JSON.parse(selectedClient.questions) : (selectedClient.questions || {})).results?.length && <p className="none-text">No matches found</p>}
                                    </div>
                                </div>
                                <div className="audit-box">
                                    <label className="section-label">Probable Banks</label>
                                    <div className="match-list">
                                        {(typeof selectedClient.questions === 'string' ? JSON.parse(selectedClient.questions) : (selectedClient.questions || {})).probable?.map(p => (
                                            <div key={p} className="match-item probable">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                                {p}
                                            </div>
                                        ))}
                                        {!(typeof selectedClient.questions === 'string' ? JSON.parse(selectedClient.questions) : (selectedClient.questions || {})).probable?.length && <p className="none-text">No probables</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="audit-footer-stats">
                                <div className="f-stat">
                                    <label>Reported Salary</label>
                                    <span>₹{parseFloat(selectedClient.salary).toLocaleString()}</span>
                                </div>
                                <div className="f-stat">
                                    <label>Final Status</label>
                                    <span className={`status-pill filled ${selectedClient.status}`}>{selectedClient.status}</span>
                                </div>
                                <div className="f-stat">
                                    <label>Loginned By</label>
                                    <span>Agent: {selectedClient.loginned_by}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="save-btn" onClick={() => setShowClientModal(false)}>Close Audit</button>
                        </div>
                    </div>
                </div>
            )}

            <nav className="admin-mobile-nav">
                <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => { setActiveTab('employees'); setSelectedEmployee(null); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    <span>Staff</span>
                </button>
                <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => { setActiveTab('clients'); setSelectedEmployee(null); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>
                    <span>Leads</span>
                </button>
                <button className={activeTab === 'policies' ? 'active' : ''} onClick={() => { setActiveTab('policies'); setSelectedEmployee(null); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <span>Policy</span>
                </button>
            </nav>

            <style>{`
                :root {
                    --admin-bg-dark: #020617;
                    --admin-bg-light: #f8fafc;
                    --admin-sidebar-dark: rgba(255,255,255,0.01);
                    --admin-sidebar-light: #ffffff;
                    --admin-text-dark: #ffffff;
                    --admin-text-light: #0f172a;
                    --admin-muted-dark: #94a3b8;
                    --admin-muted-light: #64748b;
                    --admin-border-dark: rgba(255,255,255,0.05);
                    --admin-border-light: #e2e8f0;
                    --admin-card-dark: rgba(255,255,255,0.02);
                    --admin-card-light: #ffffff;
                    --primary: #6366f1;
                    --accent: #a855f7;
                }

                .admin-container.theme-dark {
                    --bg: var(--admin-bg-dark);
                    --sidebar-bg: var(--admin-sidebar-dark);
                    --text: var(--admin-text-dark);
                    --text-main: var(--admin-text-dark);
                    --text-muted: var(--admin-muted-dark);
                    --border: var(--admin-border-dark);
                    --border-light: var(--admin-border-dark);
                    --card-bg: var(--admin-card-dark);
                    --bg-side: #0f172a;
                    --input-bg: rgba(255, 255, 255, 0.03);
                    --primary-glow: rgba(99, 102, 241, 0.2);
                    --shadow: none;
                }

                .admin-container.theme-light {
                    --bg: var(--admin-bg-light);
                    --sidebar-bg: var(--admin-sidebar-light);
                    --text: var(--admin-text-light);
                    --text-main: var(--admin-text-light);
                    --text-muted: var(--admin-muted-light);
                    --border: var(--admin-border-light);
                    --border-light: var(--admin-border-light);
                    --card-bg: var(--admin-card-light);
                    --bg-side: #f1f5f9;
                    --input-bg: rgba(0, 0, 0, 0.04);
                    --primary-glow: rgba(99, 102, 241, 0.2);
                    --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }

                .admin-container { 
                    display: flex; height: 100vh; width: 100vw; 
                    background: var(--bg); color: var(--text); 
                    font-family: 'Outfit'; transition: background 0.3s, color 0.3s;
                }
                .admin-sidebar { 
                    width: 260px; background: var(--sidebar-bg); 
                    border-right: 1px solid var(--border); padding: 2rem; 
                    display: flex; flex-direction: column; 
                }
                .sidebar-footer { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }
                
                .theme-toggle {
                    display: flex; align-items: center; gap: 12px; background: transparent; 
                    border: 1px solid var(--border); color: var(--text-muted); 
                    padding: 0.8rem 1rem; border-radius: 12px; cursor: pointer; 
                    transition: 0.3s; font-size: 0.9rem;
                }
                .theme-toggle:hover { background: var(--border); color: var(--text); }
                
                .admin-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 3rem; }
                .admin-brand span { font-weight: 200; font-size: 1.1rem; letter-spacing: -0.02em; }
                
                .admin-nav { display: flex; flex-direction: column; gap: 20px; margin-bottom: 2rem; }
                .nav-group { display: flex; flex-direction: column; gap: 6px; }
                .nav-group label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); opacity: 0.6; padding-left: 1rem; letter-spacing: 0.1em; font-weight: 600; }
                
                .admin-nav button { 
                    display: flex; align-items: center; gap: 12px; background: transparent; border: none; 
                    color: var(--text-muted); padding: 0.8rem 1rem; border-radius: 12px; cursor: pointer; 
                    transition: 0.3s; font-size: 0.9rem; text-align: left;
                }
                .back-link {
                    display: inline-flex; align-items: center; gap: 10px;
                    background: var(--input-bg); border: 1px solid var(--border);
                    color: var(--text); padding: 0.6rem 1.2rem; border-radius: 100px;
                    cursor: pointer; font-size: 0.85rem; font-weight: 500;
                    margin-bottom: 2rem; transition: 0.2s;
                }
                .back-link:hover { background: var(--border); transform: translateX(-4px); }
                
                .emp-expand-header { display: flex; align-items: center; gap: 20px; margin-bottom: 2rem; }
                .emp-expand-avatar { 
                    width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); 
                    border-radius: 20px; display: flex; align-items: center; justify-content: center;
                    color: white; font-size: 1.5rem; font-weight: 600; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
                    overflow: hidden;
                }
                .emp-expand-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .admin-nav button:hover { background: var(--border); color: var(--text); }
                .admin-nav button.active { background: rgba(99, 102, 241, 0.1); color: #6366f1; font-weight: 500; }
                
                .admin-logout { padding: 0.8rem; border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 12px; background: transparent; cursor: pointer; transition: 0.3s; font-size: 0.85rem; text-align: center; }
                .admin-logout:hover { background: rgba(239, 68, 68, 0.05); }

                .admin-viewport { flex: 1; overflow-y: auto; padding: 3rem 4rem; }
                .view-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; gap: 2rem; }
                .head-text h1 { font-size: 1.8rem; font-weight: 200; margin-bottom: 0.4rem; }
                .head-text p { color: var(--text-muted); font-size: 0.9rem; font-weight: 300; }
                
                .head-actions { display: flex; align-items: center; gap: 1rem; }
                .search-box { 
                    display: flex; align-items: center; gap: 10px; background: var(--card-bg); 
                    border: 1px solid var(--border); padding: 0.6rem 1rem; border-radius: 14px; 
                    width: 280px; transition: 0.3s;
                }
                .search-box:focus-within { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); }
                .search-box input { background: transparent; border: none; color: var(--text); outline: none; font-size: 0.9rem; width: 100%; }
                .search-box svg { color: var(--text-muted); }

                .add-btn { padding: 0.7rem 1.2rem; background: #6366f1; border: none; border-radius: 12px; color: #fff; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: 0.3s; }
                .add-btn:hover { background: #4f46e5; transform: translateY(-1px); }

                .global-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
                .g-stat-card { background: var(--card-bg); border: 1px solid var(--border); padding: 1.5rem; border-radius: 20px; box-shadow: var(--shadow); }
                .g-stat-card label { display: block; font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem; font-weight: 600; letter-spacing: 0.05em; }
                .g-val-row { display: flex; align-items: baseline; gap: 10px; }
                .g-val { font-size: 1.8rem; font-weight: 300; }
                .g-trend { font-size: 0.75rem; color: #6366f1; font-weight: 500; }

                .employee-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
                .employee-card { 
                    background: var(--card-bg); border: 1px solid var(--border); 
                    border-radius: 24px; padding: 1.5rem; box-shadow: var(--shadow);
                }
                .employee-card.interactive:hover { transform: translateY(-4px); border-color: rgba(99, 102, 241, 0.3); }
                
                .emp-top { display: flex; align-items: center; gap: 15px; margin-bottom: 1.5rem; }
                .emp-avatar { 
                    width: 45px; height: 45px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); 
                    color: white; border-radius: 14px; display: flex; align-items: center; justify-content: center; 
                    font-weight: 600; font-size: 1.1rem; position: relative;
                }
                .emp-avatar .online-dot { 
                    position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; 
                    background: #10b981; border: 2px solid var(--card-bg); border-radius: 50%; 
                }
                
                .emp-info h3 { font-size: 1rem; font-weight: 500; margin-bottom: 2px; }
                .emp-info span { font-size: 0.75rem; color: var(--text-muted); }
                .edit-emp-btn { margin-left: auto; width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; }

                .emp-card-content { display: flex; flex-direction: column; gap: 1.5rem; }
                .emp-primary-stats { display: flex; justify-content: space-between; padding-bottom: 1.2rem; border-bottom: 1px solid var(--border); }
                .p-stat label { display: block; font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.3rem; font-weight: 600; }
                .p-stat p { font-size: 1.2rem; font-weight: 400; }
                .p-stat p.highlight-text { color: #6366f1; font-weight: 600; }

                .emp-funnel { display: flex; flex-direction: column; gap: 10px; }
                .funnel-item { display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 12px; }
                .funnel-item > span { font-size: 0.7rem; color: var(--text-muted); }
                .funnel-bar { height: 6px; background: var(--border); border-radius: 10px; position: relative; display: flex; align-items: center; }
                .funnel-bar .fill { height: 100%; background: #6366f1; border-radius: 10px; transition: 1s cubic-bezier(0.4, 0, 0.2, 1); }
                .funnel-bar .fill.blue { background: #3b82f6; }
                .funnel-bar .fill.green { background: #22c55e; }
                .funnel-bar span { position: absolute; right: 0; top: -14px; font-size: 0.65rem; font-weight: 600; color: var(--text-muted); }

                .global-activity-section { margin-top: 4rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 28px; padding: 2.5rem; }
                .section-header { margin-bottom: 2rem; }
                .section-header h2 { font-size: 1.4rem; font-weight: 300; margin-bottom: 0.4rem; }
                .section-header p { font-size: 0.9rem; color: var(--text-muted); }
                
                .activity-list { display: flex; flex-direction: column; }
                .activity-row { 
                    display: grid; grid-template-columns: 1.5fr 1fr 1.2fr; align-items: center; 
                    padding: 1.2rem 0; border-bottom: 1px solid var(--border); transition: 0.3s;
                }
                .activity-row:last-child { border-bottom: none; }
                .activity-row:hover { background: rgba(255,255,255,0.01); padding-left: 10px; margin-left: -10px; padding-right: 10px; margin-right: -10px; border-radius: 12px; }
                
                .act-main { display: flex; flex-direction: column; gap: 4px; }
                .act-client { font-size: 0.95rem; font-weight: 500; color: var(--text); }
                .act-meta { font-size: 0.75rem; color: var(--text-muted); }
                
                .act-agent { display: flex; flex-direction: column; gap: 4px; }
                .act-label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; }
                .act-name { font-size: 0.85rem; color: var(--text); font-weight: 300; }
                
                .act-status { display: flex; align-items: center; justify-content: flex-end; gap: 1.5rem; }
                .status-pill { font-size: 0.7rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; text-transform: capitalize; }
                .status-pill.disbursed { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .status-pill.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .status-pill.follow_up { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
                .act-date { font-size: 0.75rem; color: var(--text-muted); text-align: right; }

                .client-master-list { background: var(--card-bg); border: 1px solid var(--border); border-radius: 28px; overflow: hidden; box-shadow: var(--shadow); }
                .client-list-header { 
                    display: grid; grid-template-columns: 2fr 1.2fr 1.5fr 1fr; 
                    padding: 1.2rem 2.5rem; background: var(--border); opacity: 0.8;
                    font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); 
                    font-weight: 700; letter-spacing: 0.12em;
                }
                .client-rows { max-height: calc(100vh - 300px); overflow-y: auto; scrollbar-width: none; }
                .client-rows::-webkit-scrollbar { display: none; }

                .client-item-row { 
                    display: grid; grid-template-columns: 2fr 1.2fr 1.5fr 1fr; 
                    padding: 1.2rem 2.5rem; border-bottom: 1px solid var(--border); 
                    align-items: center; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .client-item-row:hover { background: rgba(99, 102, 241, 0.03); transform: translateX(8px); }
                .client-item-row:last-child { border-bottom: none; }

                .c-info-wrap { display: flex; align-items: center; gap: 15px; }
                .c-avatar-mini { 
                    width: 38px; height: 38px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); 
                    color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; 
                    font-weight: 600; font-size: 0.9rem; flex-shrink: 0;
                }
                .c-info { display: flex; flex-direction: column; gap: 2px; }
                .c-name { font-size: 0.95rem; font-weight: 500; color: var(--text); }
                .c-sub { font-size: 0.7rem; color: var(--text-muted); }

                .c-agent-pill { 
                    display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.03); 
                    padding: 4px 12px; border-radius: 100px; border: 1px solid var(--border);
                }
                .a-dot { width: 6px; height: 6px; background: #6366f1; border-radius: 50%; box-shadow: 0 0 10px #6366f1; }
                .c-agent-pill span { font-size: 0.8rem; color: var(--text); font-weight: 300; }

                .loan-brief { display: flex; flex-direction: column; gap: 2px; }
                .loan-brief .c-val { font-size: 0.85rem; font-weight: 400; color: var(--text); text-transform: capitalize; }
                .loan-brief .match-pills { display: flex; gap: 6px; margin-top: 4px; }
                .match-tag { font-size: 0.6rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.02em; }
                .match-tag.result { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .match-tag.probable { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
                .match-tag.none { background: var(--input-bg); color: var(--text-muted); }

                .status-container { display: flex; align-items: center; justify-content: flex-end; gap: 15px; }
                .status-pill.filled { 
                    font-size: 0.65rem; padding: 4px 12px; border-radius: 6px; 
                    font-weight: 700; text-transform: uppercase; border: none; letter-spacing: 0.02em;
                }
                .status-pill.filled.disbursed { background: #10b981; color: white; }
                .status-pill.filled.follow_up { background: #6366f1; color: white; }
                .status-pill.filled.rejected { background: #ef4444; color: white; }

                .row-action-btn { 
                    width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--border);
                    background: transparent; color: var(--text-muted); cursor: pointer;
                    display: flex; align-items: center; justify-content: center; visibility: hidden; opacity: 0;
                    transition: 0.3s;
                }
                .client-item-row:hover .row-action-btn { visibility: visible; opacity: 1; border-color: #6366f1; color: #6366f1; }
                .row-action-btn:hover { background: #6366f1; color: white !important; transform: scale(1.1); }
                .pointer { cursor: pointer; }

                .audit-modal { width: 850px !important; max-width: 95vw; padding: 1.5rem 2rem !important; }
                .audit-content { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 0; }
                .audit-grid-split { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.2rem; align-items: stretch; }
                .audit-box { background: var(--input-bg); border: 1px solid var(--border); padding: 1.2rem; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
                
                .match-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 1rem; }
                .match-item { 
                    display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 500; 
                    padding: 8px 14px; border-radius: 10px; border: 1px solid transparent;
                }
                .match-item.result { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
                .match-item.probable { background: rgba(99, 102, 241, 0.1); color: #6366f1; border-color: rgba(99, 102, 241, 0.2); }
                .none-text { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }

                .audit-footer-stats { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--input-bg); border-radius: 14px; border: 1px solid var(--border); }
                .f-stat label { display: block; font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.05em; font-weight: 600; }
                .f-stat span { font-size: 1rem; font-weight: 500; }

                .res-group { margin-bottom: 1rem; }
                .res-group:last-child { margin-bottom: 0; }
                .res-mini-tag.secondary { background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.1); color: #818cf8; }

                .periodic-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
                .p-stat-card { background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.1); padding: 2rem; border-radius: 24px; position: relative; overflow: hidden; }
                
                .p-stat-card.highlight { background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%); border-color: rgba(99, 102, 241, 0.3); }
                .p-stat-card.highlight .val { color: #818cf8; font-weight: 300; }
                
                .p-stat-card.follow-up { border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.02); }
                .p-stat-card.follow-up .val { color: #3b82f6; }
                .p-stat-card.disbursed { border-color: rgba(34, 197, 94, 0.2); background: rgba(34, 197, 94, 0.02); }
                .p-stat-card.disbursed .val { color: #22c55e; }
                .p-stat-card.rejected { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02); }
                .p-stat-card.rejected .val { color: #ef4444; }

                .p-stat-card label { display: block; font-size: 0.7rem; text-transform: uppercase; color: #6366f1; margin-bottom: 1rem; letter-spacing: 0.1em; }
                .p-stat-card .val { font-size: 2.5rem; font-weight: 200; display: block; }
                .p-stat-card .sub { font-size: 0.8rem; color: #94a3b8; }

                .history-header { margin-bottom: 2rem; }
                .history-header h3 { font-size: 1.4rem; font-weight: 300; margin-bottom: 0.25rem; }
                .history-header p { font-size: 0.85rem; color: #94a3b8; }

                .history-item { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 1.5rem; margin-bottom: 1rem; }
                .h-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .h-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 0.2rem; }
                .h-client { font-size: 1.1rem; font-weight: 400; }
                .h-type-badge { font-size: 0.6rem; text-transform: uppercase; background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em; font-weight: 500; }
                .h-meta { font-size: 0.85rem; color: #94a3b8; font-weight: 300; }
                .h-status { text-align: right; display: flex; flex-direction: column; gap: 8px; }
                .h-date { font-size: 0.75rem; color: #64748b; }
                .status-tag { padding: 0.3rem 0.8rem; border-radius: 100px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.05); }
                .status-tag.disbursed { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .status-tag.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .status-tag.follow_up { background: rgba(99, 102, 241, 0.1); color: #6366f1; }

                .h-qa-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 0.5rem; }
                .qa-pill-detailed { 
                    background: var(--input-bg); border: 1px solid var(--border); 
                    padding: 0.6rem 0.8rem; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;
                }
                .qa-label-wrap { display: flex; flex-direction: column; gap: 2px; }
                .q-id { font-size: 0.55rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
                .q-text { font-size: 0.75rem; color: var(--text); font-weight: 300; }
                .a-val { font-size: 0.8rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
                .a-val.pass { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .a-val.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .h-results-row { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; display: flex; align-items: center; gap: 12px; }
                .res-mini-label { font-size: 0.65rem; color: #64748b; text-transform: uppercase; }
                .res-mini-tags { display: flex; flex-wrap: wrap; gap: 6px; }
                .res-mini-tag { font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 4px; background: rgba(99, 102, 241, 0.1); color: #6366f1; }

                .empty-history { text-align: center; padding: 4rem; color: #64748b; font-style: italic; }

                .policy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
                .policy-card { 
                    background: var(--card-bg); border: 1px solid var(--border); 
                    border-radius: 20px; padding: 1.8rem; transition: 0.3s; cursor: pointer;
                    display: flex; flex-direction: column; gap: 1.5rem;
                }
                .policy-card:hover { transform: translateY(-4px); border-color: #6366f1; box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.2); }
                
                .p-card-head { display: flex; align-items: flex-start; gap: 14px; }
                .bank-avatar { width: 44px; height: 44px; background: rgba(99, 102, 241, 0.1); color: #6366f1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.2rem; overflow: hidden; }
                .bank-avatar img { width: 100%; height: 100%; object-fit: contain; background: white; }
                .bank-info h3 { font-size: 1.1rem; font-weight: 400; margin-bottom: 4px; }
                .bank-info span { font-size: 0.75rem; color: var(--text-muted); display: block; }
                .irr-badge { margin-left: auto; background: rgba(34, 197, 94, 0.1); color: #22c55e; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; }

                .p-card-body { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; padding: 1.2rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
                .p-mini-stat label { display: block; font-size: 0.55rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.05em; font-weight: 600; }
                .p-mini-stat p { font-size: 0.85rem; font-weight: 400; color: var(--text); }
                
                .edit-action { background: transparent; border: none; color: #6366f1; font-size: 0.85rem; font-weight: 500; padding: 0.5rem 0; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px; }
                .edit-action:hover { text-decoration: underline; }

                .policy-modal { width: 750px !important; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .modal-title-wrap { display: flex; align-items: center; gap: 12px; }
                .modal-title-wrap h2 { font-size: 1.4rem; font-weight: 300; }
                .modal-title-wrap p { font-size: 0.9rem; color: var(--text-muted); }
                .close-modal { background: none; border: none; color: var(--text-muted); font-size: 1.8rem; cursor: pointer; transition: 0.3s; }
                .close-modal:hover { color: #f43f5e; }

                .form-scrollable { max-height: 55vh; overflow-y: auto; padding-right: 20px; margin-bottom: 2rem; scrollbar-width: thin; }
                .form-section { margin-bottom: 2.5rem; }
                .section-label { display: block; font-size: 0.7rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                
                .policy-form input, .policy-form textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); padding: 1rem; border-radius: 14px; color: var(--text); outline: none; transition: 0.3s; font-family: inherit; font-size: 0.9rem; }
                .policy-form input:focus, .policy-form textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.05); }
                .policy-form textarea { line-height: 1.6; }
                .add-btn.secondary:hover { background: #6366f1; color: #fff; }

                .empty-history { 
                    display: flex; flex-direction: column; align-items: center; justify-content: center; 
                    padding: 6rem 2rem; text-align: center; color: var(--text-muted); 
                }
                .empty-icon { 
                    width: 70px; height: 70px; background: rgba(99, 102, 241, 0.05); 
                    border-radius: 20px; display: flex; align-items: center; justify-content: center; 
                    margin-bottom: 1.5rem; color: #6366f1; border: 1px solid var(--border);
                }
                .empty-history h3 { font-size: 1.2rem; font-weight: 300; margin-bottom: 0.5rem; color: var(--text); }
                .empty-history p { font-size: 0.85rem; max-width: 250px; line-height: 1.5; }

                .admin-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
                .admin-modal { background: var(--bg-side); width: 450px; border-radius: 28px; padding: 2.5rem; border: 1px solid var(--border); box-shadow: var(--shadow); }
                .modal-input { margin-bottom: 1.5rem; }
                .modal-input label { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.6rem; }
                .modal-input input { width: 100%; background: var(--input-bg); border: 1px solid var(--border); padding: 1rem; border-radius: 12px; color: var(--text); outline: none; }
                .modal-input input:focus { border-color: #6366f1; }
                
                .password-wrap { position: relative; display: flex; align-items: center; }
                .password-eye { position: absolute; right: 0.75rem; background: none; border: none; color: #64748b; cursor: pointer; display: flex; padding: 0.5rem; transition: 0.3s; }
                .password-eye:hover { color: #fff; }
                .admin-mobile-header { display: none; }
                .admin-mobile-nav { display: none; }

                .modal-actions { display: flex; gap: 1rem; margin-top: 1rem; }
                .cancel-btn { flex: 1; padding: 1rem; background: transparent; border: 1px solid var(--border); color: var(--text); border-radius: 12px; cursor: pointer; }
                .save-btn { flex: 1.5; padding: 1rem; background: #6366f1; border: none; color: #fff; border-radius: 12px; cursor: pointer; }

                @media (max-width: 1200px) {
                    .admin-viewport { padding: 2rem; }
                    .global-stats-row { grid-template-columns: repeat(2, 1fr); }
                    .periodic-stats-row { grid-template-columns: repeat(2, 1fr); }
                }

                @media (max-width: 1024px) {
                    .admin-sidebar { width: 80px; padding: 1.5rem 0.5rem; }
                    .admin-sidebar .sidebar-head span, .admin-nav label, .admin-nav button span, .sidebar-footer span { display: none; }
                    .admin-nav button { justify-content: center; padding: 0.8rem; }
                    .admin-nav button svg { margin: 0; }
                    .sidebar-head { justify-content: center; margin-bottom: 2rem; }
                }

                @media (max-width: 768px) {
                    .admin-container { flex-direction: column; overflow-y: auto; height: auto; }
                    .admin-sidebar { display: none; }
                    .admin-viewport { padding: 1.5rem; height: auto; overflow: visible; padding-bottom: 80px !important; }
                    .global-stats-row, .periodic-stats-row { grid-template-columns: 1fr; }
                    .view-head { flex-direction: column; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem; }
                    .search-box { width: 100%; }
                    .activity-row { grid-template-columns: 1fr; gap: 1rem; }
                    .act-status { justify-content: space-between; border-top: 1px solid var(--border); padding-top: 1rem; }
                    
                    .client-list-header { display: none; }
                    .client-item-row { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.5rem; }
                    .c-status { justify-content: space-between; width: 100%; border-top: 1px solid var(--border); padding-top: 1rem; }
                    .row-action-btn { visibility: visible; opacity: 1; }
                    
                    .employee-grid, .policy-grid { grid-template-columns: 1fr; }
                    .admin-modal { width: 90%; padding: 1.5rem; }
                    .audit-modal { width: 95% !important; max-height: 90vh; overflow-y: auto; }
                    .audit-grid-split { grid-template-columns: 1fr; }
                    .audit-footer-stats { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                    .form-grid { grid-template-columns: 1fr; }
                    .history-item .h-top { flex-direction: column; gap: 1rem; }
                    .h-status { text-align: left; align-items: flex-start; }

                    .admin-mobile-header { 
                        display: flex; justify-content: space-between; align-items: center; 
                        padding: 1rem 1.5rem; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px);
                        border-bottom: 1px solid rgba(255,255,255,0.05); 
                        position: sticky; top: 0; z-index: 1000;
                    }
                    .admin-mobile-header .admin-brand { margin: 0; }
                    .admin-mobile-header .logout-btn { background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }

                    .admin-mobile-nav { 
                        display: flex; position: fixed; bottom: 0; left: 0; right: 0; 
                        background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(20px);
                        border-top: 1px solid rgba(255,255,255,0.05); 
                        padding: 0.8rem; justify-content: space-around; z-index: 1000;
                        box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
                    }
                    .admin-mobile-nav button { 
                        background: none; border: none; color: #94a3b8; display: flex; flex-direction: column; 
                        align-items: center; gap: 4px; font-size: 0.65rem; transition: 0.3s;
                    }
                    .admin-mobile-nav button.active { color: #6366f1; }
                    .admin-mobile-nav button svg { transition: 0.3s; }
                    .admin-mobile-nav button.active svg { transform: translateY(-3px); filter: drop-shadow(0 0 8px #6366f1); }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
