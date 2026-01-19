import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { FileText, X, Check, CheckSquare, Square, Loader2, Download } from 'lucide-react';

// Set the app element for accessibility
Modal.setAppElement('#root');

/**
 * ExportModal - Selection modal for choosing which cells to include in PDF
 */
const ExportModal = ({
    isOpen,
    onClose,
    cells,
    cellData,  // Map of cell.id -> { title, description, hasData }
    onConfirm,
    isGenerating
}) => {
    // Track selected cell IDs
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Initialize with all cells selected
    useEffect(() => {
        if (isOpen && cells.length > 0) {
            const allIds = new Set(cells.filter(c => cellData[c.id]?.hasData).map(c => c.id));
            setSelectedIds(allIds);
        }
    }, [isOpen, cells, cellData]);

    // Toggle individual cell selection
    const toggleCell = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Select/Deselect all
    const toggleAll = () => {
        const validCells = cells.filter(c => cellData[c.id]?.hasData);
        if (selectedIds.size === validCells.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(validCells.map(c => c.id)));
        }
    };

    // Count cells with data
    const cellsWithData = cells.filter(c => cellData[c.id]?.hasData);
    const allSelected = selectedIds.size === cellsWithData.length && cellsWithData.length > 0;

    // Custom modal styles
    const customStyles = {
        overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        content: {
            position: 'relative',
            inset: 'auto',
            padding: 0,
            border: 'none',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            style={customStyles}
            contentLabel="Export PDF Options"
        >
            <div className="bg-white rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    Export PDF Report
                                </h2>
                                <p className="text-sm text-white/70">
                                    Select cells to include
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isGenerating}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Cell Selection List */}
                <div className="p-4 max-h-[400px] overflow-y-auto">
                    {/* Select All Toggle */}
                    <button
                        onClick={toggleAll}
                        disabled={isGenerating || cellsWithData.length === 0}
                        className="w-full flex items-center gap-3 p-3 mb-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {allSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-700">
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </span>
                        <span className="ml-auto text-sm text-gray-500">
                            {selectedIds.size} of {cellsWithData.length} selected
                        </span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-3" />

                    {/* Cell List */}
                    <div className="space-y-2">
                        {cells.map((cell, index) => {
                            const data = cellData[cell.id] || {};
                            const isSelected = selectedIds.has(cell.id);
                            const hasData = data.hasData;

                            return (
                                <button
                                    key={cell.id}
                                    onClick={() => hasData && toggleCell(cell.id)}
                                    disabled={isGenerating || !hasData}
                                    className={`
                                        w-full flex items-start gap-3 p-4 rounded-xl transition-all text-left
                                        ${hasData
                                            ? isSelected
                                                ? 'bg-indigo-50 border-2 border-indigo-200'
                                                : 'bg-white border-2 border-gray-100 hover:border-gray-200'
                                            : 'bg-gray-50 border-2 border-gray-100 opacity-50 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {/* Checkbox */}
                                    <div className="mt-0.5">
                                        {hasData ? (
                                            isSelected ? (
                                                <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                                            )
                                        ) : (
                                            <div className="w-5 h-5 border-2 border-gray-200 rounded bg-gray-100" />
                                        )}
                                    </div>

                                    {/* Cell Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                                                Cell {index + 1}
                                            </span>
                                            {!hasData && (
                                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                                    No data
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 font-medium text-gray-800 truncate">
                                            {data.title || 'Unconfigured Cell'}
                                        </p>
                                        {data.description && (
                                            <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                                                {data.description}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {cells.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No analysis cells available</p>
                            <p className="text-sm">Add and run some analyses first</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(Array.from(selectedIds))}
                        disabled={isGenerating || selectedIds.size === 0}
                        className="
                            flex items-center gap-2 px-5 py-2.5 
                            bg-gradient-to-r from-indigo-600 to-purple-600 
                            text-white font-medium rounded-xl
                            hover:from-indigo-700 hover:to-purple-700
                            transition-all shadow-lg shadow-indigo-500/25
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                <span>Generate PDF ({selectedIds.size})</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ExportModal;
