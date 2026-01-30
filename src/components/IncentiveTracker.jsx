import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

const IncentiveTracker = () => {
    const [activeRange, setActiveRange] = useState('month'); // 'day', 'month', '6month', 'custom'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [summary, setSummary] = useState({ totalDisbursement: 0, totalIncentive: 0 });
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('');

    const fetchIncentives = async () => {
        const appUser = JSON.parse(localStorage.getItem('app_user'));
        const adminUser = JSON.parse(localStorage.getItem('admin_user'));

        // If an agent is selected, use that. Otherwise use current app user.
        const currentUser = selectedAgent || appUser?.username;

        try {
            setLoading(true);

            // If admin and no agents fetched yet, fetch them
            if (adminUser && agents.length === 0) {
                const { data: userList } = await supabase.from('users').select('username');
                setAgents(userList || []);
                // If it's admin view and no agent selected, maybe don't fetch data yet or fetch all
            }

            let query = supabase
                .from('agent_incentives')
                .select('*')
                .order('record_date', { ascending: false });

            if (currentUser) {
                query = query.eq('agent_username', currentUser);
            }

            const now = new Date();
            if (activeRange === 'day') {
                const today = now.toLocaleDateString('en-CA');
                query = query.eq('record_date', today);
            } else if (activeRange === 'month') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
                query = query.gte('record_date', monthStart);
            } else if (activeRange === '6month') {
                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toLocaleDateString('en-CA');
                query = query.gte('record_date', sixMonthsAgo);
            } else if (activeRange === 'custom' && customRange.start && customRange.end) {
                query = query.gte('record_date', customRange.start).lte('record_date', customRange.end);
            }

            const { data: records, error } = await query;
            if (error) throw error;

            setData(records || []);

            // Calculate summary
            const totals = (records || []).reduce((acc, curr) => ({
                totalDisbursement: acc.totalDisbursement + (parseFloat(curr.daily_disbursement) || 0),
                totalIncentive: acc.totalIncentive + (parseFloat(curr.earned_incentive) || 0)
            }), { totalDisbursement: 0, totalIncentive: 0 });

            setSummary(totals);

        } catch (err) {
            console.error('Error fetching incentives:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncentives();
    }, [activeRange, customRange.start, customRange.end, selectedAgent]);

    return (
        <div className="incentive-tracker">
            <header className="tracker-head">
                <div className="head-content">
                    <label>Earning Analytics</label>
                    <h2>Incentive Portfolio</h2>
                </div>

                <div className="head-actions-wrap">
                    {agents.length > 0 && (
                        <div className="agent-selector">
                            <select
                                value={selectedAgent}
                                onChange={(e) => setSelectedAgent(e.target.value)}
                                className="admin-agent-select"
                            >
                                <option value="">All Office Business</option>
                                {agents.map(agent => (
                                    <option key={agent.username} value={agent.username}>
                                        Agent: {agent.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="range-selector">
                        {['day', 'month', '6month', 'custom'].map(range => (
                            <button
                                key={range}
                                className={`range-btn ${activeRange === range ? 'active' : ''}`}
                                onClick={() => setActiveRange(range)}
                            >
                                {range === '6month' ? '6 Months' : range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {activeRange === 'custom' && (
                <div className="custom-filter-bar animate-fade">
                    <div className="input-group">
                        <label>From</label>
                        <input
                            type="date"
                            value={customRange.start}
                            onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>To</label>
                        <input
                            type="date"
                            value={customRange.end}
                            onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                        />
                    </div>
                </div>
            )}

            <div className="summary-cards">
                <div className="s-card glass-card">
                    <div className="s-icon purple">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <div className="s-info">
                        <span className="s-label">Aggregate Volume</span>
                        <h3 className="s-value">₹{summary.totalDisbursement.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="s-card glass-card highlighted">
                    <div className="s-icon orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <div className="s-info">
                        <span className="s-label">Net Incentive Cut</span>
                        <h3 className="s-value incentive">₹{summary.totalIncentive.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="table-zone">
                <header className="zone-head">
                    <div className="h-left">
                        <h4>Performance Ledger</h4>
                        <p>Detailed breakdown of daily disbursements and earned commissions.</p>
                    </div>
                    <button className="sync-trigger" onClick={fetchIncentives}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh Intelligence
                    </button>
                </header>

                <div className="table-glass">
                    {loading ? (
                        <div className="table-loader">
                            <div className="spinner"></div>
                            <p>Aggregating performance data...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="empty-state">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <p>No records found for the selected timeline.</p>
                        </div>
                    ) : (
                        <table className="incentive-table">
                            <thead>
                                <tr>
                                    <th>Lifecycle Date</th>
                                    <th>Business volume</th>
                                    <th>MTD Progression</th>
                                    <th className="align-right">Commissions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(item => (
                                    <tr key={item.id} className="table-row-animate">
                                        <td className="date-cell">
                                            <div className="d-wrap">
                                                <span className="day">{new Date(item.record_date).toLocaleDateString('en-US', { day: '2-digit' })}</span>
                                                <div className="m-y">
                                                    <span className="month">{new Date(item.record_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    <span className="year">{new Date(item.record_date).getFullYear()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="vol-cell">
                                            <span className="currency-symbol">₹</span>
                                            {parseFloat(item.daily_disbursement).toLocaleString()}
                                        </td>
                                        <td className="mtd-cell">
                                            <div className="mtd-progress-wrap">
                                                <span className="mtd-val">₹{parseFloat(item.total_revenue_mtd).toLocaleString()}</span>
                                                <div className="mini-bar">
                                                    <div className="fill" style={{ width: `${Math.min((parseFloat(item.total_revenue_mtd) / 500000) * 100, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="inc-cell align-right">
                                            <div className={`inc-pill ${parseFloat(item.earned_incentive) > 0 ? 'earned' : 'pending'}`}>
                                                ₹{parseFloat(item.earned_incentive).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style>{`
                .incentive-tracker { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); max-width: 1200px; margin: 0 auto; }
                
                .tracker-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
                .head-content label { font-size: 0.65rem; text-transform: uppercase; color: var(--primary); letter-spacing: 0.2em; font-weight: 600; margin-bottom: 0.5rem; display: block; }
                .head-content h2 { font-size: 2.2rem; font-weight: 200; letter-spacing: -0.05em; color: var(--text-main); }

                .head-actions-wrap { display: flex; align-items: center; gap: 1rem; }
                .admin-agent-select { 
                    background: var(--bg-side); border: 1px solid var(--border-light); color: var(--text-main); 
                    padding: 0.6rem 1rem; border-radius: 12px; font-family: 'Outfit'; font-size: 0.85rem; 
                    outline: none; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .admin-agent-select:focus { border-color: var(--primary); }

                .range-selector { display: flex; background: var(--bg-side); padding: 4px; border-radius: 14px; border: 1px solid var(--border-light); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
                .range-btn { padding: 0.6rem 1.2rem; border: none; background: none; color: var(--text-muted); font-size: 0.85rem; cursor: pointer; border-radius: 10px; transition: 0.3s; font-weight: 400; }
                .range-btn.active { background: var(--primary); color: white; box-shadow: 0 8px 15px var(--primary-glow); font-weight: 500; }

                .custom-filter-bar { display: flex; gap: 2rem; margin-bottom: 2.5rem; background: var(--glass-bg); backdrop-filter: blur(10px); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--glass-border); width: fit-content; }
                .input-group { display: flex; flex-direction: column; gap: 8px; }
                .input-group label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; }
                .input-group input { background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); color: var(--text-main); padding: 0.7rem 1rem; border-radius: 10px; font-family: 'Outfit'; outline: none; transition: 0.3s; }
                .input-group input:focus { border-color: var(--primary); background: rgba(255,255,255,0.05); }

                .summary-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
                .s-card { display: flex; align-items: center; gap: 1.5rem; padding: 2.2rem; border-radius: 28px; background: var(--glass-bg); border: 1px solid var(--glass-border); position: relative; overflow: hidden; transition: 0.4s; }
                .s-card:hover { transform: translateY(-4px); border-color: var(--primary); }
                .s-card.highlighted { border-color: rgba(245, 158, 11, 0.2); background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(245, 158, 11, 0.02) 100%); }
                
                .s-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
                .s-icon.purple { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; }
                .s-icon.orange { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }

                .s-label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; font-weight: 500; }
                .s-value { font-size: 2rem; font-weight: 200; margin-top: 6px; color: var(--text-main); letter-spacing: -0.02em; }
                .s-value.incentive { color: #f59e0b; font-weight: 400; }

                .table-zone { background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 32px; box-shadow: var(--card-shadow); overflow: hidden; }
                .zone-head { padding: 2rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
                .zone-head h4 { font-size: 1.2rem; font-weight: 400; color: var(--text-main); margin-bottom: 4px; }
                .zone-head p { font-size: 0.85rem; color: var(--text-muted); }

                .sync-trigger { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border-light); color: var(--text-muted); padding: 0.6rem 1.2rem; border-radius: 12px; cursor: pointer; transition: 0.3s; font-size: 0.8rem; }
                .sync-trigger:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-glow); }

                .table-glass { min-height: 400px; }
                .incentive-table { width: 100%; border-collapse: collapse; text-align: left; }
                .incentive-table th { padding: 1.2rem 2rem; font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1.5px; border-bottom: 1px solid var(--border-light); font-weight: 600; }
                .incentive-table td { padding: 1.5rem 2rem; font-size: 0.95rem; border-bottom: 1px solid var(--border-light); }
                
                .date-cell .d-wrap { display: flex; align-items: center; gap: 12px; }
                .date-cell .day { font-size: 1.8rem; font-weight: 200; color: var(--primary); }
                .date-cell .m-y { display: flex; flex-direction: column; line-height: 1; }
                .date-cell .month { font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: var(--text-main); }
                .date-cell .year { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }

                .vol-cell { font-weight: 300; font-size: 1.1rem; }
                .currency-symbol { font-size: 0.8rem; opacity: 0.4; margin-right: 4px; }

                .mtd-progress-wrap { display: flex; flex-direction: column; gap: 8px; width: 180px; }
                .mtd-val { font-size: 0.85rem; color: var(--text-muted); }
                .mini-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
                .mini-bar .fill { height: 100%; background: var(--primary); border-radius: 10px; opacity: 0.6; }

                .inc-pill { display: inline-block; padding: 6px 14px; border-radius: 100px; font-size: 0.9rem; font-weight: 500; }
                .inc-pill.earned { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.15); }
                .inc-pill.pending { background: rgba(255,255,255,0.03); color: var(--text-muted); opacity: 0.5; }

                .align-right { text-align: right; }
                
                .table-row-animate { transition: 0.3s; }
                .table-row-animate:hover { background: rgba(255,255,255,0.01); }

                .table-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; gap: 1rem; color: var(--text-muted); }
                .spinner { width: 36px; height: 36px; border: 3px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
                .empty-state { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 350px; color: var(--text-muted); gap: 1rem; }

                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 992px) {
                    .summary-cards { grid-template-columns: 1fr; }
                    .range-selector { width: 100%; overflow-x: auto; }
                    .mtd-progress-wrap { width: 120px; }
                }
            `}</style>
        </div>
    );
};

export default IncentiveTracker;
