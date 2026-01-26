import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

const Summary = () => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        portfolioCount: 0,
        conversionRate: 0,
        statusCounts: { follow_up: 0, conversion: 0, disbursed: 0, rejected: 0 },
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        const currentUser = JSON.parse(localStorage.getItem('app_user'))?.name || 'Vicky';
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('client_logins')
                .select('*')
                .eq('loginned_by', currentUser)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const totalRev = data
                    .filter(c => c.status === 'disbursed')
                    .reduce((acc, curr) => acc + (parseFloat(curr.eligibility) || 0), 0);

                const sCounts = data.reduce((acc, curr) => {
                    acc[curr.status] = (acc[curr.status] || 0) + 1;
                    return acc;
                }, { follow_up: 0, conversion: 0, disbursed: 0, rejected: 0 });

                const convRate = data.length > 0
                    ? ((sCounts.disbursed / data.length) * 100).toFixed(1)
                    : 0;

                setStats({
                    totalRevenue: totalRev,
                    portfolioCount: data.length,
                    conversionRate: convRate,
                    statusCounts: sCounts,
                    recentActivity: data.slice(0, 5)
                });
            }
        } catch (error) {
            console.error('Error fetching summary:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status) => {
        return status.replace('_', ' ').toUpperCase();
    };

    return (
        <div className="summary-view">
            <header className="view-intro">
                <div className="header-flex">
                    <div className="text-block">
                        <h2>Strategic Overview</h2>
                        <p>Performance intelligence and unit economics from live application data.</p>
                    </div>
                    <button className="sync-btn" onClick={fetchDashboardData}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 12a9 9 0 0 0 15 6.7L21 16M21 22v-6h-6" /></svg>
                        Refresh Intelligence
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="summary-loader">
                    <div className="loader-ring"></div>
                    <span>Aggregating Global Metrics...</span>
                </div>
            ) : (
                <>
                    <div className="stats-row">
                        <div className="metric-glass">
                            <div className="m-top">
                                <span className="m-tag">Aggregated Revenue</span>
                                <div className="m-icon rev">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                </div>
                            </div>
                            <div className="m-body">
                                <h3>₹{stats.totalRevenue.toLocaleString()}<span>.00</span></h3>
                            </div>
                            <div className="m-footer">
                                <span className="trend positive">Live</span>
                                <span className="label">Total Disbursed Capital</span>
                            </div>
                        </div>

                        <div className="metric-glass">
                            <div className="m-top">
                                <span className="m-tag">Active Portfolio</span>
                                <div className="m-icon port">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                </div>
                            </div>
                            <div className="m-body">
                                <h3>{stats.portfolioCount}</h3>
                            </div>
                            <div className="m-footer">
                                <span className="trend positive">Total</span>
                                <span className="label">Client Submissions</span>
                            </div>
                        </div>

                        <div className="metric-glass">
                            <div className="m-top">
                                <span className="m-tag">Conversion Index</span>
                                <div className="m-icon conv">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                </div>
                            </div>
                            <div className="m-body">
                                <h3>{stats.conversionRate}%</h3>
                            </div>
                            <div className="m-footer">
                                <span className="trend neutral">Optimal</span>
                                <span className="label">Disbursement Success</span>
                            </div>
                        </div>
                    </div>

                    <div className="analysis-grid">
                        <div className="analysis-panel chart-zone">
                            <div className="panel-head">
                                <label>Lifecycle distribution</label>
                                <h4>Pipeline Breakdown</h4>
                            </div>
                            <div className="pipeline-container">
                                {Object.entries(stats.statusCounts).map(([status, count]) => (
                                    <div key={status} className="pipeline-item">
                                        <div className="p-info">
                                            <span className="p-label">{status.replace('_', ' ')}</span>
                                            <span className="p-count">{count}</span>
                                        </div>
                                        <div className="p-bar-wrap">
                                            <div
                                                className={`p-bar-fill ${status}`}
                                                style={{ width: `${stats.portfolioCount > 0 ? (count / stats.portfolioCount * 100) : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="analysis-panel activity-zone">
                            <div className="panel-head">
                                <label>Recent Intelligence</label>
                                <h4>Lead Event Log</h4>
                            </div>
                            <div className="event-stack">
                                {stats.recentActivity.length === 0 ? (
                                    <div className="empty-activity">No recent updates detected.</div>
                                ) : (
                                    stats.recentActivity.map(client => (
                                        <div key={client.id} className="event-item">
                                            <div className={`event-marker ${client.status}`}></div>
                                            <div className="event-info">
                                                <span className="e-title">{client.client_name} - {getStatusLabel(client.status)}</span>
                                                <span className="e-meta">
                                                    ₹{parseFloat(client.eligibility || 0).toLocaleString()} • {new Date(client.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .summary-view { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                
                .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .view-intro h2 { font-size: 1.8rem; font-weight: 200; letter-spacing: -0.04em; margin-bottom: 0.25rem; }
                .view-intro p { color: var(--text-muted); font-size: 0.95rem; font-weight: 300; }
                
                .sync-btn { 
                    display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.02); 
                    border: 1px solid var(--border-light); color: var(--text-main); padding: 0.6rem 1.2rem;
                    border-radius: 12px; cursor: pointer; font-size: 0.85rem; transition: 0.3s;
                }
                .sync-btn:hover { background: rgba(255,255,255,0.05); border-color: var(--primary); }

                .summary-loader { height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: var(--text-muted); }
                .loader-ring { width: 30px; height: 30px; border: 2px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
                
                .metric-glass {
                    background: var(--glass-bg); backdrop-filter: blur(15px);
                    border: 1px solid var(--glass-border); border-radius: 24px;
                    padding: 1.8rem; box-shadow: var(--card-shadow); transition: 0.4s;
                }
                .metric-glass:hover { transform: translateY(-4px); border-color: var(--primary); }
                
                .m-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .m-tag { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); font-weight: 500; }
                .m-icon { padding: 10px; border-radius: 12px; }
                .m-icon.rev { color: #10b981; background: rgba(16, 185, 129, 0.05); }
                .m-icon.port { color: #6366f1; background: rgba(99, 102, 241, 0.05); }
                .m-icon.conv { color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
                
                .m-body h3 { font-size: 2rem; font-weight: 200; letter-spacing: -0.04em; color: var(--text-main); }
                .m-body h3 span { font-size: 1rem; opacity: 0.4; margin-left: 2px; }
                
                .m-footer { margin-top: 1.2rem; display: flex; align-items: center; gap: 10px; }
                .trend { font-size: 0.65rem; padding: 3px 10px; border-radius: 100px; font-weight: 500; text-transform: uppercase; }
                .trend.positive { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .trend.neutral { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
                .m-footer .label { font-size: 0.75rem; color: var(--text-muted); font-weight: 300; }

                .analysis-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.5rem; }
                .analysis-panel {
                    background: var(--glass-bg); backdrop-filter: blur(15px);
                    border: 1px solid var(--glass-border); border-radius: 28px;
                    padding: 1.8rem; box-shadow: var(--card-shadow);
                }
                
                .panel-head { margin-bottom: 2rem; }
                .panel-head label { font-size: 0.65rem; text-transform: uppercase; color: var(--primary); letter-spacing: 0.15em; display: block; margin-bottom: 0.4rem; font-weight: 500; }
                .panel-head h4 { font-size: 1.3rem; font-weight: 200; color: var(--text-main); letter-spacing: -0.02em; }

                .pipeline-container { display: flex; flex-direction: column; gap: 1.5rem; }
                .pipeline-item { display: flex; flex-direction: column; gap: 8px; }
                .p-info { display: flex; justify-content: space-between; align-items: center; }
                .p-label { font-size: 0.85rem; color: var(--text-muted); text-transform: capitalize; font-weight: 300; }
                .p-count { font-size: 0.9rem; font-weight: 500; color: var(--text-main); }
                
                .p-bar-wrap { height: 6px; background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; }
                .p-bar-fill { height: 100%; border-radius: 10px; transition: 1s cubic-bezier(0.16, 1, 0.3, 1); }
                .p-bar-fill.disbursed { background: #10b981; }
                .p-bar-fill.conversion { background: #f59e0b; }
                .p-bar-fill.follow_up { background: #6366f1; }
                .p-bar-fill.rejected { background: #ef4444; }

                .event-stack { display: flex; flex-direction: column; gap: 1.2rem; }
                .event-item { display: flex; gap: 14px; align-items: center; padding: 0.8rem; border-radius: 16px; background: rgba(255,255,255,0.01); border: 1px solid transparent; transition: 0.3s; }
                .event-item:hover { border-color: var(--border-light); background: rgba(255,255,255,0.02); }
                .event-marker { width: 6px; height: 6px; border-radius: 50%; }
                .event-marker.disbursed { background: #10b981; box-shadow: 0 0 10px #10b981; }
                .event-marker.follow_up { background: #6366f1; box-shadow: 0 0 10px #6366f1; }
                .event-marker.conversion { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
                .event-marker.rejected { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
                
                .event-info { display: flex; flex-direction: column; }
                .e-title { font-size: 0.95rem; font-weight: 400; color: var(--text-main); margin-bottom: 2px; }
                .e-meta { font-size: 0.75rem; color: var(--text-muted); font-weight: 300; }
                
                .empty-activity { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; font-weight: 300; }

                @media (max-width: 1024px) {
                    .stats-row { grid-template-columns: repeat(2, 1fr); }
                    .analysis-grid { grid-template-columns: 1fr; }
                }

                @media (max-width: 768px) {
                    .header-flex { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                    .sync-btn { width: 100%; justify-content: center; }
                    .stats-row { grid-template-columns: 1fr; }
                    .metric-glass { padding: 1.5rem; }
                    .m-body h3 { font-size: 1.6rem; }
                    .panel-head h4 { font-size: 1.1rem; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Summary;
