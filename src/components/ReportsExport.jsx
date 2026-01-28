import { useState } from 'react';

const ReportsExport = ({ allLogins = [] }) => {
    const [reportPeriod, setReportPeriod] = useState('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;

    switch (reportPeriod) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case '6months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
        case 'custom':
            if (customStartDate) {
                const s = new Date(customStartDate);
                startDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            }
            if (customEndDate) {
                const e = new Date(customEndDate);
                endDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
            } else {
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
            }
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const filteredReportData = allLogins.filter(login => {
        const loginDate = new Date(login.created_at);
        return loginDate >= startDate && loginDate <= endDate;
    });

    // Calculate report stats
    const reportStats = {
        totalLeads: filteredReportData.length,
        disbursed: filteredReportData.filter(l => l.status === 'disbursed').length,
        rejected: filteredReportData.filter(l => l.status === 'rejected').length,
        followUp: filteredReportData.filter(l => l.status === 'follow_up').length,
        conversion: filteredReportData.filter(l => l.status === 'conversion').length,
        totalVolume: filteredReportData.filter(l => l.status === 'disbursed').reduce((sum, l) => sum + parseFloat(l.eligibility || 0), 0)
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Client Name', 'Mobile', 'PAN', 'Aadhar', 'Company', 'Salary', 'Status', 'Eligibility', 'EMI', 'Agent', 'Loan Type', 'Created At'];
        const rows = filteredReportData.map(r => [
            `"${r.client_name || ''}"`,
            `"${r.client_mobile || ''}"`,
            `"${r.pan || ''}"`,
            `"${r.aadhar || ''}"`,
            `"${r.company_name || ''}"`,
            r.salary || '',
            r.status || '',
            r.eligibility || '',
            r.emi_amount || '',
            `"${r.loginned_by || ''}"`,
            r.loan_type || '',
            `"${new Date(r.created_at).toLocaleString()}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    // Export to Excel (XLSX via HTML table)
    const exportToExcel = () => {
        const table = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head><meta charset="UTF-8"></head>
            <body>
                <table border="1">
                    <thead>
                        <tr style="background:#6366f1;color:white;font-weight:bold;">
                            <th>Client Name</th><th>Mobile</th><th>PAN</th><th>Aadhar</th>
                            <th>Company</th><th>Salary</th><th>Status</th><th>Eligibility</th>
                            <th>EMI</th><th>Agent</th><th>Loan Type</th><th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredReportData.map(r => `
                            <tr>
                                <td>${r.client_name || ''}</td>
                                <td>${r.client_mobile || ''}</td>
                                <td>${r.pan || ''}</td>
                                <td>${r.aadhar || ''}</td>
                                <td>${r.company_name || ''}</td>
                                <td>${r.salary || ''}</td>
                                <td>${r.status || ''}</td>
                                <td>${r.eligibility || ''}</td>
                                <td>${r.emi_amount || ''}</td>
                                <td>${r.loginned_by || ''}</td>
                                <td>${r.loan_type || ''}</td>
                                <td>${new Date(r.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    };

    // Export to PDF
    const exportToPDF = () => {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Report - ${reportPeriod}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #6366f1; font-size: 24px; margin-bottom: 5px; }
                    .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
                    .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
                    .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; min-width: 120px; }
                    .stat-box label { font-size: 10px; color: #888; text-transform: uppercase; display: block; }
                    .stat-box .val { font-size: 24px; font-weight: bold; color: #333; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { background: #6366f1; color: white; padding: 10px 8px; text-align: left; font-size: 10px; }
                    td { padding: 8px; border-bottom: 1px solid #eee; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .status { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
                    .status.disbursed { background: #dcfce7; color: #16a34a; }
                    .status.rejected { background: #fee2e2; color: #dc2626; }
                    .status.follow_up { background: #e0e7ff; color: #4f46e5; }
                    .status.conversion { background: #fef3c7; color: #d97706; }
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <h1>Business Intelligence Report</h1>
                <p class="subtitle">Period: ${reportPeriod.toUpperCase()} | Generated: ${new Date().toLocaleString()}</p>
                
                <div class="stats">
                    <div class="stat-box"><label>Total Applications</label><div class="val">${reportStats.totalLeads}</div></div>
                    <div class="stat-box"><label>Disbursed</label><div class="val" style="color:#16a34a">${reportStats.disbursed}</div></div>
                    <div class="stat-box"><label>In Progress</label><div class="val" style="color:#d97706">${reportStats.followUp + reportStats.conversion}</div></div>
                    <div class="stat-box"><label>Rejected</label><div class="val" style="color:#dc2626">${reportStats.rejected}</div></div>
                    <div class="stat-box"><label>Total Volume</label><div class="val" style="color:#4f46e5">₹${(reportStats.totalVolume / 100000).toFixed(2)}L</div></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Client</th><th>Company</th><th>Mobile</th><th>PAN</th>
                            <th>Salary</th><th>Status</th><th>Eligibility</th><th>Agent</th><th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredReportData.map(r => `
                            <tr>
                                <td><strong>${r.client_name || ''}</strong></td>
                                <td>${r.company_name || ''}</td>
                                <td>${r.client_mobile || ''}</td>
                                <td>${r.pan || ''}</td>
                                <td>₹${parseFloat(r.salary || 0).toLocaleString()}</td>
                                <td><span class="status ${r.status}">${r.status?.replace('_', ' ') || ''}</span></td>
                                <td>₹${parseFloat(r.eligibility || 0).toLocaleString()}</td>
                                <td>${r.loginned_by || ''}</td>
                                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    return (
        <div className="admin-view">
            <header className="view-head">
                <div className="head-text">
                    <h1>Reports & Analytics</h1>
                    <p>Generate comprehensive business intelligence reports with export capabilities.</p>
                </div>
                <div className="head-actions">
                    <div className="export-dropdown">
                        <button className="export-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                        {showExportMenu && (
                            <div className="export-menu animate-pop">
                                <button onClick={() => { exportToPDF(); setShowExportMenu(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    Export as PDF
                                </button>
                                <button onClick={() => { exportToCSV(); setShowExportMenu(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                    Export as CSV
                                </button>
                                <button onClick={() => { exportToExcel(); setShowExportMenu(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>
                                    Export as Excel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="report-filters">
                <div className="filter-tabs">
                    <button className={reportPeriod === 'month' ? 'active' : ''} onClick={() => setReportPeriod('month')}>
                        This Month
                    </button>
                    <button className={reportPeriod === '6months' ? 'active' : ''} onClick={() => setReportPeriod('6months')}>
                        Last 6 Months
                    </button>
                    <button className={reportPeriod === 'year' ? 'active' : ''} onClick={() => setReportPeriod('year')}>
                        This Year
                    </button>
                    <button className={reportPeriod === 'custom' ? 'active' : ''} onClick={() => setReportPeriod('custom')}>
                        Custom Range
                    </button>
                </div>

                {reportPeriod === 'custom' && (
                    <div className="custom-date-range">
                        <div className="date-input-group">
                            <label>Start Date</label>
                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                        </div>
                        <div className="date-input-group">
                            <label>End Date</label>
                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <label>Total Applications</label>
                    <span className="big-val">{reportStats.totalLeads}</span>
                    <span className="sub-text">In Selected Period</span>
                </div>
                <div className="report-stat-card success">
                    <label>Disbursed</label>
                    <span className="big-val">{reportStats.disbursed}</span>
                    <span className="sub-text">{reportStats.totalLeads > 0 ? ((reportStats.disbursed / reportStats.totalLeads) * 100).toFixed(1) : 0}% Conversion</span>
                </div>
                <div className="report-stat-card warning">
                    <label>In Progress</label>
                    <span className="big-val">{reportStats.followUp + reportStats.conversion}</span>
                    <span className="sub-text">Follow-ups & Conversions</span>
                </div>
                <div className="report-stat-card danger">
                    <label>Rejected</label>
                    <span className="big-val">{reportStats.rejected}</span>
                    <span className="sub-text">{reportStats.totalLeads > 0 ? ((reportStats.rejected / reportStats.totalLeads) * 100).toFixed(1) : 0}% Decline Rate</span>
                </div>
                <div className="report-stat-card highlight">
                    <label>Total Volume</label>
                    <span className="big-val">₹{(reportStats.totalVolume / 100000).toFixed(2)}L</span>
                    <span className="sub-text">Disbursement Value</span>
                </div>
            </div>

            <div className="report-table-container">
                <div className="table-header-bar">
                    <h3>Detailed Records ({filteredReportData.length})</h3>
                </div>
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Agent</th>
                            <th>Status</th>
                            <th>Salary</th>
                            <th>Eligibility</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReportData.length === 0 ? (
                            <tr><td colSpan="6" className="empty-state">No records found for the selected period.</td></tr>
                        ) : (
                            filteredReportData.slice(0, 50).map(record => (
                                <tr key={record.id}>
                                    <td>
                                        <div className="client-cell">
                                            <span className="name">{record.client_name}</span>
                                            <span className="sub">{record.company_name}</span>
                                        </div>
                                    </td>
                                    <td>{record.loginned_by}</td>
                                    <td><span className={`status-mini ${record.status}`}>{record.status?.replace('_', ' ')}</span></td>
                                    <td>₹{parseFloat(record.salary || 0).toLocaleString()}</td>
                                    <td>₹{parseFloat(record.eligibility || 0).toLocaleString()}</td>
                                    <td>{new Date(record.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .report-filters { margin-bottom: 2rem; }
                .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem; }
                .filter-tabs button { 
                    background: var(--input-bg); border: 1px solid var(--border); 
                    color: var(--text-muted); padding: 0.8rem 1.5rem; border-radius: 12px; 
                    cursor: pointer; transition: 0.3s; font-size: 0.85rem; font-family: 'Outfit';
                }
                .filter-tabs button:hover { background: var(--border); color: var(--text); }
                .filter-tabs button.active { 
                    background: var(--primary); border-color: var(--primary); 
                    color: white; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
                }

                .custom-date-range { display: flex; gap: 1.5rem; margin-top: 1rem; }
                .date-input-group { display: flex; flex-direction: column; gap: 6px; }
                .date-input-group label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
                .date-input-group input { 
                    background: var(--input-bg); border: 1px solid var(--border); 
                    color: var(--text); padding: 0.7rem 1rem; border-radius: 10px; 
                    font-size: 0.9rem; font-family: 'Outfit'; outline: none;
                }
                .date-input-group input:focus { border-color: var(--primary); }

                .report-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.2rem; margin-bottom: 2.5rem; }
                .report-stat-card { 
                    background: var(--card-bg); border: 1px solid var(--border); 
                    border-radius: 20px; padding: 1.5rem; display: flex; flex-direction: column; gap: 8px;
                }
                .report-stat-card label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.08em; font-weight: 600; }
                .report-stat-card .big-val { font-size: 2rem; font-weight: 300; letter-spacing: -0.02em; }
                .report-stat-card .sub-text { font-size: 0.7rem; color: var(--text-muted); }
                .report-stat-card.success { border-color: rgba(34, 197, 94, 0.2); }
                .report-stat-card.success .big-val { color: #22c55e; }
                .report-stat-card.warning { border-color: rgba(245, 158, 11, 0.2); }
                .report-stat-card.warning .big-val { color: #f59e0b; }
                .report-stat-card.danger { border-color: rgba(239, 68, 68, 0.2); }
                .report-stat-card.danger .big-val { color: #ef4444; }
                .report-stat-card.highlight { border-color: rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.05); }
                .report-stat-card.highlight .big-val { color: #818cf8; }

                .export-btn { 
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 12px; 
                    cursor: pointer; display: flex; align-items: center; gap: 8px; 
                    font-size: 0.9rem; font-weight: 500; transition: 0.3s; font-family: 'Outfit';
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                }
                .export-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); }

                .export-dropdown { position: relative; }
                .export-menu {
                    position: absolute; top: calc(100% + 8px); right: 0; 
                    background: var(--card-bg); border: 1px solid var(--border); 
                    border-radius: 14px; padding: 8px; min-width: 180px; z-index: 100;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                .export-menu button {
                    display: flex; align-items: center; gap: 10px; width: 100%;
                    background: transparent; border: none; color: var(--text); 
                    padding: 10px 14px; border-radius: 10px; cursor: pointer; 
                    font-size: 0.85rem; font-family: 'Outfit'; transition: 0.2s;
                }
                .export-menu button:hover { background: rgba(255,255,255,0.05); }
                .export-menu button svg { color: var(--text-muted); }

                .report-table-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; }
                .table-header-bar { padding: 1.5rem 2rem; border-bottom: 1px solid var(--border); }
                .table-header-bar h3 { font-size: 1rem; font-weight: 400; }
                
                .report-table { width: 100%; border-collapse: collapse; }
                .report-table th { 
                    padding: 1rem 1.5rem; text-align: left; font-size: 0.6rem; 
                    text-transform: uppercase; color: var(--text-muted); 
                    letter-spacing: 0.1em; font-weight: 600; border-bottom: 1px solid var(--border);
                }
                .report-table td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
                .report-table tr:hover { background: var(--input-bg); }
                
                .client-cell { display: flex; flex-direction: column; gap: 2px; }
                .client-cell .name { font-weight: 500; }
                .client-cell .sub { font-size: 0.7rem; color: var(--text-muted); }

                .status-mini { 
                    font-size: 0.65rem; padding: 4px 10px; border-radius: 20px; 
                    text-transform: capitalize; font-weight: 600;
                }
                .status-mini.disbursed { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .status-mini.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .status-mini.follow_up { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
                .status-mini.conversion { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

                .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); font-style: italic; }

                @media (max-width: 1200px) {
                    .report-stats-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 768px) {
                    .report-stats-grid { grid-template-columns: 1fr 1fr; }
                    .filter-tabs { flex-direction: column; }
                    .filter-tabs button { width: 100%; }
                    .custom-date-range { flex-direction: column; }
                }
            `}</style>
        </div>
    );
};

export default ReportsExport;
