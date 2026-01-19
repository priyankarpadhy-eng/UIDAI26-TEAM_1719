import React, { memo, useState, useEffect, useMemo } from 'react';
import { useReactFlow } from 'reactflow';
import { Columns3, Calculator } from 'lucide-react';
import { DataStore } from '../../../services/DataStore';
import BaseNode from './BaseNode';

const ColumnNode = ({ id, data, isConnectable }) => {
    const [selectedColumns, setSelectedColumns] = useState(data.selectedColumns || []);
    const [inputData, setInputData] = useState([]);
    const { setNodes } = useReactFlow();

    const inputDatasetId = data.datasetId || data.inputDatasetId;

    // Fetch Input Data from Store
    useEffect(() => {
        if (inputDatasetId) {
            const d = DataStore.get(inputDatasetId);
            setInputData(d || []);
        } else if (data.inputData) {
            setInputData(data.inputData); // Legacy
        } else {
            setInputData([]);
        }
    }, [inputDatasetId, data.inputData]);

    const availableColumns = useMemo(() =>
        inputData.length > 0 ? Object.keys(inputData[0]) : [],
        [inputData]);

    const numericColumns = useMemo(() =>
        availableColumns.filter(col => inputData.length > 0 && typeof inputData[0][col] === 'number'),
        [availableColumns, inputData]);

    // Process & Propagate Data
    useEffect(() => {
        if (inputData.length === 0) return;

        const colsToKeep = selectedColumns.length > 0 ? selectedColumns : availableColumns;

        // Lightweight processing mapping
        const processed = inputData.map(row => {
            const newRow = {};
            colsToKeep.forEach(col => {
                if (Object.prototype.hasOwnProperty.call(row, col)) {
                    newRow[col] = row[col];
                }
            });
            return newRow;
        });

        // Store result
        const newDatasetId = DataStore.set(processed);

        // Update Node Data
        const timer = setTimeout(() => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === id) {
                        // Avoid infinite updates if ID hasn't changed
                        if (node.data.processedDatasetId === newDatasetId &&
                            JSON.stringify(node.data.selectedColumns) === JSON.stringify(selectedColumns)) {
                            return node;
                        }

                        return {
                            ...node,
                            data: {
                                ...node.data,
                                processedDatasetId: newDatasetId,
                                datasetId: newDatasetId, // Act as a source too
                                processedData: null, // Clear heavy data
                                selectedColumns: selectedColumns
                            }
                        };
                    }
                    return node;
                })
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [inputData, selectedColumns, id, setNodes, availableColumns]);

    const toggleColumn = (col) => {
        setSelectedColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    return (
        <BaseNode
            id={id}
            title="Columns"
            icon={Columns3}
            color="pink"
            isConnectable={isConnectable}
            handles={['left', 'right']}
        >
            <div className="space-y-3">
                {availableColumns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <Columns3 className="w-5 h-5 text-slate-400 opacity-50 mb-1" />
                        <p className="text-xs text-slate-400">Connect data source</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Select Columns ({selectedColumns.length || 'All'})</label>
                                <button
                                    onClick={() => setSelectedColumns([])}
                                    className="text-[9px] text-pink-500 hover:text-pink-600 font-medium"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="max-h-[150px] overflow-y-auto space-y-1 bg-white rounded-lg p-2 border border-slate-200 shadow-inner custom-scrollbar">
                                {availableColumns.map((col) => (
                                    <label key={col} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:bg-pink-50/50 p-1.5 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(col)}
                                            onChange={() => toggleColumn(col)}
                                            className="rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                                        />
                                        <span className="truncate max-w-[140px] font-medium" title={col}>{col}</span>
                                        {numericColumns.includes(col) && <Calculator className="w-3 h-3 text-slate-400 ml-auto flex-shrink-0" />}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {selectedColumns.length > 0 && (
                            <div className="text-[10px] text-emerald-600 font-medium text-center bg-emerald-50 py-1 rounded border border-emerald-100">
                                ✓ Filtering {selectedColumns.length} columns
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(ColumnNode);
