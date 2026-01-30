import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

const CompanyList = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [tableHeaders, setTableHeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [repositories, setRepositories] = useState([]);
    const rowsPerPage = 50;

    useEffect(() => {
        fetchRepositories();
    }, []);

    const fetchRepositories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('company_files')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRepositories(data || []);
        } catch (err) {
            console.error('Error fetching repos:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadExcel = async (fileUrl, fileName) => {
        setLoading(true);
        setSelectedFile(fileName);
        setSearch('');
        setCurrentPage(1);

        try {
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (json.length > 0) {
                setTableHeaders(json[0]);
                setTableData(json.slice(1));
            }
        } catch (error) {
            console.error('Error reading Excel:', error);
            alert('Failed to load the Excel file.');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = tableData.filter(row =>
        row.some(cell =>
            cell && cell.toString().toLowerCase().includes(search.toLowerCase())
        )
    );

    const paginatedData = filteredData.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);

    return (
        <div className="company-view">
            {!selectedFile ? (
                <div className="selection-view animate-fade">
                    <header className="view-header">
                        <div className="header-text">
                            <h2>Approved Company Repositories</h2>
                            <p>Select a bank-specific empanelment list to verify corporate categorization.</p>
                        </div>
                    </header>

                    <div className="card-grid">
                        {repositories.map(repo => (
                            <div
                                key={repo.id}
                                className="company-card interactive"
                                onClick={() => loadExcel(repo.file_url, repo.display_name)}
                                style={{ '--accent-color': repo.color_code }}
                            >
                                <div className="card-icon-wrap" style={{ background: `${repo.color_code}20`, color: repo.color_code }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg>
                                </div>
                                <div className="card-content">
                                    <h3>{repo.display_name}</h3>
                                    <p>{repo.bank_name}</p>
                                    <span className="file-tag">{repo.description || 'Corporate Master List'}</span>
                                </div>
                                <div className="card-footer">
                                    <span>Access Database</span>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="viewer-view animate-fade">
                    <header className="viewer-header">
                        <div className="viewer-left">
                            <button className="back-btn" onClick={() => setSelectedFile(null)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                Back to Selection
                            </button>
                            <div className="viewer-title">
                                <h2>{selectedFile}</h2>
                                <p>Viewing {filteredData.length} active records</p>
                            </div>
                        </div>

                        <div className="viewer-actions">
                            <div className="premium-search">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                    type="text"
                                    placeholder="Search in records..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>
                    </header>

                    {loading ? (
                        <div className="viewer-loader">
                            <div className="spinner"></div>
                            <p>Parsing Database Architecture...</p>
                        </div>
                    ) : (
                        <div className="glass-card table-viewer-card">
                            <div className="table-scroll">
                                <table className="viewer-table">
                                    <thead>
                                        <tr>
                                            {tableHeaders.map((header, idx) => (
                                                <th key={idx}>{header || 'N/A'}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.length > 0 ? (
                                            paginatedData.map((row, rowIdx) => (
                                                <tr key={rowIdx}>
                                                    {tableHeaders.map((_, colIdx) => (
                                                        <td key={colIdx}>{row[colIdx] ?? '-'}</td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={tableHeaders.length} className="empty-state">No matching records found in this repository.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >Previous</button>
                                    <span className="page-info">Page {currentPage} of {totalPages}</span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >Next</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .company-view { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                
                .view-header { margin-bottom: 2.5rem; }
                .view-header h2 { font-size: 2rem; font-weight: 200; letter-spacing: -0.04em; margin-bottom: 0.5rem; }
                .view-header p { color: var(--text-muted); font-size: 1rem; font-weight: 300; }

                .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
                
                .company-card {
                    background: var(--glass-bg); backdrop-filter: blur(20px);
                    border: 1px solid var(--glass-border); border-radius: 28px;
                    padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem;
                    transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative; overflow: hidden;
                    cursor: pointer;
                }
                .company-card:hover {
                    transform: translateY(-8px);
                    border-color: var(--accent-color);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .company-card::after {
                    content: ''; position: absolute; top: 0; right: 0; width: 100px; height: 100px;
                    background: linear-gradient(135deg, transparent, var(--accent-color));
                    opacity: 0.05; border-radius: 0 0 0 100%;
                }

                .card-icon-wrap {
                    width: 54px; height: 54px; border-radius: 16px; 
                    display: flex; align-items: center; justify-content: center;
                }
                .card-content h3 { font-size: 1.4rem; font-weight: 300; margin-bottom: 0.5rem; color: var(--text-main); }
                .card-content p { font-size: 0.9rem; color: var(--text-muted); font-weight: 300; line-height: 1.5; }
                .file-tag { 
                    display: inline-block; margin-top: 1rem; font-size: 0.65rem; 
                    text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);
                    padding: 4px 12px; border: 1px solid var(--border-light); border-radius: 100px;
                }

                .card-footer {
                    margin-top: auto; display: flex; align-items: center; justify-content: space-between;
                    font-size: 0.9rem; font-weight: 400; color: var(--accent-color);
                    opacity: 0.8; transition: 0.3s;
                }
                .company-card:hover .card-footer { opacity: 1; transform: translateX(5px); }

                /* Viewer Styles */
                .viewer-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
                .back-btn {
                    display: flex; align-items: center; gap: 8px; background: transparent;
                    border: 1px solid var(--border-light); color: var(--text-muted);
                    padding: 0.6rem 1.2rem; border-radius: 12px; cursor: pointer;
                    font-size: 0.85rem; transition: 0.3s; margin-bottom: 1.5rem;
                }
                .back-btn:hover { border-color: var(--primary); color: var(--text-main); }

                .viewer-title h2 { font-size: 2rem; font-weight: 200; letter-spacing: -0.04em; }
                .viewer-title p { color: var(--primary); font-size: 0.9rem; font-weight: 400; margin-top: 0.25rem; }

                .premium-search {
                    display: flex; align-items: center; gap: 12px; padding: 0.75rem 1.25rem;
                    background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-light);
                    border-radius: 16px; width: 350px; transition: 0.3s;
                }
                .premium-search:focus-within { border-color: var(--primary); background: rgba(255, 255, 255, 0.05); }
                .premium-search input { background: transparent; border: none; color: var(--text-main); font-family: 'Outfit'; outline: none; width: 100%; font-size: 0.9rem; }

                .table-viewer-card { overflow: hidden; display: flex; flex-direction: column; max-height: 70vh; }
                .table-scroll { overflow: auto; flex: 1; scrollbar-width: thin; }
                
                .viewer-table { width: 100%; border-collapse: collapse; text-align: left; position: relative; }
                .viewer-table th {
                    position: sticky; top: 0; background: var(--bg-side); z-index: 10;
                    padding: 1.25rem 1.5rem; color: var(--text-muted); font-size: 0.7rem;
                    text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid var(--border-light);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                }
                .viewer-table td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-light); font-size: 0.85rem; font-weight: 300; white-space: nowrap; }
                .viewer-table tr:hover { background: rgba(255, 255, 255, 0.02); }

                .viewer-loader { height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; color: var(--text-muted); }
                .spinner { width: 40px; height: 40px; border: 3px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }

                .pagination {
                    padding: 1rem 2rem; display: flex; align-items: center; justify-content: center; gap: 2rem;
                    background: rgba(255,255,255,0.01); border-top: 1px solid var(--border-light);
                }
                .pagination button {
                    background: transparent; border: 1px solid var(--border-light); color: var(--text-main);
                    padding: 0.5rem 1.5rem; border-radius: 10px; cursor: pointer; transition: 0.3s;
                }
                .pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
                .pagination button:not(:disabled):hover { border-color: var(--primary); background: var(--primary-glow); }
                .page-info { font-size: 0.9rem; color: var(--text-muted); font-weight: 300; }

                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-fade { animation: fadeIn 0.4s ease; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                @media (max-width: 1200px) {
                    .card-grid { grid-template-columns: 1fr 1fr; }
                }

                @media (max-width: 768px) {
                    .card-grid { grid-template-columns: 1fr; }
                    .viewer-header { flex-direction: column; align-items: flex-start; gap: 2rem; }
                    .premium-search { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default CompanyList;
