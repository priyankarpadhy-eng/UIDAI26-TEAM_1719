import { useState, useCallback, useEffect } from 'react';
import { useNodesState, useEdgesState, addEdge, useReactFlow } from 'reactflow';
import { DataStore } from '../../../services/DataStore';

export const useNodeEngine = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    /**
     * Smart Connection Handler - Transfers data between nodes
     */
    const onConnect = useCallback((params) => {
        // Create the edge with animated style
        const newEdge = {
            ...params,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 }
        };
        setEdges((eds) => addEdge(newEdge, eds));

        // Find source and target nodes
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);

        if (!sourceNode || !targetNode) return;

        // === DATABASE -> REGION Connection ===
        if (sourceNode.type === 'database' && targetNode.type === 'region') {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === params.target) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                isConnectedToDb: true,
                                sourceTable: sourceNode.data.selectedTable || 'tbl_enrollments'
                            }
                        };
                    }
                    return node;
                })
            );
        }

        // === API -> TABLE Connection (Transfer fetched data) ===
        // === API / FILE / DATABASE -> TABLE / COLUMN / REGION / MATH / DOWNLOAD / ANALYSIS Connection ===
        if (['api', 'file', 'database'].includes(sourceNode.type) && sourceNode.data.datasetId) {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === params.target) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                datasetId: sourceNode.data.datasetId, // Pass Reference
                                inputDatasetId: sourceNode.data.datasetId, // Alias
                                inputData: null, // Clear Heavy Data
                                connectionType: 'Direct Source'
                            }
                        };
                    }
                    return node;
                })
            );
        }

        // === COLUMN / REGION / MATH / GRAPH -> TABLE / GRAPH / REGION / COLUMN / MATH / DOWNLOAD / ANALYSIS Connection ===
        if (['column', 'region', 'math', 'graph'].includes(sourceNode.type) && ['graph', 'table', 'region', 'column', 'math', 'download', 'analysis'].includes(targetNode.type)) {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === params.target) {
                        // Region/Column/Math define 'processedDatasetId', Graph passes 'datasetId'
                        const sourceDataId = sourceNode.data.processedDatasetId || sourceNode.data.inputDatasetId || sourceNode.data.datasetId;
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                datasetId: sourceDataId,
                                inputDatasetId: sourceDataId,
                                inputData: null, // Clear Memory
                                selectedColumns: sourceNode.data.selectedColumns,
                                connectionType: 'Filtered View (' + sourceNode.type + ')',
                                targetLabel: sourceNode.data.selectedValue || node.data.targetLabel
                            }
                        };
                    }
                    return node;
                })
            );
        }

        // === Any node with selectedValue -> Graph/Table/Analysis ===
        if (sourceNode.data?.selectedValue && ['graph', 'table', 'column', 'analysis'].includes(targetNode.type)) {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === params.target) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                targetLabel: sourceNode.data.selectedValue,
                                regionType: sourceNode.data.selectedRegionType,
                                connectionType: 'Filtered View ' + (sourceNode.type === 'region' ? '(Region)' : '')
                            }
                        };
                    }
                    return node;
                })
            );
        }

        // === Column -> Graph (Pass selected columns) ===
        if (sourceNode.type === 'column' && targetNode.type === 'graph') {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === params.target) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                inputData: sourceNode.data.inputData,
                                selectedColumns: sourceNode.data.selectedColumns
                            }
                        };
                    }
                    return node;
                })
            );
        }

    }, [nodes, setNodes, setEdges]);

    /**
     * Watch for data changes in source nodes and propagate to connected targets
     */
    useEffect(() => {
        edges.forEach((edge) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) return;

            // Propagate API/FILE/DATABASE data changes (Ref ID check)
            if (['api', 'file', 'database'].includes(sourceNode.type) && sourceNode.data.datasetId) {
                // Analysis nodes handle inputs dynamically via edges, so we skip single-source propagation 
                // to prevent infinite loops when multiple sources are connected.
                if (targetNode.type === 'analysis') return;

                if (targetNode.data.datasetId !== sourceNode.data.datasetId) { // Simple String Compare!
                    setNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === edge.target) {
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        datasetId: sourceNode.data.datasetId,
                                        inputDatasetId: sourceNode.data.datasetId,
                                        connectionType: 'Direct Source'
                                    }
                                };
                            }
                            return node;
                        })
                    );
                }
            }

            // Propagate Column/Region Logic changes to Table/Graph/Region/Column
            // Removed 'analysis' from target list to prevent conflict loops
            if (['column', 'region', 'math', 'graph'].includes(sourceNode.type) && ['table', 'graph', 'region', 'column', 'math', 'download'].includes(targetNode.type)) {
                // Check Ref ID
                const sourceDataId = sourceNode.data.processedDatasetId || sourceNode.data.inputDatasetId;

                if (sourceDataId && targetNode.data.datasetId !== sourceDataId) {
                    setNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === edge.target) {
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        datasetId: sourceDataId,
                                        inputDatasetId: sourceDataId,
                                        selectedColumns: sourceNode.data.selectedColumns,
                                        connectionType: 'Filtered View (' + (sourceNode.type === 'region' ? 'Region' : 'Columns') + ')',
                                        targetLabel: sourceNode.data.selectedValue || node.data.targetLabel
                                    }
                                };
                            }
                            return node;
                        })
                    );
                }
            }

            // Propagate Analysis results to Graph/Table nodes
            // Analysis stores its results with key `analysis_${nodeId}`
            if (sourceNode.type === 'analysis' && ['graph', 'table'].includes(targetNode.type)) {
                const analysisDatasetId = `analysis_${sourceNode.id}`;
                const analysisData = DataStore.get(analysisDatasetId);

                if (analysisData && targetNode.data.datasetId !== analysisDatasetId) {
                    // Transform analysis results into chartable format
                    const chartData = [];

                    // Extract consensus scores for charts
                    if (analysisData.consensus?.scores) {
                        chartData.push(
                            { metric: 'Data Quality', value: analysisData.consensus.scores.dataQuality || 0 },
                            { metric: 'Risk Level', value: analysisData.consensus.scores.riskLevel || 0 },
                            { metric: 'Action Priority', value: analysisData.consensus.scores.actionPriority || 0 },
                            { metric: 'Agreement', value: analysisData.consensus.agreement || 0 }
                        );
                    }

                    // Store the chart-ready data
                    const chartDatasetId = DataStore.set(chartData, `analysis_chart_${sourceNode.id}`);

                    setNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === edge.target) {
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        datasetId: chartDatasetId,
                                        inputDatasetId: chartDatasetId,
                                        connectionType: 'Analysis Results',
                                        xKey: 'metric',
                                        yKey: 'value',
                                        chartType: 'bar' // Default to bar chart for analysis data
                                    }
                                };
                            }
                            return node;
                        })
                    );
                }
            }
        });
    }, [nodes, edges, setNodes]);

    /**
     * Clear all nodes and edges
     */
    const clearCanvas = useCallback(() => {
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    /**
     * Add a new node to the canvas
     */
    /**
     * Add a new node to the canvas
     */
    const { getViewport } = useReactFlow();

    const addNode = useCallback((type) => {
        const id = `${type}-${Date.now()}`;

        // Calculate center of current view
        const { x, y, zoom } = getViewport();
        // Assuming a typical viewport size or using window dimensions
        // Ideally should access the wrapper dimension, but window is a safe fallback for "center screen"
        const centerX = -x / zoom + 500 / zoom; // Approximation of center if container isn't full screen
        const centerY = -y / zoom + 300 / zoom;

        // Better: use window dimensions since we don't have container ref
        const viewCenterX = -x / zoom + (window.innerWidth / 2 / zoom) - 100; // -100 to compensate sidebar
        const viewCenterY = -y / zoom + (window.innerHeight / 2 / zoom);

        const offset = Math.random() * 50;

        const newNode = {
            id,
            type,
            position: { x: viewCenterX + offset, y: viewCenterY + offset },
            data: {}
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes, getViewport]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        clearCanvas,
        addNode
    };
};
