const store = new Map();

export const DataStore = {
    /**
     * Store data and return the ID. If ID is provided, use it.
     */
    set: (data, customId = null) => {
        const id = customId || `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        store.set(id, data);
        console.log(`[DataStore] Stored ${Array.isArray(data) ? data.length : 'object'} records. ID: ${id}`);
        return id;
    },

    get: (id) => {
        if (!id) return null;
        return store.get(id);
    },

    has: (id) => store.has(id),

    delete: (id) => store.delete(id),

    clear: () => store.clear(),

    /**
     * Get basic stats without cloning data
     */
    getStats: (id) => {
        const data = store.get(id);
        if (!data || !Array.isArray(data)) return null;
        return {
            count: data.length,
            columns: data.length > 0 ? Object.keys(data[0]) : []
        };
    },

    /**
     * Get all stored dataset IDs (for debugging)
     */
    getAllIds: () => {
        return Array.from(store.keys());
    },

    /**
     * Get summary of all stored data (for debugging)
     */
    getAll: () => {
        const summary = {};
        store.forEach((data, id) => {
            summary[id] = {
                records: Array.isArray(data) ? data.length : 'object',
                sample: Array.isArray(data) && data.length > 0 ? data[0] : data
            };
        });
        return summary;
    }
};
