import { useState } from 'react';
import PersonalLoanFlow from './PersonalLoanFlow';

const ClientAccess = () => {
    const [view, setView] = useState('products'); // 'products' or 'flow'
    const [selectedProduct, setSelectedProduct] = useState(null);

    const products = [
        {
            id: 'home_loan',
            name: 'Home Loan',
            icon: '🏠',
            tag: 'Live',
            desc: 'Property financing for residential and commercial units.',
            active: false
        },
        {
            id: 'personal_loan',
            name: 'Personal Loan',
            icon: '👤',
            tag: 'Live',
            desc: 'Unsecured financing for personal or medical emergencies.',
            active: true
        },
        {
            id: 'business_loan',
            name: 'Business Loan',
            icon: '🏢',
            tag: 'Live',
            desc: 'Working capital and expansion funds for enterprises.',
            active: false
        }
    ];

    const handleStartFlow = (prodId) => {
        setSelectedProduct(prodId);
        setView('flow');
    };

    if (view === 'flow') {
        return (
            <div className="application-view">
                <PersonalLoanFlow
                    loanType={selectedProduct}
                    onComplete={() => setView('products')}
                    onCancel={() => setView('products')}
                />
            </div>
        );
    }

    return (
        <div className="initiate-view">
            <header className="init-header">
                <h2>Initiate Application</h2>
                <p>Select a financial product to start the client onboarding journey.</p>
            </header>

            <div className="product-selection-grid">
                {products.map(product => (
                    <div
                        key={product.id}
                        className={`product-card ${product.active ? 'active' : 'disabled'}`}
                        onClick={() => product.active && handleStartFlow(product.id)}
                    >
                        {product.active && <div className="active-glow"></div>}
                        <div className="p-icon-wrap">
                            <span className="p-icon">{product.icon}</span>
                            <span className={`p-tag ${product.active ? 'live' : 'wait'}`}>{product.tag}</span>
                        </div>
                        <div className="p-content">
                            <h3>{product.name}</h3>
                            <p>{product.desc}</p>
                        </div>
                        <div className="p-footer">
                            <button className="start-btn">
                                {product.active ? 'Start Lead' : 'Coming Soon'}
                                {product.active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .initiate-view { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1); max-width: 1100px; margin: 0 auto; }
                .init-header { margin-bottom: 3rem; text-align: center; }
                .init-header h2 { font-size: 2.4rem; font-weight: 200; letter-spacing: -0.04em; margin-bottom: 0.5rem; }
                .init-header p { color: var(--text-muted); font-size: 1.1rem; }

                .product-selection-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
                    gap: 2rem; 
                }
                
                .product-card {
                    background: var(--glass-bg); backdrop-filter: blur(20px);
                    border: 1px solid var(--border-light); border-radius: 40px;
                    padding: 2rem; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative; overflow: hidden; 
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center; text-align: center;
                    aspect-ratio: 1/1; cursor: pointer;
                }
                
                .product-card.active:hover { transform: translateY(-12px); border-color: var(--primary); box-shadow: 0 25px 50px rgba(0,0,0,0.3); }
                .product-card.disabled { opacity: 0.6; filter: grayscale(100%); cursor: not-allowed; }
                .product-card.disabled::after { 
                    content: "Coming Soon"; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
                    color: #fff; display: flex; align-items: center; justify-content: center;
                    font-size: 0.9rem; font-weight: 500; letter-spacing: 0.05em; z-index: 10;
                }

                .active-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%); opacity: 0; transition: 0.5s; pointer-events: none; }
                .product-card.active:hover .active-glow { opacity: 0.3; }

                .p-icon-wrap { margin-bottom: 1.5rem; position: relative; width: 100%; }
                .p-icon { font-size: 4rem; display: block; margin-bottom: 0.5rem; }
                .p-tag { 
                    position: absolute; top: -10px; right: -10px;
                    font-size: 0.6rem; padding: 0.3rem 0.7rem; border-radius: 100px; 
                    text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
                }
                .p-tag.live { background: rgba(16, 185, 129, 0.1); color: var(--accent); border: 1px solid rgba(16, 185, 129, 0.2); }
                .p-tag.wait { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); }

                .p-content { position: relative; width: 100%; }
                .p-content h3 { font-size: 1.8rem; font-weight: 200; margin-bottom: 0.75rem; color: var(--text-main); letter-spacing: -0.02em; }
                .p-content p { color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; font-weight: 300; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding: 0 1rem; }

                .p-footer { margin-top: 2rem; position: relative; width: 100%; }
                .start-btn { 
                    width: auto; margin: 0 auto; padding: 0.8rem 2rem; border-radius: 100px; border: 1px solid var(--border-light);
                    background: rgba(255,255,255,0.02); color: var(--text-main); font-size: 0.9rem;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: 0.3s; font-weight: 400;
                }
                .product-card.active:hover .start-btn { background: var(--primary); color: white; border-color: var(--primary); transform: scale(1.05); }

                @media (max-width: 768px) {
                    .initiate-view { padding: 1.5rem; }
                    .product-selection-grid { grid-template-columns: 1fr; gap: 1.5rem; }
                    .product-card { aspect-ratio: auto; min-height: 280px; padding: 2.5rem 1.5rem; }
                }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default ClientAccess;
