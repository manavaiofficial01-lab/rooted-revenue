import { useState, useEffect } from 'react';

const EMICalculator = () => {
    const [principal, setPrincipal] = useState(500000);
    const [rate, setRate] = useState(10.5);
    const [tenure, setTenure] = useState(5);
    const [emi, setEmi] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);
    const [totalPayment, setTotalPayment] = useState(0);

    useEffect(() => {
        calculateEmi();
    }, [principal, rate, tenure]);

    const calculateEmi = () => {
        const p = parseFloat(principal);
        const r = parseFloat(rate) / 12 / 100;
        const n = parseFloat(tenure) * 12;

        if (p > 0 && r > 0 && n > 0) {
            const emiVal = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            const totalPay = emiVal * n;
            const totalInt = totalPay - p;

            setEmi(Math.round(emiVal));
            setTotalPayment(Math.round(totalPay));
            setTotalInterest(Math.round(totalInt));
        } else {
            setEmi(0);
            setTotalPayment(0);
            setTotalInterest(0);
        }
    };

    return (
        <div className="view-content">
            <header className="view-header">
                <div className="header-text">
                    <h2>EMI Intelligence</h2>
                    <p>Advanced amortization calculator for structured financing.</p>
                </div>
            </header>

            <div className="calc-grid">
                <div className="calc-inputs">
                    <div className="glass-card input-card">
                        <div className="input-field">
                            <label>Loan Amount (Principal)</label>
                            <div className="input-wrap">
                                <span className="currency">₹</span>
                                <input
                                    type="number"
                                    value={principal}
                                    onChange={(e) => setPrincipal(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <input
                                type="range"
                                min="100000"
                                max="10000000"
                                step="100000"
                                value={principal}
                                onChange={(e) => setPrincipal(e.target.value)}
                                className="range-slider"
                            />
                        </div>

                        <div className="input-field">
                            <label>Interest Rate (% P.A.)</label>
                            <div className="input-wrap">
                                <span className="unit">%</span>
                                <input
                                    type="number"
                                    value={rate}
                                    onChange={(e) => setRate(e.target.value)}
                                    placeholder="e.g. 10.5"
                                    step="0.1"
                                />
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="25"
                                step="0.1"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className="range-slider"
                            />
                        </div>

                        <div className="input-field">
                            <label>Tenure (Years)</label>
                            <div className="input-wrap">
                                <span className="unit">Y</span>
                                <input
                                    type="number"
                                    value={tenure}
                                    onChange={(e) => setTenure(e.target.value)}
                                    placeholder="e.g. 5"
                                />
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="30"
                                step="1"
                                value={tenure}
                                onChange={(e) => setTenure(e.target.value)}
                                className="range-slider"
                            />
                        </div>
                    </div>
                </div>

                <div className="calc-visuals">
                    <div className="glass-card result-card main-emi">
                        <span className="res-label">Monthly Equated Installment</span>
                        <h3>₹{emi.toLocaleString()}<span>.00</span></h3>
                        <div className="emi-meter">
                            <div className="meter-fill" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="side-results">
                        <div className="glass-card result-card">
                            <span className="res-label">Total Interest</span>
                            <h4>₹{totalInterest.toLocaleString()}</h4>
                        </div>
                        <div className="glass-card result-card">
                            <span className="res-label">Total Payment</span>
                            <h4>₹{totalPayment.toLocaleString()}</h4>
                        </div>
                    </div>

                    <div className="glass-card breakdown-card">
                        <div className="breakdown-item">
                            <span className="dot p"></span>
                            <span className="b-label">Principal Amount</span>
                            <span className="b-val">₹{parseInt(principal).toLocaleString()}</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="dot i"></span>
                            <span className="b-label">Interest Content</span>
                            <span className="b-val">₹{totalInterest.toLocaleString()}</span>
                        </div>
                        <div className="ratio-bar">
                            <div className="r-principal" style={{ width: `${(principal / totalPayment) * 100}%` }}></div>
                            <div className="r-interest" style={{ width: `${(totalInterest / totalPayment) * 100}%` }}></div>
                        </div>
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
                .input-field:last-child { margin-bottom: 0; }
                .input-field label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.12em; font-weight: 500; display: block; margin-bottom: 1rem; }
                
                .input-wrap { position: relative; margin-bottom: 1.5rem; }
                .input-wrap span { position: absolute; left: 0; top: 50%; transform: translateY(-50%); font-size: 1.2rem; color: var(--primary); font-weight: 200; }
                .input-wrap input { 
                    width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--border-light); 
                    padding: 0.5rem 0 0.5rem 1.8rem; font-size: 1.8rem; color: var(--text-main); font-family: 'Outfit'; 
                    font-weight: 200; outline: none; transition: 0.3s;
                }
                .input-wrap input:focus { border-color: var(--primary); }
                
                .range-slider {
                    -webkit-appearance: none; width: 100%; height: 4px; border-radius: 5px; background: rgba(255,255,255,0.05); outline: none; transition: .2s;
                }
                .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--primary); cursor: pointer; border: 3px solid var(--bg-main); box-shadow: 0 0 10px var(--primary-glow);
                }

                .calc-visuals { display: flex; flex-direction: column; gap: 1.5rem; }
                .result-card { display: flex; flex-direction: column; justify-content: center; }
                .res-label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 0.8rem; }
                
                .main-emi h3 { font-size: 3rem; font-weight: 200; letter-spacing: -0.05em; color: var(--primary); margin-bottom: 1rem; }
                .main-emi h3 span { font-size: 1.2rem; opacity: 0.4; }
                
                .emi-meter { height: 4px; background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; }
                .meter-fill { height: 100%; background: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }

                .side-results { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .side-results h4 { font-size: 1.5rem; font-weight: 300; letter-spacing: -0.02em; }

                .breakdown-card { display: flex; flex-direction: column; gap: 1rem; }
                .breakdown-item { display: flex; align-items: center; gap: 10px; }
                .dot { width: 8px; height: 8px; border-radius: 50%; }
                .dot.p { background: var(--primary); }
                .dot.i { background: #f59e0b; }
                .b-label { flex: 1; font-size: 0.85rem; color: var(--text-muted); font-weight: 300; }
                .b-val { font-size: 0.9rem; font-weight: 400; }

                .ratio-bar { height: 8px; border-radius: 10px; overflow: hidden; display: flex; margin-top: 0.5rem; }
                .r-principal { background: var(--primary); transition: 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                .r-interest { background: #f59e0b; transition: 0.8s cubic-bezier(0.16, 1, 0.3, 1); }

                @media (max-width: 968px) {
                    .calc-grid { grid-template-columns: 1fr; }
                    .view-header h2 { font-size: 1.5rem; }
                    .main-emi h3 { font-size: 2.2rem; }
                }

                @media (max-width: 480px) {
                    .side-results { grid-template-columns: 1fr; }
                    .glass-card { padding: 1.5rem; }
                    .input-wrap input { font-size: 1.5rem; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                
                /* Remove Arrows from Number Input */
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

export default EMICalculator;
