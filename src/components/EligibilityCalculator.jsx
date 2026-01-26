import { useState, useEffect } from 'react';

const EligibilityCalculator = () => {
    const [salary, setSalary] = useState(50000);
    const [obligations, setObligations] = useState(0);
    const [rate, setRate] = useState(10.5);
    const [tenure, setTenure] = useState(5);
    const [foir, setFoir] = useState(60); // Percentage

    const [maxEligibility, setMaxEligibility] = useState(0);
    const [maxEmi, setMaxEmi] = useState(0);

    useEffect(() => {
        calculateEligibility();
    }, [salary, obligations, rate, tenure, foir]);

    const calculateEligibility = () => {
        const s = parseFloat(salary);
        const o = parseFloat(obligations);
        const r = parseFloat(rate) / 12 / 100;
        const n = parseFloat(tenure) * 12;
        const f = parseFloat(foir) / 100;

        // Disposable Income for EMI
        const disposable = (s * f) - o;
        const allowedEmi = disposable > 0 ? disposable : 0;
        setMaxEmi(Math.round(allowedEmi));

        if (allowedEmi > 0 && r > 0 && n > 0) {
            // Present Value of Annuity formula
            // PV = PMT * [(1 - (1 + r)^-n) / r]
            const eligibility = allowedEmi * ((Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
            setMaxEligibility(Math.round(eligibility));
        } else {
            setMaxEligibility(0);
        }
    };

    return (
        <div className="view-content">
            <header className="view-header">
                <div className="header-text">
                    <h2>Eligibility Engine</h2>
                    <p>Proprietary risk assessment for maximum borrowing capacity.</p>
                </div>
            </header>

            <div className="calc-grid">
                <div className="calc-inputs">
                    <div className="glass-card input-card">
                        <div className="input-field">
                            <label>Net Monthly Salary</label>
                            <div className="input-wrap">
                                <span className="currency">₹</span>
                                <input
                                    type="number"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    placeholder="Enter monthly income"
                                />
                            </div>
                            <input
                                type="range"
                                min="15000"
                                max="1000000"
                                step="5000"
                                value={salary}
                                onChange={(e) => setSalary(e.target.value)}
                                className="range-slider"
                            />
                        </div>

                        <div className="input-field">
                            <label>Existing Monthly Obligations (EMIs)</label>
                            <div className="input-wrap">
                                <span className="currency">₹</span>
                                <input
                                    type="number"
                                    value={obligations}
                                    onChange={(e) => setObligations(e.target.value)}
                                    placeholder="Enter current EMIs"
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="500000"
                                step="1000"
                                value={obligations}
                                onChange={(e) => setObligations(e.target.value)}
                                className="range-slider"
                            />
                        </div>

                        <div className="grid-2">
                            <div className="input-field">
                                <label>Expected ROI (%)</label>
                                <div className="input-wrap compact">
                                    <span className="unit">%</span>
                                    <input
                                        type="number"
                                        value={rate}
                                        onChange={(e) => setRate(e.target.value)}
                                        step="0.1"
                                    />
                                </div>
                            </div>
                            <div className="input-field">
                                <label>Tenure (Years)</label>
                                <div className="input-wrap compact">
                                    <span className="unit">Y</span>
                                    <input
                                        type="number"
                                        value={tenure}
                                        onChange={(e) => setTenure(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="input-field">
                            <label>FOIR Allocation ({foir}%)</label>
                            <input
                                type="range"
                                min="30"
                                max="85"
                                step="5"
                                value={foir}
                                onChange={(e) => setFoir(e.target.value)}
                                className="range-slider foir"
                            />
                            <div className="foir-labels">
                                <span>Conservative</span>
                                <span>Aggressive</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="calc-visuals">
                    <div className="glass-card result-card main-eligibility">
                        <span className="res-label">Maximum Loan Potential</span>
                        <h3>₹{maxEligibility.toLocaleString()}<span>.00</span></h3>
                        <div className="capacity-bar">
                            <div className="cap-fill" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="side-results">
                        <div className="glass-card result-card">
                            <span className="res-label">Max Allowed EMI</span>
                            <h4>₹{maxEmi.toLocaleString()}</h4>
                        </div>
                        <div className="glass-card result-card">
                            <span className="res-label">Disposable Ratio</span>
                            <h4>{Math.round(((salary * (foir / 100)) / salary) * 100)}%</h4>
                        </div>
                    </div>

                    <div className="glass-card summary-card">
                        <div className="summary-head">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            <span>Credit Assessment Summary</span>
                        </div>
                        <p className="summary-text">
                            Based on a net income of ₹{parseInt(salary).toLocaleString()} and current obligations,
                            the applicant can sustain an additional EMI of ₹{maxEmi.toLocaleString()} at {rate}% ROI
                            for {tenure} years.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                .view-content { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .view-header { margin-bottom: 2.5rem; }
                .view-header h2 { font-size: 1.8rem; font-weight: 200; letter-spacing: -0.04em; margin-bottom: 0.25rem; }
                .view-header p { color: var(--text-muted); font-size: 0.95rem; font-weight: 300; }

                .calc-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; }
                
                .glass-card { 
                    background: var(--glass-bg); backdrop-filter: blur(20px); 
                    border: 1px solid var(--glass-border); border-radius: 28px; 
                    padding: 2rem; box-shadow: var(--card-shadow);
                }

                .input-field { margin-bottom: 2rem; }
                .input-field label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.12em; font-weight: 500; display: block; margin-bottom: 1rem; }
                
                .input-wrap { position: relative; margin-bottom: 1.2rem; }
                .input-wrap.compact { margin-bottom: 0; }
                .input-wrap span { position: absolute; left: 0; top: 50%; transform: translateY(-50%); font-size: 1rem; color: var(--primary); font-weight: 300; }
                .input-wrap input { 
                    width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--border-light); 
                    padding: 0.4rem 0 0.4rem 1.4rem; font-size: 1.4rem; color: var(--text-main); font-family: 'Outfit'; 
                    font-weight: 200; outline: none; transition: 0.3s;
                }
                .input-wrap.compact input { font-size: 1.2rem; }
                .input-wrap input:focus { border-color: var(--primary); }
                
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }

                .range-slider { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 5px; background: rgba(255,255,255,0.05); outline: none; }
                .range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--primary); cursor: pointer; border: 3px solid var(--bg-main); box-shadow: 0 0 10px var(--primary-glow); }
                .range-slider.foir::-webkit-slider-thumb { background: var(--accent); }

                .foir-labels { display: flex; justify-content: space-between; margin-top: 0.6rem; font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

                .calc-visuals { display: flex; flex-direction: column; gap: 1.5rem; }
                
                .main-eligibility h3 { font-size: 3rem; font-weight: 200; letter-spacing: -0.05em; color: var(--accent); margin-bottom: 1rem; }
                .main-eligibility h3 span { font-size: 1.2rem; opacity: 0.4; }
                .capacity-bar { height: 4px; background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; }
                .cap-fill { height: 100%; background: var(--accent); box-shadow: 0 0 15px var(--accent); }

                .side-results { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .side-results h4 { font-size: 1.5rem; font-weight: 300; letter-spacing: -0.02em; color: var(--text-main); }

                .summary-card { padding: 1.5rem; }
                .summary-head { display: flex; align-items: center; gap: 10px; color: var(--primary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
                .summary-text { font-size: 0.9rem; color: var(--text-muted); font-weight: 300; line-height: 1.6; }

                @media (max-width: 968px) {
                    .calc-grid { grid-template-columns: 1fr; }
                    .view-header h2 { font-size: 1.5rem; }
                    .main-eligibility h3 { font-size: 2.2rem; }
                }

                @media (max-width: 480px) {
                    .grid-2 { grid-template-columns: 1fr; }
                    .side-results { grid-template-columns: 1fr; }
                    .glass-card { padding: 1.5rem; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

export default EligibilityCalculator;
