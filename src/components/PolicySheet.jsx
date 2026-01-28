import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { BANK_LOGOS } from '../constants/banks';

const PolicySheet = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('policy_sheet')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setPolicies(data || []);
        } catch (error) {
            console.error('Error fetching policies:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredPolicies = policies.filter(p =>
        p.bank_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="view-content">
            <header className="view-header">
                <div className="header-text">
                    <h2>Bank Policy Master</h2>
                    <p>Internal credit guidelines and bank-specific eligibility matrix.</p>
                </div>
                <div className="header-actions">
                    <div className="search-wrap">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input
                            type="text"
                            placeholder="Search banks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="secondary-btn" onClick={fetchPolicies}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 12a9 9 0 0 0 15 6.7L21 16M21 22v-6h-6" /></svg>
                        Sync
                    </button>
                </div>
            </header>

            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <span>Retrieving Bank Protocols...</span>
                    </div>
                ) : (
                    <div className="scrollable-table">
                        <table className="policy-table">
                            <thead>
                                <tr>
                                    <th>Bank Partners</th>
                                    <th>Income</th>
                                    <th>BT Period</th>
                                    <th>CIBIL</th>
                                    <th>Tenor</th>
                                    <th>Rate (IRR)</th>
                                    <th>PF / PT</th>
                                    <th>Res. Proof</th>
                                    <th>FOIR</th>
                                    <th>Exceptions / Obligations</th>
                                    <th>CC / BT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPolicies.map(policy => (
                                    <tr key={policy.id}>
                                        <td className="bank-cell" data-label="Partner">
                                            <div className="bank-logo-wrap">
                                                {BANK_LOGOS[policy.bank_name] ? (
                                                    <img src={BANK_LOGOS[policy.bank_name]} alt={policy.bank_name} className="bank-logo-img" />
                                                ) : (
                                                    <div className="bank-initial">{policy.bank_name?.charAt(0)}</div>
                                                )}
                                                <div className="bank-name">{policy.bank_name}</div>
                                            </div>
                                        </td>
                                        <td className="data-cell" data-label="Income Requirement">₹{policy.income}</td>
                                        <td className="data-cell" data-label="BT Period">{policy.bt || 'NA'}</td>
                                        <td className="data-cell" data-label="CIBIL Cutoff">{policy.cibil}</td>
                                        <td className="data-cell" data-label="Tenure">{policy.tenor}m</td>
                                        <td className="data-cell" data-label="Interest Rate">{policy.irr}%</td>
                                        <td className="data-cell" data-label="Processing Fee">
                                            <span className={`tag ${policy.pf_pt?.includes('NO') ? 'inactive' : 'active'}`}>
                                                {policy.pf_pt}
                                            </span>
                                        </td>
                                        <td className="data-cell" data-label="Residence Proof">{policy.residence_proof || 'NA'}</td>
                                        <td className="data-cell" data-label="FOIR Cutoff">{policy.foir}</td>
                                        <td className="data-cell memo-cell" data-label="Special Exceptions">{policy.obligation_exception}</td>
                                        <td className="data-cell" data-label="CC/BT Status">
                                            <span className={`tag ${policy.cc_bt === 'Allowed' ? 'active' : 'inactive'}`}>
                                                {policy.cc_bt || 'Not Allowed'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                .view-content { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
                .view-header h2 { font-size: 1.8rem; font-weight: 200; letter-spacing: -0.03em; margin-bottom: 0.2rem; }
                .view-header p { color: var(--text-muted); font-size: 0.95rem; font-weight: 300; }
                
                .header-actions { display: flex; gap: 1rem; align-items: center; }
                .search-wrap { 
                    display: flex; align-items: center; gap: 10px; 
                    background: rgba(255,255,255,0.02); border: 1px solid var(--border-light);
                    padding: 0.6rem 1rem; border-radius: 12px; width: 240px;
                }
                .search-wrap input { background: none; border: none; color: var(--text-main); font-size: 0.85rem; outline: none; width: 100%; }
                
                .secondary-btn { 
                    padding: 0.6rem 1.2rem; background: rgba(255,255,255,0.02); 
                    color: var(--text-main); border: 1px solid var(--border-light); 
                    border-radius: 12px; cursor: pointer; font-size: 0.85rem; 
                    display: flex; align-items: center; gap: 8px; transition: 0.3s;
                }
                .secondary-btn:hover { background: rgba(255,255,255,0.05); border-color: var(--primary); }

                .table-wrapper { 
                    background: var(--glass-bg); backdrop-filter: blur(20px); 
                    border: 1px solid var(--glass-border); border-radius: 24px; 
                    overflow: hidden; box-shadow: var(--card-shadow);
                }
                
                .scrollable-table { overflow-x: auto; max-width: 100%; }
                .policy-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
                
                .policy-table th { 
                    padding: 1.2rem 1rem; color: var(--text-muted); font-size: 0.6rem; 
                    text-transform: uppercase; letter-spacing: 0.12em; 
                    border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.1);
                    width: 100px;
                }
                .policy-table th:first-child { width: 140px; }
                .policy-table th:nth-child(10) { width: 200px; } /* Memo Exception */
                
                .policy-table td { 
                    padding: 1rem; border-bottom: 1px solid var(--border-light); 
                    color: var(--text-main); font-size: 0.85rem; font-weight: 300;
                    vertical-align: middle;
                }
                
                .bank-cell { font-weight: 500; color: var(--primary); }
                .bank-logo-wrap { display: flex; align-items: center; gap: 12px; }
                .bank-logo-img { width: 32px; height: 32px; object-fit: contain; background: white; border-radius: 8px; border: 1px solid var(--border-light); }
                .bank-initial { width: 32px; height: 32px; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 600; }
                .bank-name { font-size: 0.9rem; font-weight: 400; color: var(--text-main); }
                .memo-cell { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }
                
                .tag { 
                    padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.65rem; 
                    text-transform: uppercase; font-weight: 500;
                }
                .tag.active { background: rgba(16, 185, 129, 0.1); color: var(--accent); }
                .tag.inactive { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); }

                .loading-state { padding: 5rem; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .spinner { width: 24px; height: 24px; border: 2px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 968px) {
                    .view-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                    .header-actions { width: 100%; flex-direction: column; }
                    .search-wrap { width: 100%; }
                    .secondary-btn { width: 100%; justify-content: center; }
                    
                    /* Custom mobile table view as cards */
                    .table-wrapper { background: transparent; border: none; box-shadow: none; }
                    .policy-table thead { display: none; }
                    .policy-table tbody, .policy-table tr, .policy-table td { display: block; width: 100%; }
                    .policy-table tr { 
                        background: var(--glass-bg); border: 1px solid var(--glass-border); 
                        border-radius: 24px; margin-bottom: 1.5rem; padding: 1.5rem; 
                        box-shadow: var(--card-shadow);
                    }
                    .policy-table td { border: none; padding: 0.5rem 0; display: flex; justify-content: space-between; align-items: center; text-align: right; }
                    .policy-table td::before { content: attr(data-label); font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; text-align: left; }
                    .bank-cell { border-bottom: 1px solid var(--border-light) !important; padding-bottom: 1rem !important; margin-bottom: 0.5rem; }
                    .memo-cell { flex-direction: column; align-items: flex-start; text-align: left; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 1rem !important; }
                    .memo-cell::before { margin-bottom: 4px; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default PolicySheet;
