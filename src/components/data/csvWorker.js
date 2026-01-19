// Web Worker for processing large CSV datasets
// Handles normalization, mapping, and arithmetic operations off the main thread

self.onmessage = function (e) {
    const { rawData, mappingConfig } = e.data;

    // Optimization 1: Pre-compile the mapping instructions
    // Instead of iterating object keys in the loop, create a fast lookup array
    // Format: [{ dbField: 'age_0_5', csvColumns: ['Male_0_5', 'Female_0_5'], isNumeric: true }, ...]
    const instructions = [];

    // We only care about fields that actually have mapped columns
    for (let dbField in mappingConfig) {
        const config = mappingConfig[dbField];
        if (config.selectedHeaders && config.selectedHeaders.length > 0) {
            instructions.push({
                dbField: dbField,
                csvColumns: config.selectedHeaders,
                // Simple heuristic: if it has multiple columns or looks like a count, treat as numeric sum
                // The main thread usually handles strict schema, but here we assume if mapped, we want values.
                // For safety, we'll try to parse int for everything except specific text fields if needed.
                // But for now, let's just sum.
            });
        }
    }

    const totalRows = rawData.length;
    const CHUNK_SIZE = 50000;
    const result = new Array(totalRows);

    let processedCount = 0;

    function processChunk(startIndex) {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, totalRows);

        // Optimization 2: Use raw for loop for maximum V8 performance
        for (let i = startIndex; i < endIndex; i++) {
            const row = rawData[i];
            const newRow = {};

            // Internal loop for fields
            for (let j = 0; j < instructions.length; j++) {
                const instr = instructions[j];
                const columns = instr.csvColumns;

                // Optimization 3: Handle single vs multiple columns differently
                if (columns.length === 1) {
                    // Direct mapping
                    // Try to keep as number if possible, else string
                    const val = row[columns[0]];
                    // Simple check for numeric-ness (CSV parser might have already done it, but let's be safe)
                    // If it looks like a number, parse it, otherwise keep as is.
                    // Actually, for UIDAI usecase, most mapped fields are metrics.
                    // Let's rely on standard parsing or 0 if NaN for numeric fields logic?
                    // For now, let's just raw copy, and if we need to sum, we handle it below.
                    newRow[instr.dbField] = val;
                } else {
                    // Summation Logic
                    let sum = 0;
                    for (let k = 0; k < columns.length; k++) {
                        const val = row[columns[k]];
                        // Fast parse int
                        // +val is faster than parseInt generally, but treats empty string as 0
                        const num = +val;
                        if (!isNaN(num)) {
                            sum += num;
                        }
                    }
                    newRow[instr.dbField] = sum;
                }
            }

            // Preserve original non-mapped columns? 
            // The requirement implies "simplified, processed array". 
            // Usually we only want the mapped fields + potentially unmapped ones if needed.
            // But strict mapping usually implies we only want target schema.
            // Let's assume we return only the mapped structure to save memory.

            result[i] = newRow;
        }

        processedCount = endIndex;

        // Rate limit progress updates to avoid flooding main thread
        // Only post every chunk

        // STREAMING FEATURE: Send a sample of pincodes for "Live Scanning" effect
        // We pick up to 50 pincodes from this chunk to animate
        const samplePincodes = [];
        for (let k = startIndex; k < Math.min(endIndex, startIndex + 50); k++) {
            if (result[k].pincode) samplePincodes.push(result[k].pincode);
        }

        self.postMessage({
            type: 'progress',
            percent: Math.round((processedCount / totalRows) * 100),
            processedCount: processedCount,
            streamPincodes: samplePincodes // For Leaflet "Flash" animation
        });

        if (processedCount < totalRows) {
            // Schedule next chunk to allow event loop to breathe (though in worker it matters less, 
            // it helps if we want to handle 'terminate' messages)
            setTimeout(() => processChunk(processedCount), 0);
        } else {
            // Done
            self.postMessage({
                type: 'complete',
                data: result
            });
        }
    }

    // Start processing
    processChunk(0);
};
