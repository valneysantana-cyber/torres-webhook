const express = require('express');
const bodyParser = require('body-parser');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'torres-webhook-2026';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const PORT = process.env.PORT || 8000;

const HUMAN_NUMBER_PRIMARY = '+55 11 99907-3135';
const HUMAN_NUMBER_SECONDARY = '+55 13 99615-5505';

const MENU_RESPONSE = `Olá! Seja muito bem-vindo(a) à TorresGuest 😊\n\nEstou aqui para te ajudar com tudo da sua hospedagem. Escolha uma opção ou digite o tema direto:\n\n1️⃣ Wi-Fi\n2️⃣ Café da manhã\n3️⃣ Piscina e academia\n4️⃣ Estacionamento\n5️⃣ Snacks no apartamento\n6️⃣ Troca de toalhas\n7️⃣ Restaurante\n8️⃣ Check-in / Check-out\n9️⃣ Transfer aeroporto\n🔟 Falar com atendimento humano\n\nÉ só responder com o número ou escrever o assunto. Sempre que precisar, estou por aqui! 🌴`;

const HUMAN_ESCALATION_RESPONSE = `Para qualquer outra dúvida, nosso concierge humano atende nos WhatsApps ${HUMAN_NUMBER_PRIMARY} e ${HUMAN_NUMBER_SECONDARY}. É só chamar que cuidamos de você 24/7. 😊`;

const WIFI_RESPONSE = `Acesso ao Wi-Fi\nConecte-se à rede do hotel e, ao abrir o portal Captiva, informe Nome + CPF (os mesmos do check-in).\nSe tiver qualquer dificuldade, me chama aqui que eu ajudo. 🌴`;

const BREAKFAST_RESPONSE = `☕ Café da Manhã\nIncluso na sua reserva, servido no restaurante do lobby (em frente à recepção).\n🕒 Todos os dias, das 06h30 às 10h00.\nAproveite para começar o dia muito bem! 🌴`;

const POOL_RESPONSE = `🏊‍♀️ Piscina & Academia\nA infraestrutura do hotel fica disponível todos os dias, das 08h00 às 21h00.\nAproveite a piscina para relaxar e a academia para manter a rotina! 🌴`;

const PARKING_RESPONSE = `🚗 Estacionamento\nO estacionamento é dentro do prédio, com manobrista.\nBasta informar que está hospedado em flat do condomínio.\n✔️ Sem custo adicional para hóspedes. Qualquer dúvida, me avisa! 🌴`;

const SNACKS_RESPONSE = `🍫 Snacks e Conveniência\nDeixamos snacks no apartamento para sua comodidade.\n💳 Pagamento via PIX 62.169.624/0001-94.\n📋 A tabela está na bancada; se preferir, te envio aqui.\nCurta com vontade! 🌴`;

const TOWELS_RESPONSE = `🧺 Troca de Toalhas\nPara estadias acima de dois dias, fazemos a troca a cada 48h.\nSe precisar antes, é só me avisar que agilizo com a governança. 🌴`;

const RESTAURANT_RESPONSE = `🍽️ Restaurante do Hotel\nO restaurante no lobby oferece refeições à la carte ao longo do dia.\nPerfeito para quem quer comer bem sem sair do prédio. Se quiser sugestões, me chama! 🌴`;

const CHECKIN_RESPONSE = `🕐 Check-in & Check-out\nCheck-in: a partir das 14h\nCheck-out: até 12h\nA recepção funciona 24h com equipe de segurança para te receber em qualquer horário. 🌴`;

const SECURITY_RESPONSE = `🔐 Segurança & Recepção\nContamos com recepção 24h, controle de acesso e equipe no local o tempo todo.\nPode chegar tranquilo(a), estamos sempre por perto. 🌴`;

const TRANSFER_RESPONSE = `✈️ Transfer Aeroporto\nOferecemos apoio com transfer sob demanda.\nMe avise seu voo e horário que conecto você direto com nossa concierge no ${HUMAN_NUMBER_PRIMARY} ou ${HUMAN_NUMBER_SECONDARY} para finalizar os detalhes. 🌴`;

const LOCATION_RESPONSE = `📍 Diferenciais TorresGuest\n• Flats dentro de um hotel completo (piscina, academia, restaurante)\n• Localização excelente em Santos/SP\n• Atendimento próximo e humanizado, estilo concierge\nIdeal para lazer ou trabalho. Precisa de algo específico? Só chamar! 🌴`;

const LONG_STAY_RESPONSE = `💰 Estadias longas\nTemos condições especiais para períodos estendidos.\nMe conta quantas noites e datas que converso com a equipe no ${HUMAN_NUMBER_PRIMARY}/${HUMAN_NUMBER_SECONDARY} e já retorno com a proposta. 🌴`;

const CLEANING_RESPONSE = `🧹 Limpeza / Governança\nA limpeza é realizada pela equipe do hotel.\nAvise com 24h de antecedência o melhor horário e eu agendo pra você. 🌴`;

const INTERNET_RESPONSE = `📡 Internet\nO Wi-Fi do hotel é fibra, ideal para trabalho remoto e streaming.\nSe notar qualquer instabilidade, me chama que aciono o time técnico na hora. 🌴`;

const LUGGAGE_RESPONSE = `🧳 Guarda de malas\nPrecisando deixar bagagem antes do check-in ou depois do check-out?\nOrganizo com a recepção conforme disponibilidade. Me informe horários que já deixo alinhado. 🌴`;

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
        const body = message.text?.body || '';
        const from = message.from;
        if (!from) continue;

        const normalized = normalizeText(body);

        if (shouldSendMenu(normalized)) {
          await sendWhatsAppText(from, MENU_RESPONSE);
        } else if (shouldSendWifi(normalized)) {
          await sendWhatsAppText(from, WIFI_RESPONSE);
        } else if (shouldSendBreakfast(normalized)) {
          await sendWhatsAppText(from, BREAKFAST_RESPONSE);
        } else if (shouldSendPool(normalized)) {
          await sendWhatsAppText(from, POOL_RESPONSE);
        } else if (shouldSendParking(normalized)) {
          await sendWhatsAppText(from, PARKING_RESPONSE);
        } else if (shouldSendSnacks(normalized)) {
          await sendWhatsAppText(from, SNACKS_RESPONSE);
        } else if (shouldSendTowels(normalized)) {
          await sendWhatsAppText(from, TOWELS_RESPONSE);
        } else if (shouldSendRestaurant(normalized)) {
          await sendWhatsAppText(from, RESTAURANT_RESPONSE);
        } else if (shouldSendCheckin(normalized)) {
          await sendWhatsAppText(from, CHECKIN_RESPONSE);
        } else if (shouldSendSecurity(normalized)) {
          await sendWhatsAppText(from, SECURITY_RESPONSE);
        } else if (shouldSendTransfer(normalized)) {
          await sendWhatsAppText(from, TRANSFER_RESPONSE);
        } else if (shouldSendLocation(normalized)) {
          await sendWhatsAppText(from, LOCATION_RESPONSE);
        } else if (shouldSendLongStay(normalized)) {
          await sendWhatsAppText(from, LONG_STAY_RESPONSE);
        } else if (shouldSendCleaning(normalized)) {
          await sendWhatsAppText(from, CLEANING_RESPONSE);
        } else if (shouldSendInternet(normalized)) {
          await sendWhatsAppText(from, INTERNET_RESPONSE);
        } else if (shouldSendLuggage(normalized)) {
          await sendWhatsAppText(from, LUGGAGE_RESPONSE);
        } else if (shouldSendHuman(normalized)) {
          await sendWhatsAppText(from, HUMAN_ESCALATION_RESPONSE);
        } else {
          await sendWhatsAppText(from, `${HUMAN_ESCALATION_RESPONSE}\n\nSe quiser voltar ao menu, é só digitar "menu".`);
        }
      }
    }
  }
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^0-9a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNumericSelection(text, ...options) {
  const digits = text.replace(/[^0-9]/g, '');
  return digits && options.includes(digits);
}

function shouldSendMenu(text) {
  return isNumericSelection(text, '0') || /\b(menu|opcao|opcoes|ajuda|inicio|start|comecar)\b/.test(text);
}

function shouldSendWifi(text) {
  return isNumericSelection(text, '1') || /(wi\s*-?\s*fi|wifi|senha do wi fi|internet)/.test(text);
}

function shouldSendBreakfast(text) {
  return isNumericSelection(text, '2') || /(cafe da manha|cafe|breakfast|desjejum)/.test(text);
}

function shouldSendPool(text) {
  return isNumericSelection(text, '3') || /(piscina|academia|gym|ginasi|hidro)/.test(text);
}

function shouldSendParking(text) {
  return isNumericSelection(text, '4') || /(estacionamento|carro|vaga|manobrista|garagem)/.test(text);
}

function shouldSendSnacks(text) {
  return isNumericSelection(text, '5') || /(snack|conveniencia|lanche|guloseima|chocolate)/.test(text);
}

function shouldSendTowels(text) {
  return isNumericSelection(text, '6') || /(toalha|troca de toalha|roupa de banho)/.test(text);
}

function shouldSendRestaurant(text) {
  return isNumericSelection(text, '7') || /(restaurante|comida|almoco|jantar|refeicao)/.test(text);
}

function shouldSendCheckin(text) {
  return isNumericSelection(text, '8') || /(checkin|check-in|checkout|check-out|entrada|saida|saída|horario)/.test(text);
}

function shouldSendTransfer(text) {
  return isNumericSelection(text, '9') || /(transfer|aeroporto|uber|taxi|traslado)/.test(text);
}

function shouldSendHuman(text) {
  return isNumericSelection(text, '10') || /(atendimento|humano|falar com alguem|concierge|suporte)/.test(text);
}

function shouldSendSecurity(text) {
  return /(seguranca|recepcao|portaria|24h|24 horas)/.test(text);
}

function shouldSendLocation(text) {
  return /(localizacao|endereco|onde fica|diferencial|estrutura)/.test(text);
}

function shouldSendLongStay(text) {
  return /(desconto|long stay|longa estadia|mensal|mensalista)/.test(text);
}

function shouldSendCleaning(text) {
  return /(limpeza|governanca|faxina|arrumacao)/.test(text);
}

function shouldSendInternet(text) {
  return /((internet|wifi).*?(boa|sinal|velocidade|trabalh|stream)|sinal de internet|conexao)/.test(text);
}

function shouldSendLuggage(text) {
  return /(mala|bagagem|guardar|luggage|depositar)/.test(text);
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
