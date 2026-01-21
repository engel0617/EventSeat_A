import { GoogleGenAI, Type } from "@google/genai";
import { Guest } from "../types";

export const generateGuestList = async (eventDescription: string, count: number, apiKey?: string): Promise<Partial<Guest>[]> => {
  const key = apiKey || process.env.API_KEY;

  if (!key) {
    throw new Error("API Key is missing. Please enter it in the input box.");
  }

  // Initialize client here with the specific key
  const ai = new GoogleGenAI({ apiKey: key });

  const model = "gemini-3-flash-preview";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Generate a realistic guest list for a ${eventDescription}. Create exactly ${count} guests. 
      Use Traditional Chinese names (zh-TW). 
      Categorize them into groups like '男方親友', '女方親友', '公司同事', 'VIP'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Full name in Traditional Chinese" },
              category: { type: Type.STRING, description: "Group category name" },
              notes: { type: Type.STRING, description: "Short trait or role (e.g. 'Uncle', 'Manager')" }
            },
            required: ["name", "category"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const parsed = JSON.parse(jsonText);
    return parsed as Partial<Guest>[];

  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};

export const suggestSeatingArrangement = async (tables: any[], guests: any[]): Promise<any> => {
     // Placeholder for future expansion: AI could suggest layout logic
     // Currently we focus on guest generation as the primary AI feature.
     return null;
}