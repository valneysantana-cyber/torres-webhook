const express = require('express');
const bodyParser = require('body-parser');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'torres-webhook-2026';
const PORT = process.env.PORT || 10000;

const app = express();
app.use(bodyParser.json());

app.get('/whatsapp-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }

  console.log('Verification failed', { mode, token, expected: VERIFY_TOKEN });
  res.sendStatus(403);
});

app.post('/whatsapp-webhook', (req, res) => {
  console.log('Incoming webhook:', JSON.stringify(req.body, null, 2));
  res.status(200).send({ status: 'received' });
});

app.get('/', (_req, res) => {
  res.send('TorresGuest WhatsApp webhook online');
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
