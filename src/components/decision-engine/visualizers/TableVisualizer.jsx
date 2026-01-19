import React, { useState, useEffect } from 'react';
import { Table, FileSpreadsheet } from 'lucide-react';
import { DataStore } from '../../../services/DataStore';

export const TableVisualizer = ({ datasetId, inputData: propInputData }) => {
    const [tableData, setTableData] = useState([]);

    useEffect(() => {
        if (datasetId) {
            const d = DataStore.get(datasetId);
            setTableData(d || []);
        } else if (propInputData) {
            setTableData(propInputData);
        } else {
            setTableData([]);
        }
    }, [datasetId, propInputData]);

    const inputData = tableData;
    const headers = inputData.length > 0 ? Object.keys(inputData[0]) : [];

    // Auto-formatting for JSON objects in cells
    const formatCell = (value) => {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return String(value ?? '-');
    };

    if (inputData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-base text-slate-500 font-medium">No data available</p>
                <p className="text-xs text-slate-400 mt-2">Connect a data source to view table</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {/* Table Content */}
            <div className="flex-1 overflow-hidden relative">
                <div className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-emerald-400/30 scrollbar-track-slate-100">
                    <table className="w-full text-sm border-collapse min-w-max">
                        <thead className="sticky top-0 bg-emerald-50 z-10">
                            <tr>
                                {headers.map((header) => (
                                    <th key={header} className="px-4 py-3 text-left text-emerald-700 font-bold border-b-2 border-emerald-200 whitespace-nowrap text-xs uppercase tracking-wide">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            {inputData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-emerald-50/50 border-b border-slate-100 transition-colors">
                                    {headers.map((header) => (
                                        <td key={header} className="px-4 py-2.5 whitespace-nowrap border-r border-slate-100 last:border-r-0 max-w-[300px] truncate text-sm">
                                            {formatCell(row[header])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2 text-xs text-emerald-700 font-medium flex justify-between items-center">
                <span className="flex items-center gap-2">
                    <Table className="w-3.5 h-3.5" />
                    {inputData.length} Records
                </span>
                <span>{headers.length} Columns</span>
            </div>
        </div>
    );
};
