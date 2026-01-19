import { useState, useCallback, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import { supabase } from '../../../supabaseClient';
import { COLUMN_MAPPING } from '../../../context/FlowContext';

/**
 * useFlowEngine - The Pipeline Processor Hook
 * 
 * This hook manages the visual data pipeline by:
 * 1. Traversing the node tree from DatabaseNode
 * 2. Collecting filters from RegionNode
 * 3. Collecting columns from ColumnNode
 * 4. Executing Supabase queries
 * 5. Injecting results into GraphNode/LogicNode
 */

export const useFlowEngine = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [pipelineData, setPipelineData] = useState({
        filters: {},
        columns: [],
        queryResult: null,
        loading: false,
        error: null
    });

    const queryTimeoutRef = useRef(null);

    /**
     * Find all downstream nodes connected to a given node
     */
    const getDownstreamNodes = useCallback((nodeId) => {
        const downstream = [];
        const visited = new Set();

        const traverse = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            edges.forEach(edge => {
                if (edge.source === currentId) {
                    const targetNode = nodes.find(n => n.id === edge.target);
                    if (targetNode) {
                        downstream.push(targetNode);
                        traverse(targetNode.id);
                    }
                }
            });
        };

        traverse(nodeId);
        return downstream;
    }, [nodes, edges]);

    /**
     * Find all upstream nodes connected to a given node
     */
    const getUpstreamNodes = useCallback((nodeId) => {
        const upstream = [];
        const visited = new Set();

        const traverse = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            edges.forEach(edge => {
                if (edge.target === currentId) {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    if (sourceNode) {
                        upstream.push(sourceNode);
                        traverse(sourceNode.id);
                    }
                }
            });
        };

        traverse(nodeId);
        return upstream;
    }, [nodes, edges]);

    /**
     * Collect pipeline configuration by traversing from Database to Action/Graph
     */
    const collectPipelineConfig = useCallback(() => {
        // Find the DatabaseNode (the root)
        const databaseNode = nodes.find(n => n.type === 'databaseSource');
        if (!databaseNode) {
            return { filters: {}, columns: [], hasDatabase: false };
        }

        const config = {
            filters: {},
            columns: [],
            hasDatabase: true
        };

        // Traverse downstream and collect configurations
        const allNodes = getDownstreamNodes(databaseNode.id);

        allNodes.forEach(node => {
            // Collect RegionNode filters
            if (node.type === 'regionFilter' && node.data) {
                if (node.data.state) config.filters.state = node.data.state;
                if (node.data.district) config.filters.district = node.data.district;
                if (node.data.pincode) config.filters.pincode = node.data.pincode;
            }

            // Collect ColumnNode selections
            if (node.type === 'columnSelector' && node.data?.selectedColumns) {
                // Map display names to actual DB columns
                const mappedCols = node.data.selectedColumns.flatMap(
                    displayName => COLUMN_MAPPING[displayName] || []
                );
                config.columns = [...new Set([...config.columns, ...mappedCols])];
            }
        });

        return config;
    }, [nodes, getDownstreamNodes]);

    /**
     * Execute the Pipeline Query
     */
    const executePipelineQuery = useCallback(async (config) => {
        if (!config.hasDatabase) {
            setPipelineData(prev => ({
                ...prev,
                error: 'No database connection',
                loading: false
            }));
            return null;
        }

        setPipelineData(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Build select string
            const baseColumns = ['state', 'district', 'pincode'];
            const selectColumns = config.columns.length > 0
                ? [...baseColumns, ...config.columns].join(', ')
                : '*';

            // Start query
            let query = supabase
                .from('enrollments')
                .select(selectColumns);

            // Apply filters
            if (config.filters.state) {
                query = query.eq('state', config.filters.state);
            }
            if (config.filters.district) {
                query = query.eq('district', config.filters.district);
            }
            if (config.filters.pincode) {
                query = query.eq('pincode', config.filters.pincode);
            }

            // Execute with limit
            const { data, error } = await query.limit(100);

            if (error) throw error;

            const result = {
                data,
                filters: config.filters,
                columns: config.columns,
                timestamp: new Date().toISOString()
            };

            setPipelineData({
                filters: config.filters,
                columns: config.columns,
                queryResult: data,
                loading: false,
                error: null
            });

            // Update downstream nodes with results
            updateDownstreamNodes(result);

            return result;

        } catch (error) {
            console.error('Pipeline Query Error:', error);
            setPipelineData(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }));
            return null;
        }
    }, []);

    /**
     * Update GraphNode and LogicNode with query results
     */
    const updateDownstreamNodes = useCallback((result) => {
        setNodes(nds => nds.map(node => {
            if (node.type === 'graphVisualizer') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        queryResult: result.data,
                        filters: result.filters,
                        loading: false
                    }
                };
            }
            if (node.type === 'logicProcessor') {
                // Evaluate the logic
                const signal = evaluateLogicSignal(result.data, node.data);
                return {
                    ...node,
                    data: {
                        ...node.data,
                        queryResult: result.data,
                        signal,
                        loading: false
                    }
                };
            }
            if (node.type === 'actionOutput') {
                // Get signal from connected LogicNode
                const upstreamLogic = nodes.find(n =>
                    n.type === 'logicProcessor' &&
                    edges.some(e => e.source === n.id && e.target === node.id)
                );
                return {
                    ...node,
                    data: {
                        ...node.data,
                        signal: upstreamLogic?.data?.signal || false
                    }
                };
            }
            return node;
        }));
    }, [nodes, edges, setNodes]);

    /**
     * Evaluate logic signal based on data and rules
     */
    const evaluateLogicSignal = (data, logicConfig) => {
        if (!data || data.length === 0) return null;

        const { metric = 'total', operator = 'lt', threshold = 50 } = logicConfig || {};

        // Calculate metric value
        // NOTE: There is NO total_enrollments column - calculate total from age columns
        let metricValue = 0;
        if (metric === 'total') {
            metricValue = data.reduce((sum, row) =>
                sum + (row.age_0_5 || 0) + (row.age_5_18 || 0) + (row.age_18_plus || 0), 0);
        } else if (metric === 'count') {
            metricValue = data.length;
        } else if (metric === 'age_0_5') {
            metricValue = data.reduce((sum, row) => sum + (row.age_0_5 || 0), 0);
        } else if (metric === 'age_5_18') {
            metricValue = data.reduce((sum, row) => sum + (row.age_5_18 || 0), 0);
        } else if (metric === 'age_18_plus') {
            metricValue = data.reduce((sum, row) => sum + (row.age_18_plus || 0), 0);
        }

        // Evaluate condition
        switch (operator) {
            case 'lt': return metricValue < threshold;
            case 'gt': return metricValue > threshold;
            case 'eq': return metricValue === threshold;
            case 'lte': return metricValue <= threshold;
            case 'gte': return metricValue >= threshold;
            default: return false;
        }
    };

    /**
     * Handle Node Data Update (Called when user interacts with a node)
     */
    const updateNodeData = useCallback((nodeId, newData) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: { ...node.data, ...newData }
                };
            }
            return node;
        }));

        // Debounce query execution
        if (queryTimeoutRef.current) {
            clearTimeout(queryTimeoutRef.current);
        }

        queryTimeoutRef.current = setTimeout(() => {
            const config = collectPipelineConfig();
            if (Object.keys(config.filters).length > 0 || config.columns.length > 0) {
                executePipelineQuery(config);
            }
        }, 500);
    }, [setNodes, collectPipelineConfig, executePipelineQuery]);

    /**
     * Handle Connection Events
     */
    const onConnect = useCallback((params) => {
        // Add animated edge
        setEdges(eds => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 }
        }, eds));

        // Check if connection triggers a query
        setTimeout(() => {
            const config = collectPipelineConfig();
            if (config.hasDatabase && Object.keys(config.filters).length > 0) {
                executePipelineQuery(config);
            }
        }, 100);
    }, [setEdges, collectPipelineConfig, executePipelineQuery]);

    /**
     * Delete Node
     */
    const deleteNode = useCallback((nodeId) => {
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    }, [setNodes, setEdges]);

    /**
     * Add New Node
     */
    const addNode = useCallback((type, position) => {
        const id = `${type}-${Date.now()}`;
        const newNode = {
            id,
            type,
            position: position || { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 },
            data: getDefaultNodeData(type)
        };
        setNodes(nds => [...nds, newNode]);
        return id;
    }, [setNodes]);

    /**
     * Get Default Data for Node Type
     */
    const getDefaultNodeData = (type) => {
        switch (type) {
            case 'databaseSource':
                return { connected: true, tableName: 'enrollments' };
            case 'regionFilter':
                return { state: null, district: null, pincode: null };
            case 'columnSelector':
                return { selectedColumnIds: ['age'], selectedColumns: ['Age Groups (All)'] };
            case 'logicProcessor':
                return { metric: 'total', operator: 'lt', threshold: 50, signal: null };
            case 'actionOutput':
                return { signal: false };
            case 'graphVisualizer':
                return { queryResult: null, loading: false };
            default:
                return {};
        }
    };

    /**
     * Manual Query Trigger
     */
    const triggerPipelineQuery = useCallback(() => {
        const config = collectPipelineConfig();
        return executePipelineQuery(config);
    }, [collectPipelineConfig, executePipelineQuery]);

    /**
     * Clear All Nodes
     */
    const clearAllNodes = useCallback(() => {
        console.log('Clearing all nodes...');
        // Use the functional update pattern to ensure state updates correctly
        setNodes(() => []);
        setEdges(() => []);
        setPipelineData({
            filters: {},
            columns: [],
            queryResult: null,
            loading: false,
            error: null
        });
        console.log('All nodes cleared.');
    }, [setNodes, setEdges]);

    return {
        // State
        nodes,
        edges,
        pipelineData,

        // React Flow handlers
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,

        // Pipeline operations
        updateNodeData,
        deleteNode,
        addNode,
        triggerPipelineQuery,
        collectPipelineConfig,
        clearAllNodes,

        // Utilities
        getDownstreamNodes,
        getUpstreamNodes
    };
};

export default useFlowEngine;
