import React, { memo, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { Database, Table2 } from 'lucide-react';
import BaseNode from './BaseNode';

const DatabaseNode = ({ id, data, isConnectable, selected }) => {
    const [selectedTable, setSelectedTable] = useState(data.selectedTable || '');
    const { setNodes } = useReactFlow();

    const tables = [
        { id: 'tbl_enrollments', name: 'Enrollments', desc: 'Aadhaar enrollment data' },
        { id: 'tbl_biometrics', name: 'Biometrics', desc: 'Biometric update records' },
        { id: 'tbl_demographics', name: 'Demographics', desc: 'Demographic changes' },
    ];

    const handleTableSelect = (tableId) => {
        setSelectedTable(tableId);
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, selectedTable: tableId, isConnected: true } };
                }
                return node;
            })
        );
    };

    return (
        <BaseNode
            id={id}
            title="Database"
            icon={Database}
            color="amber"
            selected={selected}
            isConnectable={isConnectable}
            handles={['right']}
        >
            <div className="space-y-3">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Select Table Source</p>
                {tables.map((table) => (
                    <button
                        key={table.id}
                        onClick={() => handleTableSelect(table.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all group ${selectedTable === table.id
                            ? 'bg-amber-50 border-amber-300 text-amber-800 ring-1 ring-amber-200 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50/50 shadow-sm'
                            }`}
                    >
                        <div className={`p-2 rounded-md ${selectedTable === table.id ? 'bg-amber-200/50' : 'bg-gray-100 group-hover:bg-amber-100'}`}>
                            <Table2 className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <div>
                            <p className="text-xs font-bold">{table.name}</p>
                            <p className="text-[10px] opacity-70 leading-tight">{table.desc}</p>
                        </div>
                    </button>
                ))}
                {selectedTable && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center gap-2 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[10px] text-emerald-700 font-bold">Source Connected</p>
                    </div>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(DatabaseNode);
