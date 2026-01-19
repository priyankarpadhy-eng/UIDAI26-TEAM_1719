import { supabase } from '../supabaseClient';

export const executeQuery = async (queryConfig) => {
    if (queryConfig.intent !== 'query' || !queryConfig.tables || queryConfig.tables.length === 0) {
        return null;
    }

    // Default to 'enrollments' if table is missing or invalid, but trust the config mostly
    const table = queryConfig.tables[0];

    // Default select if missing
    const selectCols = queryConfig.select || '*';

    let query = supabase.from(table).select(selectCols);

    // Apply Filters Dynamically
    if (queryConfig.filters) {
        Object.entries(queryConfig.filters).forEach(([key, value]) => {
            // Handle simple equality. Can be expanded for other operators later if needed.
            if (value !== null && value !== undefined && value !== "") {
                query = query.eq(key, value);
            }
        });
    }

    // Add a limit to prevent fetching too much data by default
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
        console.error("DB Executor Error:", error);
        return null;
    }

    return data;
};
