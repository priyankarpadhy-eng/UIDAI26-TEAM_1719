import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

export const generateFinalAnswer = async (userQuestion, dbData) => {
    const prompt = `
  User Question: "${userQuestion}"
  
  **FACTUAL DATA FROM DATABASE:** 
  ${JSON.stringify(dbData, null, 2)}
  
  **INSTRUCTIONS:**
  1. Answer the user's question using ONLY the data above.
  2. If the data is empty or null, say "I checked the records, but found no data matching your specific request."
  3. If there is data, summarize it clearly. For example, mention specific pincodes, counts, or stats found.
  4. Keep it professional, helpful, and concise.
  5. Do NOT hallucinate data not present in the provided JSON.
  `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful Database Reporter. You describe data." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.1, // Slight creativity for natural phrasing, but grounded
        });

        return completion.choices[0]?.message?.content || "No response generated.";
    } catch (error) {
        console.error("Reporter Error:", error);
        return "I encountered an error analyzing the data.";
    }
};

export const getStandardAIResponse = async (userQuestion) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful AI Assistant for UIDAI SAMARTH. Answer general questions politely. if asked about data, say you can check the database." },
                { role: "user", content: userQuestion }
            ],
            model: "llama-3.1-8b-instant",
        });

        return completion.choices[0]?.message?.content || "I am listening.";
    } catch (error) {
        return "I am unable to chat right now.";
    }
};
