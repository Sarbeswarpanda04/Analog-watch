const hourHand = document.getElementById("hour-hand");
const minuteHand = document.getElementById("minute-hand");
const secondHand = document.getElementById("second-hand");
const digitalTime = document.getElementById("digital-time");

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateWatch() {
  const now = new Date();

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDegrees = (hours % 12) * 30 + minutes * 0.5;
  const minuteDegrees = minutes * 6 + seconds * 0.1;
  const secondDegrees = seconds * 6;

  hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`;
  secondHand.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`;

  digitalTime.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

updateWatch();
setInterval(updateWatch, 1000);
