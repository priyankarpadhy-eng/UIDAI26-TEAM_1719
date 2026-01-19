/**
 * Analysis Store - Persists AI analysis results per node
 * Prevents re-running analysis when navigating between views
 */

const analysisStore = new Map();

export const AnalysisStore = {
    /**
     * Store analysis result for a specific node
     */
    set: (nodeId, result) => {
        analysisStore.set(nodeId, {
            result,
            timestamp: Date.now()
        });
        console.log(`[AnalysisStore] Saved analysis for node ${nodeId}`);
    },

    /**
     * Get stored analysis for a node
     */
    get: (nodeId) => {
        const stored = analysisStore.get(nodeId);
        if (!stored) return null;
        return stored.result;
    },

    /**
     * Check if analysis exists for a node
     */
    has: (nodeId) => analysisStore.has(nodeId),

    /**
     * Clear analysis for a specific node
     */
    clear: (nodeId) => {
        analysisStore.delete(nodeId);
    },

    /**
     * Clear all stored analyses
     */
    clearAll: () => {
        analysisStore.clear();
    },

    /**
     * Get timestamp of when analysis was run
     */
    getTimestamp: (nodeId) => {
        const stored = analysisStore.get(nodeId);
        return stored?.timestamp || null;
    }
};
