export async function createBlowDetector({
  onLevel,
  onBlow,
  onCalibrated,

  // Автокалибровка
  autoCalibrate = true,
  calibrationMs = 1200,
  thresholdMultiplier = 2.6, // порог = baseline * multiplier
  minThreshold = 0.06,       // нижний предел (иначе будет слишком чувствительно)

  // Детект "дутья"
  holdMs = 650,
  minStartMs = 350,
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia недоступен в этом браузере");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);

  let running = true;
  let aboveStart = null;
  const t0 = performance.now();

  // threshold будет вычислен/назначен
  let threshold = minThreshold;

  function rmsLevel() {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const x = buffer[i];
      sum += x * x;
    }
    return Math.sqrt(sum / buffer.length);
  }

  // ===== калибровка =====
  async function calibrate() {
    if (!autoCalibrate) {
      threshold = minThreshold;
      onCalibrated?.({ baseline: null, threshold });
      return;
    }

    const start = performance.now();
    let acc = 0;
    let n = 0;

    while (performance.now() - start < calibrationMs) {
      const lvl = rmsLevel();
      acc += lvl;
      n += 1;
      onLevel?.(lvl); // чтобы индикатор жил уже во время калибровки
      await new Promise((r) => requestAnimationFrame(r));
    }

    const baseline = n > 0 ? acc / n : 0;
    threshold = Math.max(minThreshold, baseline * thresholdMultiplier);

    onCalibrated?.({ baseline, threshold });
  }

  await calibrate();

  function loop() {
    if (!running) return;

    const now = performance.now();
    const level = rmsLevel();
    onLevel?.(level);

    const elapsed = now - t0;

    if (elapsed > minStartMs) {
      if (level >= threshold) {
        if (aboveStart === null) aboveStart = now;
        if (now - aboveStart >= holdMs) {
          onBlow?.();
          stop();
          return;
        }
      } else {
        aboveStart = null;
      }
    }

    requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    try { stream.getTracks().forEach((t) => t.stop()); } catch {}
    try { audioCtx.close(); } catch {}
  }

  loop();

  return { stop };
}
