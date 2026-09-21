/* ====== ТЕМА ====== */
const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("theme-light");
  });
}

/* ====== УСТАНОВКА PWA ====== */
let deferredPrompt;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = "block";
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    installBtn.style.display = "none";
  });
}

/* ====== ГЕОЛОКАЦИЯ ====== */
const geoBtn = document.getElementById("geoSend");
const geoStatus = document.getElementById("geoStatus");

if (geoBtn) {
  geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showToast("Геолокация не поддерживается");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);

        geoStatus.innerHTML = `Ваши координаты: ${lat}, ${lon}`;
        showToast("Геолокация получена");

        // Здесь можно подключить отправку на сервер
      },
      () => {
        showToast("Не удалось получить геолокацию");
      }
    );
  });
}

/* ====== ФОРМА ЗАЯВКИ ====== */
const requestForm = document.getElementById("requestForm");
const requestStatus = document.getElementById("requestStatus");

if (requestForm) {
  requestForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(requestForm);
    const name = formData.get("name");
    const phone = formData.get("phone");
    const address = formData.get("address");
    const comment = formData.get("comment");

    requestStatus.innerHTML = "Заявка отправлена (демо‑режим)";
    showToast("Заявка отправлена");

    requestForm.reset();

    // Здесь можно подключить отправку на сервер
  });
}

/* ====== МОДАЛ ====== */
function openModal(title, text) {
  const modal = document.getElementById("modal");
  document.getElementById("modalTitle").innerText = title;
  document.getElementById("modalText").innerText = text;
  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
}

/* ====== TOAST ====== */
function showToast(text) {
  const toast = document.getElementById("toast");
  toast.innerText = text;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 2500);
}

/* ====== SERVICE WORKER ====== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
