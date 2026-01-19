/* eslint-disable no-restricted-globals */
/**
 * ETL Worker v5 - Supports both CSV and Excel files
 * Aggregates by (pincode, record_date) to avoid duplicate key errors
 * 
 * Since the same (pincode, date) can appear multiple times with different district names,
 * we aggregate (sum) values for duplicate keys.
 * 
 * Message Types:
 * - INPUT: { file: File, config: {...}, batchId: string, dataType: string, isExcel: boolean }
 * - OUTPUT: { type: 'progress', count: number, percent: number, phase: string }
 * - OUTPUT: { type: 'file_ready', blob: Blob, fileName: string, stats: {...} }
 * - OUTPUT: { type: 'done', total: number }
 * - OUTPUT: { type: 'error', message: string }
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const BATCH_SIZE = 50000; // Rows per progress update

/**
 * Parse Excel file and return rows as array of objects (like Papa.parse)
 */
async function parseExcelToRows(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON with headers
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    return rows;
}

self.onmessage = async (e) => {
    const { file, config, batchId, dataType, isExcel } = e.data;

    if (!file || !config || !config.mappings || !config.pincodeCol) {
        self.postMessage({ type: 'error', message: 'Invalid config received by worker.' });
        return;
    }

    // Aggregate by (pincode + record_date) to handle duplicates
    const aggregatedMap = new Map(); // key: "pincode|record_date", value: record
    let rawRowCount = 0;
    let totalRows = 0;

    // Pre-compute mapping keys for speed
    const mappingEntries = Object.entries(config.mappings);
    const pincodeCol = config.pincodeCol;

    try {
        // Handle Excel files differently
        if (isExcel) {
            self.postMessage({
                type: 'progress',
                count: 0,
                percent: 5,
                phase: 'scanning',
                activePincode: null,
                message: 'Reading Excel file...'
            });

            const rows = await parseExcelToRows(file);
            totalRows = rows.length;

            console.log(`📊 Worker: Parsed ${totalRows} rows from Excel file`);

            // Process all rows
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                rawRowCount++;

                // Extract and clean pincode
                const rawPincode = row[pincodeCol];
                const pincode = cleanPincode(rawPincode);
                if (!pincode) continue;

                // Extract date - try common date column names
                let recordDate = null;
                const dateColumns = ['date', 'Date', 'DATE', 'record_date', 'created_at', 'timestamp'];
                for (const dc of dateColumns) {
                    if (row[dc]) {
                        recordDate = parseDate(row[dc]);
                        break;
                    }
                }

                // If no date found, use today
                if (!recordDate) {
                    recordDate = new Date().toISOString().split('T')[0];
                }

                // Create composite key for aggregation
                const compositeKey = `${pincode}|${recordDate}`;

                // Get or create record
                if (!aggregatedMap.has(compositeKey)) {
                    aggregatedMap.set(compositeKey, {
                        pincode: pincode,
                        record_date: recordDate,
                        state: null,
                        district: null,
                        age_0_5: 0,
                        age_5_18: 0,
                        age_18_plus: 0
                    });
                }
                const record = aggregatedMap.get(compositeKey);

                // Apply all mappings from the AI-generated config
                for (let j = 0; j < mappingEntries.length; j++) {
                    const [dbCol, csvCols] = mappingEntries[j];
                    if (!csvCols || csvCols.length === 0) continue;

                    for (let k = 0; k < csvCols.length; k++) {
                        const csvCol = csvCols[k];
                        const rawVal = row[csvCol];
                        if (rawVal === undefined || rawVal === null || rawVal === '') continue;

                        const numVal = +rawVal;
                        if (isNaN(numVal)) {
                            // Text value (state, district) - keep first non-null value
                            const cleanedText = String(rawVal).trim();
                            if (cleanedText && cleanedText !== pincode && !record[dbCol]) {
                                record[dbCol] = cleanedText;
                            }
                        } else {
                            // Numeric value - SUM for aggregation
                            record[dbCol] = (record[dbCol] || 0) + numVal;
                        }
                    }
                }

                // Report progress every BATCH_SIZE rows
                if (rawRowCount % BATCH_SIZE === 0 || rawRowCount === totalRows) {
                    const percent = Math.min(90, Math.round((rawRowCount / totalRows) * 100));
                    self.postMessage({
                        type: 'progress',
                        count: rawRowCount,
                        uniqueRecords: aggregatedMap.size,
                        percent: percent,
                        phase: 'scanning',
                        activePincode: record.pincode
                    });
                }
            }

            // Generate output (same as CSV path)
            finishProcessing(aggregatedMap, rawRowCount, batchId, dataType);
            return;
        }

        // CSV parsing with PapaParse (original code)
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            chunk: (results, parser) => {
                parser.pause();

                // Estimate total rows from file size
                if (totalRows === 0 && file.size && results.data.length > 0) {
                    const bytesPerRow = file.size / (results.data.length || 1);
                    totalRows = Math.ceil(file.size / bytesPerRow);
                }

                // Process each row
                const chunkLen = results.data.length;
                for (let i = 0; i < chunkLen; i++) {
                    const row = results.data[i];
                    rawRowCount++;

                    // Extract and clean pincode
                    const rawPincode = row[pincodeCol];
                    const pincode = cleanPincode(rawPincode);
                    if (!pincode) continue;

                    // Extract date - try common date column names
                    let recordDate = null;
                    const dateColumns = ['date', 'Date', 'DATE', 'record_date', 'created_at', 'timestamp'];
                    for (const dc of dateColumns) {
                        if (row[dc]) {
                            recordDate = parseDate(row[dc]);
                            break;
                        }
                    }

                    // If no date found, use today
                    if (!recordDate) {
                        recordDate = new Date().toISOString().split('T')[0];
                    }

                    // Create composite key for aggregation
                    const compositeKey = `${pincode}|${recordDate}`;

                    // Get or create record
                    if (!aggregatedMap.has(compositeKey)) {
                        aggregatedMap.set(compositeKey, {
                            pincode: pincode,
                            record_date: recordDate,
                            state: null,
                            district: null,
                            age_0_5: 0,
                            age_5_18: 0,
                            age_18_plus: 0
                        });
                    }
                    const record = aggregatedMap.get(compositeKey);

                    // Apply all mappings from the AI-generated config
                    for (let j = 0; j < mappingEntries.length; j++) {
                        const [dbCol, csvCols] = mappingEntries[j];
                        if (!csvCols || csvCols.length === 0) continue;

                        for (let k = 0; k < csvCols.length; k++) {
                            const csvCol = csvCols[k];
                            const rawVal = row[csvCol];
                            if (rawVal === undefined || rawVal === null || rawVal === '') continue;

                            const numVal = +rawVal;
                            if (isNaN(numVal)) {
                                // Text value (state, district) - keep first non-null value
                                const cleanedText = String(rawVal).trim();
                                if (cleanedText && cleanedText !== pincode && !record[dbCol]) {
                                    record[dbCol] = cleanedText;
                                }
                            } else {
                                // Numeric value - SUM for aggregation
                                record[dbCol] = (record[dbCol] || 0) + numVal;
                            }
                        }
                    }
                }

                // Calculate progress
                const percent = totalRows > 0 ? Math.min(90, Math.round((rawRowCount / totalRows) * 100)) : 0;

                // Report Progress
                self.postMessage({
                    type: 'progress',
                    count: rawRowCount,
                    uniqueRecords: aggregatedMap.size,
                    percent: percent,
                    phase: 'scanning',
                    activePincode: aggregatedMap.size > 0 ? Array.from(aggregatedMap.values()).pop().pincode : null
                });

                parser.resume();
            },
            complete: () => {
                const allRecords = Array.from(aggregatedMap.values());

                // Calculate unique pincodes (regardless of date)
                const uniquePincodeSet = new Set(allRecords.map(r => r.pincode));
                const uniquePincodeCount = uniquePincodeSet.size;

                console.log(`🔄 Worker: Parsing complete. ${rawRowCount} rows -> ${allRecords.length} unique (pincode+date) records from ${uniquePincodeCount} unique pincodes`);

                // Phase 2: Generate CSV Blob
                self.postMessage({
                    type: 'progress',
                    count: rawRowCount,
                    uniqueRecords: allRecords.length,
                    uniquePincodes: uniquePincodeCount,
                    percent: 95,
                    phase: 'generating',
                    activePincode: null
                });

                // Create CSV content from aggregated records
                const csvContent = generateCSV(allRecords);
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const fileName = `upload_${batchId}_${dataType}.csv`;

                console.log(`📦 Worker: Generated CSV blob (${(blob.size / 1024 / 1024).toFixed(2)} MB) with ${allRecords.length} unique records`);

                // Send the blob to main thread
                self.postMessage({
                    type: 'file_ready',
                    blob: blob,
                    fileName: fileName,
                    stats: {
                        rawRows: rawRowCount,
                        totalRecords: allRecords.length,
                        uniquePincodes: uniquePincodeCount,
                        fileSizeMB: (blob.size / 1024 / 1024).toFixed(2),
                        dataType: dataType,
                        aggregated: true
                    }
                });

                // Final completion message
                self.postMessage({ type: 'done', total: rawRowCount });
            },
            error: (err) => {
                self.postMessage({ type: 'error', message: err.message || 'CSV Parsing Error' });
            }
        });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message || 'Worker Error' });
    }
};

/**
 * Common finish processing function for both CSV and Excel paths
 * @param {Map} aggregatedMap - Map of aggregated records
 * @param {number} rawRowCount - Total raw rows processed
 * @param {string} batchId - Batch ID for file naming
 * @param {string} dataType - Type of data (enrollment, biometric, demographic)
 */
function finishProcessing(aggregatedMap, rawRowCount, batchId, dataType) {
    const allRecords = Array.from(aggregatedMap.values());

    // Calculate unique pincodes (regardless of date)
    const uniquePincodeSet = new Set(allRecords.map(r => r.pincode));
    const uniquePincodeCount = uniquePincodeSet.size;

    console.log(`🔄 Worker: Processing complete. ${rawRowCount} rows -> ${allRecords.length} unique (pincode+date) records from ${uniquePincodeCount} unique pincodes`);

    // Phase 2: Generate CSV Blob
    self.postMessage({
        type: 'progress',
        count: rawRowCount,
        uniqueRecords: allRecords.length,
        uniquePincodes: uniquePincodeCount,
        percent: 95,
        phase: 'generating',
        activePincode: null
    });

    // Create CSV content from aggregated records
    const csvContent = generateCSV(allRecords);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const fileName = `upload_${batchId}_${dataType}.csv`;

    console.log(`📦 Worker: Generated CSV blob (${(blob.size / 1024 / 1024).toFixed(2)} MB) with ${allRecords.length} unique records`);

    // Send the blob to main thread
    self.postMessage({
        type: 'file_ready',
        blob: blob,
        fileName: fileName,
        stats: {
            rawRows: rawRowCount,
            totalRecords: allRecords.length,
            uniquePincodes: uniquePincodeCount,
            fileSizeMB: (blob.size / 1024 / 1024).toFixed(2),
            dataType: dataType,
            aggregated: true
        }
    });

    // Final completion message
    self.postMessage({ type: 'done', total: rawRowCount });
}

/**
 * Generate CSV string from records
 */
function generateCSV(records) {
    // CSV Header - including record_date
    const header = 'pincode,record_date,state,district,age_0_5,age_5_18,age_18_plus';
    const lines = [header];

    for (const record of records) {
        const line = [
            escapeCSV(record.pincode),
            escapeCSV(record.record_date),
            escapeCSV(record.state || 'Unknown'),
            escapeCSV(record.district || 'Unknown'),
            record.age_0_5 || 0,
            record.age_5_18 || 0,
            record.age_18_plus || 0
        ].join(',');
        lines.push(line);
    }

    return lines.join('\n');
}

/**
 * Parse various date formats to YYYY-MM-DD
 */
function parseDate(dateStr) {
    if (!dateStr) return null;

    const str = String(dateStr).trim();

    // Handle DD-MM-YYYY format
    const dmyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle YYYY-MM-DD format (already correct)
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle MM/DD/YYYY format
    const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try native Date parsing as fallback
    try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (e) {
        // Ignore
    }

    return null;
}

/**
 * Escape a value for CSV
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Clean and validate pincode
 */
function cleanPincode(str) {
    if (!str) return null;
    let cleaned = String(str).replace(/[^a-zA-Z0-9]/g, '').trim();
    if (/^\d+$/.test(cleaned) && cleaned.length < 6) {
        cleaned = cleaned.padStart(6, '0');
    }
    return cleaned || null;
}
