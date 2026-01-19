import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { FileUp, FileJson, FileSpreadsheet, FileType, CheckCircle2, Loader2, X, UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataStore } from '../../../services/DataStore';

const FileNode = ({ id, data, isConnectable }) => {
    const [fileName, setFileName] = useState(data.fileName || '');
    const [status, setStatus] = useState(data.status || 'idle'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const { setNodes, setEdges } = useReactFlow();

    const processData = (jsonData, name) => {
        // Standardize to array of objects
        const standardized = Array.isArray(jsonData) ? jsonData : [jsonData];

        // Store in Global DataStore to avoid React Flow performance issues with large objects
        const datasetId = DataStore.set(standardized);

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            fileName: name,
                            datasetId: datasetId,
                            fetchedData: null, // Clear heavy data from state
                            status: 'success'
                        }
                    };
                }
                // Auto-propagate to connected tables/graphs if they exist would be handled by useNodeEngine
                return node;
            })
        );
        setFileName(name);
        setStatus('success');
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('loading');
        setErrorMsg('');
        const name = file.name.toLowerCase();

        try {
            if (name.endsWith('.json')) {
                const text = await file.text();
                const json = JSON.parse(text);
                processData(json, file.name);
            }
            else if (name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    worker: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        processData(results.data, file.name);
                    },
                    error: (err) => {
                        console.error('CSV Parse Error:', err);
                        setStatus('error');
                        setErrorMsg('Parser Error: ' + err.message);
                    }
                });
            }
            else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.ods')) {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                processData(json, file.name);
            }
            else {
                throw new Error('Unsupported format. Use CSV, JSON, or Excel.');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message);
        }
    };

    const handleDelete = () => {
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodes((nds) => nds.filter((n) => n.id !== id));
    };

    return (
        <div className={`bg-white border-2 rounded-2xl shadow-lg min-w-[280px] relative transition-all ${status === 'success' ? 'border-emerald-400 shadow-emerald-100' : 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100'
            }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 flex items-center justify-between border-b border-indigo-100 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}>
                        <FileUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-700">File Upload</span>
                        <span className="text-[10px] text-indigo-400 block">CSV, JSON, Excel</span>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {status === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-3 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
                            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{fileName}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1">✓ Ready to analyze</p>
                        </div>
                        <button
                            onClick={() => setStatus('idle')}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium hover:underline"
                        >
                            Upload different file
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Supported Formats */}
                        <div className="flex justify-center gap-3">
                            <div className="text-center group">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border-2 border-blue-100 group-hover:border-blue-400 transition-colors">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                                </div>
                                <span className="text-[10px] text-slate-500 mt-1 block font-medium">CSV/XLS</span>
                            </div>
                            <div className="text-center group">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border-2 border-amber-100 group-hover:border-amber-400 transition-colors">
                                    <FileJson className="w-5 h-5 text-amber-500" />
                                </div>
                                <span className="text-[10px] text-slate-500 mt-1 block font-medium">JSON</span>
                            </div>
                        </div>

                        {/* Upload Area */}
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all group bg-slate-50">
                            <div className="flex flex-col items-center justify-center p-4">
                                {status === 'loading' ? (
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-2" />
                                ) : (
                                    <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                                )}
                                <p className="text-xs text-slate-500 group-hover:text-indigo-600 font-medium">
                                    {status === 'loading' ? 'Parsing file...' : 'Click to upload or drag & drop'}
                                </p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept=".csv, .json, .xlsx, .xls, .ods"
                                onChange={handleFileUpload}
                                disabled={status === 'loading'}
                            />
                        </label>

                        {status === 'error' && (
                            <p className="text-xs text-red-600 text-center bg-red-50 p-2 rounded-lg border border-red-200">
                                {errorMsg}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Output Handle - LARGE & VISIBLE */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!w-5 !h-5 !bg-indigo-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                style={{ right: '-10px' }}
            />
        </div>
    );
};

export default memo(FileNode);
