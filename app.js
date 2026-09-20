const heroBg = document.getElementById('heroBg');
window.addEventListener('scroll', () => {
  const offset = window.scrollY * 0.25;
  heroBg.style.transform = `translateY(${offset}px) scale(1.05)`;
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

requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(requestForm);
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    comment: formData.get('comment')
  };

  requestStatus.textContent = "Отправляем заявку...";

  try {
    const res = await fetch('/api/request.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });

    if (res.ok) {
      requestStatus.textContent = "Заявка отправлена. Мы скоро свяжемся с вами.";
      requestForm.reset();
    } else {
      requestStatus.textContent = "Ошибка отправки. Попробуйте ещё раз.";
    }
  } catch {
    requestStatus.textContent = "Ошибка соединения. Попробуйте позже.";
  }
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
