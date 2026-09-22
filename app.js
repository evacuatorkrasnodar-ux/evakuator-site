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

// === Яндекс Геокодер — авто-адрес ===
async function getFullAddress(lat, lon) {
  const apiKey = "fc0f9182-0eee-4e83-bed3-8e561c88c4d5"; // твой активный ключ
  const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${apiKey}&geocode=${lon},${lat}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const geo = data.response.GeoObjectCollection.featureMember[0].GeoObject;

    const fullAddress = geo.metaDataProperty.GeocoderMetaData.text || "Адрес не найден";

    const components = geo.metaDataProperty.GeocoderMetaData.Address.Components;

    let city = "";
    let district = "";
    let street = "";
    let house = "";

    components.forEach(c => {
      if (c.kind === "locality") city = c.name;
      if (c.kind === "district") district = c.name;
      if (c.kind === "street") street = c.name;
      if (c.kind === "house") house = c.name;
    });

    return {
      city,
      district,
      street,
      house,
      fullAddress
    };

  } catch (err) {
    console.error("Geo API Error:", err);
    return {
      city: "",
      district: "",
      street: "",
      house: "",
      fullAddress: "Адрес не найден"
    };
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

  if (navigator.vibrate) navigator.vibrate(30);

  const status = document.getElementById("requestStatus");
  if (status) {
    status.textContent = "Заявка отправлена!";
    status.classList.add("status-show");
    setTimeout(() => status.classList.remove("status-show"), 3000);
  }

  alert("Заявка отправлена! Мы свяжемся с вами.");
}

// === ОТПРАВКА ГЕОЛОКАЦИИ ===
async function sendLocation() {
  if (!navigator.geolocation) {
    alert("Геолокация не поддерживается на этом устройстве");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const addr = await getFullAddress(lat, lon);

    const yandex = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;

    const message =
`Геолокация клиента:
Город: ${addr.city}
Район: ${addr.district}
Улица: ${addr.street} ${addr.house}
Полный адрес: ${addr.fullAddress}

Широта: ${lat}
Долгота: ${lon}

Открыть в Яндекс.Навигаторе:
${yandex}`;

    sendToVK(message);

    if (navigator.vibrate) navigator.vibrate(30);

    const geoStatus = document.getElementById("geoStatus");
    if (geoStatus) {
      geoStatus.textContent = "Геолокация отправлена!";
      geoStatus.classList.add("status-show");
      setTimeout(() => geoStatus.classList.remove("status-show"), 3000);
    }

    alert("Геолокация отправлена! Открой сообщение в VK.");
  }, err => {
    console.error("Geo Error:", err);
    alert("Не удалось получить геолокацию");
  });
}

// === УСТАНОВКА PWA ===
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "block";
    installBtn.classList.add("popIn");
  }
});

// === ПРИВЯЗКА КНОПОК + ТЕМА ===
document.addEventListener("DOMContentLoaded", () => {

  // Тема
  const themeBtn = document.getElementById("themeToggle");

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {

      themeBtn.classList.add("btn-bounce");
      setTimeout(() => themeBtn.classList.remove("btn-bounce"), 250);

      if (document.body.classList.contains("theme-dark")) {
        document.body.classList.remove("theme-dark");
        document.body.classList.add("theme-light");
        localStorage.setItem("theme", "light");
      } else {
        document.body.classList.remove("theme-light");
        document.body.classList.add("theme-dark");
        localStorage.setItem("theme", "dark");
      }
    });
  }

  // Заявка
  const btnRequest = document.getElementById("btn-request");
  if (btnRequest) {
    btnRequest.addEventListener("click", () => {
      btnRequest.classList.add("btn-bounce");
      setTimeout(() => btnRequest.classList.remove("btn-bounce"), 250);
      sendRequest();
    });
  }

  // Геолокация
  const btnLocation = document.getElementById("btn-location");
  if (btnLocation) {
    btnLocation.addEventListener("click", () => {
      btnLocation.classList.add("btn-bounce");
      setTimeout(() => btnLocation.classList.remove("btn-bounce"), 250);
      sendLocation();
    });
  }

  // Установка PWA
  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {

      installBtn.classList.add("btn-bounce");
      setTimeout(() => installBtn.classList.remove("btn-bounce"), 250);

      if (!deferredPrompt) {
        alert("Установка недоступна. Попробуйте позже.");
        return;
      }

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      deferredPrompt = null;
      installBtn.style.display = "none";
    });
  }

  // Enter в форме
  const form = document.getElementById("requestForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendRequest();
    });
  }
});
