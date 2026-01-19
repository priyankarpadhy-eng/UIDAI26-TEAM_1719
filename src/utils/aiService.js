/**
 * AI Service using Llama 3 (via Groq) to generate Python code.
 * Migrated from OpenAI to Open Source Llama 3 for Hackathon compliance
 */

import Groq from 'groq-sdk';

// Initialize Groq client with browser support
const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

/**
 * Generate Python code for data analysis using Llama 3
 * @param {string} query - The user's analysis query
 * @param {string[]} columns - Available columns in the data
 * @param {string} apiKey - (Optional) API key override (not used, kept for compatibility)
 * @returns {Promise<string>} - Generated Python code
 */
export const generatePythonCode = async (query, columns, apiKey) => {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) throw new Error("Groq API Key is missing.");

    const systemPrompt = `You are an expert Python Data Analyst.
The user has a CSV file named 'data.csv' loaded into a pandas DataFrame.
The columns are: ${columns.join(', ')}.

Your task is to write a Python script to answer the user's question.

Requirements:
1. Read the file: df = pd.read_csv('data.csv')
2. Clean/Process the data as needed (e.g., handle NaNs, group by Pincode).
3. IMPORTANT: The final output MUST be a dictionary called 'result'.
   - Keys: Pincode (string)
   - Values: The calculated metric (number) - e.g., count, sum, average, or intensity.
4. Do NOT print anything. Just define the 'result' variable.
5. Use only 'pandas' and standard libraries.
6. Return ONLY the raw Python code. No markdown formatting, no explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            max_tokens: 2048
        });

        let code = completion.choices[0]?.message?.content || '';

        // Clean markdown code blocks if LLM adds them despite instructions
        code = code.replace(/```python/g, "").replace(/```/g, "").trim();

        return code;

    } catch (error) {
        console.error("Llama 3 Code Gen Error:", error);
        throw error;
    }
};

/**
 * Generic AI response function for any prompt
 * @param {string} userPrompt - The user's prompt
 * @param {string} systemInstruction - System instruction
 * @returns {Promise<string>} - AI response as text
 */
export const getAITextResponse = async (userPrompt, systemInstruction) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            max_tokens: 4096
        });

        return completion.choices[0]?.message?.content || '';
    } catch (error) {
        console.error("Llama 3 API Error:", error);
        return null;
    }
};
