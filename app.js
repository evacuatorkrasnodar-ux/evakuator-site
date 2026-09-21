// === НАСТРОЙКИ VK ===
const VK_ADMIN_ID = 200004082404;
const VK_TOKEN = "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dZCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";

// === ОТПРАВКА В VK ЛИЧКУ АДМИНА ===
async function sendToVK(message) {
  const url = `https://api.vk.com/method/messages.send` +
              `?user_id=${VK_ADMIN_ID}` +
              `&message=${encodeURIComponent(message)}` +
              `&random_id=${Date.now()}` +
              `&access_token=${VK_TOKEN}` +
              `&v=5.199`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("VK Error:", data.error);
      alert("Ошибка отправки в VK: " + data.error.error_msg);
    } else {
      console.log("Отправлено в VK:", data);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    alert("Ошибка соединения с VK");
  }
}

// === ОТПРАВКА ЗАЯВКИ ===
function sendRequest() {
  const name = document.getElementById("name")?.value || "";
  const phone = document.getElementById("phone")?.value || "";
  const address = document.getElementById("address")?.value || "";
  const comment = document.getElementById("comment")?.value || "";

  if (!phone.trim()) {
    alert("Введите телефон");
    return;
  }

  const message =
`Новая заявка:
Имя: ${name}
Телефон: ${phone}
Адрес: ${address}
Комментарий: ${comment}`;

  sendToVK(message);
  alert("Заявка отправлена! Мы свяжемся с вами.");
}

// === ОТПРАВКА ГЕОЛОКАЦИИ ===
function sendLocation() {
  if (!navigator.geolocation) {
    alert("Геолокация не поддерживается на этом устройстве");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const yandex = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;

    const message =
`Геолокация клиента:
Широта: ${lat}
Долгота: ${lon}

Открыть в Яндекс.Навигаторе:
${yandex}`;

    sendToVK(message);
    alert("Геолокация отправлена! Открой сообщение в VK.");
  }, err => {
    console.error("Geo Error:", err);
    alert("Не удалось получить геолокацию");
  });
}

// === ПРИВЯЗКА КНОПОК ===
document.addEventListener("DOMContentLoaded", () => {

  const btnRequest = document.getElementById("btn-request");
  if (btnRequest) btnRequest.addEventListener("click", sendRequest);

  const btnLocation = document.getElementById("btn-location");
  if (btnLocation) btnLocation.addEventListener("click", sendLocation);

  const form = document.getElementById("requestForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendRequest();
    });
  }
});
