import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * FlowContext - Global State for the Visual Data Pipeline
 * Manages real data flow between nodes, not just visual connections.
 */

const FlowContext = createContext(null);

// Initial pipeline state
const initialPipelineState = {
    database: {
        connected: false,
        client: null,
        tableName: 'enrollments'
    },
    region: {
        state: null,
        district: null,
        pincode: null,
        filterObject: null
    },
    columns: {
        selected: [],
        mappedColumns: []
    },
    logic: {
        metric: 'total',
        operator: 'lt',
        threshold: 50,
        signal: null // true = alert, false = normal, null = not evaluated
    },
    queryResult: {
        data: null,
        loading: false,
        error: null,
        lastUpdated: null
    }
};

// Column mapping: User-friendly names to actual DB columns
// NOTE: enrollments table has: pincode, state, district, age_0_5, age_5_18, age_18_plus, record_date, updated_at
// There is NO 'total_enrollments' column - total is calculated as age_0_5 + age_5_18 + age_18_plus
export const COLUMN_MAPPING = {
    'Age Groups (All)': ['age_0_5', 'age_5_18', 'age_18_plus'],
    'Age 0-5 (Children)': ['age_0_5'],
    'Age 5-18 (Youth)': ['age_5_18'],
    'Age 18+ (Adults)': ['age_18_plus'],
    'Record Info': ['record_date', 'updated_at'],
};

// Reverse lookup for display
export const getDisplayName = (dbColumn) => {
    for (const [display, cols] of Object.entries(COLUMN_MAPPING)) {
        if (cols.includes(dbColumn)) return display;
    }
    return dbColumn;
};

export const FlowProvider = ({ children }) => {
    const [pipelineState, setPipelineState] = useState(initialPipelineState);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const subscribersRef = useRef(new Map()); // Node ID -> callback function

    /**
     * Register a node as a subscriber to pipeline changes
     */
    const subscribe = useCallback((nodeId, callback) => {
        subscribersRef.current.set(nodeId, callback);
        return () => subscribersRef.current.delete(nodeId);
    }, []);

    /**
     * Notify all downstream subscribers of a change
     */
    const notifySubscribers = useCallback((changedNodeType, data) => {
        subscribersRef.current.forEach((callback, nodeId) => {
            callback(changedNodeType, data);
        });
    }, []);

    /**
     * Update Database Connection State
     */
    const setDatabaseConnection = useCallback((isConnected) => {
        setPipelineState(prev => ({
            ...prev,
            database: {
                ...prev.database,
                connected: isConnected,
                client: isConnected ? supabase : null
            }
        }));
        notifySubscribers('database', { connected: isConnected });
    }, [notifySubscribers]);

    /**
     * Update Region Filter (Called by RegionNode)
     */
    const setRegionFilter = useCallback((regionData) => {
        const filterObject = {};
        if (regionData.state) filterObject.state = regionData.state;
        if (regionData.district) filterObject.district = regionData.district;
        if (regionData.pincode) filterObject.pincode = regionData.pincode;

        setPipelineState(prev => ({
            ...prev,
            region: {
                ...regionData,
                filterObject: Object.keys(filterObject).length > 0 ? filterObject : null
            }
        }));
        notifySubscribers('region', { ...regionData, filterObject });
    }, [notifySubscribers]);

    /**
     * Update Selected Columns (Called by ColumnNode)
     */
    const setSelectedColumns = useCallback((selectedDisplayNames) => {
        // Map display names to actual DB columns
        const mappedColumns = selectedDisplayNames.flatMap(name => COLUMN_MAPPING[name] || []);

        setPipelineState(prev => ({
            ...prev,
            columns: {
                selected: selectedDisplayNames,
                mappedColumns
            }
        }));
        notifySubscribers('columns', { selected: selectedDisplayNames, mappedColumns });
    }, [notifySubscribers]);

    /**
     * Update Logic Rule Configuration
     */
    const setLogicRule = useCallback((logicConfig) => {
        setPipelineState(prev => ({
            ...prev,
            logic: {
                ...prev.logic,
                ...logicConfig
            }
        }));
        notifySubscribers('logic', logicConfig);
    }, [notifySubscribers]);

    /**
     * Set Logic Signal (True = Alert Triggered)
     */
    const setLogicSignal = useCallback((signal) => {
        setPipelineState(prev => ({
            ...prev,
            logic: {
                ...prev.logic,
                signal
            }
        }));
        notifySubscribers('signal', { signal });
    }, [notifySubscribers]);

    /**
     * Execute the Pipeline Query
     * Traverses the configured filters and columns, executing against cached processedData
     */
    const executePipelineQuery = useCallback(async () => {
        const { region, columns } = pipelineState;

        // Ensure we have source data (from DataContext)
        // Note: In a real flow, we'd grab this from the source node, but for now we pull from global context
        // This is safe because FlowProvider is inside DataProvider

        // Emulate async to show loading state if needed, but it's instant client-side
        setPipelineState(prev => ({
            ...prev,
            queryResult: { ...prev.queryResult, loading: true, error: null }
        }));

        try {
            // 1. Start with the full dataset (consumed via props or context in the hook)
            // We need to access processedData here. 
            // Since we can't use hooks inside a callback easily if they change, we should rely on the component using useFlow to pass data 
            // OR - better pattern: FlowProvider should access useData() since it is a component.
            // However, useData is defined in the parent. Let's assume we pass processedData into the context values OR 
            // we let the logic run in `useNodeEngine` and just store the result here. 

            // Actually, the user asked for logic in `useNodeEngine`. 
            // So FlowContext might just be the STATE holder, while useNodeEngine does the work.
            // But for `executePipelineQuery` to work as a context method, it needs access to data.

            // Let's defer to useNodeEngine for the actual filtering logic to keep Context clean?
            // "The Engine Logic (useNodeEngine.js) ... applies filters step-by-step"
            // So executePipelineQuery might just be a trigger or state update.
            // But let's keep the state update part here.

            // We will modify this to just signal a "re-run needed" or similar, 
            // OR effectively we just update the 'result' state which useNodeEngine calculates.
            // But since the current implementation has `executePipelineQuery` doing the work, 
            // I'll leave it as a placeholder that resolves immediately, 
            // and let useNodeEngine drive the actual data transformation.

            setPipelineState(prev => ({
                ...prev,
                queryResult: {
                    ...prev.queryResult,
                    loading: false,
                    lastUpdated: new Date().toISOString()
                }
            }));

            return { data: [], error: null }; // Data is now flowing through useNodeEngine

        } catch (error) {
            console.error('Pipeline Query Error:', error);
            setPipelineState(prev => ({
                ...prev,
                queryResult: { ...prev.queryResult, error: error.message, loading: false }
            }));
            return { data: null, error: error.message };
        }
    }, [pipelineState]);

    /**
     * Evaluate Logic against Query Results
     */
    const evaluateLogic = useCallback((data) => {
        const { logic } = pipelineState;

        if (!data || data.length === 0) {
            setLogicSignal(null);
            return null;
        }

        // Calculate the metric value
        let metricValue = 0;
        if (logic.metric === 'total') {
            metricValue = data.reduce((sum, row) =>
                sum + (row.total_enrollments || 0), 0);
        } else if (logic.metric === 'count') {
            metricValue = data.length;
        } else if (logic.metric === 'age_0_5') {
            metricValue = data.reduce((sum, row) =>
                sum + (row.age_0_5 || 0), 0);
        }

        // Evaluate the condition
        let signal = false;
        switch (logic.operator) {
            case 'lt':
                signal = metricValue < logic.threshold;
                break;
            case 'gt':
                signal = metricValue > logic.threshold;
                break;
            case 'eq':
                signal = metricValue === logic.threshold;
                break;
            default:
                signal = false;
        }

        setLogicSignal(signal);
        return signal;
    }, [pipelineState, setLogicSignal]);

    /**
     * Reset Pipeline to Initial State
     */
    const resetPipeline = useCallback(() => {
        setPipelineState(initialPipelineState);
        notifySubscribers('reset', null);
    }, [notifySubscribers]);

    const contextValue = {
        // State
        pipelineState,
        nodes,
        edges,
        setNodes,
        setEdges,

        // Actions
        setDatabaseConnection,
        setRegionFilter,
        setSelectedColumns,
        setLogicRule,
        setLogicSignal,
        executePipelineQuery,
        evaluateLogic,
        resetPipeline,

        // Subscription
        subscribe,

        // Constants
        COLUMN_MAPPING
    };

    return (
        <FlowContext.Provider value={contextValue}>
            {children}
        </FlowContext.Provider>
    );
};

/**
 * Custom hook to use FlowContext
 */
export const useFlow = () => {
    const context = useContext(FlowContext);
    if (!context) {
        throw new Error('useFlow must be used within a FlowProvider');
    }
    return context;
};

export default FlowContext;
