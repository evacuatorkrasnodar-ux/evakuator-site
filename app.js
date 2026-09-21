/* ---------------------------------------
   HERO PARALLAX (мягкое движение баннера)
---------------------------------------- */

const heroBg = document.querySelector('.hero-bg');

window.addEventListener('scroll', () => {
  const offset = window.scrollY * 0.25;
  heroBg.style.transform = `translateY(${offset}px) scale(1.02)`;
});


/* ---------------------------------------
   АНИМАЦИЯ ЛОГОТИПА
---------------------------------------- */

window.addEventListener('load', () => {
  const logo = document.querySelector('.logo-animated');
  if (logo) logo.classList.add('visible');
});


/* ---------------------------------------
   ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (светлая / тёмная)
---------------------------------------- */

const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('theme-light');
  document.body.classList.toggle('theme-dark');
});


/* ---------------------------------------
   ГЕОЛОКАЦИЯ (клиенту ничего не показываем)
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

      // Клиенту координаты НЕ показываем
      geoStatus.textContent = "Готово. Можете позвонить.";

      // Здесь позже будет отправка в VK
      // sendToVK(lat, lon);
    },
    () => {
      geoStatus.textContent = "Разрешите доступ к геолокации.";
    },
    { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
  );
});


/* ---------------------------------------
   ЗАЯВКА → (пока без VK, как ты просил)
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

  requestStatus.textContent = "Заявка отправлена. Ожидайте звонка.";

  // Позже подключим VK API
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
  navigator.serviceWorker.register("service-worker.js?v=9000");
}
