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
      const url = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
      window.location.href = url;
    },
    () => geoStatus.textContent = "Разрешите доступ к геолокации."
  );
});

const form = document.getElementById('requestForm');
const statusBox = document.getElementById('requestStatus');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const text =
    `Заявка:%0AИмя: ${fd.get('name')}%0AТелефон: ${fd.get('phone')}%0AАдрес: ${fd.get('address')}%0AКомментарий: ${fd.get('comment')}`;

  statusBox.textContent = "Открываем VK для отправки заявки...";

  window.location.href = `https://vk.ru/evakuator.krasnodar?message=${text}`;
});

let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "flex";
});

installBtn.addEventListener('click', async () => {
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installBtn.style.display = "none";
});

navigator.serviceWorker.register("service-worker.js");
