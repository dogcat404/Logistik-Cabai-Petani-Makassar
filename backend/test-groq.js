require('dotenv').config();
const https = require('https');

const body = JSON.stringify({
  model: 'openai/gpt-oss-120b',
  messages: [
    {
      role: 'user',
      content: 'Balas singkat: Smart Logistics AI aktif.'
    }
  ],
  max_tokens: 50
});

const req = https.request({
  hostname: 'api.groq.com',
  path: '/openai/v1/chat/completions',
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, res => {
  let data = '';

  res.on('data', chunk => data += chunk);

  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);

    const result = JSON.parse(data);

    console.log(
      result.choices?.[0]?.message?.content ||
      result.error?.message ||
      data
    );
  });
});

req.on('error', err => {
  console.log('Koneksi gagal:', err.message);
});

req.end(body);
