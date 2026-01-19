/**
 * AI Mapper Service
 * Uses Llama 3 (via Groq) to intelligently map CSV headers to database schema
 * Migrated from Google Gemini to Open Source Llama 3 for Hackathon compliance
 */

import Groq from 'groq-sdk';

// Initialize Groq client with browser support
const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

// Database schema that the AI needs to map to
const DB_SCHEMA = {
    required: ['pincode'],
    optional: ['state', 'district', 'age_0_5', 'age_5_18', 'age_18_plus']
};

/**
 * Generic AI Response function using Llama 3 via Groq
 * @param {string} userPrompt - The user's prompt/question
 * @param {string} systemInstruction - System instruction for the AI
 * @returns {Promise<Object|null>} - Parsed JSON response or null on error
 */
export const getAIResponse = async (userPrompt, systemInstruction) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemInstruction + " Return ONLY valid JSON." },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Llama 3 API Error:", error);
        return null;
    }
};

/**
 * Generate AI-powered column mapping configuration
 * @param {string[]} csvHeaders - Headers from the CSV file
 * @param {string} dataType - Type of data (enrollment, biometric, demographic)
 * @returns {Promise<{mappings: Object, pincodeCol: string, confidence: number}>}
 */
export const generateAIMapping = async (csvHeaders, dataType = 'enrollment') => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        console.warn('Groq API key not found. Using fallback fuzzy matching.');
        return fallbackMapping(csvHeaders);
    }

    try {
        const { systemPrompt, userPrompt } = buildMappingPrompts(csvHeaders, dataType);

        const config = await getAIResponse(userPrompt, systemPrompt);

        if (!config || !config.pincodeCol || !config.mappings) {
            throw new Error('AI response missing required fields');
        }

        return {
            ...config,
            confidence: 0.9,
            source: 'ai'
        };

    } catch (error) {
        console.error('AI Mapping Error:', error.message || error);
        console.log('Falling back to fuzzy matching...');
        return fallbackMapping(csvHeaders);
    }
};

/**
 * Build the prompts for the AI
 */
function buildMappingPrompts(csvHeaders, dataType) {
    const systemPrompt = `You are a data mapping expert. Your job is to analyze CSV headers and map them to a predefined database schema. You MUST respond with valid JSON only, no explanations.`;

    const userPrompt = `I need you to map CSV column headers to a database schema.

CSV Headers: ${JSON.stringify(csvHeaders)}

Database Schema (Target Columns):
- pincode (REQUIRED): The PIN code / Postal code. Look for columns like "Pin", "Pincode", "PIN Code", "Postal Code"
- state (optional): State name. Look for "State", "Circle", "Region"
- district (optional): District name. Look for "District", "Division", "City"
- age_0_5 (optional): Count of people aged 0-5 years. IMPORTANT: If there are separate Male/Female columns for this age group, include BOTH so they can be summed.
- age_5_18 (optional): Count of people aged 5-18 years. Same rule - include all gender variants.
- age_18_plus (optional): Count of adults 18+. Include all gender variants.

Data Type: ${dataType} (this helps understand the context)

RULES:
1. If multiple CSV columns should be SUMMED into one DB column (e.g., "Male 0-5" and "Female 0-5" both go into "age_0_5"), put them ALL in an array.
2. For text columns like state/district, just map a single column.
3. If a column doesn't match any DB field, ignore it.
4. The pincode column is REQUIRED - you MUST find it.

Return this JSON format:
{
  "pincodeCol": "exact_header_name_for_pincode",
  "mappings": {
    "state": ["header_for_state"],
    "district": ["header_for_district"],
    "age_0_5": ["male_0_5_header", "female_0_5_header"],
    "age_5_18": ["male_5_18_header", "female_5_18_header"],
    "age_18_plus": ["male_18plus_header", "female_18plus_header"]
  }
}

Only include mappings for columns you actually found a match for. Omit any that don't have matches.`;

    return { systemPrompt, userPrompt };
}

/**
 * Fallback fuzzy matching when AI is not available
 */
function fallbackMapping(csvHeaders) {
    const normalizedHeaders = csvHeaders.map(h => ({
        original: h,
        lower: h.toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    const config = {
        pincodeCol: null,
        mappings: {},
        confidence: 0.6,
        source: 'fuzzy'
    };

    // Find pincode column
    const pincodePatterns = ['pincode', 'pin', 'postalcode', 'zipcode', 'zip'];
    for (const header of normalizedHeaders) {
        if (pincodePatterns.some(p => header.lower.includes(p))) {
            config.pincodeCol = header.original;
            break;
        }
    }

    // Find state
    const statePatterns = ['state', 'circle', 'region'];
    for (const header of normalizedHeaders) {
        if (statePatterns.some(p => header.lower.includes(p))) {
            config.mappings.state = [header.original];
            break;
        }
    }

    // Find district
    const districtPatterns = ['district', 'division', 'city'];
    for (const header of normalizedHeaders) {
        if (districtPatterns.some(p => header.lower.includes(p))) {
            config.mappings.district = [header.original];
            break;
        }
    }

    // Find age groups (collect ALL matching columns for summing)
    const age0_5Patterns = ['05', '0_5', '0to5', 'child', 'infant', 'age05', 'age0_5'];
    const age5_18Patterns = ['518', '5_18', '5to18', 'minor', 'youth', '517', '5_17', '5to17', 'age517', 'age5_17'];
    const age18PlusPatterns = ['18plus', '18_plus', '18above', 'adult', 'above18', '18greater', '18_greater', 'greater18', 'age18'];

    config.mappings.age_0_5 = [];
    config.mappings.age_5_18 = [];
    config.mappings.age_18_plus = [];

    for (const header of normalizedHeaders) {
        // Check 18+ first (to avoid matching '18' in '5_18')
        if (age18PlusPatterns.some(p => header.lower.includes(p))) {
            config.mappings.age_18_plus.push(header.original);
        } else if (age5_18Patterns.some(p => header.lower.includes(p))) {
            config.mappings.age_5_18.push(header.original);
        } else if (age0_5Patterns.some(p => header.lower.includes(p))) {
            config.mappings.age_0_5.push(header.original);
        }
    }

    // Clean up empty arrays
    Object.keys(config.mappings).forEach(key => {
        if (config.mappings[key].length === 0) {
            delete config.mappings[key];
        }
    });

    return config;
}

/**
 * Validate a mapping config
 */
export const validateMappingConfig = (config) => {
    const errors = [];

    if (!config.pincodeCol) {
        errors.push('Pincode column is required');
    }

    if (!config.mappings || Object.keys(config.mappings).length === 0) {
        errors.push('At least one column mapping is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};
