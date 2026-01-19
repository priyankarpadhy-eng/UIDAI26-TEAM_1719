import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { usePython } from '../../hooks/usePython';
import { generatePythonCode } from '../../utils/aiService';
import PincodeMap from '../map/PincodeMap';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';
import { Send, Code, Map as MapIcon, Key, Play, Loader2, AlertTriangle } from 'lucide-react';

const InterpreterDashboard = ({ initialQuery = '', autoRun = false }) => {
    // State
    const [apiKey, setApiKey] = useState(''); // In real app, use env var
    const [query, setQuery] = useState(initialQuery);
    const [generatedCode, setGeneratedCode] = useState('');
    const [executionResult, setExecutionResult] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState('map'); // 'map' | 'code'
    const scanIntervalRef = React.useRef(null);

    // Context & Hooks
    const { uploadedFiles, updateScanProgress, triggerScanAnimation, scanMode, scanProgress, syncToDatabase } = useData();
    const { runPythonCode, isReady, isLoading: isPythonLoading } = usePython();

    // Init Effect
    React.useEffect(() => {
        if (initialQuery) setQuery(initialQuery);
        if (autoRun && uploadedFiles.length > 0) {
            runScannerLogic();
        }
    }, [autoRun, initialQuery, uploadedFiles.length]);

    // --- SEQUENTIAL SCANNER LOGIC ---
    const runScannerLogic = async () => {
        if (uploadedFiles.length === 0) return;

        // 1. Prepare Data
        const allRows = uploadedFiles.flatMap(f => f.data);
        const uniquePincodes = [...new Set(allRows.map(r => r.Pincode).filter(Boolean))];

        triggerScanAnimation(true);
        setIsGenerating(true); // Show loading state

        let currentIndex = 0;
        const total = uniquePincodes.length;

        // 2. Animation Loop
        scanIntervalRef.current = setInterval(() => {
            if (currentIndex >= total) {
                // FINISHED
                clearInterval(scanIntervalRef.current);
                finishScanning(uniquePincodes.length);
            } else {
                // TICK
                const pincode = uniquePincodes[currentIndex];
                updateScanProgress(pincode, currentIndex + 1, total);
                currentIndex++;
            }
        }, 50); // Speed of scanning (50ms per pincode)
    };

    const stopScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        // Finish with current progress
        const processedCount = scanProgress?.step || 0;
        finishScanning(processedCount, true); // true = wasStopped
    };

    const finishScanning = async (count, wasStopped = false) => {
        // Stop Animation
        updateScanProgress(null, count, count);
        if (!wasStopped) {
            // Success Confetti!
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        setTimeout(() => triggerScanAnimation(false), 800);

        // 3. Database Sync
        await syncToDatabase(uploadedFiles);

        // 4. Proceed to AI Generation (if Key exists) or Visualization
        if (apiKey && query && !wasStopped) {
            handleGenerate();
        } else {
            setIsGenerating(false);
            setActiveTab('map');

            if (!apiKey && !wasStopped) {
                // Focus the API Input
                const keyInput = document.querySelector('input[type="password"]');
                if (keyInput) keyInput.focus();
                alert(`Analysis Complete! ${count} regions processed.\n\nTo get AI insights ("${query}"), please enter your OpenAI API Key.`);
            } else if (wasStopped) {
                alert(`Analysis Stopped by User. Processed ${count} regions.`);
            }
        }
    };

    // --- AI LOGIC ---
    const handleGenerate = async (e) => {
        if (e) e.preventDefault();
        if (!apiKey) return;

        setIsGenerating(true);
        try {
            const columns = uploadedFiles[0].meta.fields || Object.keys(uploadedFiles[0].data[0]);
            const code = await generatePythonCode(query, columns, apiKey);
            setGeneratedCode(code);
            setActiveTab('code');

            // Auto-Run the code
            setTimeout(() => handleRun(code), 500);

        } catch (err) {
            console.error(err);
            alert("AI Error: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRun = async (codeToRun = generatedCode) => {
        if (!codeToRun) return;
        setIsRunning(true);
        try {
            const csvContent = Papa.unparse(uploadedFiles[0].data);
            const files = [{ name: 'data.csv', content: csvContent }];
            const result = await runPythonCode(codeToRun, files);

            const mapData = Object.entries(result).map(([pincode, value]) => ({
                Pincode: pincode,
                metrics: {
                    totalEnrollments: value,
                    updates: 0,
                    rejections: 0
                }
            }));

            setExecutionResult(mapData);
            setActiveTab('map');

        } catch (err) {
            alert("Runtime Error: " + err.message);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0b1120] overflow-hidden transition-colors duration-300">
            {/* Top Bar */}
            <div className="bg-white dark:bg-[#1f2937] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        AI Code Interpreter
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions in plain English, visualize answers on the map.</p>
                </div>

                {/* API Key Input (Hackathon Mode) */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="password"
                            placeholder="OpenAI API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none w-48"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Chat & Code */}
                <div className="w-1/3 bg-white dark:bg-[#1f2937] border-r border-gray-200 dark:border-gray-700 flex flex-col z-10 shadow-xl transition-colors duration-300">

                    {/* Chat Input */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#111827]">
                        <form onSubmit={handleGenerate} className="flex gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g. 'Show Pincodes with > 500 enrollments'"
                                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-xl focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none text-sm shadow-sm"
                            />
                            <button
                                type="submit"
                                disabled={isGenerating || !isReady}
                                className={`p-2 rounded-xl text-white shadow-md transition-all
                                    ${isGenerating ? 'bg-purple-300 dark:bg-purple-900' : 'bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-500'}
                                `}
                            >
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                        {!isReady && (
                            <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Initializing Python Runtime...
                            </p>
                        )}
                        {uploadedFiles.length === 0 && (
                            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> No CSV loaded. Please upload file first.
                            </p>
                        )}
                    </div>

                    {/* Result Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('code')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'code' ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            Generated Code
                        </button>
                        <button
                            onClick={() => setActiveTab('map')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'map' ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            Visualization
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#111827] relative">
                        {activeTab === 'code' ? (
                            <div className="h-full flex flex-col">
                                <textarea
                                    value={generatedCode}
                                    onChange={(e) => setGeneratedCode(e.target.value)}
                                    className="flex-1 w-full bg-[#1e1e1e] text-green-400 font-mono text-xs p-4 resize-none outline-none dark:bg-black"
                                    placeholder="# AI Generated Code will appear here..."
                                />
                                <div className="p-4 bg-white dark:bg-[#1f2937] border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={handleRun}
                                        disabled={isRunning || !generatedCode}
                                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium shadow-md transition-all active:scale-[0.98]"
                                    >
                                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        Run Code
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center">
                                {executionResult ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                                            <MapIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Visualization Ready</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">The map on the right has been updated with {executionResult.length} data points from your query.</p>
                                        </div>
                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Data Points</p>
                                                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{executionResult.length}</p>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Status</p>
                                                <p className="text-sm font-bold text-green-700 dark:text-green-300">Active</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : isRunning ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Generating Visualization...</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Processing your query and preparing the map.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mx-auto">
                                            <MapIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Ready to Visualize</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Enter a query above and run the code to see your data on the map.</p>
                                        </div>
                                        {/* Instructions */}
                                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-left">
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Quick Start:</p>
                                            <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                                                <li>Upload a CSV file with pincode data</li>
                                                <li>Type a query like "Show enrollment heatmap"</li>
                                                <li>Click run to generate the visualization</li>
                                            </ol>
                                        </div>
                                        {/* Example queries */}
                                        <div className="text-xs text-gray-400 dark:text-gray-500">
                                            <p className="font-medium mb-1">Try these queries:</p>
                                            <div className="space-y-1">
                                                <p className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                                                    "Show total enrollments by pincode"
                                                </p>
                                                <p className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                                                    "Highlight areas with low enrollment"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Map */}
                <div className="flex-1 bg-white dark:bg-[#1f2937] relative transition-colors duration-300">
                    <PincodeMap externalData={executionResult} />

                    {/* SCANNER OVERLAY: Progress Bar */}
                    {scanMode && scanProgress && (
                        <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[500] pointer-events-auto">
                            <div className="bg-white dark:bg-[#1f2937] p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4 w-96 animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center relative">
                                    <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <MapIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                                </div>

                                <div className="text-center w-full">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Syncing to Database...</h3>

                                    {/* Current Pincode Info */}
                                    <div className="mt-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Current Pincode</p>
                                        <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{scanProgress.activePincode}</p>
                                        {scanProgress.state && scanProgress.state !== 'Unknown' && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                {scanProgress.district !== 'Unknown' && `${scanProgress.district}, `}{scanProgress.state}
                                            </p>
                                        )}
                                    </div>

                                    {/* Current Table */}
                                    {scanProgress.currentTable && (
                                        <div className="mt-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full inline-block">
                                            {scanProgress.currentTable}
                                        </div>
                                    )}

                                    {/* Row Progress */}
                                    <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>Pincode {scanProgress.step?.toLocaleString()} of {scanProgress.total?.toLocaleString()}</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                            {Math.round((scanProgress.step / scanProgress.total) * 100)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-150 ease-out"
                                        style={{ width: `${(scanProgress.step / scanProgress.total) * 100}%` }}
                                    ></div>
                                </div>

                                {/* Detailed Progress Info */}
                                {scanProgress.step && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Processing Record {scanProgress.step.toLocaleString()} of {scanProgress.total.toLocaleString()}
                                    </p>
                                )}

                                {/* STOP BUTTON */}
                                <button
                                    onClick={stopScanning}
                                    className="mt-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/20 transition-colors flex items-center gap-1 cursor-pointer pointer-events-auto"
                                >
                                    <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                                    Stop Analysis
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Overlay Label for Context - Always Visible */}
                    <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-purple-200 dark:border-purple-800 shadow-lg px-4 py-2 rounded-xl z-[400] flex flex-col items-end">
                        {scanMode ? (
                            <>
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Analyzing...</span>
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Processing Data</span>
                            </>
                        ) : executionResult ? (
                            <>
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Active Analysis</span>
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">"{query || 'Data Visualization'}"</span>
                            </>
                        ) : (
                            <>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">No Analysis</span>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ready to analyze</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterpreterDashboard;
