const express = require('express');
const bodyParser = require('body-parser');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'torres-webhook-2026';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const PORT = process.env.PORT || 8000;

const WIFI_RESPONSE = `Acesso ao Wi-Fi
Para utilizar o Wi-Fi do hotel, basta acessar o portal Captiva ao conectar na rede.
Em seguida, informe:
- Nome
- CPF
(Os mesmos dados que foram cadastrados na recepção no momento do check-in.)
Caso tenha qualquer dificuldade, estamos à disposição para ajudar! 😊`;

const PARKING_RESPONSE = `🚗 Estacionamento
O estacionamento é realizado no mesmo prédio com manobrista.
Ao chegar, basta deixar o veículo com o manobrista e informar que se trata de hospedagem em flat do condomínio.
✔️ O serviço não possui custo para hóspedes.
Qualquer dúvida, estamos à disposição! 😊`;

const BREAKFAST_RESPONSE = `☕ Café da Manhã
O café da manhã está incluso na sua reserva e é servido no restaurante do hotel, localizado no lobby, em frente à recepção.
🕒 Horário: diariamente, das 06:30 às 10:00
Aproveite esse momento para começar bem o seu dia! 😊`;

const SNACKS_RESPONSE = `🍫 Snacks e Conveniência
Disponibilizamos snacks no apartamento para maior comodidade durante sua estadia.
💳 O pagamento deve ser realizado diretamente conosco via PIX: 62.169.624/0001-94
📋 A tabela de preços está disponível na bancada do apartamento ou, se preferir, podemos reenviar para você.
Esperamos que curta! 😊`;

const TOWELS_RESPONSE = `🧺 Troca de Toalhas
Para manter o conforto durante sua estadia, em reservas acima de dois dias, realizamos a troca das toalhas a cada dois dias 💙
Essa rotina ajuda a garantir sempre peças limpas e agradáveis para você aproveitar ao máximo sua hospedagem.
Se precisar de algo antes desse período, é só nos avisar! 😊`;

const app = express();
app.use(bodyParser.json());

app.get('/whatsapp-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('Verification failed', { mode, token });
    res.sendStatus(403);
  }
});

app.post('/whatsapp-webhook', async (req, res) => {
  console.log('Incoming webhook:', JSON.stringify(req.body, null, 2));
  res.status(200).send({ status: 'received' });

  try {
    await handleIncoming(req.body);
  } catch (err) {
    console.error('Failed to handle webhook payload', err);
  }
});

app.get('/', (_req, res) => {
  res.send('TorresGuest WhatsApp webhook online');
});

async function handleIncoming(payload) {
  if (!payload?.entry) return;

  for (const entry of payload.entry) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const messages = value.messages || [];
      for (const message of messages) {
        if (message.type !== 'text') continue;
        const text = (message.text?.body || '').toLowerCase();
        const from = message.from;
        if (!from) continue;

        if (shouldSendWifi(text)) {
          await sendWhatsAppText(from, WIFI_RESPONSE);
        } else if (shouldSendParking(text)) {
          await sendWhatsAppText(from, PARKING_RESPONSE);
        } else if (shouldSendBreakfast(text)) {
          await sendWhatsAppText(from, BREAKFAST_RESPONSE);
        } else if (shouldSendSnacks(text)) {
          await sendWhatsAppText(from, SNACKS_RESPONSE);
        } else if (shouldSendTowels(text)) {
          await sendWhatsAppText(from, TOWELS_RESPONSE);
        }
      }
    }
  }
}

function shouldSendWifi(text) {
  return /wi\s*-?\s*fi|internet|wifi/.test(text);
}

function shouldSendParking(text) {
  return /(estacionamento|carro|vaga|estacionar|manobrista)/.test(text);
}

function shouldSendBreakfast(text) {
  return /(café da manhã|cafe da manha|breakfast|desjejum|restaurante|manhã|manha)/.test(text);
}

function shouldSendSnacks(text) {
  return /(snack|conveniência|conveniencia|lanche|guloseima|chocolate)/.test(text);
}

function shouldSendTowels(text) {
  return /(toalha|troca de toalha|roupa de banho)/.test(text);
}

async function sendWhatsAppText(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error('Missing WhatsApp credentials');
    return;
  }

  const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to send WhatsApp message', response.status, errorText);
  } else {
    const data = await response.json();
    console.log('WhatsApp reply sent', JSON.stringify(data));
  }
}

const server = app.listen(PORT, () => {
  console.log(`WhatsApp webhook server listening on port ${PORT}`);
});

server.on('close', () => {
  console.log('Webhook server closed');
});

server.on('error', (err) => {
  console.error('Webhook server error:', err);
});
