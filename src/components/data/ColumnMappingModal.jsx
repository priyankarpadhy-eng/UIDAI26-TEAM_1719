/**
 * Column Mapping Modal
 * Supports MANY-TO-ONE mapping: multiple CSV columns → single DB field
 */
import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, Sparkles, ArrowRight, Database, FileSpreadsheet, Loader2, Plus, Minus, Layers } from 'lucide-react';
import { predictColumnMapping, DB_SCHEMA_FIELDS, validateMapping, normalizeDataWithMapping } from '../../utils/columnMapper';

const ColumnMappingModal = ({
    isOpen,
    onClose,
    uploadedHeaders = [],
    rawData = [],
    dataType = 'enrollment',
    onConfirm
}) => {
    const [mapping, setMapping] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);

    const [progress, setProgress] = useState(0);

    // Generate initial predictions when modal opens
    useEffect(() => {
        if (isOpen && uploadedHeaders.length > 0) {
            const predicted = predictColumnMapping(uploadedHeaders);
            setMapping(predicted);
        }
    }, [isOpen, uploadedHeaders]);

    const validation = useMemo(() => validateMapping(mapping), [mapping]);

    const autoMatchedCount = useMemo(() => {
        return Object.values(mapping).filter(m => m.autoMatched && m.selectedHeaders?.length > 0).length;
    }, [mapping]);

    // Total columns mapped (including multi-select)
    const totalColumnsMapped = useMemo(() => {
        return Object.values(mapping).reduce((sum, m) => sum + (m.selectedHeaders?.length || 0), 0);
    }, [mapping]);

    // Handle single dropdown change
    const handleSingleMappingChange = (fieldKey, selectedHeader) => {
        setMapping(prev => ({
            ...prev,
            [fieldKey]: {
                ...prev[fieldKey],
                selectedHeaders: selectedHeader ? [selectedHeader] : [],
                autoMatched: false
            }
        }));
    };

    // Handle multi-select add
    const handleAddColumn = (fieldKey, header) => {
        if (!header) return;
        setMapping(prev => {
            const current = prev[fieldKey]?.selectedHeaders || [];
            if (current.includes(header)) return prev;
            return {
                ...prev,
                [fieldKey]: {
                    ...prev[fieldKey],
                    selectedHeaders: [...current, header],
                    autoMatched: false
                }
            };
        });
    };

    // Handle multi-select remove
    const handleRemoveColumn = (fieldKey, header) => {
        setMapping(prev => ({
            ...prev,
            [fieldKey]: {
                ...prev[fieldKey],
                selectedHeaders: (prev[fieldKey]?.selectedHeaders || []).filter(h => h !== header),
                autoMatched: false
            }
        }));
    };

    // WORKER-BASED PROCESSING
    const handleConfirm = async () => {
        if (!validation.isValid) return;

        setIsProcessing(true);
        setProgress(0);

        // Instantiate Worker
        const worker = new Worker(new URL('./csvWorker.js', import.meta.url));

        worker.onmessage = async (e) => {
            const { type, percent, data } = e.data;

            if (type === 'progress') {
                setProgress(percent);
            } else if (type === 'complete') {
                try {
                    // Send processed data back
                    await onConfirm(data, mapping, dataType);
                    onClose();
                } catch (error) {
                    console.error("Post-processing error:", error);
                    alert("Error saving data: " + error.message);
                } finally {
                    setIsProcessing(false);
                    worker.terminate(); // Clean up
                }
            }
        };

        worker.onerror = (error) => {
            console.error('Worker Error:', error);
            alert('Background processing failed. See console.');
            setIsProcessing(false);
            worker.terminate();
        };

        // Start Worker
        worker.postMessage({
            rawData: rawData,
            mappingConfig: mapping
        });
    };

    const getConfidenceBadge = (confidence) => {
        if (confidence >= 0.8) return { color: 'bg-green-100 text-green-700', label: 'High Match' };
        if (confidence >= 0.6) return { color: 'bg-amber-100 text-amber-700', label: 'Good Match' };
        if (confidence >= 0.4) return { color: 'bg-blue-100 text-blue-700', label: 'Possible' };
        return { color: 'bg-gray-100 text-gray-500', label: 'Manual' };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-[#1f2937] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Map Your Data
                            </h2>
                            <p className="text-blue-100 text-sm mt-1">
                                We found {uploadedHeaders.length} columns. Map them to our database schema.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="mt-3 flex gap-3">
                        {autoMatchedCount > 0 && (
                            <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-300" />
                                <span className="text-sm">
                                    <span className="font-semibold">{autoMatchedCount}</span> fields auto-detected
                                </span>
                            </div>
                        )}
                        <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-300" />
                            <span className="text-sm">
                                <span className="font-semibold">{totalColumnsMapped}</span> columns mapped
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                        <Layers className="w-4 h-4" />
                        <span><strong>Tip:</strong> For age fields, you can add multiple columns (e.g., Male_0_5 + Female_0_5) - they'll be summed automatically!</span>
                    </div>
                </div>

                {/* Mapping Table */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center relative">
                                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Processing Big Data...</h3>
                                <p className="text-gray-500 dark:text-gray-400">Mapping and calculating sums for {rawData.length.toLocaleString()} rows.</p>
                                <div className="w-64 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mx-auto mt-4">
                                    <div
                                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{progress}% Complete</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {Object.entries(DB_SCHEMA_FIELDS).map(([fieldKey, fieldConfig]) => {
                                const currentMapping = mapping[fieldKey] || {};
                                const selectedHeaders = currentMapping.selectedHeaders || [];
                                const badge = getConfidenceBadge(currentMapping.confidence || 0);
                                const availableHeaders = uploadedHeaders.filter(h => !selectedHeaders.includes(h));

                                return (
                                    <div
                                        key={fieldKey}
                                        className={`bg-white dark:bg-gray-800 border rounded-xl p-4 transition-colors ${fieldConfig.required && selectedHeaders.length === 0
                                            ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10'
                                            : selectedHeaders.length > 0
                                                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-900/10'
                                                : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left: Database Field Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Database className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {fieldConfig.displayName}
                                                    </span>
                                                    {fieldConfig.required && (
                                                        <span className="text-red-500 dark:text-red-400 text-xs font-bold">* Required</span>
                                                    )}
                                                    {fieldConfig.allowMultiple && (
                                                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-medium">
                                                            Multi-Column
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    db field: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{fieldConfig.dbField}</code>
                                                    {fieldConfig.isNumeric && <span className="ml-2 text-blue-500 dark:text-blue-400">(values will be summed)</span>}
                                                </p>
                                            </div>

                                            {/* Right: Column Selector */}
                                            <div className="flex-1 min-w-0">
                                                {fieldConfig.allowMultiple ? (
                                                    // Multi-select UI
                                                    <div className="space-y-2">
                                                        {/* Selected columns as tags */}
                                                        {selectedHeaders.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                                {selectedHeaders.map((header, idx) => (
                                                                    <span
                                                                        key={header}
                                                                        className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-xs font-medium group"
                                                                    >
                                                                        {idx > 0 && <span className="text-blue-400">+</span>}
                                                                        <FileSpreadsheet className="w-3 h-3" />
                                                                        {header}
                                                                        <button
                                                                            onClick={() => handleRemoveColumn(fieldKey, header)}
                                                                            className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Add more dropdown */}
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                onChange={(e) => {
                                                                    handleAddColumn(fieldKey, e.target.value);
                                                                    e.target.value = '';
                                                                }}
                                                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                                defaultValue=""
                                                            >
                                                                <option value="">+ Add column...</option>
                                                                {availableHeaders.map(header => (
                                                                    <option key={header} value={header}>
                                                                        {header}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {selectedHeaders.length > 1 && (
                                                            <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                These {selectedHeaders.length} columns will be summed
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // Single select dropdown
                                                    <div className="space-y-1">
                                                        <select
                                                            value={selectedHeaders[0] || ''}
                                                            onChange={(e) => handleSingleMappingChange(fieldKey, e.target.value || null)}
                                                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200
                                                                ${selectedHeaders.length > 0 ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-600'}
                                                            `}
                                                        >
                                                            <option value="">-- Select Column --</option>
                                                            {uploadedHeaders.map(header => (
                                                                <option key={header} value={header}>
                                                                    {header}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Confidence Badge */}
                                                {selectedHeaders.length > 0 && currentMapping.autoMatched && (
                                                    <div className="mt-1.5 flex items-center gap-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {validation.isValid ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                        Ready to import {rawData.length.toLocaleString()} rows
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                    <span className="text-sm text-amber-600 dark:text-amber-400">
                                        Missing: {validation.missingFields.join(', ')}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!validation.isValid || isProcessing}
                                className={`px-5 py-2.5 text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2
                                    ${validation.isValid && !isProcessing
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg active:scale-[0.98]'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Import & Analyze
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColumnMappingModal;
