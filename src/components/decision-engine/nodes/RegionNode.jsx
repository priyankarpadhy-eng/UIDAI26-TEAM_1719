import React, { memo, useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { MapPin, Loader2, Lock } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { DataStore } from '../../../services/DataStore';
import BaseNode from './BaseNode';

const RegionNode = ({ id, data, isConnectable, selected }) => {
    const [regionType, setRegionType] = useState('state');
    const [options, setOptions] = useState([]);
    const [selectedValue, setSelectedValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [inputData, setInputData] = useState([]);
    const { setNodes } = useReactFlow();

    const isConnectedToDb = data.isConnectedToDb || false;
    const inputDatasetId = data.inputDatasetId || data.datasetId;
    const sourceTable = data.sourceTable || 'tbl_enrollments';

    // Check if we have ANY source
    const hasSource = isConnectedToDb || !!inputDatasetId;

    // Fetch input data from store
    useEffect(() => {
        if (inputDatasetId) {
            const d = DataStore.get(inputDatasetId);
            setInputData(d || []);
        } else {
            setInputData([]);
        }
    }, [inputDatasetId]);

    // Helper to find case-insensitive key in an object
    const getValue = (obj, key) => {
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
        return foundKey ? obj[foundKey] : null;
    };

    useEffect(() => {
        if (!hasSource) return;

        const fetchOptions = async () => {
            setLoading(true);
            try {
                if (isConnectedToDb) {
                    // Database Mode
                    const { data: dbData } = await supabase
                        .from(sourceTable)
                        .select(regionType)
                        .not(regionType, 'is', null);
                    const unique = [...new Set(dbData?.map(item => item[regionType]) || [])].sort();
                    setOptions(unique);
                } else {
                    // Local Data Mode (File/API)
                    if (inputData.length === 0) return;
                    // Aggregate unique values from inputData
                    const unique = [...new Set(inputData.map(item => getValue(item, regionType)))].filter(Boolean).sort();
                    setOptions(unique);
                }
            } catch (err) {
                console.error('Region fetch error:', err);
                setOptions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, [isConnectedToDb, inputData, regionType, sourceTable, hasSource]);

    const handleValueChange = (val) => {
        setSelectedValue(val);

        let processedId = null;
        let matchCount = 0;

        if (inputData.length > 0) {
            // Client-side filtering
            const processed = val
                ? inputData.filter(item => String(getValue(item, regionType)) === String(val))
                : inputData;

            matchCount = processed.length;
            // Store filtered result in Data Store
            processedId = DataStore.set(processed);
        }

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            selectedRegionType: regionType,
                            selectedValue: val,
                            processedDatasetId: processedId, // Pass filtered reference
                            processedData: null // Clear Prop
                        }
                    };
                }
                return node;
            })
        );
    };

    return (
        <BaseNode
            id={id}
            title="Region Filter"
            icon={MapPin}
            color="cyan"
            selected={selected}
            isConnectable={isConnectable}
            handles={['left', 'right']}
        >
            <div className="space-y-4">
                {!hasSource ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <Lock className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                        <p className="text-xs text-slate-500 font-medium">No Data Source</p>
                        <p className="text-[10px] text-slate-400 mt-1">Connect Database, File, or API</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            {['state', 'district', 'pincode'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => { setRegionType(type); setSelectedValue(''); }}
                                    className={`flex-1 text-[10px] py-1.5 px-2 rounded-md capitalize transition-all font-bold ${regionType === type
                                        ? 'bg-white text-cyan-600 shadow-sm ring-1 ring-cyan-100'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-4 bg-slate-50 rounded-lg border border-slate-200">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" /> Loading regions...
                            </div>
                        ) : (
                            <div className="relative group/input">
                                <input
                                    type="text"
                                    value={selectedValue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedValue(val);
                                    }}
                                    onBlur={() => {
                                        if (selectedValue) handleValueChange(selectedValue);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleValueChange(selectedValue);
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    list={`list-${id}`}
                                    placeholder={`Search ${regionType}...`}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-200 placeholder:text-slate-400 transition-all font-medium"
                                />
                                <datalist id={`list-${id}`}>
                                    {options.map((opt) => (
                                        <option key={opt} value={opt} />
                                    ))}
                                </datalist>
                                {/* Search Icon overlay */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <span className="text-[10px] text-slate-400">▼</span>
                                </div>
                            </div>
                        )}

                        {selectedValue && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Filter Active: <span className="text-slate-700">{selectedValue}</span>
                                </p>
                                {inputData.length > 0 && (
                                    <p className="text-[10px] text-slate-500 mt-1 pl-3.5 border-l-2 border-emerald-200 ml-0.5 font-medium">
                                        {inputData.filter(i => String(getValue(i, regionType)) === String(selectedValue)).length} records matched
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(RegionNode);
