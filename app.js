/* ---------------------------------------
   HERO PARALLAX (мягкое движение баннера)
---------------------------------------- */

const heroBg = document.querySelector('.hero-bg');

window.addEventListener('scroll', () => {
  const offset = window.scrollY * 0.25;
  heroBg.style.transform = `translateY(${offset}px) scale(1.02)`;
});


/* ---------------------------------------
   ГЕОЛОКАЦИЯ
---------------------------------------- */

const geoBtn = document.getElementById('geoSend');
const geoStatus = document.getElementById('geoStatus');

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    geoStatus.textContent = "Геолокация не поддерживается.";
    return;
  }

  geoStatus.textContent = "Определяем местоположение...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      geoStatus.textContent = "Открываем маршрут...";

      const url = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
      window.location.href = url;
    },
    () => {
      geoStatus.textContent = "Разрешите доступ к геолокации.";
    },
    { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
  );
});


/* ---------------------------------------
   ЗАЯВКА → VK
---------------------------------------- */

const form = document.getElementById('requestForm');
const requestStatus = document.getElementById('requestStatus');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  const name = fd.get('name');
  const phone = fd.get('phone');
  const address = fd.get('address');
  const comment = fd.get('comment') || '—';

  const text =
    `Заявка:%0A` +
    `Имя: ${name}%0A` +
    `Телефон: ${phone}%0A` +
    `Адрес: ${address}%0A` +
    `Комментарий: ${comment}`;

  requestStatus.textContent = "Открываем VK для отправки заявки...";

  window.location.href = `https://vk.ru/evakuator.krasnodar?message=${text}`;
});


/* ---------------------------------------
   PWA УСТАНОВКА ПРИЛОЖЕНИЯ
---------------------------------------- */

let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "flex";
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installBtn.style.display = "none";
});


/* ---------------------------------------
   SERVICE WORKER
---------------------------------------- */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js?v=5000");
}
