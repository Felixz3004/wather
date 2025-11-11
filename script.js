const status = document.getElementById("status");
const result = document.getElementById("result");
const placeEl = document.getElementById("place");
const tempEl = document.getElementById("temp");
const meta = document.getElementById("meta");
const toggleUnitBtn = document.getElementById("toggleUnit");
const iconEl = document.getElementById("icon");

let map, marker;
let unit = "C";
let lastTempC = null;

function showStatus(msg) {
  status.textContent = msg;
}

function initMap(lat = 13.75, lon = 100.5) {
  if (!map) {
    map = L.map("map").setView([lat, lon], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
  } else {
    map.setView([lat, lon], 8);
  }

  if (marker) marker.remove();
  marker = L.marker([lat, lon]).addTo(map);
}

async function fetchWeatherByCoords(lat, lon, label = "ตำแหน่งนี้") {
  showStatus("กำลังดึงข้อมูล...");
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const cw = data.current_weather;
    if (!cw) throw new Error("ไม่มีข้อมูลสภาพอากาศ");

    lastTempC = cw.temperature;
    placeEl.textContent = `${label} (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    meta.textContent = `🌬️ ลม ${cw.windspeed} m/s | รหัสสภาพ: ${cw.weathercode}`;
    iconEl.innerHTML = getWeatherIcon(cw.weathercode);

    renderTemp();
    result.style.display = "block";
    initMap(lat, lon);
    showStatus("");
  } catch (err) {
    showStatus("เกิดข้อผิดพลาด: " + err.message);
  }
}

function renderTemp() {
  if (lastTempC === null) return;
  if (unit === "C") {
    tempEl.textContent = `${lastTempC.toFixed(1)} °C`;
    toggleUnitBtn.textContent = "เปลี่ยนเป็น °F";
  } else {
    const f = lastTempC * 9 / 5 + 32;
    tempEl.textContent = `${f.toFixed(1)} °F`;
    toggleUnitBtn.textContent = "เปลี่ยนเป็น °C";
  }
}

function getWeatherIcon(code) {
  // weathercode → emoji/ไอคอนอย่างง่าย
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55].includes(code)) return "🌦️";
  if ([61, 63, 65].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([80, 81, 82].includes(code)) return "⛈️";
  return "🌈";
}

toggleUnitBtn.addEventListener("click", () => {
  unit = unit === "C" ? "F" : "C";
  renderTemp();
});

document.getElementById("locBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("เบราว์เซอร์ไม่รองรับ geolocation");
    return;
  }
  showStatus("ขออนุญาตเข้าถึงตำแหน่ง...");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, "ตำแหน่งของคุณ");
    },
    (err) => {
      showStatus("ไม่สามารถรับตำแหน่ง: " + err.message);
    }
  );
});

document.getElementById("searchBtn").addEventListener("click", async () => {
  const q = document.getElementById("cityInput").value.trim();
  if (!q) {
    showStatus("พิมพ์ชื่อเมืองก่อน");
    return;
  }
  showStatus("ค้นหาตำแหน่งของเมือง...");
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=1`;
    const r = await fetch(geoUrl);
    if (!r.ok) throw new Error("geocoding failed");
    const j = await r.json();
    if (!j.results || j.results.length === 0) {
      showStatus("ไม่พบเมืองที่ค้นหา");
      return;
    }
    const top = j.results[0];
    fetchWeatherByCoords(
      top.latitude,
      top.longitude,
      `${top.name}${top.country ? ", " + top.country : ""}`
    );
  } catch (e) {
    showStatus("เกิดข้อผิดพลาด: " + e.message);
  }
});

// เริ่มแผนที่ตอนโหลด
initMap();
