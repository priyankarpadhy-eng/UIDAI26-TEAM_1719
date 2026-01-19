import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { supabase } from '../../../supabaseClient';
import { MapPin, Loader2, X } from 'lucide-react';

export const StateSourceNode = ({ id, data, isConnectable }) => {
    const [states, setStates] = useState([]);
    const [selectedState, setSelectedState] = useState(data.selectedValue || '');
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const { setNodes } = useReactFlow();

    // 1. Fetch States from Database on Load
    useEffect(() => {
        const fetchStates = async () => {
            try {
                const { data, error } = await supabase
                    .from('enrollments') // Correct table name used in project
                    .select('state')
                    .not('state', 'is', null);

                if (error) throw error;

                // Get unique states only
                const uniqueStates = [...new Set(data.map(item => item.state))].sort();
                setStates(uniqueStates);
            } catch (err) {
                console.error("Error fetching states:", err);
                // Fallback if DB fails/empty
                setStates(['Maharashtra', 'Uttar Pradesh', 'Odisha', 'Karnataka']);
            } finally {
                setLoading(false);
            }
        };
        fetchStates();
    }, []);

    // 2. Handle Selection
    const handleChange = (evt) => {
        const val = evt.target.value;
        setSelectedState(val);

        // Update the global node data so connections can read it
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    node.data = { ...node.data, selectedValue: val };
                }
                return node;
            })
        );

        // Trigger callback if provided
        if (data.onChange) data.onChange(val);
    };

    return (
        <div
            className="p-0 border-2 border-amber-400 dark:border-amber-500 bg-white dark:bg-[#1f2937] rounded-xl shadow-lg min-w-[220px] overflow-hidden relative transition-all hover:shadow-xl hover:shadow-amber-100 dark:hover:shadow-amber-900/20"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Delete Button */}
            {isHovered && data.onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onDelete();
                    }}
                    className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-all transform hover:scale-110"
                    title="Delete node"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/10 p-2 flex items-center gap-2 border-b border-amber-200 dark:border-amber-700">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Select State</span>
            </div>

            {/* Content */}
            <div className="p-4 bg-white dark:bg-[#1f2937]">
                {loading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading states...
                    </div>
                ) : (
                    <select
                        className="w-full bg-amber-50 dark:bg-black/20 border border-amber-200 dark:border-amber-700 rounded-lg p-2 text-sm text-gray-800 dark:text-white outline-none focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/30 transition-colors cursor-pointer"
                        value={selectedState}
                        onChange={handleChange}
                    >
                        <option value="" className="dark:bg-gray-800">-- Choose State --</option>
                        {states.map(state => (
                            <option key={state} value={state} className="dark:bg-gray-800">{state}</option>
                        ))}
                    </select>
                )}
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                    Selected: <span className="text-amber-600 dark:text-amber-400 font-semibold">{selectedState || 'None'}</span>
                </p>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-800 !shadow-md"
            />
        </div>
    );
};

export default StateSourceNode;
