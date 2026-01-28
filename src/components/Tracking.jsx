import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

import { ALL_BANKS, BANK_LOGOS } from '../constants/banks';

const Tracking = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('client_logins')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (clientId, newStatus) => {
        const currentUser = JSON.parse(localStorage.getItem('app_user'))?.name || 'Vicky';
        try {
            const { error } = await supabase
                .from('client_logins')
                .update({
                    status: newStatus,
                    loginned_by: currentUser
                })
                .eq('id', clientId);

            if (error) throw error;

            setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));
            if (selectedClient && selectedClient.id === clientId) {
                setSelectedClient(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            alert('Status update failed: ' + error.message);
        }
    };

    const handleIdentifierUpdate = async (clientId, field, newValue) => {
        const currentUser = JSON.parse(localStorage.getItem('app_user'))?.name || 'Vicky';
        try {
            const { error } = await supabase
                .from('client_logins')
                .update({
                    [field]: newValue,
                    loginned_by: currentUser
                })
                .eq('id', clientId);

            if (error) throw error;

            setClients(prev => prev.map(c => c.id === clientId ? { ...c, [field]: newValue } : c));
            if (selectedClient && selectedClient.id === clientId) {
                setSelectedClient(prev => ({ ...prev, [field]: newValue }));
            }
        } catch (error) {
            alert('Update failed: ' + error.message);
        }
    };

    const calculateEligibility = (currentAnswers) => {
        const scores = {};
        ALL_BANKS.forEach(bank => scores[bank] = 0);

        const rules = [
            { id: 'q3', yes: ALL_BANKS, no: ["INCRED/FINABLE"] },
            { id: 'q4', yes: ["ICICI BANK", "IDFC BANK", "YES BANK", "HDFC BANK", "AXIS BANK", "AXIS FINANCE", "ADITYA BIRLA"], no: ["PRIMAL", "CHOLA", "SRIRAM", "TATA CAPITAL", "BAJAJ", "POONAWALA", "INCRED/FINABLE", "SMFG", "UTKARSH"] },
            { id: 'q5', yes: ["ICICI BANK", "HDFC BANK", "BAJAJ", "POONAWALA", "SRIRAM", "YES BANK", "AXIS BANK"], no: ["PRIMAL", "CHOLA", "ADITYA BIRLA", "TATA CAPITAL", "INCRED/FINABLE", "SMFG", "AXIS FINANCE", "IDFC BANK", "YES BANK"] },
            { id: 'q6', yes: ["PRIMAL", "CHOLA", "ADITYA BIRLA", "TATA CAPITAL", "BAJAJ", "IDFC BANK", "UTKARSH", "ICICI BANK", "YES BANK", "HDFC BANK", "AXIS BANK"], no: ["INCRED/FINABLE", "SMFG", "SRIRAM", "POONAWALA", "AXIS FINANCE"] },
            { id: 'q7', yes: ["PRIMAL", "CHOLA", "ADITYA BIRLA", "TATA CAPITAL", "BAJAJ", "IDFC BANK", "UTKARSH", "POONAWALA", "SMFG", "AXIS FINANCE"], no: ["INCRED/FINABLE", "ICICI BANK", "YES BANK", "HDFC BANK", "AXIS BANK"] }
        ];

        if (currentAnswers.q8 === 'Yes') {
            return { banks: [], probable: [], reasons: [{ q: "Recent Cheque Bounce (Last 6 Months)", lost: ALL_BANKS }] };
        }

        const reasons = [];
        ALL_BANKS.forEach(bank => {
            rules.forEach(rule => {
                const targetList = currentAnswers[rule.id] === 'Yes'
                    ? [...new Set([...rule.yes, ...rule.no])]
                    : rule.no;
                if (targetList.includes(bank)) scores[bank] += 1;
            });
        });

        const strictBanks = ALL_BANKS.filter(bank => scores[bank] === rules.length);
        const probableBanks = ALL_BANKS.filter(bank => scores[bank] === rules.length - 1 && !strictBanks.includes(bank));
        return { banks: strictBanks, probable: probableBanks, reasons };
    };

    const handleAnswerUpdate = async (client, qKey, newVal) => {
        const currentUser = JSON.parse(localStorage.getItem('app_user'))?.name || 'Vicky';
        const currentQs = typeof client.questions === 'string' ? JSON.parse(client.questions) : client.questions;
        const newQs = { ...currentQs, [qKey]: newVal };

        const { banks, probable, reasons } = calculateEligibility(newQs);
        const finalQs = { ...newQs, results: banks, probable, reasons };

        // Auto-reject if Instrument Clearance issue (q8) is confirmed
        const updatePayload = {
            questions: finalQs,
            loginned_by: currentUser
        };

        if (qKey === 'q8' && newVal === 'Yes') {
            updatePayload.status = 'rejected';
        }

        try {
            const { error } = await supabase
                .from('client_logins')
                .update(updatePayload)
                .eq('id', client.id);

            if (error) throw error;

            const updatedClient = {
                ...client,
                questions: finalQs,
                ...(updatePayload.status ? { status: updatePayload.status } : {})
            };

            setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
            setSelectedClient(updatedClient);
        } catch (error) {
            alert('Answer update failed: ' + error.message);
        }
    };

    const QuestionDetails = ({ client }) => {
        const qs = typeof client.questions === 'string' ? JSON.parse(client.questions) : client.questions;
        if (!qs) return null;

        const questionLabels = {
            q1: "Gold Loan Status",
            q2: "Credit Connectivity",
            q3: "Pay-slip Verification",
            q4: "Bureau Standing (>700)",
            q5: "Income Threshold (>25k)",
            q6: "Statutory Deductions",
            q7: "Address Verification",
            q8: "Instrument Clearance (6m)"
        };

        const statuses = [
            { id: 'follow_up', label: 'Follow Up' },
            { id: 'conversion', label: 'Conversion' },
            { id: 'disbursed', label: 'Disbursed' },
            { id: 'rejected', label: 'Rejected' }
        ];

        return (
            <div className="premium-modal-overlay" onClick={() => setSelectedClient(null)}>
                <div className="premium-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="header-meta">
                            <span className="badge">Application #{client.id.toString().slice(-4)}</span>
                            <h2>{client.client_name}</h2>
                            <p className="subtitle">{client.company_name} • System ID: {client.id.toString().slice(0, 8)}</p>
                        </div>

                        <div className="status-editor">
                            <label>Lifecycle Status</label>
                            <select
                                value={client.status}
                                onChange={(e) => handleStatusUpdate(client.id, e.target.value)}
                                className={`status-select ${client.status}`}
                            >
                                {statuses.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <button className="minimal-close" onClick={() => setSelectedClient(null)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="modal-content">
                        <div className="metric-row">
                            <div className="metric-card editable" onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Enter New Salary:", client.salary);
                                if (val !== null) handleIdentifierUpdate(client.id, 'salary', val);
                            }}>
                                <span className="m-label">Net Monthly Salary</span>
                                <div className="edit-value-row">
                                    <span className="m-val">₹{parseFloat(client.salary || 0).toLocaleString()}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                            <div className="metric-card editable" onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Enter New Mobile Number:", client.client_mobile);
                                if (val !== null) handleIdentifierUpdate(client.id, 'client_mobile', val);
                            }}>
                                <span className="m-label">Communication (Mobile)</span>
                                <div className="edit-value-row">
                                    <span className="m-val">{client.client_mobile || 'N/A'}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                            <div className="metric-card editable" onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Enter New PAN:", client.pan);
                                if (val !== null) handleIdentifierUpdate(client.id, 'pan', val.toUpperCase());
                            }}>
                                <span className="m-label">Tax Identity (PAN)</span>
                                <div className="edit-value-row">
                                    <span className="m-val mono">{client.pan || 'N/A'}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                            <div className="metric-card editable" onClick={(e) => {
                                e.stopPropagation();
                                const options = ["personal_loan", "business_loan", "home_loan"];
                                const val = prompt(`Enter New Loan Type (${options.join(", ")}):`, client.loan_type);
                                if (val && options.includes(val)) handleIdentifierUpdate(client.id, 'loan_type', val);
                                else if (val) alert("Invalid Loan Type! Use: " + options.join(", "));
                            }}>
                                <span className="m-label">Product Line</span>
                                <div className="edit-value-row">
                                    <span className="m-val">{client.loan_type?.replace('_', ' ').toUpperCase() || 'PERSONAL LOAN'}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="metric-row">
                            <div className="metric-card editable" onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Enter New Aadhar/UID:", client.aadhar);
                                if (val !== null) handleIdentifierUpdate(client.id, 'aadhar', val);
                            }}>
                                <span className="m-label">Aadhar / UID</span>
                                <div className="edit-value-row">
                                    <span className="m-val">{client.aadhar || 'UNSIGNED'}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                            <div className="metric-card highlighted editable" onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Enter New Eligibility:", client.eligibility);
                                if (val !== null) handleIdentifierUpdate(client.id, 'eligibility', val);
                            }}>
                                <span className="m-label">Total Eligibility</span>
                                <div className="edit-value-row">
                                    <span className="m-val">₹{parseFloat(client.eligibility || 0).toLocaleString()}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                            <div className="metric-card editable" onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt("Enter New EMI Amount:", client.emi_amount);
                                if (val !== null) handleIdentifierUpdate(client.id, 'emi_amount', val);
                            }}>
                                <span className="m-label">EMI Amount (/mo)</span>
                                <div className="edit-value-row">
                                    <span className="m-val">₹{parseFloat(client.emi_amount || 0).toLocaleString()}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="knowledge-base">
                            <section className="kb-section">
                                <label>Eligibility Diagnostics</label>
                                <div className="diagnostic-grid">
                                    {Object.entries(questionLabels).map(([key, label]) => (
                                        <div
                                            key={key}
                                            className="diag-item interactive"
                                            onClick={() => handleAnswerUpdate(client, key, qs[key] === 'Yes' ? 'No' : 'Yes')}
                                        >
                                            <span className="d-label">{label}</span>
                                            <span className={`d-status ${qs[key] === 'Yes' ? 'pass' : 'fail'}`}>
                                                {qs[key] === 'Yes' ? 'YES' : 'NO'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="kb-section">
                                <label>Portfolio Recommendations</label>
                                <div className="recommendation-stack">
                                    {qs.results && qs.results.length > 0 ? (
                                        <div className="partners-box">
                                            <span className="p-header">Primary Tier Partners</span>
                                            <div className="p-grid logos">
                                                {qs.results.map(b => (
                                                    <div key={b} className="logo-pill high">
                                                        <img src={BANK_LOGOS[b]} alt={b} onError={(e) => e.target.style.opacity = '0.3'} />
                                                        <span className="bank-name-mini">{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="none-found">No Primary Tier matches identified for this risk profile.</div>
                                    )}

                                    {qs.probable && qs.probable.length > 0 ? (
                                        <div className="partners-box alt">
                                            <span className="p-header">Secondary Tier Candidates</span>
                                            <div className="p-grid logos">
                                                {qs.probable.map(b => (
                                                    <div key={b} className="logo-pill mid">
                                                        <img src={BANK_LOGOS[b]} alt={b} onError={(e) => e.target.style.opacity = '0.3'} />
                                                        <span className="bank-name-mini">{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="none-found">No Semi-Eligible (Secondary Tier) candidates identified for this risk profile.</div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const filteredClients = clients.filter(c => {
        const matchesSearch = c.client_name.toLowerCase().includes(search.toLowerCase()) ||
            c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.pan?.toLowerCase().includes(search.toLowerCase()) ||
            c.aadhar?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Calculate attempt numbers for clients with the same PAN (ordered by created_at)
    const getAttemptInfo = (client) => {
        // Find all clients with the same PAN
        const sameIdentifierClients = clients.filter(c =>
            (c.pan && c.pan === client.pan) ||
            (c.client_name && c.client_name.toLowerCase() === client.client_name?.toLowerCase())
        );

        if (sameIdentifierClients.length <= 1) return null;

        // Sort by created_at ascending (oldest first)
        const sorted = [...sameIdentifierClients].sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
        );

        // Find the index of the current client
        const attemptNumber = sorted.findIndex(c => c.id === client.id) + 1;
        const totalAttempts = sorted.length;

        // Ordinal suffix
        const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };

        return { attemptNumber, totalAttempts, label: `${getOrdinal(attemptNumber)} Attempt` };
    };

    return (
        <div className="tracking-view">
            <header className="view-header">
                <div className="header-text">
                    <h2>Application Repository</h2>
                    <p>Advanced lifecycle management for client financing journey.</p>
                </div>
                <div className="header-actions">
                    <div className="premium-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input
                            type="text"
                            placeholder="Find application..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="status-filter">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Statuses</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="rejected">Rejected</option>
                            <option value="approved">Approved</option>
                            <option value="disbursed">Disbursed</option>
                        </select>
                    </div>
                    <button className="ghost-btn" onClick={fetchClients}>Synchronize</button>
                </div>
            </header>

            <div className="glass-container">
                {loading ? (
                    <div className="loader-ring">
                        <div className="spinner"></div>
                        <span>Accessing Central Intelligence...</span>
                    </div>
                ) : (
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Applicant Identity</th>
                                <th>Lifecycle Status</th>
                                <th>Financial Exposure</th>
                                <th>Identifiers</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-state">Null record set. No matching applications found.</td>
                                </tr>
                            ) : (
                                filteredClients.map(client => (
                                    <tr key={client.id} onClick={() => setSelectedClient(client)}>
                                        <td className="entity-cell">
                                            <div className="entity-avatar">{client.client_name.charAt(0)}</div>
                                            <div className="entity-info">
                                                <div className="name-row">
                                                    <span className="name">{client.client_name}</span>
                                                    <div className="tags-row">
                                                        <span className="loan-type-tag">{client.loan_type?.replace('_', ' ')}</span>
                                                        {(() => {
                                                            const attemptInfo = getAttemptInfo(client);
                                                            return attemptInfo && (
                                                                <span className="attempt-tag" title={`${attemptInfo.totalAttempts} total entries for this identity`}>
                                                                    {attemptInfo.label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                <span className="id">{client.company_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-tag ${client.status}`}>
                                                <div className="tag-dot"></div>
                                                {client.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="financial-cell">
                                                <span className="val">₹{client.salary?.toLocaleString()}</span>
                                                <span className="sub">Net Monthly</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="id-stack-cell">
                                                <span className="pan">PAN: {client.pan || 'N/A'}</span>
                                                <span className="sub">UID: {client.aadhar ? 'Verified' : 'Unsigned'}</span>
                                            </div>
                                        </td>
                                        <td className="action-cell">
                                            <div className="row-action">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedClient && <QuestionDetails client={selectedClient} />}

            <style>{`
                .tracking-view { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .header-text h2 { font-size: 1.6rem; font-weight: 300; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
                .header-text p { color: var(--text-muted); font-size: 0.95rem; }

                .header-actions { display: flex; gap: 1rem; align-items: center; }
                .premium-search {
                    display: flex; align-items: center; gap: 10px; padding: 0.6rem 1.2rem;
                    background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-light);
                    border-radius: 12px; width: 280px; transition: 0.3s;
                }
                .premium-search:focus-within { border-color: var(--primary); background: rgba(255, 255, 255, 0.03); }
                .premium-search input { background: none; border: none; color: var(--text-main); outline: none; width: 100%; font-size: 0.9rem; font-family: 'Outfit'; font-weight: 300; }

                .ghost-btn { background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); color: var(--text-muted); padding: 0.6rem 1.5rem; border-radius: 12px; cursor: pointer; transition: 0.3s; font-size: 0.9rem; }
                .ghost-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-main); }

                .filter-select {
                    background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-light);
                    color: var(--text-muted); padding: 0.6rem 1.2rem; border-radius: 12px;
                    font-size: 0.9rem; outline: none; cursor: pointer; transition: 0.3s;
                    font-family: 'Outfit';
                }
                .filter-select:focus { border-color: var(--primary); color: var(--text-main); }
                .filter-select option { background: #0a0a0b; color: var(--text-main); }

                .tags-row { display: flex; align-items: center; gap: 8px; margin-top: 2px; }

                .loan-type-tag {
                    font-size: 0.6rem; text-transform: uppercase; color: var(--primary);
                    background: var(--primary-glow); padding: 2px 8px; border-radius: 6px;
                    letter-spacing: 0.05em; font-weight: 500;
                }

                .attempt-tag {
                    font-size: 0.55rem; color: #f59e0b; background: rgba(245, 158, 11, 0.1);
                    padding: 2px 6px; border-radius: 4px; font-weight: 600;
                    letter-spacing: 0.03em; border: 1px solid rgba(245, 158, 11, 0.2);
                }

                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
                    70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }

                .glass-container { background: var(--glass-bg); backdrop-filter: blur(15px); border: 1px solid var(--glass-border); border-radius: 20px; box-shadow: var(--card-shadow); overflow: hidden; }

                .premium-table { width: 100%; border-collapse: collapse; text-align: left; }
                .premium-table th {
                    padding: 1rem 1.5rem; color: var(--text-muted); font-size: 0.65rem;
                    text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 1px solid var(--border-light);
                }
                .premium-table tr { cursor: pointer; transition: 0.2s; }
                .premium-table tr:hover { background: rgba(255, 255, 255, 0.01); }
                .premium-table td { padding: 0.8rem 1.5rem; border-bottom: 1px solid var(--border-light); color: var(--text-main); font-size: 0.9rem; font-weight: 300; }
                
                .entity-cell { display: flex; align-items: center; gap: 12px; }
                .entity-avatar {
                    width: 32px; height: 32px; border-radius: 10px;
                    background: var(--primary-glow); color: var(--primary);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.8rem;
                }
                .entity-info .name { font-size: 0.9rem; font-weight: 400; }
                .entity-info .id { font-size: 0.65rem; color: var(--text-muted); }

                .status-tag { display: inline-flex; align-items: center; gap: 6px; padding: 0.3rem 0.7rem; border-radius: 100px; font-size: 0.7rem; text-transform: uppercase; }
                .tag-dot { width: 4px; height: 4px; border-radius: 50%; }
                
                .status-tag.follow_up { background: rgba(99, 102, 241, 0.05); color: var(--primary); }
                .status-tag.conversion { background: rgba(245, 158, 11, 0.05); color: #f59e0b; }
                .status-tag.rejected { background: rgba(239, 68, 68, 0.05); color: #ef4444; }
                .status-tag.disbursed { background: rgba(34, 197, 94, 0.05); color: #22c55e; }
                .status-tag.follow_up .tag-dot { background: var(--primary); }
                .status-tag.conversion .tag-dot { background: #f59e0b; }
                .status-tag.rejected .tag-dot { background: #ef4444; }
                .status-tag.disbursed .tag-dot { background: #22c55e; }

                .financial-cell .val { font-size: 1rem; display: block; }
                .financial-cell .sub, .owner-cell .sub, .id-stack-cell .sub { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); }

                .owner-cell .agent { font-size: 0.95rem; display: block; text-transform: capitalize; }

                .id-stack-cell .pan { font-size: 0.85rem; display: block; font-family: 'JetBrains Mono', monospace; }

                .row-action { color: var(--text-muted); transition: 0.3s; }
                .premium-table tr:hover .row-action { color: var(--primary); transform: translateX(3px); }

                .loader-ring { padding: 4rem; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                .spinner { width: 30px; height: 30px; border: 2px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Modal Styles */
                .premium-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.3s; }
                .premium-modal { background: var(--bg-side); width: 800px; max-height: 85vh; border-radius: 28px; border: 1px solid var(--border-light); overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.4); }
                
                .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 2rem; padding-bottom: 1rem; }
                
                .status-editor { display: flex; flex-direction: column; gap: 6px; margin-left: auto; margin-right: 2rem; position: relative; }
                .status-editor label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.12em; font-weight: 500; }
                .status-select { 
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); 
                    color: var(--text-main); padding: 0.6rem 2.8rem 0.6rem 1.2rem; border-radius: 14px; 
                    font-size: 0.9rem; cursor: pointer; outline: none; transition: all 0.4s;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1.2rem center;
                    font-weight: 300;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .status-select:hover { border-color: var(--primary); background: rgba(255,255,255,0.05); transform: translateY(-1px); }
                .status-select.follow_up { color: var(--primary); border-color: rgba(99, 102, 241, 0.2); }
                .status-select.conversion { color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
                .status-select.disbursed { color: #22c55e; border-color: rgba(34, 197, 94, 0.2); }
                .status-select.rejected { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
                .status-select option { background: var(--bg-side); color: var(--text-main); }

                .header-meta .badge { padding: 0.25rem 0.6rem; background: var(--primary-glow); color: var(--primary); border-radius: 100px; font-size: 0.6rem; margin-bottom: 0.75rem; display: inline-block; }
                .header-meta h2 { font-size: 1.8rem; font-weight: 200; letter-spacing: -0.04em; }
                .header-meta .subtitle { font-size: 0.95rem; color: var(--text-muted); }
                .minimal-close { background: transparent; border: 1px solid var(--border-light); color: var(--text-muted); width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .minimal-close:hover { border-color: #ef4444; color: #ef4444; }

                .modal-content { padding: 2rem; padding-top: 0; }
                .metric-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; margin-bottom: 2rem; }
                .metric-card { background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); padding: 1.2rem; border-radius: 16px; }
                .m-label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; display: block; }
                .m-val { font-size: 1.3rem; font-weight: 300; }

                .metric-card.editable { cursor: pointer; transition: 0.3s; position: relative; }
                .metric-card.editable:hover { border-color: var(--primary); background: rgba(255,255,255,0.03); }
                .edit-value-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .edit-value-row svg { color: var(--text-muted); opacity: 0; transition: 0.3s; }
                .metric-card.editable:hover .edit-value-row svg { opacity: 1; color: var(--primary); }

                .kb-section { margin-bottom: 2rem; }
                .kb-section label { font-size: 0.65rem; text-transform: uppercase; color: var(--primary); letter-spacing: 0.12em; margin-bottom: 1.2rem; display: block; border-left: 2px solid var(--primary); padding-left: 0.6rem; }
                
                .diagnostic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
                .diag-item { display: flex; justify-content: space-between; background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); padding: 0.8rem 1.2rem; border-radius: 14px; font-size: 0.85rem; }
                .d-label { color: var(--text-muted); }

                .d-status.pass { color: var(--accent); }
                .d-status.fail { color: #ef4444; }

                .metric-card.highlighted { border-color: var(--primary); background: var(--primary-glow); }
                .metric-card.highlighted .m-label { color: var(--primary); }

                .partners-box { margin-bottom: 1.5rem; }
                .p-header { font-size: 0.8rem; color: var(--text-main); margin-bottom: 0.8rem; display: block; }
                .p-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; }
                .p-tag { padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.9rem; font-weight: 300; }
                .p-tag.high { background: rgba(16, 185, 129, 0.05); color: var(--accent); }
                .p-tag.mid { background: rgba(99, 102, 241, 0.05); color: var(--primary); }

                .diag-item.interactive { cursor: pointer; transition: 0.3s; }
                .diag-item.interactive:hover { border-color: var(--primary); background: rgba(255, 255, 255, 0.03); }

                .p-grid.logos { gap: 1rem; }
                .logo-pill { 
                    display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px;
                    background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); border-radius: 12px;
                    transition: 0.3s; width: 80px;
                }
                .logo-pill img { width: 40px; height: 40px; object-fit: contain; }
                .logo-pill.high { border-color: rgba(16, 185, 129, 0.2); }
                .logo-pill.mid { border-color: rgba(99, 102, 241, 0.2); }
                .logo-pill.rejected { opacity: 0.3; filter: grayscale(1); border-color: transparent; }
                .partners-box.waitlist { margin-top: 1.5rem; border-top: 1px dashed var(--border-light); padding-top: 1rem; }
                .bank-name-mini { font-size: 0.55rem; color: var(--text-muted); text-align: center; }

                @media (max-width: 1024px) {
                    .metric-row { grid-template-columns: 1fr 1fr; }
                    .premium-modal { width: 90%; }
                }

                @media (max-width: 768px) {
                    .view-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                    .header-actions { width: 100%; flex-direction: column; }
                    .premium-search { width: 100%; }
                    .status-filter { width: 100%; }
                    .filter-select { width: 100%; }
                    .ghost-btn { width: 100%; }
                    
                    .glass-container { background: transparent; border: none; box-shadow: none; overflow: visible; }
                    .premium-table thead { display: none; }
                    .premium-table tbody, .premium-table tr, .premium-table td { display: block; width: 100%; }
                    .premium-table tr { 
                        background: var(--glass-bg); border: 1px solid var(--glass-border); 
                        border-radius: 20px; margin-bottom: 1rem; padding: 1rem; 
                        box-shadow: var(--card-shadow);
                    }
                    .premium-table td { border: none; padding: 0.5rem 0; }
                    .action-cell { display: none; }
                    
                    .entity-avatar { width: 40px; height: 40px; font-size: 1rem; }
                    .financial-cell, .id-stack-cell { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 0.75rem !important; margin-top: 0.5rem; }
                    .financial-cell::before { content: 'Monthly Salary'; font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); }
                    .id-stack-cell::before { content: 'Client Identifiers'; font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); }
                    
                    .premium-modal { width: 95%; max-height: 90vh; }
                    .modal-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                    .status-editor { margin: 0; width: 100%; }
                    .status-select { width: 100%; }
                    .metric-row { grid-template-columns: 1fr; }
                    .diagnostic-grid { grid-template-columns: 1fr; }
                    .minimal-close { position: absolute; top: 1.5rem; right: 1.5rem; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Tracking;
