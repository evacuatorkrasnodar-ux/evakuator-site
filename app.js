// ====== APP.JS — ПОЛНЫЙ ФАЙЛ ======

// ТЕМА (СВЕТЛАЯ / ТЁМНАЯ)
const themeToggle = document.getElementById('themeToggle');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('theme-dark')) {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    }
  });
}

// TOAST
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.style.opacity = 1;

  setTimeout(() => {
    t.style.opacity = 0;
  }, 2500);
}

// MODAL
function openModal(title, text) {
  const m = document.getElementById('modal');
  const mt = document.getElementById('modalTitle');
  const mx = document.getElementById('modalText');
  if (!m || !mt || !mx) return;

  mt.innerText = title;
  mx.innerText = text;

  m.style.opacity = 1;
  m.style.pointerEvents = "auto";

  const content = document.querySelector('.modal-content');
  if (content) content.style.transform = "scale(1)";
}

function closeModal() {
  const m = document.getElementById('modal');
  if (!m) return;

  m.style.opacity = 0;
  m.style.pointerEvents = "none";

  const content = document.querySelector('.modal-content');
  if (content) content.style.transform = "scale(.9)";
}

// ГЕОЛОКАЦИЯ
const geoBtn = document.getElementById('geoSend');
const geoStatus = document.getElementById('geoStatus');

if (geoBtn && geoStatus) {
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.innerText = "Геолокация не поддерживается.";
      toast("Геолокация не поддерживается.");
      return;
    }

    geoStatus.innerText = "Определяем местоположение...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        geoStatus.innerText = `Ваши координаты: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        toast("Геолокация получена.");
      },
      () => {
        geoStatus.innerText = "Не удалось получить геолокацию.";
        toast("Ошибка геолокации.");
      }
    );
  });
}

// ЗАЯВКА (ФОРМА)
const requestForm = document.getElementById('requestForm');
const requestStatus = document.getElementById('requestStatus');

if (requestForm && requestStatus) {
  requestForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(requestForm);
    const name = formData.get('name');
    const phone = formData.get('phone');
    const address = formData.get('address');
    const comment = formData.get('comment');

    // Здесь можно подключить реальный backend
    console.log("Заявка:", { name, phone, address, comment });

    requestStatus.innerText = "Заявка отправлена. Мы свяжемся с вами.";
    toast("Заявка отправлена.");
    requestForm.reset();
  });
}

// PWA УСТАНОВКА
const installBtn = document.getElementById('installBtn');
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-block';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') {
        toast("Приложение установлено.");
      } else {
        toast("Установка отменена.");
      }
    } else {
      // iPhone / Safari — показываем инструкцию
      openModal(
        "Как установить на iPhone",
        "1. Откройте сайт в Safari.\n2. Нажмите кнопку «Поделиться».\n3. Выберите «На экран Домой».\n4. Подтвердите установку."
      );
    }
  });
}

// PAGE TRANSITION (ПЛАВНЫЕ ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ)
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-loaded");
});

document.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", e => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("tel:")) return;

    e.preventDefault();
    document.body.style.opacity = 0;

    setTimeout(() => {
      window.location.href = href;
    }, 250);
  });
});

// SERVICE WORKER РЕГИСТРАЦИЯ
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('ServiceWorker зарегистрирован:', reg.scope);
      })
      .catch(err => {
        console.log('ServiceWorker ошибка:', err);
      });
  });
}
