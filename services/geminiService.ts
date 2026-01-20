import { GoogleGenAI, Type } from "@google/genai";
import { Guest } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client (will fail gracefully in UI if key is missing, handled by caller)
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateGuestList = async (eventDescription: string, count: number): Promise<Partial<Guest>[]> => {
  if (!API_KEY) {
    throw new Error("API Key is missing");
  }

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