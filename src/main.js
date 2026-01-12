import "./style.css";
import videoUrl from "./assets/video.mp4";
import { createBlowDetector } from "./blowDetector.js";
import cakeSvgUrl from "./assets/cake.svg";

const screens = {
  greeting: document.getElementById("screen-greeting"),
  cake: document.getElementById("screen-cake"),
  video: document.getElementById("screen-video"),
  final: document.getElementById("final-screen"),
};

const btnToCake = document.getElementById("btn-to-cake");
const btnMic = document.getElementById("btn-mic");
const btnBlow = document.getElementById("btn-blow"); // fallback
const btnBack = document.getElementById("btn-back");
//const btnRestart = document.getElementById("btn-restart");

btnBack.addEventListener("click", () => {
  disableMic();
  setFlames(true);
  resetCakeEffects();
  showScreen("greeting");
});

//btnRestart.addEventListener("click", () => {
//  disableMic();
//  video.pause();
//  video.currentTime = 0;
//  setFlames(true);
//  resetCakeEffects();
//  showScreen("greeting");
//});

btnToCake.addEventListener("click", () => {
  resetCakeEffects();
  setFlames(true);
  showScreen("cake");
});

const flames = () =>
  Array.from(document.querySelectorAll(".flame"));

const video = document.getElementById("video");
video.src = videoUrl;

const videoCard = document.getElementById("video-card");
const btnPlay = document.getElementById("btn-play");

btnPlay.addEventListener("click", async () => {
  try {
    // показываем стандартные controls после явного действия пользователя
    video.controls = true;

    // попытка включить
    await video.play();

    videoCard.classList.add("playing");
  } catch (e) {
    // если браузер/политики вмешались — оставим как есть
    console.error(e);
  }
});

video.addEventListener("pause", () => {
  // если видео не закончилось (иначе это мешает концовке)
  /*if (video.currentTime > 0 && !video.ended) {
    videoCard.classList.remove("playing");
  }*/
  return;
});

video.addEventListener("ended", () => {
  videoCard.classList.remove("playing");

  // небольшая пауза для "осознания"
  setTimeout(() => {
    showFinalScreen();
  }, 600);
});


const cakeContainer = document.getElementById("cake-container");

async function loadCakeSvg() {
  const res = await fetch(cakeSvgUrl);
  const svgText = await res.text();
  cakeContainer.innerHTML = svgText;
}

await loadCakeSvg();

const cakeWrap = document.getElementById("cake-wrap");


const meterBar = document.getElementById("meter-bar");

let detector = null;
let micEnabled = false;

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function resetCakeEffects() {
  cakeWrap?.classList.remove("blown");
  cakeWrap?.style.setProperty("--blow", "0");
}

function setCakeBlowPower(level01) {
  // 0..1
  const v = Math.max(0, Math.min(1, level01));
  cakeWrap?.style.setProperty("--blow", String(v));
}

function setFlames(on) {
  flames().forEach((f) => f.classList.toggle("off", !on));
}


function setMeter(level) {
  // level обычно маленький: 0.00..0.20
  const pct = Math.max(0, Math.min(100, (level / 0.2) * 100));
  meterBar.style.width = `${pct}%`;
}

function goToVideo() {
  // запускаем анимацию "задули"
  cakeWrap?.classList.add("blown");
  setMeter(0);

  video.controls = false;
  videoCard.classList.remove("playing");

  setTimeout(() => {
    showScreen("video");
  }, 2000); // чуть дольше, чтобы дымок успел сыграть
}

async function enableMic() {
  if (micEnabled) return;

  resetCakeEffects();
  setFlames(true);

  try {
    detector = await createBlowDetector({
    autoCalibrate: true,
    calibrationMs: 300,
    thresholdMultiplier: 2.2,
    minThreshold: 0.05,
    holdMs: 600,

    onCalibrated: ({ baseline, threshold }) => {
      // baseline может быть null, если autoCalibrate=false
      if (baseline !== null) {
        return;
      } else {
        return;
      }
    },

    onLevel: (lvl) => {
      setMeter(lvl);

      // Превращаем уровень в 0..1 для анимации
      // (0.02..0.16 типично, но зависит от девайса)
      const blow01 = Math.max(0, Math.min(1, (lvl - 0.16) / 0.14));
      setCakeBlowPower(blow01);
    },

    onBlow: () => {
      micEnabled = false;
      detector = null;
      goToVideo();
    },
  });

    micEnabled = true;
  } catch (e) {
    micEnabled = false;
    detector = null;
    console.error(e);
  }
}

function disableMic() {
  if (detector) detector.stop();
  detector = null;
  micEnabled = false;
  setMeter(0);
  setCakeBlowPower(0);
}

btnToCake.addEventListener("click", () => {
  showScreen("cake");
});

btnMic.addEventListener("click", async () => {
  await enableMic();
});

//btnBlow.addEventListener("click", () => {
//  disableMic();
//  goToVideo();
//});

btnBack.addEventListener("click", () => {
  disableMic();
  setFlames(true);
  showScreen("greeting");
});

function showFinalScreen() {
  screens.final.classList.add("show");
}

function hideFinalScreen() {
  screens.final.classList.remove("show");
}

//btnRestart.addEventListener("click", () => {
//  disableMic();
//  video.pause();
//  video.currentTime = 0;
//  setFlames(true);
//  showScreen("greeting");
//});

// Старт
setFlames(true);
showScreen("greeting");
