import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    BookOpen,
    Sparkles,
    Trash2,
    Download,
    FileText,
    Code2,
    Zap,
    Database,
    Loader2
} from 'lucide-react';
import AnalysisCell from '../components/notebook/AnalysisCell';
import ExportModal from '../components/notebook/ExportModal';
import ReportDocument from '../components/notebook/ReportDocument';
import { pdf } from '@react-pdf/renderer';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';

// LocalStorage key for persistence
const STORAGE_KEY = 'aadhaar_notebook_cells';

/**
 * NotebookPage - Interactive UIDAI SAMARTH Analytics Notebook
 * A Jupyter-like interface for running pre-built SQL analytics
 * Features vector-based PDF export with chart image embedding
 */
const NotebookPage = () => {
    // Initialize cells from localStorage or start with one empty cell
    const [cells, setCells] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.length > 0 ? parsed : [{ id: 1, moduleId: null, startDate: '', endDate: '' }];
            }
        } catch (e) {
            console.error('Failed to load notebook from localStorage:', e);
        }
        return [{ id: 1, moduleId: null, startDate: '', endDate: '' }];
    });

    const [nextId, setNextId] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const maxId = parsed.reduce((max, cell) => Math.max(max, cell.id), 0);
                return maxId + 1;
            }
        } catch (e) {
            // ignore
        }
        return 2;
    });

    // Refs map for accessing AnalysisCell methods
    const cellRefs = useRef({});

    // Export Modal state
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [cellDataMap, setCellDataMap] = useState({});

    // Persist cells to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
        } catch (e) {
            console.error('Failed to save notebook to localStorage:', e);
        }
    }, [cells]);

    // Add a new cell
    const addCell = useCallback(() => {
        setCells(prev => [...prev, { id: nextId, moduleId: null, startDate: '', endDate: '' }]);
        setNextId(prev => prev + 1);
    }, [nextId]);

    // Delete a cell
    const deleteCell = useCallback((cellId) => {
        setCells(prev => {
            const filtered = prev.filter(cell => cell.id !== cellId);
            return filtered.length > 0 ? filtered : [{ id: nextId, moduleId: null, startDate: '', endDate: '' }];
        });
        if (cells.length === 1) {
            setNextId(prev => prev + 1);
        }
        // Clean up ref
        delete cellRefs.current[cellId];
    }, [cells.length, nextId]);

    // Update cell state (for persistence)
    const updateCell = useCallback((cellId, updates) => {
        setCells(prev => prev.map(cell =>
            cell.id === cellId
                ? { ...cell, moduleId: updates.moduleId, startDate: updates.startDate, endDate: updates.endDate }
                : cell
        ));
    }, []);

    // Clear all cells and start fresh
    const clearNotebook = () => {
        if (window.confirm('Are you sure you want to clear all cells? This action cannot be undone.')) {
            setCells([{ id: 1, moduleId: null, startDate: '', endDate: '' }]);
            setNextId(2);
            cellRefs.current = {};
        }
    };

    // Export notebook configuration as JSON
    const exportNotebook = () => {
        const data = JSON.stringify(cells, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aadhaar_notebook_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Open Export Modal - Gather cell data and show selection UI
     */
    const openExportModal = () => {
        // Collect current cell data from refs
        const dataMap = {};
        cells.forEach(cell => {
            const ref = cellRefs.current[cell.id];
            if (ref && ref.getCellData) {
                dataMap[cell.id] = ref.getCellData();
            } else {
                dataMap[cell.id] = {
                    id: cell.id,
                    title: 'Unconfigured Cell',
                    description: '',
                    hasData: false,
                };
            }
        });
        setCellDataMap(dataMap);
        setIsExportModalOpen(true);
    };

    /**
     * Generate PDF Report
     * Called when user confirms selection in the modal
     * @param {Array} selectedIds - Array of selected cell IDs
     */
    const generatePDF = async (selectedIds) => {
        setIsGenerating(true);

        try {
            // Step 1: Capture chart images for selected cells
            const chartImagesMap = {};

            for (const cellId of selectedIds) {
                const ref = cellRefs.current[cellId];
                if (ref && ref.getChartElement) {
                    const chartElement = ref.getChartElement();
                    if (chartElement) {
                        try {
                            // Use html-to-image to capture high-res PNG of the chart
                            const dataUrl = await toPng(chartElement, {
                                quality: 1,
                                pixelRatio: 2, // High resolution
                                backgroundColor: '#ffffff',
                                style: {
                                    // Ensure proper rendering
                                    transform: 'none',
                                }
                            });
                            chartImagesMap[cellId] = dataUrl;
                        } catch (err) {
                            console.warn(`Failed to capture chart for cell ${cellId}:`, err);
                            // Continue without this chart
                        }
                    }
                }
            }

            // Step 2: Build selected cells data array
            const selectedCells = selectedIds.map(id => {
                const cellData = cellDataMap[id] || {};
                return {
                    id,
                    title: cellData.title || 'Analysis Cell',
                    description: cellData.description || '',
                    rowCount: cellData.rowCount,
                    executionTime: cellData.executionTime,
                    moduleId: cellData.moduleId,
                };
            });

            // Step 3: Generate PDF using @react-pdf/renderer
            const pdfBlob = await pdf(
                <ReportDocument
                    selectedCells={selectedCells}
                    chartImagesMap={chartImagesMap}
                    metadata={{
                        totalRecords: selectedCells.reduce((sum, c) => sum + (c.rowCount || 0), 0),
                    }}
                />
            ).toBlob();

            // Step 4: Save the PDF
            const filename = `UIDAI_SAMARTH_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`;
            saveAs(pdfBlob, filename);

            console.log(`PDF generated successfully: ${filename}`);

            // Close modal on success
            setIsExportModalOpen(false);

        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
                <div className="max-w-6xl mx-auto px-6 py-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Title */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                                    <BookOpen className="w-7 h-7" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-md">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    UIDAI SAMARTH Notebook
                                </h1>
                                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5" />
                                    Interactive SQL-powered analytics • {cells.length} cell{cells.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearNotebook}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                                title="Clear All"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                            <button
                                onClick={exportNotebook}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                                title="Export as JSON"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">JSON</span>
                            </button>
                            <button
                                onClick={openExportModal}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-500/20"
                                title="Export as PDF"
                            >
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline">PDF Report</span>
                            </button>
                            <button
                                onClick={addCell}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Cell</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notebook Content */}
            <div id="notebook-report-container" className="max-w-6xl mx-auto px-6 py-8">
                {/* Report Header */}
                <div className="mb-6 pb-4 border-b border-gray-200 print:block">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">UIDAI SAMARTH Analytics Report</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Generated on {new Date().toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })} • Team UIDAI_1719
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">UIDAI Hackathon 2026</p>
                            <p className="text-xs text-gray-400">{cells.length} Analysis Cell{cells.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>

                {/* Introduction Card */}
                <div className="mb-8 p-6 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 rounded-2xl border border-violet-200/50 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-800">Low-Code Analytics</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Select pre-built analysis modules from the dropdown, configure date ranges, and click <strong>"Run Analysis"</strong> to instantly visualize insights from your Aadhaar data.
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-white/60 px-4 py-2 rounded-xl border border-gray-200/50">
                            <Code2 className="w-4 h-4" />
                            <span>Powered by Supabase</span>
                        </div>
                    </div>
                </div>

                {/* Cells Container */}
                <div className="space-y-6">
                    {cells.map((cell, index) => (
                        <div
                            key={cell.id}
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <AnalysisCell
                                ref={el => { cellRefs.current[cell.id] = el; }}
                                cellId={cell.id}
                                initialModule={cell.moduleId}
                                initialStartDate={cell.startDate}
                                initialEndDate={cell.endDate}
                                onDelete={deleteCell}
                                onUpdate={updateCell}
                            />
                        </div>
                    ))}
                </div>

                {/* Add Cell Button (Bottom) */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={addCell}
                        className="group flex items-center gap-3 px-6 py-3 text-gray-500 bg-white/70 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
                    >
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Add Another Cell</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200/50 text-center">
                    <p className="text-xs text-gray-400">
                        Your notebook is automatically saved in your browser.
                        <span className="mx-2">•</span>
                        Last updated: {new Date().toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Export Modal */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                cells={cells}
                cellData={cellDataMap}
                onConfirm={generatePDF}
                isGenerating={isGenerating}
            />
        </div>
    );
};

export default NotebookPage;
