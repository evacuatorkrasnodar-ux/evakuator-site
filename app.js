/* HERO PARALLAX */
const heroBg = document.querySelector('.hero-bg');

window.addEventListener('scroll', () => {
  const offset = window.scrollY * 0.25;
  heroBg.style.transform = `translateY(${offset}px) scale(1.05)`;
});

/* Логотип */
document.addEventListener("DOMContentLoaded", () => {
  const logo = document.querySelector('.logo-animated');
  if (logo) {
    setTimeout(() => {
      logo.classList.add('visible');
    }, 400);
  }
});

/* Переключатель темы */
const themeToggle = document.getElementById('themeToggle');

function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'light') {
    document.body.classList.add('theme-light');
    document.body.classList.remove('theme-dark');
  } else if (savedTheme === 'dark') {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-light');
  } else {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    document.body.classList.add(prefersLight ? 'theme-light' : 'theme-dark');
  }
}

document.addEventListener("DOMContentLoaded", applySavedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('theme-light');
    document.body.classList.toggle('theme-light', !isLight);
    document.body.classList.toggle('theme-dark', isLight);
    localStorage.setItem('theme', !isLight ? 'light' : 'dark');
  });
}

/* Геолокация → сервер → Telegram */
const geoBtn = document.getElementById('geoSend');
const geoStatus = document.getElementById('geoStatus');

if (geoBtn) {
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.textContent = "Ваш браузер не поддерживает геолокацию.";
      return;
    }

    geoStatus.textContent = "Определяем ваше местоположение…";

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        geoStatus.textContent = "Отправляем данные…";

        try {
          await fetch('https://твой-домен-или-ip/api/geo', {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body:JSON.stringify({ lat, lon })
          });
          geoStatus.textContent = "Ваше местоположение отправлено оператору.";
        } catch (e) {
          geoStatus.textContent = "Ошибка отправки. Попробуйте ещё раз.";
        }
      },
      () => {
        geoStatus.textContent = "Разрешите доступ к геолокации.";
      },
      { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
    );
  });
}

/* Заявка → сервер → Telegram */
const form = document.getElementById('requestForm');
const requestStatus = document.getElementById('requestStatus');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const name = fd.get('name');
    const phone = fd.get('phone');
    const address = fd.get('address');
    const comment = fd.get('comment') || '—';

    requestStatus.textContent = "Отправляем заявку…";

    try {
      await fetch('https://твой-домен-или-ip/api/request', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ name, phone, address, comment })
      });
      requestStatus.textContent = "Заявка отправлена. Оператор скоро свяжется с вами.";
      form.reset();
    } catch (e) {
      requestStatus.textContent = "Ошибка отправки. Попробуйте ещё раз.";
    }
  });
}

/* PWA INSTALL */
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = "flex";
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    installBtn.style.display = "none";
  });
}

/* SERVICE WORKER */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js?v=8000");
}
