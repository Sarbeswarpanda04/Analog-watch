const hourHand = document.getElementById("hour-hand");
const minuteHand = document.getElementById("minute-hand");
const secondHand = document.getElementById("second-hand");
const digitalTime = document.getElementById("digital-time");
const dateDisplay = document.getElementById("date-display");
const timezoneDisplay = document.getElementById("timezone-display");
const soundToggle = document.getElementById("sound-toggle");
const weatherIcon = document.getElementById("weather-icon");
const weatherTemp = document.getElementById("weather-temp");
const weatherHumidity = document.getElementById("weather-humidity");
const weatherStatus = document.getElementById("weather-status");
const page = document.querySelector(".page");
const modeToggle = document.getElementById("mode-toggle");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric"
});

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const weatherCodeMap = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mostly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Rime fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Drizzle"],
  55: ["🌧️", "Heavy drizzle"],
  61: ["🌦️", "Light rain"],
  63: ["🌧️", "Rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Light snow"],
  73: ["🌨️", "Snow"],
  75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Rain showers"],
  81: ["🌧️", "Strong showers"],
  82: ["⛈️", "Violent showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Storm with hail"],
  99: ["⛈️", "Severe hailstorm"]
};

let isTickSoundOn = false;
let audioContext;
let lastTickSecond = -1;

const STORAGE_KEYS = {
  mode: "watch.mode",
  tickSound: "watch.tickSound"
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function utcOffsetLabel(date) {
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  return `UTC${sign}${pad(hours)}:${pad(minutes)}`;
}

function getStoredBoolean(key, fallbackValue) {
  try {
    const value = window.localStorage.getItem(key);

    if (value === null) {
      return fallbackValue;
    }

    return value === "true";
  } catch {
    return fallbackValue;
  }
}

function setStoredBoolean(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors (private mode or blocked storage).
  }
}

function setMode(isDigital) {
  page.classList.toggle("digital-mode", isDigital);
  modeToggle.setAttribute("aria-pressed", String(isDigital));
  modeToggle.textContent = isDigital ? "Switch to Analog" : "Switch to Digital";
  setStoredBoolean(STORAGE_KEYS.mode, isDigital);
}

function setTickSound(enabled) {
  isTickSoundOn = enabled;
  soundToggle.setAttribute("aria-pressed", String(enabled));
  soundToggle.textContent = enabled ? "Tick Sound: On" : "Tick Sound: Off";
  setStoredBoolean(STORAGE_KEYS.tickSound, enabled);
}

function setupAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTickSound() {
  if (!isTickSoundOn || !audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(1600, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.07, now + 0.003);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.04);
}

function renderWeather(weatherData) {
  const current = weatherData.current;
  const codeInfo = weatherCodeMap[current.weather_code] || ["🌍", "Weather updated"];
  const icon = codeInfo[0];
  const description = codeInfo[1];

  weatherIcon.textContent = icon;
  weatherTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
  weatherHumidity.textContent = `Humidity: ${Math.round(current.relative_humidity_2m)}%`;
  weatherStatus.textContent = description;
}

async function fetchWeather(latitude, longitude) {
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error("Unable to fetch weather data");
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error("No weather data returned");
  }

  renderWeather(data);
}

async function loadWeatherByIpFallback() {
  try {
    const ipResponse = await fetch("https://ipapi.co/json/");

    if (!ipResponse.ok) {
      throw new Error("IP lookup failed");
    }

    const ipData = await ipResponse.json();

    if (typeof ipData.latitude === "number" && typeof ipData.longitude === "number") {
      await fetchWeather(ipData.latitude, ipData.longitude);
      return;
    }

    throw new Error("Coordinates unavailable");
  } catch {
    weatherIcon.textContent = "⚠️";
    weatherTemp.textContent = "--";
    weatherHumidity.textContent = "Humidity: --";
    weatherStatus.textContent = "Weather unavailable";
  }
}

function loadWeather() {
  weatherStatus.textContent = "Getting weather...";

  if (!navigator.geolocation) {
    loadWeatherByIpFallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await fetchWeather(position.coords.latitude, position.coords.longitude);
      } catch {
        await loadWeatherByIpFallback();
      }
    },
    async () => {
      await loadWeatherByIpFallback();
    },
    {
      timeout: 8000,
      maximumAge: 600000
    }
  );
}

function updateClock() {
  const now = new Date();

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  const smoothSeconds = seconds + milliseconds / 1000;
  const smoothMinutes = minutes + smoothSeconds / 60;
  const smoothHours = (hours % 12) + smoothMinutes / 60;

  const hourDegrees = smoothHours * 30;
  const minuteDegrees = smoothMinutes * 6;
  const secondDegrees = smoothSeconds * 6;

  hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`;
  secondHand.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`;

  digitalTime.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  dateDisplay.textContent = dateFormatter.format(now);
  timezoneDisplay.textContent = `Time Zone: ${timeZone} (${utcOffsetLabel(now)})`;

  if (seconds !== lastTickSecond) {
    lastTickSecond = seconds;
    playTickSound();
  }

  requestAnimationFrame(updateClock);
}

setMode(getStoredBoolean(STORAGE_KEYS.mode, false));
setTickSound(getStoredBoolean(STORAGE_KEYS.tickSound, false));
loadWeather();
updateClock();

modeToggle.addEventListener("click", () => {
  const isDigital = !page.classList.contains("digital-mode");
  setMode(isDigital);
});

soundToggle.addEventListener("click", () => {
  const shouldEnable = !isTickSoundOn;

  if (shouldEnable) {
    setupAudioContext();
  }

  setTickSound(shouldEnable);
});

document.addEventListener(
  "pointerdown",
  () => {
    if (isTickSoundOn) {
      setupAudioContext();
    }
  },
  { once: true }
);
