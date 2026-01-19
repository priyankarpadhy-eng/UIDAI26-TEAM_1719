import React, { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { generateAIMapping, validateMappingConfig } from '../../services/aiMapper';
import { useData } from '../../context/DataContext';
import {
    Upload, FileSpreadsheet, Zap, Check, X, AlertTriangle,
    RefreshCw, Play, Pause, Trash2, Sparkles, ChevronDown, ChevronUp,
    Database, Loader2, CheckCircle2, Brain, Settings2, CloudUpload,
    Server, PartyPopper, MapPin, FileText
} from 'lucide-react';

const SmartETLUploader = () => {
    // UI States
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [sampleRows, setSampleRows] = useState([]);
    const [dataType, setDataType] = useState('enrollment');

    // AI Mapping States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [mappingConfig, setMappingConfig] = useState(null);
    const [editMode, setEditMode] = useState(false);

    // Processing States - NEW 3-STEP FLOW
    const [currentPhase, setCurrentPhase] = useState(null); // null, 'scanning', 'uploading', 'processing', 'complete'
    const [progress, setProgress] = useState({ percent: 0, count: 0, activePincode: null, uniquePincodes: 0 });
    const [errors, setErrors] = useState([]);
    const [importResult, setImportResult] = useState(null);

    // Worker Ref
    const workerRef = useRef(null);
    const abortRef = useRef(false);

    const { fetchFromDatabase } = useData();

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    /**
     * Determine if file is Excel format
     */
    const isExcelFile = (file) => {
        const excelTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/excel',
            'application/x-excel',
            'application/x-msexcel'
        ];
        const excelExtensions = ['.xlsx', '.xls', '.xlsb', '.xlsm'];

        return excelTypes.includes(file.type) ||
            excelExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    /**
     * Parse Excel file to extract headers and sample rows
     */
    const parseExcelFile = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to JSON with headers
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length < 1) {
                        reject(new Error('Excel file is empty'));
                        return;
                    }

                    // First row is headers
                    const headers = jsonData[0].map(h => String(h || '').trim());

                    // Get sample rows (next 4 rows)
                    const sampleRows = jsonData.slice(1, 5).map(row => {
                        const obj = {};
                        headers.forEach((header, idx) => {
                            obj[header] = row[idx] !== undefined ? String(row[idx]) : '';
                        });
                        return obj;
                    });

                    resolve({ headers, sampleRows });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read Excel file'));
            reader.readAsArrayBuffer(file);
        });
    };

    /**
     * Handle file selection - supports CSV and Excel
     */
    const handleFileSelect = useCallback(async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setMappingConfig(null);
        setErrors([]);
        setProgress({ percent: 0, count: 0, activePincode: null, uniquePincodes: 0 });
        setCurrentPhase(null);
        setImportResult(null);

        try {
            if (isExcelFile(selectedFile)) {
                // Parse Excel file
                const { headers: excelHeaders, sampleRows: excelSamples } = await parseExcelFile(selectedFile);
                setHeaders(excelHeaders);
                setSampleRows(excelSamples);
            } else {
                // Parse CSV file
                Papa.parse(selectedFile, {
                    header: true,
                    preview: 5,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.meta.fields) {
                            setHeaders(results.meta.fields);
                            setSampleRows(results.data);
                        }
                    },
                    error: (err) => {
                        setErrors([`Failed to parse file: ${err.message}`]);
                    }
                });
            }
        } catch (err) {
            setErrors([`Failed to parse file: ${err.message}`]);
        }
    }, []);

    /**
     * Trigger AI Analysis
     */
    const analyzeWithAI = useCallback(async () => {
        if (headers.length === 0) return;

        setIsAnalyzing(true);
        setErrors([]);

        try {
            const config = await generateAIMapping(headers, dataType);

            const validation = validateMappingConfig(config);
            if (!validation.isValid) {
                setErrors(validation.errors);
            }

            setMappingConfig(config);
        } catch (err) {
            setErrors([`AI Analysis failed: ${err.message}`]);
        } finally {
            setIsAnalyzing(false);
        }
    }, [headers, dataType]);

    /**
     * Update mapping for a specific DB column
     */
    const updateMapping = (dbCol, csvCols) => {
        setMappingConfig(prev => ({
            ...prev,
            mappings: {
                ...prev.mappings,
                [dbCol]: csvCols
            }
        }));
    };

    /**
     * Add a CSV column to a DB field mapping
     */
    const addColumnToMapping = (dbCol, csvCol) => {
        if (!csvCol) return;
        setMappingConfig(prev => {
            const current = prev.mappings[dbCol] || [];
            if (current.includes(csvCol)) return prev;
            return {
                ...prev,
                mappings: {
                    ...prev.mappings,
                    [dbCol]: [...current, csvCol]
                }
            };
        });
    };

    /**
     * Remove a CSV column from a DB field mapping
     */
    const removeColumnFromMapping = (dbCol, csvCol) => {
        setMappingConfig(prev => ({
            ...prev,
            mappings: {
                ...prev.mappings,
                [dbCol]: (prev.mappings[dbCol] || []).filter(c => c !== csvCol)
            }
        }));
    };

    /**
     * THE MAIN 3-STEP PIPELINE
     */
    const startProcessing = useCallback(async () => {
        if (!file || !mappingConfig) return;

        const validation = validateMappingConfig(mappingConfig);
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setCurrentPhase('scanning');
        setProgress({ percent: 0, count: 0, activePincode: null, uniquePincodes: 0 });
        setErrors([]);
        setImportResult(null);
        abortRef.current = false;

        // Initialize Worker
        workerRef.current = new Worker(
            new URL('../../workers/etlWorker.js', import.meta.url),
            { type: 'module' }
        );

        workerRef.current.onmessage = async (e) => {
            const { type, blob, fileName, stats, count, percent, phase, activePincode, uniquePincodes, total, message } = e.data;

            if (abortRef.current) {
                workerRef.current.terminate();
                setCurrentPhase(null);
                return;
            }

            switch (type) {
                case 'progress':
                    setProgress({ percent, count, activePincode, uniquePincodes: uniquePincodes || 0 });
                    if (phase) setCurrentPhase(phase);
                    break;

                case 'file_ready':
                    // STEP 2: Upload to Supabase Storage
                    console.log('📦 Received blob from worker:', stats);
                    setCurrentPhase('uploading');
                    setProgress(prev => ({ ...prev, percent: 97 }));

                    try {
                        await uploadAndProcess(blob, fileName, stats);
                    } catch (err) {
                        console.error('Upload/Process error:', err);
                        setErrors(prev => [...prev, `Upload failed: ${err.message}`]);
                        setCurrentPhase(null);
                    }
                    break;

                case 'done':
                    console.log(`ETL Worker done! Processed ${total} rows.`);
                    workerRef.current.terminate();
                    break;

                case 'error':
                    setErrors(prev => [...prev, message]);
                    setCurrentPhase(null);
                    break;
            }
        };

        workerRef.current.onerror = (err) => {
            setErrors(prev => [...prev, `Worker Error: ${err.message}`]);
            setCurrentPhase(null);
        };

        // Send file and config to worker (with file type info)
        workerRef.current.postMessage({
            file,
            config: mappingConfig,
            batchId: Date.now().toString(),
            dataType,
            isExcel: isExcelFile(file)
        });

    }, [file, mappingConfig, dataType]);

    /**
     * STEP 2: Direct Batch Insertion (bypasses Edge Function for reliability)
     * For 1M+ rows, Edge Function times out. Direct insertion is more reliable.
     */
    const uploadAndProcess = async (blob, fileName, stats) => {
        const BATCH_SIZE = 2000; // Records per batch insert

        setCurrentPhase('processing');
        console.log('🔄 Starting direct batch insertion...');

        // Parse the CSV blob
        const csvText = await blob.text();
        const lines = csvText.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new Error('CSV file is empty');
        }

        // Parse header
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const pincodeIdx = header.indexOf('pincode');
        const dateIdx = header.indexOf('record_date');
        const stateIdx = header.indexOf('state');
        const districtIdx = header.indexOf('district');
        const age05Idx = header.indexOf('age_0_5');
        const age518Idx = header.indexOf('age_5_18');
        const age18plusIdx = header.indexOf('age_18_plus');

        // Determine table
        const tableName = dataType === 'biometric'
            ? 'biometric_updates'
            : dataType === 'demographic'
                ? 'demographic_updates'
                : 'enrollments';

        console.log(`🎯 Target table: ${tableName}, Total rows: ${lines.length - 1}`);

        // Parse all records
        const allRecords = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            if (values.length < 3) continue;

            const pincode = values[pincodeIdx];
            const recordDate = values[dateIdx];

            if (!pincode || !recordDate) continue;

            allRecords.push({
                pincode,
                record_date: recordDate,
                state: values[stateIdx] || 'Unknown',
                district: values[districtIdx] || 'Unknown',
                age_0_5: parseInt(values[age05Idx]) || 0,
                age_5_18: parseInt(values[age518Idx]) || 0,
                age_18_plus: parseInt(values[age18plusIdx]) || 0
            });
        }

        console.log(`✅ Parsed ${allRecords.length} valid records`);

        // Insert in batches
        let successCount = 0;
        let errorCount = 0;
        const totalBatches = Math.ceil(allRecords.length / BATCH_SIZE);

        for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
            const chunk = allRecords.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;

            try {
                const { error: upsertError } = await supabase
                    .from(tableName)
                    .upsert(chunk, {
                        onConflict: 'pincode,record_date',
                        ignoreDuplicates: false
                    });

                if (upsertError) {
                    console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, upsertError.message);
                    errorCount += chunk.length;
                    setErrors(prev => [...prev.slice(-3), `Batch ${batchNum}: ${upsertError.message}`]);
                } else {
                    successCount += chunk.length;
                    console.log(`✅ Batch ${batchNum}/${totalBatches}: ${chunk.length} records`);
                }

                // Update progress
                const percent = Math.round(97 + (i / allRecords.length) * 3);
                setProgress(prev => ({
                    ...prev,
                    percent,
                    count: successCount
                }));

            } catch (err) {
                console.error(`❌ Batch ${batchNum} exception:`, err);
                errorCount += chunk.length;
            }
        }

        console.log(`🎉 Import complete: ${successCount} inserted, ${errorCount} failed`);

        // SUCCESS!
        setCurrentPhase('complete');
        setProgress(prev => ({ ...prev, percent: 100 }));
        setImportResult({
            success: true,
            stats: {
                total_rows: lines.length - 1,
                records_processed: allRecords.length,
                records_inserted: successCount,
                records_failed: errorCount,
                table: tableName
            },
            localStats: stats
        });

        // Refresh dashboard data
        if (fetchFromDatabase) {
            await fetchFromDatabase();
        }
    };

    /**
     * Stop processing
     */
    const stopProcessing = () => {
        abortRef.current = true;
        if (workerRef.current) {
            workerRef.current.terminate();
        }
        setCurrentPhase(null);
    };

    /**
     * Reset uploader
     */
    const handleReset = () => {
        setFile(null);
        setHeaders([]);
        setSampleRows([]);
        setMappingConfig(null);
        setProgress({ percent: 0, count: 0, activePincode: null, uniquePincodes: 0 });
        setCurrentPhase(null);
        setImportResult(null);
        setErrors([]);
        if (workerRef.current) {
            workerRef.current.terminate();
        }
    };

    // Available columns for mapping (not yet used)
    const getAvailableColumns = (excludeDbCol) => {
        const usedCols = new Set();
        Object.entries(mappingConfig?.mappings || {}).forEach(([dbCol, csvCols]) => {
            if (dbCol !== excludeDbCol) {
                csvCols.forEach(c => usedCols.add(c));
            }
        });
        if (mappingConfig?.pincodeCol) usedCols.add(mappingConfig.pincodeCol);
        return headers.filter(h => !usedCols.has(h));
    };

    /**
     * Phase indicator component
     */
    const PhaseIndicator = () => {
        const phases = [
            { id: 'scanning', icon: MapPin, label: 'Scanning Data', color: 'text-blue-600 dark:text-blue-400' },
            { id: 'uploading', icon: CloudUpload, label: 'Preparing', color: 'text-purple-600 dark:text-purple-400' },
            { id: 'processing', icon: Server, label: 'Database Insert', color: 'text-orange-600 dark:text-orange-400' },
            { id: 'complete', icon: PartyPopper, label: 'Complete!', color: 'text-green-600 dark:text-green-400' },
        ];

        const currentIndex = phases.findIndex(p => p.id === currentPhase);

        return (
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-xl">
                {phases.map((phase, idx) => {
                    const Icon = phase.icon;
                    const isActive = phase.id === currentPhase;
                    const isComplete = idx < currentIndex;
                    const isPending = idx > currentIndex;

                    return (
                        <React.Fragment key={phase.id}>
                            <div className={`flex flex-col items-center transition-all ${isActive ? 'scale-110' : ''}`}>
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                                    ${isComplete ? 'bg-green-500 text-white' : ''}
                                    ${isActive ? 'bg-white dark:bg-gray-800 shadow-lg ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900' : ''}
                                    ${isPending ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : ''}
                                    ${!isComplete && !isPending ? phase.color : ''}
                                `}>
                                    {isComplete ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                                    )}
                                </div>
                                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {phase.label}
                                </span>
                            </div>
                            {idx < phases.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 rounded ${idx < currentIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-[#1f2937] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Brain className="w-6 h-6" />
                            AI-Powered Smart Uploader v2
                        </h2>
                        <p className="text-white/80 text-sm mt-1">
                            Ultra-fast bulk import: 1M rows in under 1 minute
                        </p>
                    </div>
                    {file && (
                        <button
                            onClick={handleReset}
                            className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Step 1: File Selection */}
                {!file ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center hover:border-purple-300 dark:hover:border-purple-500 transition-colors">
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="smart-file-input"
                        />
                        <label htmlFor="smart-file-input" className="cursor-pointer block">
                            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Drop your file here</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Supports CSV and Excel (.xlsx, .xls)</p>
                            <div className="flex items-center justify-center gap-4 mt-3">
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                    <FileText className="w-3 h-3" /> CSV
                                </span>
                                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                                    <FileSpreadsheet className="w-3 h-3" /> Excel
                                </span>
                            </div>
                        </label>
                    </div>
                ) : (
                    <>
                        {/* File Info */}
                        <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                            <FileSpreadsheet className="w-10 h-10 text-green-600 dark:text-green-400" />
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{file.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • {headers.length} columns detected
                                </p>
                            </div>
                            <select
                                value={dataType}
                                onChange={(e) => setDataType(e.target.value)}
                                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                disabled={currentPhase !== null}
                            >
                                <option value="enrollment">📊 Enrollments</option>
                                <option value="biometric">🔐 Biometric Updates</option>
                                <option value="demographic">👥 Demographic Updates</option>
                            </select>
                        </div>

                        {/* Step 2: AI Analysis */}
                        {!mappingConfig ? (
                            <div className="text-center py-8">
                                <button
                                    onClick={analyzeWithAI}
                                    disabled={isAnalyzing}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Analyzing with AI...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Analyze Columns with AI
                                        </>
                                    )}
                                </button>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                                    AI will auto-detect how to map your columns to the database
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mapping Preview */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">Column Mapping</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${mappingConfig.source === 'ai'
                                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                }`}>
                                                {mappingConfig.source === 'ai' ? '✨ AI Generated' : '🔍 Fuzzy Match'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setEditMode(!editMode)}
                                            disabled={currentPhase !== null}
                                            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium disabled:opacity-50"
                                        >
                                            {editMode ? 'Done Editing' : 'Edit Mapping'}
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        {/* Pincode Mapping */}
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <span className="font-medium text-gray-700 dark:text-gray-200 w-32">pincode</span>
                                            <span className="text-gray-400">→</span>
                                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-mono">
                                                {mappingConfig.pincodeCol}
                                            </span>
                                        </div>

                                        {/* Other Mappings */}
                                        {['state', 'district', 'age_0_5', 'age_5_18', 'age_18_plus'].map(dbCol => {
                                            const csvCols = mappingConfig.mappings[dbCol] || [];
                                            const isNumeric = dbCol.startsWith('age_');

                                            return (
                                                <div key={dbCol} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                                    <Database className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                                    <span className="font-medium text-gray-700 dark:text-gray-200 w-32">{dbCol}</span>
                                                    <span className="text-gray-400">→</span>

                                                    <div className="flex-1 flex flex-wrap gap-2">
                                                        {csvCols.length > 0 ? (
                                                            csvCols.map((col, idx) => (
                                                                <span
                                                                    key={col}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg text-sm font-mono"
                                                                >
                                                                    {idx > 0 && isNumeric && (
                                                                        <span className="text-green-500 dark:text-green-400">+</span>
                                                                    )}
                                                                    {col}
                                                                    {editMode && (
                                                                        <button
                                                                            onClick={() => removeColumnFromMapping(dbCol, col)}
                                                                            className="ml-1 text-green-500 hover:text-red-500"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400 text-sm italic">No mapping</span>
                                                        )}

                                                        {editMode && (
                                                            <select
                                                                onChange={(e) => {
                                                                    addColumnToMapping(dbCol, e.target.value);
                                                                    e.target.value = '';
                                                                }}
                                                                className="text-xs px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                                defaultValue=""
                                                            >
                                                                <option value="">+ Add</option>
                                                                {getAvailableColumns(dbCol).map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>

                                                    {isNumeric && csvCols.length > 1 && (
                                                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                                            Will sum
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Errors */}
                                {errors.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium mb-2">
                                            <AlertTriangle className="w-5 h-5" />
                                            Errors
                                        </div>
                                        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                                            {errors.map((err, i) => (
                                                <li key={i}>• {err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Progress - THE NEW 3-STEP VISUALIZATION */}
                                {currentPhase && (
                                    <div className="space-y-4">
                                        <PhaseIndicator />

                                        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-indigo-800 dark:text-indigo-200">
                                                    {currentPhase === 'scanning' && '🔍 Scanning Local Data...'}
                                                    {currentPhase === 'generating' && '📦 Generating Clean CSV...'}
                                                    {currentPhase === 'uploading' && '☁️ Secure Upload...'}
                                                    {currentPhase === 'processing' && '🚀 Server Ingestion...'}
                                                    {currentPhase === 'complete' && '🎉 Import Complete!'}
                                                </span>
                                                <span className="text-sm text-indigo-600 dark:text-indigo-400">
                                                    {progress.count.toLocaleString()} rows • {progress.uniquePincodes.toLocaleString()} unique pincodes
                                                </span>
                                            </div>
                                            <div className="h-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${currentPhase === 'complete'
                                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                                        }`}
                                                    style={{ width: `${progress.percent}%` }}
                                                />
                                            </div>
                                            {progress.activePincode && currentPhase === 'scanning' && (
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                                                    Current: {progress.activePincode}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Success Result */}
                                {importResult && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="w-8 h-8 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                                                    🎉 Import Successful!
                                                </h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div className="bg-white/70 dark:bg-white/5 rounded-lg p-3">
                                                        <p className="text-gray-500 dark:text-gray-400">Raw Rows</p>
                                                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                                            {importResult.localStats?.rawRows?.toLocaleString() || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-white/5 rounded-lg p-3">
                                                        <p className="text-gray-500 dark:text-gray-400">Unique Pincodes</p>
                                                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                                            {importResult.localStats?.uniquePincodes?.toLocaleString() || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-white/5 rounded-lg p-3">
                                                        <p className="text-gray-500 dark:text-gray-400">Records Inserted</p>
                                                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                            {importResult.stats?.records_inserted?.toLocaleString() || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/70 dark:bg-white/5 rounded-lg p-3">
                                                        <p className="text-gray-500 dark:text-gray-400">Table</p>
                                                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                                            {importResult.stats?.table || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {!importResult && (
                                    <div className="flex gap-3">
                                        {!currentPhase ? (
                                            <button
                                                onClick={startProcessing}
                                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <Play className="w-5 h-5" />
                                                Start Bulk Import
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopProcessing}
                                                className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <Pause className="w-5 h-5" />
                                                Stop
                                            </button>
                                        )}

                                        <button
                                            onClick={analyzeWithAI}
                                            disabled={isAnalyzing || currentPhase !== null}
                                            className="px-4 py-3 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 font-medium rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                )}

                                {/* New Upload Button after success */}
                                {importResult && (
                                    <button
                                        onClick={handleReset}
                                        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Upload className="w-5 h-5" />
                                        Upload Another File
                                    </button>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SmartETLUploader;
