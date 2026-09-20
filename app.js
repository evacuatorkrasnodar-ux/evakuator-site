/* ------------------------------
   CALL BUTTON
------------------------------ */
function callNow() {
  window.location.href = "tel:+79888717018";
}

/* ------------------------------
   GEOLOCATION + ROUTE
------------------------------ */
const geoBtn = document.getElementById('geoSend');
const geoStatus = document.getElementById('geoStatus');

geoBtn.addEventListener('click', () => {

  geoStatus.classList.add('show');
  geoStatus.textContent = "Определяем ваше местоположение...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      geoStatus.innerHTML = `
        <strong>Геолокация получена.</strong><br>
        Открываем маршрут...
      `;

      // Маршрут в Яндекс.Картах
      const url = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;

      window.location.href = url;
    },

    (err) => {
      geoStatus.textContent = "Разрешите доступ к геолокации.";
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

/* ------------------------------
   PWA INSTALL
------------------------------ */
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

/* ------------------------------
   SERVICE WORKER
------------------------------ */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
