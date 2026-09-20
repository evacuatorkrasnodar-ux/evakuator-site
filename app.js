/* HERO PARALLAX */
const heroBg = document.querySelector('.hero-bg');

window.addEventListener('scroll', () => {
  const offset = window.scrollY * 0.25;
  heroBg.style.transform = `translateY(${offset}px) scale(1.05)`;
});

/* ГЕОЛОКАЦИЯ */
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
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        geoStatus.textContent = "Открываем карту…";
        const url = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
        window.location.href = url;
      },
      () => {
        geoStatus.textContent = "Разрешите доступ к геолокации.";
      },
      { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
    );
  });
}

/* ЗАЯВКА → VK */
const form = document.getElementById('requestForm');
const requestStatus = document.getElementById('requestStatus');

if (form) {
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

    requestStatus.textContent = "Открываем VK для отправки заявки…";
    window.location.href = `https://vk.ru/evakuator.krasnodar?message=${text}`;
  });
}

/* iOS Fade-In Delay */
document.addEventListener("DOMContentLoaded", () => {
  const animatedBlocks = document.querySelectorAll('.fade-in');
  animatedBlocks.forEach((el, i) => {
    el.style.animationDelay = `${i * 0.12}s`;
  });

  /* Анимация нижнего меню */
  const bottomMenu = document.querySelector('.bottom-menu');
  if (bottomMenu) {
    setTimeout(() => {
      bottomMenu.classList.add('visible');
    }, 600);
  }

  /* Авто‑тёмная/светлая тема */
  const prefersLight = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: light)').matches;

  if (prefersLight) {
    document.body.classList.add('theme-light');
  }

  /* Анимация логотипа (когда появится) */
  const logo = document.querySelector('.logo-animated');
  if (logo) {
    logo.style.opacity = '0';
    logo.style.transform = 'scale(0.9)';
    setTimeout(() => {
      logo.style.transition = 'all .6s ease';
      logo.style.opacity = '1';
      logo.style.transform = 'scale(1)';
    }, 400);
  }
});

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
  navigator.serviceWorker.register("service-worker.js?v=7000");
}
