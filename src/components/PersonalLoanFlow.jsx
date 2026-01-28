import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

import { ALL_BANKS, BANK_LOGOS } from '../constants/banks';

const DIAGNOSTIC_LABELS = {
    q1: "Gold Loan Status",
    q2: "Credit Connectivity",
    q3: "Pay-slip Verification",
    q4: "Bureau Standing (>700)",
    q5: "Income Threshold (>25k)",
    q6: "Statutory Deductions",
    q7: "Address Verification",
    q8: "Instrument Clearance (6m)"
};

const PersonalLoanFlow = ({ onComplete, onCancel, loanType }) => {
    const [stage, setStage] = useState(2);
    const [formData, setFormData] = useState({
        client_name: '',
        client_mobile: '',
        salary: '',
        company_name: '',
        aadhar: '',
        pan: '',
    });
    const [answers, setAnswers] = useState({
        q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null, q8: null,
    });

    const [loading, setLoading] = useState(false);
    const [clientId, setClientId] = useState(null);
    const [eligibleBanks, setEligibleBanks] = useState([]);
    const [probableBanks, setProbableBanks] = useState([]);
    const [liveEligibleBanks, setLiveEligibleBanks] = useState({ primary: ALL_BANKS, alternate: [] });
    const [isShuffling, setIsShuffling] = useState(false);

    const [calcData, setCalcData] = useState({
        salary: '',
        obligation: '',
        multiplier: '',
        interestRate: 10.5,
        duration: 5
    });

    const [finalEligibility, setFinalEligibility] = useState(0);
    const [finalEmi, setFinalEmi] = useState(0);

    useEffect(() => {
        const sal = parseFloat(calcData.salary) || 0;
        const obl = parseFloat(calcData.obligation) || 0;
        const mul = parseFloat(calcData.multiplier) || 0;
        const elig = (sal - obl) * mul;
        setFinalEligibility(elig > 0 ? elig : 0);
    }, [calcData.salary, calcData.obligation, calcData.multiplier]);

    useEffect(() => {
        const calculateEMI = (principal, rate, years) => {
            const r = rate / 12 / 100;
            const n = years * 12;
            if (r === 0) return Math.round(principal / n);
            const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            return Math.round(emi) || 0;
        };
        const emi = calculateEMI(finalEligibility, calcData.interestRate, calcData.duration);
        setFinalEmi(emi);
    }, [finalEligibility, calcData.interestRate, calcData.duration]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const panValue = formData.pan.trim().toUpperCase() || null;
        const aadharValue = formData.aadhar.trim() || null;

        const currentUser = JSON.parse(localStorage.getItem('app_user'))?.name || 'Vicky';

        try {
            let existing = null;
            if (panValue) {
                const { data } = await supabase
                    .from('client_logins')
                    .select('id, loginned_by')
                    .eq('pan', panValue)
                    .single();
                existing = data;
            }

            let targetId;

            if (existing) {
                // 2. If exists, update (Trigger handles the audit loginned_by shift)
                const { error: updateError } = await supabase
                    .from('client_logins')
                    .update({
                        client_name: formData.client_name,
                        client_mobile: formData.client_mobile,
                        salary: parseFloat(formData.salary),
                        company_name: formData.company_name,
                        aadhar: aadharValue,
                        status: 'follow_up',
                        loginned_by: currentUser,
                        loan_type: loanType
                    })
                    .eq('id', existing.id);

                if (updateError) throw updateError;
                targetId = existing.id;
            } else {
                // 3. If new, insert
                const { data, error: insertError } = await supabase
                    .from('client_logins')
                    .insert([{
                        client_name: formData.client_name,
                        client_mobile: formData.client_mobile,
                        salary: parseFloat(formData.salary),
                        company_name: formData.company_name,
                        aadhar: aadharValue,
                        pan: panValue,
                        status: 'follow_up',
                        loginned_by: currentUser,
                        loan_type: loanType
                    }])
                    .select();

                if (insertError) throw insertError;
                targetId = data[0].id;
            }

            setClientId(targetId);
            setStage(3);
        } catch (error) {
            alert('Operation failed: ' + error.message);
        } finally {
            setLoading(false);
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

        let baseBanks = [...ALL_BANKS];

        // If applicant has a bounce (q8 = 'Yes'), it's an immediate rejection across all partners
        if (currentAnswers.q8 === 'Yes') {
            return { banks: [], probable: [], reasons: [{ q: "Recent Cheque Bounce (Last 6 Months)", lost: ALL_BANKS }] };
        }

        const reasons = [];
        baseBanks.forEach(bank => {
            rules.forEach(rule => {
                const targetList = currentAnswers[rule.id] === 'Yes'
                    ? [...new Set([...rule.yes, ...rule.no])]
                    : rule.no;

                if (targetList.includes(bank)) {
                    scores[bank] += 1;
                }
            });
        });

        const strictBanks = baseBanks.filter(bank => scores[bank] === rules.length);
        const probableBanks = baseBanks.filter(bank => scores[bank] === rules.length - 1 && !strictBanks.includes(bank));

        if (strictBanks.length === 0) {
            rules.forEach(rule => {
                const targetList = currentAnswers[rule.id] === 'Yes' ? rule.yes : rule.no;
                const rejected = baseBanks.filter(b => !targetList.includes(b));
                if (rejected.length > 0) reasons.push({ q: rule.id, lost: rejected });
            });
        }

        return {
            banks: strictBanks,
            probable: probableBanks,
            reasons
        };
    };

    const getLiveBanks = (currentAnswers) => {
        const rules = [
            { id: 'q3', yes: ALL_BANKS, no: ["INCRED/FINABLE"] },
            { id: 'q4', yes: ["ICICI BANK", "IDFC BANK", "YES BANK", "HDFC BANK", "AXIS BANK", "AXIS FINANCE", "ADITYA BIRLA"], no: ["PRIMAL", "CHOLA", "SRIRAM", "TATA CAPITAL", "BAJAJ", "POONAWALA", "INCRED/FINABLE", "SMFG", "UTKARSH"] },
            { id: 'q5', yes: ["ICICI BANK", "HDFC BANK", "BAJAJ", "POONAWALA", "SRIRAM", "YES BANK", "AXIS BANK"], no: ["PRIMAL", "CHOLA", "ADITYA BIRLA", "TATA CAPITAL", "INCRED/FINABLE", "SMFG", "AXIS FINANCE", "IDFC BANK", "YES BANK"] },
            { id: 'q6', yes: ["PRIMAL", "CHOLA", "ADITYA BIRLA", "TATA CAPITAL", "BAJAJ", "IDFC BANK", "UTKARSH", "ICICI BANK", "YES BANK", "HDFC BANK", "AXIS BANK"], no: ["INCRED/FINABLE", "SMFG", "SRIRAM", "POONAWALA", "AXIS FINANCE"] },
            { id: 'q7', yes: ["PRIMAL", "CHOLA", "ADITYA BIRLA", "TATA CAPITAL", "BAJAJ", "IDFC BANK", "UTKARSH", "POONAWALA", "SMFG", "AXIS FINANCE"], no: ["INCRED/FINABLE", "ICICI BANK", "YES BANK", "HDFC BANK", "AXIS BANK"] }
        ];

        if (currentAnswers.q8 === 'Yes') return { primary: [], alternate: [] };

        const scores = {};
        ALL_BANKS.forEach(bank => scores[bank] = 0);
        let answeredCount = 0;

        rules.forEach(rule => {
            const ans = currentAnswers[rule.id];
            if (ans !== null) {
                answeredCount++;
                const targetList = ans === 'Yes' ? [...new Set([...rule.yes, ...rule.no])] : rule.no;
                ALL_BANKS.forEach(bank => {
                    if (targetList.includes(bank)) scores[bank]++;
                });
            }
        });

        return {
            primary: ALL_BANKS.filter(bank => scores[bank] === answeredCount),
            alternate: ALL_BANKS.filter(bank => scores[bank] === answeredCount - 1 && answeredCount > 0)
        };
    };

    const handleAnswer = (q, val) => {
        const newAnswers = { ...answers, [q]: val };
        setAnswers(newAnswers);

        // Update live filtering
        setIsShuffling(true);
        const live = getLiveBanks(newAnswers);
        setLiveEligibleBanks(live);
        setTimeout(() => setIsShuffling(false), 600);

        if (q === 'q8') {
            const { banks: eligible, probable, reasons } = calculateEligibility(newAnswers);
            setEligibleBanks(eligible);
            setProbableBanks(probable);
            saveAnswers(newAnswers, eligible, probable, reasons);
        }
    };

    const handlePrevious = () => {
        if (currentQIndex === 0) {
            setStage(2);
            return;
        }
        const keys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
        const prevKey = keys[currentQIndex - 1];
        const newAnswers = { ...answers, [prevKey]: null };
        setAnswers(newAnswers);

        // Update live filtering
        setIsShuffling(true);
        const live = getLiveBanks(newAnswers);
        setLiveEligibleBanks(live);
        setTimeout(() => setIsShuffling(false), 600);
    };

    const saveAnswers = async (finalAnswers, eligible, probable, reasons) => {
        try {
            await supabase
                .from('client_logins')
                .update({
                    questions: { ...finalAnswers, results: eligible, probable: probable, reasons: reasons },
                    // Rejection logic: No eligible OR probable banks identified, or hard rejection condition met
                    status: eligible.length > 0 || probable.length > 0 ? 'follow_up' : 'rejected'
                })
                .eq('id', clientId);
        } catch (error) {
            console.error('Error updating answers:', error.message);
        }
    };

    const handleFinalConfirm = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('client_logins')
                .update({
                    eligibility: finalEligibility,
                    emi_amount: finalEmi,
                    interest: calcData.interestRate,
                    status: 'follow_up'
                })
                .eq('id', clientId);

            if (error) throw error;
            onComplete();
        } catch (error) {
            alert('Error updating final results: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const currentQIndex = Object.values(answers).filter(v => v !== null).length;

    return (
        <div className="flow-container">
            <header className="flow-header">
                <button className="minimal-back" onClick={onCancel}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    <span>Dashboard</span>
                </button>
                <div className="flow-stepper">
                    <div className={`step-dot ${stage >= 1 ? 'active' : ''}`}></div>
                    <div className="step-bar"></div>
                    <div className={`step-dot ${stage >= 2 ? 'active' : ''}`}></div>
                    <div className="step-bar"></div>
                    <div className={`step-dot ${stage >= 3 ? 'active' : ''}`}></div>
                    <div className="step-bar"></div>
                    <div className={`step-dot ${stage >= 4 ? 'active' : ''}`}></div>
                </div>
                <div className="header-spacer"></div>
            </header>

            {stage === 1 && (
                <div className="glass-card main-stage">
                    <div className="stage-head">
                        <h2>Select Product</h2>
                        <p>What type of financing does the client require?</p>
                    </div>
                    <div className="product-grid">
                        <div className="product-item disabled">
                            <span className="p-icon">🏠</span>
                            <h3>Home Loan</h3>
                            <span className="p-tag">Waitlist</span>
                        </div>
                        <div className="product-item active" onClick={() => setStage(2)}>
                            <div className="glow-effect"></div>
                            <span className="p-icon">👤</span>
                            <h3>Personal Loan</h3>
                            <span className="p-tag primary">Active</span>
                        </div>
                        <div className="product-item disabled">
                            <span className="p-icon">🏢</span>
                            <h3>Business Loan</h3>
                            <span className="p-tag">Waitlist</span>
                        </div>
                    </div>
                </div>
            )}

            {stage === 2 && (
                <div className="glass-card detail-stage">
                    <div className="stage-head">
                        <h2>Applicant Identity</h2>
                        <p>We need some basic info to start the verification.</p>
                    </div>
                    <form onSubmit={handleFormSubmit} className="loan-form">
                        <div className="input-group">
                            <label>Client Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                placeholder="e.g. Rahul Sharma"
                            />
                        </div>
                        <div className="grid-2">
                            <div className="input-group">
                                <label>Mobile Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.client_mobile}
                                    onChange={(e) => setFormData({ ...formData, client_mobile: e.target.value })}
                                    placeholder="10-digit mobile"
                                />
                            </div>
                            <div className="input-group">
                                <label>Monthly Salary (Net)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.salary}
                                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                    placeholder="Enter amount"
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Company Name</label>
                            <input
                                type="text"
                                required
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder="Employer name"
                            />
                        </div>
                        <div className="grid-2">
                            <div className="input-group">
                                <label>PAN Number (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.pan}
                                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                                    placeholder="ABCDE1234F"
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>
                            <div className="input-group">
                                <label>Aadhar (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.aadhar}
                                    onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
                                    placeholder="12 digit ID"
                                />
                            </div>
                        </div>
                        <div className="form-actions row-rev">
                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Saving...' : 'Continue to Eligibility'}
                            </button>
                            <button type="button" className="text-btn" onClick={onCancel}>← Cancel Initiation</button>
                        </div>
                    </form>
                </div>
            )}

            {stage === 3 && (
                <div className="glass-card quest-stage">
                    {!answers.q8 ? (
                        <>
                            <div className="quest-header">
                                <div className="mini-progress">
                                    <div className="progress-fill" style={{ width: `${(currentQIndex / 8) * 100}%` }}></div>
                                </div>
                                <div className="quest-meta-row">
                                    <button className="back-quest-btn" onClick={handlePrevious}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                        <span>Previous</span>
                                    </button>
                                    <span className="quest-meta">Question {currentQIndex + 1} / 8</span>
                                    <div className="logo-indicator">
                                        <div className="pulsing-dot"></div>
                                        <span>Evaluating Partners</span>
                                    </div>
                                </div>
                            </div>

                            <div className="quest-body">
                                {currentQIndex === 0 && (
                                    <div className="q-item animate-fade">
                                        <p>Do you have a Gold Loan currently active?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q1', 'Yes')}>YES, I DO</button>
                                            <button onClick={() => handleAnswer('q1', 'No')}>NO, I DON'T</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 1 && (
                                    <div className="q-item animate-fade">
                                        <p>Do you currently have an active Credit Card?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q2', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q2', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 2 && (
                                    <div className="q-item animate-fade">
                                        <p>Does the applicant have the last 3 months' pay slips?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q3', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q3', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 3 && (
                                    <div className="q-item animate-fade">
                                        <p>Does the applicant have a CIBIL score more than 700?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q4', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q4', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 4 && (
                                    <div className="q-item animate-fade">
                                        <p>Is the monthly salary more than ₹25,000?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q5', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q5', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 5 && (
                                    <div className="q-item animate-fade">
                                        <p>Does the applicant have PF/PT deductions in their company?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q6', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q6', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 6 && (
                                    <div className="q-item animate-fade">
                                        <p>Does the applicant have a Residence Address Proof?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q7', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q7', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                                {currentQIndex === 7 && (
                                    <div className="q-item animate-fade">
                                        <p>Does the applicant have any cheque bounces in the last 6 months?</p>
                                        <div className="q-btns">
                                            <button onClick={() => handleAnswer('q8', 'Yes')}>YES</button>
                                            <button onClick={() => handleAnswer('q8', 'No')}>NO</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="live-matching-container">
                                <div className="live-header">
                                    <div className="live-title">
                                        <div className="live-pulse"></div>
                                        <span>Live Matching Partners</span>
                                    </div>
                                    <span className="live-count">{liveEligibleBanks.primary.length + liveEligibleBanks.alternate.length} Eligible Partners</span>
                                </div>
                                <div className={`live-partners-grid ${isShuffling ? 'shuffling' : ''}`}>
                                    {ALL_BANKS.map((bank) => {
                                        const isPrimary = liveEligibleBanks.primary.includes(bank);
                                        const isAlternate = liveEligibleBanks.alternate.includes(bank);
                                        const isRejected = !isPrimary && !isAlternate;

                                        return (
                                            <div
                                                key={bank}
                                                className={`live-logo-item ${isPrimary ? 'is-primary' : isAlternate ? 'is-alternate' : 'is-rejected'}`}
                                            >
                                                <div className="logo-box">
                                                    <img src={BANK_LOGOS[bank]} alt={bank} onError={(e) => e.target.style.opacity = '0.3'} />
                                                    {isPrimary && <div className="match-badge">Match</div>}
                                                    {isAlternate && <div className="match-badge alt">Potential</div>}
                                                    {isRejected && <div className="match-badge rejected">Waitlist</div>}
                                                </div>
                                                <span className="bank-name-mini">{bank}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="results-box animate-pop">
                            <div className="status-indicator">
                                <div className={`status-icon ${eligibleBanks.length > 0 ? 'success' : 'fail'}`}>
                                    {eligibleBanks.length > 0 ? (
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    )}
                                </div>
                                <h2>{eligibleBanks.length > 0 ? 'Verification Successful' : 'Verification Unsuccessful'}</h2>
                                <p>Partners evaluated for {formData.client_name}</p>
                            </div>

                            <div className="results-partners-container">
                                <div className="results-section">
                                    <h3 className="section-title">Eligibility Diagnostics</h3>
                                    <div className="diagnostics-grid">
                                        {Object.keys(DIAGNOSTIC_LABELS).map(key => (
                                            <div key={key} className="diagnostic-item">
                                                <span>{DIAGNOSTIC_LABELS[key]}</span>
                                                <span className={`status-tag ${answers[key] === 'Yes' || (key === 'q8' && answers[key] === 'No') ? 'pos' : 'neg'}`}>
                                                    {answers[key] === 'Yes' ? 'YES' : 'NO'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="results-section">
                                    <h3 className="section-title">Portfolio Recommendations</h3>

                                    <div className="tier-group">
                                        <label className="tier-label">Primary Tier Partners</label>
                                        <div className="live-partners-grid results-grid">
                                            {ALL_BANKS.filter(b => eligibleBanks.includes(b)).map((bank) => (
                                                <div key={bank} className="live-logo-item result-item is-primary">
                                                    <div className="logo-box">
                                                        <img src={BANK_LOGOS[bank]} alt={bank} />
                                                        <div className="match-badge">Match</div>
                                                    </div>
                                                    <span className="bank-name-mini">{bank}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="tier-group">
                                        <div className="tier-header-wrap">
                                            <label className="tier-label">Secondary Tier Candidates</label>
                                            {probableBanks.length === 0 && <span className="tier-none-notice">— No Candidates Found —</span>}
                                        </div>
                                        {probableBanks.length > 0 ? (
                                            <div className="live-partners-grid results-grid">
                                                {ALL_BANKS.filter(b => probableBanks.includes(b)).map((bank) => (
                                                    <div key={bank} className="live-logo-item result-item is-alternate">
                                                        <div className="logo-box">
                                                            <img src={BANK_LOGOS[bank]} alt={bank} />
                                                            <div className="match-badge alt">Potential</div>
                                                        </div>
                                                        <span className="bank-name-mini">{bank}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="tier-info-text">Based on the current profile, no secondary tier partners identified for this risk appetite.</p>
                                        )}
                                    </div>

                                </div>

                                {eligibleBanks.length === 0 && probableBanks.length === 0 && (
                                    <div className="rejection-summary">
                                        <p>Immediate Profile Rejection</p>
                                        <div className="r-grid-mini">
                                            {calculateEligibility(answers).reasons.slice(0, 3).map((r, i) => (
                                                <div key={i} className="r-tag-mini">{r.q}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="confirm-zone">
                                {(eligibleBanks.length > 0 || probableBanks.length > 0) ? (
                                    <div className="confirm-actions">
                                        <button className="confirm-btn primary" onClick={() => setStage(4)}>Continue calculations →</button>
                                        <button className="text-btn" onClick={() => handleAnswer('q8', null)}>← Change Answers</button>
                                    </div>
                                ) : (
                                    <div className="confirm-actions">
                                        <button className="confirm-btn" onClick={onComplete}>Back to Dashboard</button>
                                        <button className="text-btn" onClick={() => handleAnswer('q8', null)}>← Change Answers</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {stage === 4 && (
                <div className="glass-card calc-stage">
                    <div className="stage-head">
                        <h2>EMI Console</h2>
                        <p>Calculate fine eligibility and repayment schedules.</p>
                    </div>

                    <div className="console-grid">
                        <div className="console-inputs">
                            <div className="input-group">
                                <label>Salary (Net)</label>
                                <input
                                    type="number"
                                    value={calcData.salary}
                                    onChange={(e) => setCalcData({ ...calcData, salary: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Obligations</label>
                                <input
                                    type="number"
                                    value={calcData.obligation}
                                    onChange={(e) => setCalcData({ ...calcData, obligation: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Multiplier</label>
                                <input
                                    type="number"
                                    value={calcData.multiplier}
                                    onChange={(e) => setCalcData({ ...calcData, multiplier: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="logic-output">
                            <div className="logic-pill">
                                <span>Disposable Income</span>
                                <h3>₹{((parseFloat(calcData.salary) || 0) - (parseFloat(calcData.obligation) || 0)).toLocaleString()}</h3>
                            </div>
                            <div className="logic-pill primary">
                                <span>Total Eligibility</span>
                                <h3>₹{finalEligibility.toLocaleString()}</h3>
                                <div className="glow"></div>
                            </div>
                        </div>
                    </div>

                    <div className="calculator-divider"></div>

                    <div className="emi-details">
                        <div className="sliders-panel">
                            <div className="control-group">
                                <div className="c-label">
                                    <span>Interest Rate</span>
                                    <span>{calcData.interestRate}%</span>
                                </div>
                                <input
                                    type="range" min="1" max="25" step="0.1"
                                    value={calcData.interestRate}
                                    onChange={(e) => setCalcData({ ...calcData, interestRate: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="control-group">
                                <div className="c-label">
                                    <span>Tenure</span>
                                    <span>{calcData.duration} Years</span>
                                </div>
                                <input
                                    type="range" min="1" max="15"
                                    value={calcData.duration}
                                    onChange={(e) => setCalcData({ ...calcData, duration: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="emi-summary">
                            <div className="emi-display">
                                <span className="e-label">Monthly EMI</span>
                                <h1 className="emi-value">₹{finalEmi.toLocaleString()}<span>/mo</span></h1>
                            </div>

                            <div className="visual-block">
                                <div className="donut-chart" style={{ '--ratio': `${(finalEmi * calcData.duration * 12 - finalEligibility) / (finalEmi * calcData.duration * 12) * 100}%` }}>
                                    <div className="donut-inner"></div>
                                </div>
                                <div className="v-legend">
                                    <div className="v-item pri">
                                        <div className="dot"></div>
                                        <span>Principal: ₹{finalEligibility.toLocaleString()}</span>
                                    </div>
                                    <div className="v-item sec">
                                        <div className="dot"></div>
                                        <span>Interest: ₹{Math.max(0, (finalEmi * calcData.duration * 12) - finalEligibility).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions row-rev spacing-top">
                        <button className="submit-btn" onClick={handleFinalConfirm} disabled={loading}>
                            {loading ? 'Finalizing...' : 'Confirm & Save'}
                        </button>
                        <button className="text-btn" onClick={() => setStage(3)}>← Previous Step</button>
                    </div>
                </div>
            )}

            <style>{`
                .flow-container { 
                    max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; 
                    animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .flow-header { 
                    display: flex; align-items: center; justify-content: space-between; 
                    margin-bottom: 3rem;
                }

                .minimal-back { 
                    display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.02); 
                    border: 1px solid var(--border-light); color: var(--text-muted); padding: 0.5rem 1rem;
                    border-radius: 12px; cursor: pointer; transition: 0.3s; font-size: 0.85rem;
                }
                .minimal-back:hover { color: var(--primary); transform: translateX(-3px); }

                .flow-stepper { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.01); padding: 8px 16px; border-radius: 100px; border: 1px solid var(--border-light); }
                .step-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-medium); opacity: 0.3; }
                .step-dot.active { background: var(--primary); box-shadow: 0 0 12px var(--primary); opacity: 1; transform: scale(1.1); }
                .step-bar { width: 24px; height: 1px; background: var(--border-light); }

                .glass-card { 
                    background: var(--glass-bg); backdrop-filter: blur(30px); 
                    border: 1px solid var(--glass-border); border-radius: 40px; 
                    padding: 3rem; box-shadow: var(--card-shadow);
                    animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    width: 100%; max-width: 1000px; margin: 0 auto;
                }

                .stage-head { text-align: center; margin-bottom: 3rem; }
                .stage-head h2 { font-size: 2.2rem; font-weight: 200; letter-spacing: -0.04em; margin-bottom: 0.5rem; color: var(--text-main); }
                .stage-head p { color: var(--text-muted); font-size: 1rem; font-weight: 300; }

                .product-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                    gap: 2rem; 
                }
                .product-item { 
                    position: relative; 
                    aspect-ratio: 1/1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem; border-radius: 32px; 
                    background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-light);
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer;
                    text-align: center; overflow: hidden;
                }
                .product-item:hover:not(.disabled) { transform: translateY(-8px); border-color: var(--primary); background: rgba(255, 255, 255, 0.02); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
                .product-item.active { border-color: var(--primary); background: rgba(99, 102, 241, 0.05); box-shadow: 0 0 30px rgba(99, 102, 241, 0.15); }
                
                .p-icon { font-size: 3.5rem; margin-bottom: 1rem; filter: grayscale(1) opacity(0.3); transition: 0.5s; }
                .product-item.active .p-icon { filter: grayscale(0) opacity(1); transform: scale(1.1); }
                .product-item h3 { font-size: 1.3rem; font-weight: 300; margin-bottom: 0.5rem; }
                .product-item p { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding: 0 0.5rem; }
                
                .p-tag { 
                    display: inline-block; font-size: 0.65rem; padding: 0.4rem 0.8rem; border-radius: 100px; 
                    background: var(--bg-subtle); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;
                }

                .loan-form { display: flex; flex-direction: column; gap: 2rem; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                .input-group label { display: block; margin-bottom: 0.8rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
                input { 
                    width: 100%; padding: 1rem 1.4rem; border-radius: 18px; 
                    border: 1px solid var(--border-medium); background: rgba(255, 255, 255, 0.01);
                    color: var(--text-main); font-size: 1rem; transition: 0.3s;
                }
                input:focus { border-color: var(--primary); box-shadow: 0 0 0 6px var(--primary-glow); }

                .form-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 2rem; }
                .form-actions.row-rev { flex-direction: row-reverse; }
                .text-btn { background: transparent; border: 1px solid var(--border-medium); color: var(--text-muted); padding: 0.8rem 2rem; border-radius: 16px; cursor: pointer; font-size: 0.9rem; transition: 0.3s; }
                .submit-btn { 
                    padding: 1rem 3rem; border-radius: 20px; background: var(--primary); 
                    color: white; border: none; font-size: 1rem; transition: 0.4s; cursor: pointer;
                    box-shadow: 0 12px 24px var(--primary-glow);
                }
                .submit-btn:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 15px 30px var(--primary-glow); }

                .quest-header { margin-bottom: 3rem; }
                .mini-progress { width: 100%; height: 3px; background: var(--border-light); border-radius: 100px; overflow: hidden; margin-bottom: 1rem; }
                .progress-fill { height: 100%; background: var(--primary); transition: 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .quest-meta { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.15em; }

                .q-item p { font-size: 2.2rem; font-weight: 200; line-height: 1.2; letter-spacing: -0.04em; margin-bottom: 3rem; color: var(--text-main); }
                .q-btns { display: flex; gap: 1.5rem; }
                .q-btns button { 
                    flex: 1; padding: 1.5rem; border-radius: 24px; border: 1px solid var(--border-medium);
                    background: rgba(255, 255, 255, 0.02); color: var(--text-main); font-size: 1.1rem; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative; overflow: hidden;
                }
                .q-btns button::after {
                    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    transition: 0.5s;
                }
                .q-btns button:hover::after { left: 100%; }
                .q-btns button:hover { background: var(--primary); color: white; transform: translateY(-4px) scale(1.02); border-color: transparent; box-shadow: 0 15px 30px var(--primary-glow); }
                .q-btns button:active { transform: translateY(0) scale(0.98); }

                .results-box { text-align: center; }
                .status-icon { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 2rem; color: white; }
                .status-icon.success { background: #10b981; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
                .status-icon.fail { background: #ef4444; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2); }
                .status-indicator h2 { font-size: 2rem; font-weight: 200; letter-spacing: -0.04em; margin-bottom: 0.75rem; }
                .status-indicator p { color: var(--text-muted); margin-bottom: 3rem; font-size: 1rem; }

                .partner-group { margin-bottom: 2.5rem; text-align: left; }
                .partner-group label { display: block; margin-bottom: 1.2rem; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; }
                .p-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
                .p-pill { padding: 1rem; border-radius: 16px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); font-size: 0.95rem; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 80px; }
                .logo-pill { background: rgba(255,255,255,0.02); }
                .bank-logo-small { max-width: 100%; max-height: 40px; object-fit: contain; filter: brightness(1.2); }

                .quest-meta-row { display: flex; justify-content: space-between; align-items: center; }
                .logo-indicator { display: flex; align-items: center; gap: 8px; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
                .pulsing-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

                .back-quest-btn {
                    display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border-light); color: var(--text-muted); padding: 0.4rem 0.8rem;
                    border-radius: 8px; cursor: pointer; font-size: 0.7rem; transition: 0.3s; text-transform: uppercase; letter-spacing: 0.05em;
                }
                .back-quest-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-main); transform: translateX(-4px); }

                .confirm-actions { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; width: 100%; }
                .confirm-btn.primary { background: var(--primary); }

                .live-matching-container { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border-light); }
                .live-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .live-title { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.15em; }
                .live-pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; animation: pulse 2s infinite; }
                .live-count { font-size: 0.8rem; color: var(--primary); font-weight: 500; }

                .live-partners-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1.5rem; transition: 0.3s; }
                .live-partners-grid.shuffling { opacity: 0.7; transform: translateY(5px); }

                .live-logo-item { 
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .live-logo-item.is-primary { opacity: 1; transform: scale(1) translateY(0); }
                .live-logo-item.is-alternate { opacity: 0.7; transform: scale(0.95); }
                .live-logo-item.is-alternate .logo-box { border-style: dashed; }
                .live-logo-item.is-rejected { opacity: 0.25; transform: scale(0.85); filter: grayscale(1); }
                .live-logo-item.is-rejected .logo-box { border-color: transparent; background: transparent; }

                .logo-box { 
                    width: 64px; height: 64px; border-radius: 18px; background: rgba(255, 255, 255, 0.03); 
                    border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center;
                    padding: 10px; transition: 0.3s; position: relative;
                }
                .live-logo-item.is-primary:hover .logo-box { background: rgba(255, 255, 255, 0.06); border-color: var(--primary); transform: translateY(-4px); }
                .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; filter: brightness(1.1); transition: 0.3s; }
                
                .match-badge {
                    position: absolute; bottom: -5px; right: -5px; font-size: 0.5rem; padding: 2px 6px;
                    border-radius: 4px; background: #10b981; color: white; text-transform: uppercase;
                    letter-spacing: 0.05em; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
                }
                .match-badge.alt { background: var(--primary); box-shadow: 0 4px 10px var(--primary-glow); }
                .match-badge.rejected { background: var(--bg-subtle); color: var(--text-muted); box-shadow: none; border: 1px solid var(--border-light); }
                .bank-name-mini { font-size: 0.6rem; color: var(--text-muted); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

                .results-partners-container { margin-top: 2rem; text-align: left; display: flex; flex-direction: column; gap: 3rem; }
                .results-section { border-top: 1px solid var(--border-light); padding-top: 2rem; }
                .section-title { font-size: 0.75rem; text-transform: uppercase; color: var(--primary); letter-spacing: 0.2em; margin-bottom: 2rem; display: flex; align-items: center; gap: 10px; }
                .section-title::before { content: ''; width: 2px; height: 14px; background: var(--primary); display: inline-block; }

                .diagnostics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .diagnostic-item { 
                    background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-light); padding: 1.2rem 1.5rem; 
                    border-radius: 16px; display: flex; justify-content: space-between; align-items: center;
                }
                .diagnostic-item span:first-child { font-size: 0.9rem; color: var(--text-muted); font-weight: 300; }
                .status-tag { font-size: 0.8rem; font-weight: 500; letter-spacing: 0.05em; }
                .status-tag.pos { color: #10b981; }
                .status-tag.neg { color: #ef4444; }

                .tier-group { margin-bottom: 2.5rem; }
                .tier-header-wrap { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
                .tier-label { font-size: 0.95rem; font-weight: 300; color: var(--text-main); }
                .tier-none-notice { font-size: 0.65rem; color: #ef4444; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; }
                .tier-helper-tag { font-size: 0.65rem; color: var(--primary); background: var(--primary-glow); padding: 4px 10px; border-radius: 8px; cursor: help; font-weight: 500; }
                .tier-info-text { font-size: 0.8rem; color: var(--text-muted); font-weight: 300; margin-bottom: 1.5rem; line-height: 1.4; max-width: 500px; }
                
                .results-grid { margin-bottom: 0; gap: 1.5rem; }
                .scrollable-x { display: flex; overflow-x: auto; padding-bottom: 10px; gap: 2rem; scrollbar-width: none; }
                .scrollable-x::-webkit-scrollbar { display: none; }
                .scrollable-x .result-item { flex-shrink: 0; }

                .result-item .logo-box { width: 90px; height: 90px; border-radius: 24px; }
                .rejection-summary { background: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.12); padding: 2rem; border-radius: 24px; text-align: center; }
                .rejection-summary p { font-size: 0.7rem; text-transform: uppercase; color: #ef4444; margin-bottom: 1rem; letter-spacing: 0.1em; }
                .r-grid-mini { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
                .r-tag-mini { font-size: 0.65rem; padding: 4px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .console-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
                .console-inputs { display: flex; flex-direction: column; gap: 1.5rem; }
                .logic-output { display: flex; flex-direction: column; gap: 1.5rem; }
                .logic-pill { padding: 2rem; border-radius: 24px; background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-light); }
                .logic-pill span { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 0.75rem; display: block; }
                .logic-pill h3 { font-size: 2rem; font-weight: 200; letter-spacing: -0.04em; margin: 0; }

                .calculator-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border-light), transparent); margin-bottom: 3rem; }

                .emi-details { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3rem; }
                .control-group { margin-bottom: 2.5rem; }
                .c-label { display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.8rem; }
                .c-label span:last-child { color: var(--primary); font-size: 1rem; }
                
                input[type="range"] { -webkit-appearance: none; height: 4px; background: var(--border-light); border-radius: 100px; }
                input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; background: white; border: 2px solid var(--primary); box-shadow: 0 4px 10px var(--primary-glow); }

                .emi-summary { text-align: right; }
                .emi-display { margin-bottom: 2.5rem; }
                .e-label { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.15em; display: block; margin-bottom: 1rem; }
                .emi-value { font-size: 4rem; font-weight: 200; letter-spacing: -0.05em; color: var(--text-main); }
                .emi-value span { font-size: 1.1rem; color: var(--text-muted); }

                .visual-block { display: flex; align-items: center; justify-content: flex-end; gap: 2rem; }
                .v-legend { text-align: left; }
                .v-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; margin-bottom: 0.5rem; }

                .confirm-zone { margin-top: 3.5rem; display: flex; justify-content: center; }
                .confirm-btn { 
                    padding: 1rem 3rem; border-radius: 20px; background: var(--primary); 
                    color: white; border: none; font-size: 1.1rem; transition: 0.4s; cursor: pointer;
                    box-shadow: 0 12px 24px var(--primary-glow);
                }
                .confirm-btn:hover { transform: translateY(-4px); }

                @media (max-width: 1024px) {
                    .product-grid { grid-template-columns: 1fr; }
                    .grid-2 { grid-template-columns: 1fr; }
                    .console-grid { grid-template-columns: 1fr; gap: 2rem; }
                    .emi-details { grid-template-columns: 1fr; gap: 2rem; }
                    .visual-block { justify-content: flex-start; }
                    .emi-summary { text-align: left; }
                }

                @media (max-width: 768px) {
                    .glass-card { padding: 1.5rem; border-radius: 24px; }
                    .stage-head h2 { font-size: 1.6rem; }
                    .q-item p { font-size: 1.6rem; margin-bottom: 2rem; }
                    .q-btns { flex-direction: column; }
                    .emi-value { font-size: 2.8rem; }
                    .flow-container { padding: 1rem; }
                    .stage-view { padding: 1rem; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div >
    );
};

export default PersonalLoanFlow;
