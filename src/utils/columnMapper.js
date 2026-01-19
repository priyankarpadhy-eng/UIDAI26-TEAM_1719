/**
 * Column Mapping Utility
 * Smart fuzzy matching for schema-agnostic CSV import
 * Supports MANY-TO-ONE mapping (multiple CSV columns → single DB field)
 */
import stringSimilarity from 'string-similarity';

// Required database fields with friendly display names
export const DB_SCHEMA_FIELDS = {
    pincode: {
        dbField: 'pincode',
        displayName: 'PIN Code',
        required: true,
        isNumeric: false,
        allowMultiple: false, // Pincode should be single column
        alternateNames: ['pin', 'pincode', 'postal_code', 'postal code', 'zip', 'zipcode']
    },
    state: {
        dbField: 'state',
        displayName: 'State',
        required: false,
        isNumeric: false,
        allowMultiple: false,
        alternateNames: ['state', 'state_name', 'region', 'circle']
    },
    district: {
        dbField: 'district',
        displayName: 'District',
        required: false,
        isNumeric: false,
        allowMultiple: false,
        alternateNames: ['district', 'district_name', 'division', 'city']
    },
    age_0_5: {
        dbField: 'age_0_5',
        displayName: 'Age Group 0-5 Years',
        required: false,
        isNumeric: true,
        allowMultiple: true, // Can sum Male_0_5 + Female_0_5
        alternateNames: ['age_0_5', 'age0-5', 'age 0-5', '0-5', '0_5', 'children', 'infant', 'age05', '0to5', 'male_0_5', 'female_0_5', 'm_0_5', 'f_0_5']
    },
    age_5_18: {
        dbField: 'age_5_18',
        displayName: 'Age Group 5-18 Years',
        required: false,
        isNumeric: true,
        allowMultiple: true,
        alternateNames: ['age_5_18', 'age5-18', 'age 5-18', '5-18', '5_18', 'minors', 'youth', 'age518', '5to18', 'age517', '5to17', 'male_5_18', 'female_5_18']
    },
    age_18_plus: {
        dbField: 'age_18_plus',
        displayName: 'Age Group 18+ Years',
        required: false,
        isNumeric: true,
        allowMultiple: true,
        alternateNames: ['age_18_plus', 'age18+', 'age 18+', '18+', '18_plus', 'adult', 'adults', 'age18', '18above', '18greater', 'male_18', 'female_18']
    }
};

/**
 * Normalize a header string for better matching
 */
const normalizeString = (str) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
};

/**
 * Predict column mapping using fuzzy string matching
 * Now supports multiple columns per field
 * @returns {Object} - Mapping of dbField -> { selectedHeaders: string[], confidence, autoMatched }
 */
export const predictColumnMapping = (uploadedHeaders, requiredDbFields = DB_SCHEMA_FIELDS) => {
    const mapping = {};
    const usedHeaders = new Set();

    const normalizedHeaders = uploadedHeaders.map(h => ({
        original: h,
        normalized: normalizeString(h)
    }));

    Object.entries(requiredDbFields).forEach(([fieldKey, fieldConfig]) => {
        const matchedHeaders = [];

        // For multi-column fields, find ALL matching headers
        for (const header of normalizedHeaders) {
            if (!fieldConfig.allowMultiple && usedHeaders.has(header.original)) continue;

            let bestScore = 0;

            // Check against alternate names
            for (const altName of fieldConfig.alternateNames) {
                const normalizedAlt = normalizeString(altName);

                // Exact match
                if (header.normalized === normalizedAlt) {
                    bestScore = 1.0;
                    break;
                }

                // Contains match
                if (header.normalized.includes(normalizedAlt) || normalizedAlt.includes(header.normalized)) {
                    bestScore = Math.max(bestScore, 0.8);
                }

                // Fuzzy match
                const similarity = stringSimilarity.compareTwoStrings(header.normalized, normalizedAlt);
                bestScore = Math.max(bestScore, similarity);
            }

            // Also compare with display name
            const displaySimilarity = stringSimilarity.compareTwoStrings(
                header.normalized,
                normalizeString(fieldConfig.displayName)
            );
            bestScore = Math.max(bestScore, displaySimilarity);

            // If good match found
            if (bestScore >= 0.4) {
                matchedHeaders.push({
                    header: header.original,
                    score: bestScore
                });

                if (!fieldConfig.allowMultiple) {
                    usedHeaders.add(header.original);
                    break; // Stop after first match for single-column fields
                }
            }
        }

        // Sort by score and take top matches
        matchedHeaders.sort((a, b) => b.score - a.score);

        // For allowMultiple fields, take all good matches; for single, take best one
        const selectedHeaders = fieldConfig.allowMultiple
            ? matchedHeaders.map(m => m.header)
            : matchedHeaders.slice(0, 1).map(m => m.header);

        const avgConfidence = matchedHeaders.length > 0
            ? matchedHeaders.reduce((sum, m) => sum + m.score, 0) / matchedHeaders.length
            : 0;

        mapping[fieldKey] = {
            selectedHeaders, // Now an array!
            confidence: avgConfidence,
            autoMatched: selectedHeaders.length > 0
        };

        // Mark used headers for single-column fields
        if (!fieldConfig.allowMultiple && selectedHeaders.length > 0) {
            selectedHeaders.forEach(h => usedHeaders.add(h));
        }
    });

    return mapping;
};

/**
 * Normalize data based on user-confirmed column mapping
 * Supports SUMMING multiple columns for numeric fields
 */
export const normalizeDataWithMapping = (rawData, confirmedMapping, schemaFields = DB_SCHEMA_FIELDS) => {
    return rawData.map(row => {
        const normalizedRow = {};

        Object.entries(confirmedMapping).forEach(([dbField, mappingInfo]) => {
            const selectedHeaders = mappingInfo.selectedHeaders || [];
            const fieldConfig = schemaFields[dbField];

            if (selectedHeaders.length === 0) return;

            if (fieldConfig?.isNumeric && selectedHeaders.length > 1) {
                // SUM multiple numeric columns
                let sum = 0;
                selectedHeaders.forEach(header => {
                    if (row.hasOwnProperty(header)) {
                        const val = parseInt(row[header]) || 0;
                        sum += val;
                    }
                });
                normalizedRow[dbField] = sum;
            } else if (selectedHeaders.length === 1) {
                // Single column mapping
                const header = selectedHeaders[0];
                if (row.hasOwnProperty(header)) {
                    let value = row[header];

                    // Parse numeric fields
                    if (fieldConfig?.isNumeric) {
                        value = parseInt(value) || 0;
                    }

                    // Clean string fields
                    if (dbField === 'pincode') {
                        value = String(value).trim();
                    }

                    normalizedRow[dbField] = value;
                }
            } else if (selectedHeaders.length > 1 && !fieldConfig?.isNumeric) {
                // Multiple columns for non-numeric - take first non-empty
                for (const header of selectedHeaders) {
                    if (row.hasOwnProperty(header) && row[header]) {
                        normalizedRow[dbField] = row[header];
                        break;
                    }
                }
            }
        });

        return normalizedRow;
    });
};

/**
 * Validate if required mappings are complete
 */
export const validateMapping = (mapping) => {
    const missingFields = [];

    Object.entries(DB_SCHEMA_FIELDS).forEach(([fieldKey, fieldConfig]) => {
        const fieldMapping = mapping[fieldKey];
        if (fieldConfig.required && (!fieldMapping?.selectedHeaders || fieldMapping.selectedHeaders.length === 0)) {
            missingFields.push(fieldConfig.displayName);
        }
    });

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
};
