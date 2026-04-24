const { streamText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
require('dotenv').config();

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

async function main() {
  try {
    const result = streamText({
      model: google('gemini-1.5-flash'),
      prompt: 'Hello, what is your name?',
    });
    
    console.log("Starting to iterate stream...");
    for await (const chunk of result.textStream) {
      console.log('Chunk:', chunk);
    }
    console.log("Stream iteration finished.");
  } catch (err) {
    console.error('Error iterating stream:', err);
  }
}

main();
