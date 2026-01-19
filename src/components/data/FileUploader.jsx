import React, { useCallback, useState } from 'react';
import { useData } from '../../context/DataContext';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Loader2, Play, Sparkles, Database, ArrowRight, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ColumnMappingModal from './ColumnMappingModal';

const FileUploader = ({ onAnalyze }) => {
    const {
        handleFileUpload,
        uploadedFiles,
        resetData,
        runAnalysis,
        isProcessing,
        processedData,
        syncToDatabase,
        isSyncing,
        triggerScanAnimation,
        updateScanProgress
    } = useData();

    const [selectedDataType, setSelectedDataType] = useState('enrollment');
    const [dragActive, setDragActive] = useState(false);

    // Column Mapping Modal State
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingHeaders, setPendingHeaders] = useState([]);
    const [pendingRawData, setPendingRawData] = useState([]);

    // Ready for sync state
    const [readyToSync, setReadyToSync] = useState(false);

    // Drag events
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    /**
     * Check if file is Excel format
     */
    const isExcelFile = (file) => {
        const excelTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/excel',
            'application/x-excel',
            'application/x-msexcel'
        ];
        const excelExtensions = ['.xlsx', '.xls', '.xlsb', '.xlsm'];
        return excelTypes.includes(file.type) ||
            excelExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    /**
     * Parse Excel file to rows with headers
     */
    const parseExcelFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length < 2) {
                        reject(new Error('Excel file is empty or has no data rows'));
                        return;
                    }

                    const headers = jsonData[0].map(h => String(h || '').trim());
                    const rows = jsonData.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, idx) => {
                            obj[header] = row[idx] !== undefined ? row[idx] : '';
                        });
                        return obj;
                    });

                    resolve({ fields: headers, data: rows });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read Excel file'));
            reader.readAsArrayBuffer(file);
        });
    };

    // Parse file (CSV or Excel) and show mapping modal
    const parseAndShowMapping = useCallback(async (files) => {
        if (files.length === 0) return;

        const file = files[0];

        try {
            if (isExcelFile(file)) {
                // Parse Excel file
                const result = await parseExcelFile(file);
                if (result.data.length > 0 && result.fields.length > 0) {
                    setPendingFile(file);
                    setPendingHeaders(result.fields);
                    setPendingRawData(result.data);
                    setShowMappingModal(true);
                } else {
                    alert('Excel file is empty or has no valid headers');
                }
            } else {
                // Parse CSV file
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    worker: true,
                    complete: (results) => {
                        if (results.data.length > 0 && results.meta.fields) {
                            setPendingFile(file);
                            setPendingHeaders(results.meta.fields);
                            setPendingRawData(results.data);
                            setShowMappingModal(true);
                        } else {
                            alert('CSV file is empty or has no valid headers');
                        }
                    },
                    error: (error) => {
                        console.error('Parse error:', error);
                        alert('Error parsing CSV: ' + error.message);
                    }
                });
            }
        } catch (error) {
            console.error('Parse error:', error);
            alert('Error parsing file: ' + error.message);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            parseAndShowMapping(Array.from(e.dataTransfer.files));
        }
    }, [parseAndShowMapping]);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            parseAndShowMapping(Array.from(e.target.files));
        }
    };

    // Handle confirmed mapping from modal - JUST LOAD, DON'T SYNC
    const handleMappingConfirm = async (normalizedData, mapping, dataType) => {
        console.log('Mapping confirmed, loading file:', {
            mapping,
            dataType,
            rowCount: normalizedData.length
        });

        // Create structured file object
        const structuredFile = {
            fileName: pendingFile?.name || 'uploaded_file.csv',
            data: normalizedData,
            type: dataType,
            meta: {
                fields: Object.keys(normalizedData[0] || {}),
                mapping: mapping,
                rowCount: normalizedData.length
            }
        };

        // Just add to uploaded files - DON'T sync yet
        await handleFileUpload([structuredFile], dataType, false); // false = don't auto-sync

        // Mark ready for final sync
        setReadyToSync(true);

        // Clear pending state
        setPendingFile(null);
        setPendingHeaders([]);
        setPendingRawData([]);
    };

    // FINAL SYNC - triggered by user clicking the button
    const handleFinalSync = async () => {
        if (uploadedFiles.length === 0) return;

        // Trigger scan animation
        triggerScanAnimation(true);

        try {
            // Actually sync to database
            // The syncToDatabase function in context now handles the scan mode and progress updates internally
            await syncToDatabase(uploadedFiles);

            const totalRows = uploadedFiles.reduce((sum, f) => sum + f.data.length, 0);

            // Final progress update
            updateScanProgress('Complete!', totalRows, totalRows);

            // Short delay then stop animation
            setTimeout(() => {
                triggerScanAnimation(false);
                setReadyToSync(false);

                // Run analysis and trigger visualization
                runAnalysis();
                if (onAnalyze) {
                    const types = [...new Set(uploadedFiles.map(f => f.type))];
                    let autoQuery = "Visualize the total enrollments on the map.";
                    if (types.includes('demographic')) {
                        autoQuery = "Show demographic updates distribution on the map.";
                    } else if (types.includes('biometric')) {
                        autoQuery = "Show biometric updates heatmap.";
                    }
                    onAnalyze(autoQuery);
                }
            }, 1000);

        } catch (error) {
            console.error('Sync failed:', error);
            triggerScanAnimation(false);
            alert('Sync failed: ' + error.message);
        }
    };

    // Get total rows ready for sync
    const totalRowsReady = uploadedFiles.reduce((sum, f) => sum + (f.data?.length || 0), 0);
    const hasMappedFiles = uploadedFiles.some(f => f.meta?.mapping);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    Live Data Analysis Engine
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Smart Import
                    </span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400">Upload CSV files with any column names - we'll help map them automatically!</p>
            </div>

            {/* Data Type Selector */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 transition-colors">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Data Type:</label>
                <div className="flex flex-wrap gap-2">
                    {['enrollment', 'demographic', 'biometric'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedDataType(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                                ${selectedDataType === type
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }
                            `}
                        >
                            {type} Data
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">All subsequent uploads will be tagged as <b>{selectedDataType}</b> data.</p>
            </div>

            {/* Drag & Drop Zone */}
            <div
                className={`relative flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-xl transition-all duration-200
                    ${dragActive
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                    }
                    ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    multiple
                    accept=".csv,.xlsx,.xls"
                    onChange={handleChange}
                />

                <div className="flex flex-col items-center text-center p-6 space-y-3 pointer-events-none">
                    <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        {isProcessing ? <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" /> : <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {isProcessing ? "Processing Data..." : `Click or drag ${selectedDataType} files here`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Supports CSV and Excel (.xlsx, .xls) - Smart column mapping included
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                <FileText className="w-3 h-3" /> CSV
                            </span>
                            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                                <FileSpreadsheet className="w-3 h-3" /> Excel
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* File Status List */}
            {uploadedFiles.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Loaded Files ({uploadedFiles.length})</h3>
                        <button onClick={resetData} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline">
                            Clear All
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="px-4 py-3 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{file.fileName}</p>
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded
                                                ${file.type === 'enrollment' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                    file.type === 'biometric' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                                                {file.type}
                                            </span>
                                            {file.meta?.mapping && (
                                                <span className="text-[10px] uppercase font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    MAPPED
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Parsed
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{file.data?.length?.toLocaleString() || 0} rows</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Bar */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Status Info */}
                        <div className="flex items-center gap-2 text-sm">
                            {hasMappedFiles ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <span className="font-bold text-green-600 dark:text-green-400">{totalRowsReady.toLocaleString()}</span> rows ready for sync
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                    <span className="text-gray-500 dark:text-gray-400">Upload and map CSV files first</span>
                                </>
                            )}
                        </div>

                        {/* Sync Button */}
                        <button
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all
                                ${hasMappedFiles && !isSyncing
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                                }
                            `}
                            onClick={handleFinalSync}
                            disabled={!hasMappedFiles || isSyncing}
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Syncing to Database...
                                </>
                            ) : (
                                <>
                                    <Database className="w-5 h-5" />
                                    Sync to Database
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Analysis Result Summary (Preview) */}
            {processedData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Total Pincodes Covered</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{processedData.length.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Total Enrollments</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {processedData.reduce((acc, curr) => acc + (curr.metrics?.totalEnrollments || 0), 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Biometric Updates</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {processedData.reduce((acc, curr) => acc + (curr.metrics?.biometricUpdates || 0), 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Demographic Updates</p>
                        <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                            {processedData.reduce((acc, curr) => acc + (curr.metrics?.demographicUpdates || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Column Mapping Modal */}
            <ColumnMappingModal
                isOpen={showMappingModal}
                onClose={() => {
                    setShowMappingModal(false);
                    setPendingFile(null);
                    setPendingHeaders([]);
                    setPendingRawData([]);
                }}
                uploadedHeaders={pendingHeaders}
                rawData={pendingRawData}
                dataType={selectedDataType}
                onConfirm={handleMappingConfirm}
            />

        </div>
    );
};

export default FileUploader;
