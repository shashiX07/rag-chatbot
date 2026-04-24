import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyBQ3SKOOsr74BWLMCHra4isKLszP88TiMM" });

const models = await ai.models.list();

models.forEach(model => {
  console.log(model.name);
});