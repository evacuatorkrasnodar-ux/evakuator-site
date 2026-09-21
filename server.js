// server.js
// Установка: npm init -y && npm install express cors
// Запуск: node server.js

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Твой токен бота
const BOT_TOKEN = '8802525027:AAFXRMubG0xCxlf4PEPTruDL19UUHDyZURE';

// Твой chat_id (НУЖНО ЗАМЕНИТЬ)
// 1) Напиши боту /start
// 2) Открой: https://api.telegram.org/bot<ТОКЕН>/getUpdates
// 3) Найди "chat":{"id":123456789}
// 4) Подставь сюда:
const CHAT_ID = 123456789; // ЗАМЕНИ НА СВОЙ chat_id

async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML'
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error('Ошибка отправки в Telegram:', e);
  }
}

// Заявка
app.post('/api/request', async (req, res) => {
  const { name, phone, address, comment } = req.body;

  const text =
    `<b>Новая заявка</b>\n` +
    `Имя: ${name}\n` +
    `Телефон: ${phone}\n` +
    `Адрес: ${address}\n` +
    `Комментарий: ${comment || '—'}`;

  await sendToTelegram(text);
  res.json({ ok: true });
});

// Геолокация
app.post('/api/geo', async (req, res) => {
  const { lat, lon } = req.body;

  const text =
    `<b>Новая геолокация клиента</b>\n` +
    `Координаты: ${lat}, ${lon}\n` +
    `Ссылка: https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;

  await sendToTelegram(text);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
