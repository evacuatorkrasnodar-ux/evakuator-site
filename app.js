const heroBg = document.querySelector('.hero-bg');
window.addEventListener('scroll', () => {
  const offset = window.scrollY * 0.25;
  heroBg.style.transform = `translateY(${offset}px) scale(1.02)`;
});

const geoBtn = document.getElementById('geoSend');
const heroGeoBtn = document.getElementById('heroGeoBtn');
const geoStatus = document.getElementById('geoStatus');

function requestGeo() {
  if (!navigator.geolocation) {
    geoStatus.textContent = "Геолокация не поддерживается.";
    return;
  }

  geoStatus.textContent = "Определяем ваше местоположение...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      geoStatus.textContent = "Геолокация получена, открываем маршрут...";

      const url = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
      window.location.href = url;
    },
    () => {
      geoStatus.textContent = "Разрешите доступ к геолокации в браузере.";
    },
    { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
  );
}

geoBtn.addEventListener('click', requestGeo);
heroGeoBtn.addEventListener('click', requestGeo);

const requestForm = document.getElementById('requestForm');
const requestStatus = document.getElementById('requestStatus');

requestForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(requestForm);
  const name = formData.get('name');
  const phone = formData.get('phone');
  const address = formData.get('address');
  const comment = formData.get('comment') || '—';

  const text =
    `Заявка эвакуатора:%0A` +
    `Имя: ${name}%0A` +
    `Телефон: ${phone}%0A` +
    `Адрес: ${address}%0A` +
    `Комментарий: ${comment}`;

  requestStatus.textContent = "Открываем WhatsApp для отправки заявки...";
  const waUrl = `https://wa.me/79888717018?text=${text}`;
  window.location.href = waUrl;
});

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
