// app.js — Полный, синхронизированный с style.css и index.html
// Включает: PWA install, preloader, theme toggle, геолокацию + геокодер,
// отправку заявок в VK, UI helpers (toast/modal), fade-in observer,
// service worker registration, безопасные утилиты.
// В конце добавлена надёжная защита bottom-menu (portal protector).

// -----------------------------
// === КОНФИГ (проверь свои ключи)
// -----------------------------
const VK_ADMIN_ID = 200004082404;
const VK_TOKEN = "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dZCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";
const YANDEX_API_KEY = "fc0f9182-0eee-4e83-bed3-8e561c88c4d5";

// -----------------------------
// === УТИЛИТЫ
// -----------------------------
function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isSafari() {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) && isIOS();
}

function vibrate(ms = 30) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function sanitize(text = "") {
  return String(text).replace(/[<>]/g, "");
}

// Простая функция с таймаутом для fetch
async function fetchWithTimeout(url, opts = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// -----------------------------
// === UI HELPERS: toast / modal
// -----------------------------
function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) {
    // fallback: temporary inline toast
    const tmp = document.createElement("div");
    tmp.textContent = text;
    tmp.style.position = "fixed";
    tmp.style.left = "50%";
    tmp.style.bottom = "110px";
    tmp.style.transform = "translateX(-50%)";
    tmp.style.background = "rgba(0,0,0,.8)";
    tmp.style.color = "#fff";
    tmp.style.padding = "10px 14px";
    tmp.style.borderRadius = "10px";
    tmp.style.zIndex = 999999;
    document.body.appendChild(tmp);
    setTimeout(() => tmp.remove(), 3000);
    return;
  }

  toast.textContent = text;
  toast.classList.add("toast-show");

  // remove after 3s
  setTimeout(() => {
    toast.classList.remove("toast-show");
  }, 3000);
}

function openModal(title, text) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");

  if (!modal || !modalTitle || !modalText) return;

  modalTitle.textContent = title;
  modalText.textContent = text;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}
window.closeModal = closeModal;

// -----------------------------
// === ОТПРАВКА В VK
// -----------------------------
async function sendToVK(message) {
  const safeMessage = sanitize(message);
  const url =
    `https://api.vk.com/method/messages.send?user_id=${VK_ADMIN_ID}` +
    `&message=${encodeURIComponent(safeMessage)}` +
    `&random_id=${Date.now()}` +
    `&access_token=${encodeURIComponent(VK_TOKEN)}` +
    `&v=5.199`;

  try {
    const response = await fetchWithTimeout(url, { method: "GET" }, 10000);
    const data = await response.json();

    if (data.error) {
      console.error("VK Error:", data.error);
      showToast("Ошибка отправки в VK");
      return { ok: false, error: data.error };
    } else {
      console.log("Отправлено в VK:", data);
      showToast("Сообщение отправлено в VK");
      return { ok: true, data };
    }
  } catch (err) {
    console.error("Fetch Error (VK):", err);
    showToast("Ошибка соединения с VK");
    return { ok: false, error: err };
  }
}

// -----------------------------
// === ЯНДЕКС ГЕОКОДЕР
// -----------------------------
async function getFullAddress(lat, lon) {
  const url =
    `https://geocode-maps.yandex.ru/1.x/?format=json` +
    `&apikey=${encodeURIComponent(YANDEX_API_KEY)}` +
    `&geocode=${lon},${lat}`;

  try {
    const res = await fetchWithTimeout(url, {}, 10000);
    const data = await res.json();

    const member = data?.response?.GeoObjectCollection?.featureMember?.[0];
    if (!member) throw new Error("No geo object");

    const geo = member.GeoObject;
    const meta = geo.metaDataProperty?.GeocoderMetaData;
    const fullAddress = meta?.text || "Адрес не найден";
    const components = meta?.Address?.Components || meta?.Address?.Components || [];

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

    return { city, district, street, house, fullAddress };
  } catch (err) {
    console.error("Geo API Error:", err);
    return { city: "", district: "", street: "", house: "", fullAddress: "Адрес не найден" };
  }
}

// -----------------------------
// === ЗАЯВКА (FORM)
// -----------------------------
let requestLocked = false;

function sendRequest() {
  if (requestLocked) return;
  requestLocked = true;
  setTimeout(() => (requestLocked = false), 2000);

  const name = sanitize(document.getElementById("name")?.value || "");
  const phone = sanitize(document.getElementById("phone")?.value || "");
  const address = sanitize(document.getElementById("address")?.value || "");
  const comment = sanitize(document.getElementById("comment")?.value || "");

  if (!phone.trim()) {
    showToast("Введите телефон");
    return;
  }

  const message =
`Новая заявка:
Имя: ${name}
Телефон: ${phone}
Адрес: ${address}
Комментарий: ${comment}`;

  sendToVK(message).then(res => {
    if (res.ok) {
      vibrate(40);
      const status = document.getElementById("requestStatus");
      if (status) {
        status.textContent = "Заявка отправлена!";
        status.classList.add("status-show");
        setTimeout(() => status.classList.remove("status-show"), 3000);
      }
      showToast("Заявка отправлена! Мы свяжемся с вами.");
      // optionally clear form
      // document.getElementById("requestForm")?.reset();
    }
  });
}

// -----------------------------
// === ГЕОЛОКАЦИЯ
// -----------------------------
async function sendLocation() {
  if (!navigator.geolocation) {
    showToast("Геолокация не поддерживается");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
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

      const res = await sendToVK(message);
      if (res.ok) {
        vibrate(40);
        const geoStatus = document.getElementById("geoStatus");
        if (geoStatus) {
          geoStatus.textContent = "Геолокация отправлена!";
          geoStatus.classList.add("status-show");
          setTimeout(() => geoStatus.classList.remove("status-show"), 3000);
        }
        showToast("Геолокация отправлена! Открой сообщение в VK.");
      }
    },
    err => {
      console.error("Geo Error:", err);
      showToast("Не удалось получить геолокацию");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// -----------------------------
// === PWA / INSTALL HANDLING
// -----------------------------
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");
  const iosInstallBtn = document.getElementById("iosInstall");

  if (installBtn) {
    installBtn.style.display = "block";
    installBtn.classList.add("popIn");
  }

  if (iosInstallBtn && isIOS() && !isInStandaloneMode()) {
    iosInstallBtn.style.display = "block";
  }

  console.log("beforeinstallprompt caught");
});

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// -----------------------------
// === DOM READY: bind UI
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // THEME
  const themeBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  } else if (savedTheme === "dark") {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
  }

  themeBtn?.addEventListener("click", () => {
    themeBtn.classList.add("btn-bounce");
    setTimeout(() => themeBtn.classList.remove("btn-bounce"), 250);

    const dark = document.body.classList.contains("theme-dark");
    if (dark) {
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
      localStorage.setItem("theme", "dark");
    }
  });

  // REQUEST FORM
  const btnRequest = document.getElementById("btn-request");
  const form = document.getElementById("requestForm");

  form?.addEventListener("submit", e => {
    e.preventDefault();
    if (btnRequest) {
      btnRequest.classList.add("btn-bounce");
      setTimeout(() => btnRequest.classList.remove("btn-bounce"), 250);
    }
    sendRequest();
  });

  // GEO LOCATION (main)
  const btnLocation = document.getElementById("btn-location");
  btnLocation?.addEventListener("click", () => {
    btnLocation.classList.add("btn-bounce");
    setTimeout(() => btnLocation.classList.remove("btn-bounce"), 250);
    sendLocation();
  });

  // GEO SEND (alternate)
  const geoSendBtn = document.getElementById("geoSend");
  geoSendBtn?.addEventListener("click", () => {
    geoSendBtn.classList.add("btn-bounce");
    setTimeout(() => geoSendBtn.classList.remove("btn-bounce"), 250);
    sendLocation();
  });

  // INSTALL BUTTON (Android)
  const installBtn = document.getElementById("installBtn");
  installBtn?.addEventListener("click", async () => {
    installBtn.classList.add("btn-bounce");
    setTimeout(() => installBtn.classList.remove("btn-bounce"), 250);

    if (!deferredPrompt) {
      showToast("Установка недоступна. Попробуйте позже.");
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log("User choice:", choice);

    if (choice.outcome === "accepted") {
      showToast("Приложение установлено");
    } else {
      showToast("Установка отменена");
    }

    deferredPrompt = null;
    installBtn.style.display = "none";
  });

  // iOS install hint
  const iosInstallBtn = document.getElementById("iosInstall");
  const iosModal = document.getElementById("iosModal");
  if (iosInstallBtn && iosModal) {
    if (isIOS()) iosInstallBtn.style.display = "block";
    else iosInstallBtn.style.display = "none";

    iosInstallBtn.addEventListener("click", () => {
      iosModal.style.display = "flex";
    });
  }

  if (isIOS() && isSafari()) {
    setTimeout(() => showToast("Чтобы установить: Поделиться → На экран Домой"), 2500);
  }

  // Fade-in observer (IntersectionObserver)
  const fadeElems = document.querySelectorAll(".fade-in");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    fadeElems.forEach(el => observer.observe(el));
  } else {
    fadeElems.forEach(el => el.classList.add("fade-visible"));
  }

  // Smooth internal navigation with page fade-out
  const links = document.querySelectorAll("a[href]");
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("https://") || href.startsWith("http://")) {
      return;
    }
    link.addEventListener("click", e => {
      e.preventDefault();
      document.body.classList.add("page-fade-out");
      setTimeout(() => { window.location.href = href; }, 200);
    });
  });

  // Modal close handlers
  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", closeModal);
  });

  // Toast close (if exists)
  const toast = document.getElementById("toast");
  if (toast) {
    toast.addEventListener("click", () => toast.classList.remove("toast-show"));
  }
});

// -----------------------------
// === PRELOADER HIDE
// -----------------------------
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;
  preloader.classList.add("hidden");
  // ensure it's removed from accessibility flow
  preloader.setAttribute("aria-hidden", "true");
});

// -----------------------------
// === SERVICE WORKER
// -----------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(reg => console.log("SW registered:", reg.scope))
      .catch(err => console.error("SW registration failed:", err));
  });
}

// -----------------------------
// === EXPORTS (if module environment)
// -----------------------------
if (typeof window !== "undefined") {
  window.appHelpers = {
    sendRequest,
    sendLocation,
    sendToVK,
    getFullAddress,
    openModal,
    closeModal,
    showToast
  };
}

// -----------------------------
// === Portal protector for bottom-menu (robust fix)
// -----------------------------
// Creates a fixed portal in <body>, moves the menu there, injects protective CSS,
// observes mutations and periodically enforces critical styles.
// Paste this block at the end of app.js (already included here).
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.bottom-menu');
    if (!menu) {
      console.warn('bottom-menu не найден — портал не создан');
      return;
    }

    // Если уже есть портал — используем его
    let portal = document.getElementById('bottom-menu-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'bottom-menu-portal';
      // Стили портала: фиксированное положение внизу, поверх всего
      Object.assign(portal.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        top: 'auto',
        width: '100%',
        zIndex: String(2147483647),
        pointerEvents: 'none', // по умолчанию, кнопки внутри будут принимать события
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: 'none',
        animation: 'none',
      });
      document.body.appendChild(portal);
    }

    // Переместим меню внутрь портала (не клонируем) — так ссылки и события сохранятся
    if (menu.parentElement !== portal) {
      // Сохраняем inline-стили, если нужны
      menu.style.position = 'fixed';
      menu.style.left = '0';
      menu.style.right = '0';
      menu.style.bottom = '0';
      menu.style.top = 'auto';
      menu.style.width = '100%';
      menu.style.zIndex = String(2147483647);
      menu.style.pointerEvents = 'auto';
      menu.style.transform = 'none';
      menu.style.animation = 'none';
      menu.style.transition = 'none';
      // Переносим
      portal.appendChild(menu);
      console.log('bottom-menu перемещено в портал #bottom-menu-portal');
    }

    // Убедимся, что меню принимает события (портал pointerEvents none, меню — auto)
    portal.style.pointerEvents = 'none';
    menu.style.pointerEvents = 'auto';

    // Добавим защитный CSS прямо в документ (приоритетно)
    const cssId = 'bottom-menu-portal-styles';
    if (!document.getElementById(cssId)) {
      const style = document.createElement('style');
      style.id = cssId;
      style.textContent = `
        #bottom-menu-portal { pointer-events: none; position: fixed; left: 0; right: 0; bottom: 0; top: auto; z-index: 2147483647; transform: none !important; animation: none !important; }
        #bottom-menu-portal .bottom-menu {
          pointer-events: auto !important;
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          top: auto !important;
          width: 100% !important;
          transform: none !important;
          animation: none !important;
          transition: none !important;
          z-index: 2147483647 !important;
        }
        /* защита от родительских transform: делаем меню в отдельном stacking context */
        #bottom-menu-portal { will-change: auto !important; transform: none !important; }
      `;
      document.head.appendChild(style);
    }

    // MutationObserver: если кто-то попытается переместить меню или изменить его стили — вернуть обратно
    const mo = new MutationObserver(mutations => {
      for (const m of mutations) {
        // если меню удалили из портала — вернуть
        if (m.type === 'childList') {
          if (![...portal.children].includes(menu)) {
            portal.appendChild(menu);
            console.warn('Защитник: menu возвращено в портал');
          }
        }
        // если кто-то меняет inline-стили меню — восстановим критичные
        if (m.type === 'attributes' && m.target === menu && (m.attributeName === 'style' || m.attributeName === 'class')) {
          menu.style.position = 'fixed';
          menu.style.left = '0';
          menu.style.right = '0';
          menu.style.bottom = '0';
          menu.style.top = 'auto';
          menu.style.transform = 'none';
          menu.style.animation = 'none';
          menu.style.transition = 'none';
          menu.style.zIndex = String(2147483647);
          menu.style.pointerEvents = 'auto';
          console.warn('Защитник: восстановил стили bottom-menu');
        }
      }
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Дополнительно: периодическая проверка (короткий интервал) — на случай сторонних библиотек
    const interval = setInterval(() => {
      const cs = getComputedStyle(menu);
      if (cs.position !== 'fixed' || cs.transform !== 'none' || cs.animationName !== 'none') {
        menu.style.position = 'fixed';
        menu.style.left = '0';
        menu.style.right = '0';
        menu.style.bottom = '0';
        menu.style.top = 'auto';
        menu.style.transform = 'none';
        menu.style.animation = 'none';
        menu.style.transition = 'none';
        menu.style.zIndex = String(2147483647);
        menu.style.pointerEvents = 'auto';
        console.warn('Защитник (интервал): восстановил критичные свойства bottom-menu');
      }
      // если портал исчез — восстановим
      if (!document.getElementById('bottom-menu-portal')) {
        document.body.appendChild(portal);
        portal.appendChild(menu);
        console.warn('Защитник: восстановил портал и menu');
      }
    }, 700);

    // Остановим интервал через 30 секунд — после инициализации он не нужен, но MutationObserver остаётся
    setTimeout(() => clearInterval(interval), 30000);

    // Лог успешного включения защиты
    console.log('Защитник bottom-menu активирован');
  });
})();
