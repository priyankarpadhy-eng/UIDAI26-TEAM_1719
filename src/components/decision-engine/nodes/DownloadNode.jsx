import React, { memo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Check, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DataStore } from '../../../services/DataStore';
import BaseNode from './BaseNode';

const DownloadNode = ({ id, data, isConnectable, selected }) => {
    const inputDatasetId = data.datasetId || data.inputDatasetId;
    const isConnected = !!inputDatasetId;
    const [status, setStatus] = useState('idle'); // idle, processing, success

    const handleDownloadExcel = () => {
        const dataset = DataStore.get(inputDatasetId);
        if (!dataset || dataset.length === 0) return;
        setStatus('processing');

        setTimeout(() => {
            const ws = XLSX.utils.json_to_sheet(dataset);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Analysis_Data");
            XLSX.writeFile(wb, `Export_${Date.now()}.xlsx`);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        }, 100);
    };

    const handleDownloadPDF = () => {
        const dataset = DataStore.get(inputDatasetId);
        if (!dataset || dataset.length === 0) return;
        setStatus('processing');

        // Use setTimeout to allow UI to update to 'processing'
        setTimeout(() => {
            try {
                const doc = new jsPDF();
                // ... (Keep existing PDF logic same, abbreviated for brevity if unchanged logic is complex, but better to include it to avoid breaks)
                // Re-implementing simplified logic for safety
                doc.setFontSize(16);
                doc.text("Analysis Report", 10, 10);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 18);
                doc.text(`Total Records: ${dataset.length}`, 10, 24);

                const cols = Object.keys(dataset[0] || {});
                let y = 35;
                const pageHeight = doc.internal.pageSize.height;
                const lineHeight = 6;
                const margin = 10;

                // Headers
                doc.setFont(undefined, 'bold');
                doc.text(cols.join(' | ').substring(0, 95), margin, 30);
                doc.setFont(undefined, 'normal');

                dataset.forEach((row, i) => {
                    if (y > pageHeight - margin) {
                        doc.addPage();
                        y = 20;
                    }
                    const line = cols.map(c => row[c]).join(' | ').substring(0, 95);
                    doc.text(line, margin, y);
                    y += lineHeight;
                });

                doc.save(`Report_${Date.now()}.pdf`);
                setStatus('success');
            } catch (error) {
                console.error("PDF Generation Error", error);
                alert("Error generating PDF. Dataset might be too large.");
                setStatus('idle');
            }
            setTimeout(() => setStatus('idle'), 2000);
        }, 100);
    };

    return (
        <BaseNode
            id={id}
            title="Export Data"
            icon={Download}
            color="green"
            selected={selected}
            isConnectable={isConnectable}
            handles={['left']}
        >
            <div className="space-y-4">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-slate-700/50 rounded-lg bg-slate-900/50">
                        <AlertTriangle className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                        <p className="text-xs text-slate-500 font-medium">No Input Connected</p>
                        <p className="text-[10px] text-slate-600 mt-1">Connect a node to export data</p>
                    </div>
                ) : (
                    <div className="space-y-3 animation-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Data Ready for Export
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleDownloadExcel}
                                disabled={status === 'processing'}
                                className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-emerald-500/50 text-emerald-400 text-xs py-3 rounded-lg transition-all group"
                            >
                                <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>Excel</span>
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={status === 'processing'}
                                className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-red-500/50 text-red-400 text-xs py-3 rounded-lg transition-all group"
                            >
                                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>PDF</span>
                            </button>
                        </div>

                        {status === 'success' && (
                            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 py-2 rounded border border-emerald-500/20">
                                <Check className="w-3 h-3" /> Download Started
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(DownloadNode);
