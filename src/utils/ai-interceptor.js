import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

export const generateDbQuery = async (userQuestion) => {
    const SYSTEM_PROMPT = `
  You are a Database Query Generator for an Aadhaar Analytics System.
  
  **YOUR GOAL:** Convert the user's question into a strict JSON query for Supabase.
  
  **DATABASE SCHEMA:**
  - Table: 'enrollments'
  - Columns: pincode (string), district (string), state (string), age_0_5 (int), age_18_plus (int), date (date).
  
  **RULES:**
  1. If the question asks for data (stats, trends, counts, comparisons, list of pincodes/states), return a JSON object with 'intent': 'query'.
  2. If the question is general conversation ("Hi", "Thanks") or specific to AI identity, return 'intent': 'chat'.
  3. Do NOT explain. Do NOT chat. Return ONLY JSON.

  **JSON FORMAT:**
  {
    "intent": "query", // or "chat"
    "tables": ["enrollments"], 
    "filters": { "pincode": "751024" }, // e.g. strictly equality filters for now
    "select": "pincode,state,district,age_0_5,age_5_18,age_18_plus", // Columns needed
    "isAggregation": false
  }
  `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userQuestion }
            ],
            model: "llama-3.1-8b-instant", // Using instant for < 0.2s speed
            temperature: 0, // Strict Logic
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch (error) {
        console.error("Interceptor Error:", error);
        return { intent: "chat" }; // Fallback
    }
};
