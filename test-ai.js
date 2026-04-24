const { generateText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
require('dotenv').config();

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

async function main() {
  try {
    const result = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: 'Hello, what is your name?',
    });
    console.log('Result:', result.text);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
