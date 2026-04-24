async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'What is RAG?' }] })
    });
    console.log('STATUS:', res.status);
    const text = await res.text();
    console.log('BODY:', text);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
