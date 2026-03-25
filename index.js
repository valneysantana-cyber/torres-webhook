
const express = require('express');
const bodyParser = require('body-parser');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'torres-webhook-2026';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const PORT = process.env.PORT || 8000;

const STAYS_BASE_URL = process.env.STAYS_API_BASE_URL || 'https://valney.stays.net/external/v1';
const STAYS_USERNAME = process.env.STAYS_API_LOGIN || process.env.STAYS_API_USER;
const STAYS_PASSWORD = process.env.STAYS_API_PASSWORD || process.env.STAYS_API_PASS;

const HUMAN_NUMBER_PRIMARY = '+55 11 99907-3135';
const HUMAN_NUMBER_SECONDARY = '+55 13 99615-5505';

const CONFIRMATION_TTL_MS = 10 * 60 * 1000;
const pendingConfirmations = new Map();

const MENU_RESPONSE = `Olá! Seja muito bem-vindo(a) à TorresGuest 😊

Estou aqui para te ajudar com tudo da sua hospedagem. Escolha uma opção ou digite o tema direto:

1️⃣ Wi-Fi
2️⃣ Café da manhã
3️⃣ Piscina e academia
4️⃣ Estacionamento
5️⃣ Snacks no apartamento
6️⃣ Troca de toalhas
7️⃣ Restaurante
8️⃣ Check-in / Check-out
9️⃣ Transfer aeroporto
🔟 Falar com atendimento humano
1️⃣1️⃣ Confirmar minha reserva

É só responder com o número ou escrever o assunto. Sempre que precisar, estou por aqui! 🌴`;

const HUMAN_ESCALATION_RESPONSE = `Para qualquer outra dúvida, nosso concierge humano atende nos WhatsApps ${HUMAN_NUMBER_PRIMARY} e ${HUMAN_NUMBER_SECONDARY}. É só chamar que cuidamos de você 24/7. 😊`;

const CONFIRMATION_PROMPT = `Claro! Me envia o código da sua reserva (ex.: IC09J) ou os dados completos para eu confirmar no sistema.`;

const WIFI_RESPONSE = `Acesso ao Wi-Fi
Conecte-se à rede do hotel e, ao abrir o portal Captiva, informe Nome + CPF (os mesmos do check-in).
Se tiver qualquer dificuldade, me chama aqui que eu ajudo. 🌴`;

const BREAKFAST_RESPONSE = `☕ Café da Manhã
Incluso na sua reserva, servido no restaurante do lobby (em frente à recepção).
🕒 Todos os dias, das 06h30 às 10h00.
Aproveite para começar o dia muito bem! 🌴`;

const POOL_RESPONSE = `🏊‍♀️ Piscina & Academia
A infraestrutura do hotel fica disponível todos os dias, das 08h00 às 21h00.
Aproveite a piscina para relaxar e a academia para manter a rotina! 🌴`;

const PARKING_RESPONSE = `🚗 Estacionamento
O estacionamento é dentro do prédio, com manobrista.
Basta informar que está hospedado em flat do condomínio.
✔️ Sem custo adicional para hóspedes. Qualquer dúvida, me avisa! 🌴`;

const SNACKS_RESPONSE = `🍫 Snacks e Conveniência
Deixamos snacks no apartamento para sua comodidade.
💳 Pagamento via PIX 62.169.624/0001-94.
📋 A tabela está na bancada; se preferir, te envio aqui.
Curta com vontade! 🌴`;

const TOWELS_RESPONSE = `🧺 Troca de Toalhas
Para estadias acima de dois dias, fazemos a troca a cada 48h.
Se precisar antes, é só me avisar que agilizo com a governança. 🌴`;

const RESTAURANT_RESPONSE = `🍽️ Restaurante do Hotel
O restaurante no lobby oferece refeições à la carte ao longo do dia.
Perfeito para quem quer comer bem sem sair do prédio. Se quiser sugestões, me chama! 🌴`;

const CHECKIN_RESPONSE = `🕐 Check-in & Check-out
Check-in: a partir das 14h
Check-out: até 12h
A recepção funciona 24h com equipe de segurança para te receber em qualquer horário. 🌴`;

const SECURITY_RESPONSE = `🔐 Segurança & Recepção
Contamos com recepção 24h, controle de acesso e equipe no local o tempo todo.
Pode chegar tranquilo(a), estamos sempre por perto. 🌴`;

const TRANSFER_RESPONSE = `✈️ Transfer Aeroporto
Oferecemos apoio com transfer sob demanda.
Me avise seu voo e horário que conecto você direto com nossa concierge no ${HUMAN_NUMBER_PRIMARY} ou ${HUMAN_NUMBER_SECONDARY} para finalizar os detalhes. 🌴`;

const LOCATION_RESPONSE = `📍 Diferenciais TorresGuest
• Flats dentro de um hotel completo (piscina, academia, restaurante)
• Localização excelente em Santos/SP
• Atendimento próximo e humanizado, estilo concierge
Ideal para lazer ou trabalho. Precisa de algo específico? Só chamar! 🌴`;

const LONG_STAY_RESPONSE = `💰 Estadias longas
Temos condições especiais para períodos estendidos.
Me conta quantas noites e datas que converso com a equipe no ${HUMAN_NUMBER_PRIMARY}/${HUMAN_NUMBER_SECONDARY} e já retorno com a proposta. 🌴`;

const CLEANING_RESPONSE = `🧹 Limpeza / Governança
A limpeza é realizada pela equipe do hotel.
Avise com 24h de antecedência o melhor horário e eu agendo pra você. 🌴`;

const INTERNET_RESPONSE = `📡 Internet
O Wi-Fi do hotel é fibra, ideal para trabalho remoto e streaming.
Se notar qualquer instabilidade, me chama que aciono o time técnico na hora. 🌴`;

const LUGGAGE_RESPONSE = `🧳 Guarda de malas
Precisando deixar bagagem antes do check-in ou depois do check-out?
Organizo com a recepção conforme disponibilidade. Me informe horários que já deixo alinhado. 🌴`;

const RESERVATION_NOT_FOUND = (code) => `Ainda não localizei a reserva ${code}. Você consegue confirmar se o código está correto ou me enviar o print do canal? Se preferir, nosso atendimento humano resolve rapidinho nos números ${HUMAN_NUMBER_PRIMARY} e ${HUMAN_NUMBER_SECONDARY}.`;

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

        const confirmationHandled = await maybeHandleReservationConfirmation({ rawText: body, normalizedText: normalized, from });
        if (confirmationHandled) {
          continue;
        }

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
          await sendWhatsAppText(from, `${HUMAN_ESCALATION_RESPONSE}

Se quiser voltar ao menu, é só digitar "menu".`);
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
  return isNumericSelection(text, '0') || /(menu|opcao|opcoes|ajuda|inicio|start|comecar)/.test(text);
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
  return isNumericSelection(text, '8') || /(checkin|check-in|checkout|check-out|entrada|saida|saída|horario|horário)/.test(text);
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

function shouldHandleReservationConfirmation(text) {
  return isNumericSelection(text, '11') || /(confirmar|confirmacao|status|codigo).*reserva/.test(text);
}

function cleanupPendingConfirmations() {
  const now = Date.now();
  for (const [key, ts] of pendingConfirmations.entries()) {
    if (now - ts > CONFIRMATION_TTL_MS) {
      pendingConfirmations.delete(key);
    }
  }
}

function rememberPendingConfirmation(phone) {
  pendingConfirmations.set(phone, Date.now());
}

function isAwaitingCode(phone) {
  cleanupPendingConfirmations();
  return pendingConfirmations.has(phone);
}

function extractReservationCode(rawText) {
  if (!rawText) return null;
  const tokens = rawText.toUpperCase().replace(/[^A-Z0-9]/g, ' ').split(' ');
  for (const token of tokens) {
    if (token.length >= 4 && token.length <= 8 && /[A-Z]/.test(token) && /[0-9]/.test(token)) {
      return token;
    }
  }
  return null;
}

async function maybeHandleReservationConfirmation({ rawText, normalizedText, from }) {
  const expectingCode = isAwaitingCode(from);
  const wantsConfirmation = expectingCode || shouldHandleReservationConfirmation(normalizedText);
  if (!wantsConfirmation) {
    return false;
  }

  const code = extractReservationCode(rawText);
  if (!code) {
    rememberPendingConfirmation(from);
    await sendWhatsAppText(from, CONFIRMATION_PROMPT);
    return true;
  }

  const reservation = await fetchReservationByCode(code);
  if (reservation) {
    pendingConfirmations.delete(from);
    await sendWhatsAppText(from, formatReservationMessage(reservation));
  } else {
    rememberPendingConfirmation(from);
    await sendWhatsAppText(from, RESERVATION_NOT_FOUND(code));
  }
  return true;
}

async function fetchReservationByCode(code) {
  if (!STAYS_USERNAME || !STAYS_PASSWORD) {
    console.error('Missing Stays credentials');
    return null;
  }

  const auth = Buffer.from(`${STAYS_USERNAME}:${STAYS_PASSWORD}`).toString('base64');
  const url = `${STAYS_BASE_URL.replace(/\/$/, '')}/booking/reservations/${encodeURIComponent(code)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to fetch reservation', response.status, text);
      return null;
    }

    const data = await response.json();
    const reservation = data?.reservation || data;
    if (reservation && reservation.id) {
      return reservation;
    }
  } catch (err) {
    console.error('Error fetching reservation', err);
  }
  return null;
}

function formatReservationMessage(reservation) {
  const guest = reservation.client?.name || reservation.guest_name || 'hóspede';
  const listing = reservation.listing?.internalName || reservation.listing?.id || '';
  const partner = reservation.partnerName || reservation.partner?.name || 'canal direto';
  const status = formatReservationStatus(reservation.type);
  const checkin = formatDateBRT(reservation.checkInDate || reservation.checkin);
  const checkout = formatDateBRT(reservation.checkOutDate || reservation.checkout);
  const guests = reservation.guestTotalCount || reservation.guests || reservation.persons || 1;
  const nights = reservation.nightCount || reservation.nights || '';

  const parts = [
    `Confirmei aqui: a reserva ${reservation.id} (${partner}) está ${status}.`,
    checkin && checkout ? `Período: ${checkin} até ${checkout}${nights ? ` · ${nights} noite(s)` : ''}.` : '',
    guests ? `${guests} hóspede(s)${listing ? ` · Flat ${listing}` : ''}.` : listing ? `Flat ${listing}.` : '',
    'Qualquer ajuste, me avisa que eu cuido por aqui. 🌴',
  ].filter(Boolean);

  return parts.join('\n');
}

function formatReservationStatus(type) {
  const mapping = {
    booked: 'confirmada ✅',
    reserved: 'pendente de confirmação',
    contract: 'em contrato',
    canceled: 'cancelada ❌',
    maintenance: 'bloqueada para manutenção',
    blocked: 'bloqueada',
  };
  return mapping[type] || 'em andamento';
}

function formatDateBRT(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
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
