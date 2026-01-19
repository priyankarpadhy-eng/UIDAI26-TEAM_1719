import { useCallback, useEffect } from 'react';
import { useFlow } from '../context/FlowContext';
import { useData } from '../context/DataContext';
import { getOutgoers } from 'reactflow';

/**
 * useNodeEngine (The Processor)
 * 
 * Implements the "Visual Data Pipeline":
 * 1. Traverse from DatabaseNode.
 * 2. RegionNode: Apply filters (.eq).
 * 3. ColumnNode: Select columns (.select).
 * 4. LogicNode: Calculate metric vs threshold -> Signal.
 * 5. ActionNode: React to Signal.
 * 6. GraphNode: Visualize Data.
 */
export const useNodeEngine = () => {
    const { nodes, edges, setNodes } = useFlow();
    const { processedData } = useData();

    const runEngine = useCallback(() => {
        if (!nodes.length || !processedData.length) return;

        // 1. Initialize Map: NodeID -> Data Payload
        const nodeDataMap = new Map();

        // 2. Identify Roots (Database Nodes)
        const dbNodes = nodes.filter(n => n.type === 'database');
        dbNodes.forEach(node => {
            // "Output" of DatabaseNode is the full dataset
            nodeDataMap.set(node.id, processedData);
        });

        // 3. Traversal Queue (BFS)
        const queue = [...dbNodes];
        const visited = new Set();
        const updates = new Map(); // Store updates to avoid immediate re-renders

        while (queue.length > 0) {
            const currentNode = queue.shift();
            visited.add(currentNode.id);

            // Get Input Data
            const inputPayload = nodeDataMap.get(currentNode.id) || [];

            let outputPayload = inputPayload;
            let nodeUpdates = {};

            // --- PROCESSOR LOGIC ---
            switch (currentNode.type) {
                case 'region': {
                    // Filter Logic
                    const { state, district, pincode } = currentNode.data.region || {};
                    if (Array.isArray(inputPayload)) {
                        outputPayload = inputPayload.filter(item => {
                            // Check both lowercase and PascalCase keys just in case
                            const itemState = item.State || item.state;
                            const itemDistrict = item.District || item.district;
                            const itemPincode = String(item.Pincode || item.pincode);

                            if (state && itemState !== state) return false;
                            if (district && itemDistrict !== district) return false;
                            if (pincode && itemPincode !== String(pincode)) return false;
                            return true;
                        });
                    }
                    break;
                }
                case 'column': {
                    // Selector Logic
                    outputPayload = inputPayload;
                    break;
                }
                case 'graph': {
                    // Viz Logic: Transform for Recharts
                    const dataToMap = Array.isArray(inputPayload) ? inputPayload : [];
                    // Limit to top 20 for performance in viz
                    const chartData = dataToMap.slice(0, 20).map(item => ({
                        name: item.Pincode || item.District || 'Unknown',
                        value: item.total_enrollments || 0
                    }));
                    nodeUpdates = { chartData };
                    break;
                }
                case 'logic': {
                    // Evaluation Logic
                    const { metric, operator, threshold } = currentNode.data.config || {};
                    const dataToEval = Array.isArray(inputPayload) ? inputPayload : [];

                    // 1. Calculate Metric (Sum)
                    const totalValue = dataToEval.reduce((acc, item) => {
                        // Metrics mapping
                        if (metric === 'age_0_5') return acc + (item.enrollment_0_5 || 0);
                        if (metric === 'age_18_plus') return acc + (item.enrollment_18_plus || 0);
                        return acc + (item.total_enrollments || 0); // Default 'total'
                    }, 0);

                    // 2. Evaluate Rule
                    let isSignal = false;
                    const limit = Number(threshold || 0);
                    if (operator === 'gt') isSignal = totalValue > limit;
                    if (operator === 'lt') isSignal = totalValue < limit;
                    if (operator === 'eq') isSignal = totalValue === limit;

                    // 3. Emit Signal
                    nodeUpdates = { signal: isSignal, currentValue: totalValue };
                    outputPayload = { signal: isSignal, value: totalValue }; // Downstream gets the signal
                    break;
                }
                case 'action': {
                    // Action Logic
                    // Input is expected to be { signal: boolean }
                    const signal = inputPayload?.signal === true;
                    nodeUpdates = { signal };
                    break;
                }
                default:
                    break;
            }

            // Save updates if any
            if (Object.keys(nodeUpdates).length > 0) {
                updates.set(currentNode.id, nodeUpdates);
            }

            // Propagate to Children
            const outgoers = getOutgoers(currentNode, nodes, edges);
            outgoers.forEach(child => {
                // Pass output to child's input slot
                nodeDataMap.set(child.id, outputPayload);

                if (!visited.has(child.id) && !queue.find(n => n.id === child.id)) {
                    queue.push(child);
                }
            });
        }

        // 4. Batch Commit Updates to React Flow
        // We compare with current state to avoid endless loops
        if (updates.size > 0) {
            setNodes(currentNodes => currentNodes.map(node => {
                if (updates.has(node.id)) {
                    const newProps = updates.get(node.id);
                    // Check strict equality to prevent re-render loop
                    const isDifferent = Object.keys(newProps).some(key =>
                        JSON.stringify(node.data[key]) !== JSON.stringify(newProps[key])
                    );

                    if (isDifferent) {
                        return { ...node, data: { ...node.data, ...newProps } };
                    }
                }
                return node;
            }));
        }

    }, [nodes, edges, processedData, setNodes]);

    // Auto-run when dependencies change
    useEffect(() => {
        const timer = setTimeout(runEngine, 100);
        return () => clearTimeout(timer);
    }, [runEngine]);
};
