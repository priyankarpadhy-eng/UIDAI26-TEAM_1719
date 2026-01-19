import Papa from 'papaparse';
import _ from 'lodash';

/**
 * Parses a CSV file client-side using PapaParse.
 * Returns a Promise that resolves with the JSON data.
 */
export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            worker: true,
            complete: (results) => {
                // Normalize Headers
                const normalizeKey = (key) => {
                    const lower = key.toLowerCase().trim();
                    if (['pincode', 'pin code', 'zip', 'zipcode'].includes(lower)) return 'Pincode';
                    if (['state', 'circle'].includes(lower)) return 'State';
                    if (['district', 'division', 'city'].includes(lower)) return 'District';
                    return key; // Return original if no match
                };

                const normalizedData = results.data.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(k => {
                        newRow[normalizeKey(k)] = row[k];
                    });
                    // Fallback for missing keys if needed, or leave as is
                    return newRow;
                });

                resolve({
                    meta: results.meta,
                    data: normalizedData, // Return normalized data
                    fileName: file.name
                });
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};

/**
 * Merges and aggregates data from multiple sources.
 * Main Logic Layer for the Analysis Engine.
 */
export const mergeAndAggregateData = (filesData) => {
    console.log("Starting Analysis on", filesData.length, "files.");

    // Flatten all data rows from all files, keeping the file type context
    const allRows = filesData.flatMap(file =>
        file.data.map(row => ({ ...row, _type: file.type || 'enrollment' })) // Default to enrollment if missing
    );

    // Group by Pincode
    const aggregated = _(allRows)
        .groupBy('Pincode')
        .map((rows, pincode) => {

            const getValue = (r) => parseInt(r.total_enrollments || r.updates || r.Count || 0);

            // Aggregate metrics based on type
            const totalEnrollments = _.sumBy(rows, r => r._type === 'enrollment' ? getValue(r) : 0);
            const biometricUpdates = _.sumBy(rows, r => r._type === 'biometric' ? getValue(r) : 0);
            const demographicUpdates = _.sumBy(rows, r => r._type === 'demographic' ? getValue(r) : 0);
            const rejections = _.sumBy(rows, r => parseInt(r.rejections || 0)); // Keep rejections as generic for now

            const firstProto = rows[0];

            return {
                Pincode: pincode,
                State: firstProto.State || firstProto.Circle || 'Unknown',
                District: firstProto.District || firstProto.Division || 'Unknown',
                metrics: {
                    totalEnrollments,
                    updates: biometricUpdates + demographicUpdates, // Unified updates specific for some views, or keep separate? 
                    // Let's keep specific fields but also a total updates if needed primarily
                    biometricUpdates,
                    demographicUpdates,
                    rejections
                }
            };
        })
        .value();

    console.log("Analysis Complete. Processed rows:", allRows.length, "Unique Pincodes:", aggregated.length);
    return aggregated;
};
