const sounds = {};
const playing = {};

export function loadSound(key, src) {
  const audio = new Audio();
  audio.src = src;
  audio.preload = 'auto';
  sounds[key] = audio;
}

export function playSound(key, volume = 1.0) {
  if (!sounds[key]) return;
  if (playing[key]) {
    playing[key].pause();
    playing[key].currentTime = 0;
  }
  const audio = sounds[key].cloneNode();
  audio.volume = volume;
  audio.onended = () => { if (playing[key] === audio) playing[key] = null; };
  playing[key] = audio;
  audio.play().catch(() => {});
}

export function playSoundLoop(key, volume = 1.0) {
  if (!sounds[key]) return;
  if (playing[key]) {
    playing[key].pause();
    playing[key].currentTime = 0;
  }
  const audio = sounds[key].cloneNode();
  audio.volume = volume;
  audio.loop = true;
  playing[key] = audio;
  audio.play().catch(() => {});
}

export function playSoundWithCallback(key, volume, onEnded) {
  if (!sounds[key]) { if (onEnded) onEnded(); return; }
  if (playing[key]) {
    playing[key].pause();
    playing[key].currentTime = 0;
  }
  const audio = sounds[key].cloneNode();
  audio.volume = volume;
  audio.onended = () => { if (playing[key] === audio) playing[key] = null; if (onEnded) onEnded(); };
  playing[key] = audio;
  audio.play().catch(() => { if (onEnded) onEnded(); });
}

export function stopSound(key) {
  if (playing[key]) {
    playing[key].pause();
    playing[key].currentTime = 0;
    playing[key] = null;
  }
}
