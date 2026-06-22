export const musicPlayer = {
  ctx: null,
  currentTrack: null,
  currentBgm: null,
  tracks: [],
  playing: false,
  _bgmPlaying: false,
  _nodes: null,
  _audioElements: {},
  _currentAudio: null,
  _currentBgmAudio: null,

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  unlock(trackName) {
    if (!this.tracks.includes(trackName)) {
      this.tracks.push(trackName);
    }
  },

  loadTrack(trackName, src) {
    const audio = new Audio();
    audio.src = src;
    audio.preload = 'auto';
    this._audioElements[trackName] = audio;
  },

  playBgm(trackName) {
    this.init();
    if (this.currentBgm === trackName && this._bgmPlaying && this._bgmStarted) return;
    this.stopBgm();
    this.currentBgm = trackName;
    this._bgmPlaying = true;
    this._bgmStarted = false;

    if (this._audioElements[trackName]) {
      const audio = this._audioElements[trackName];
      audio.loop = true;
      audio.currentTime = 0;
      audio.play().then(() => {
        this._bgmStarted = true;
      }).catch(() => {
        this._bgmPlaying = false;
      });
      this._currentBgmAudio = audio;
    }
  },

  stopBgm() {
    if (this._currentBgmAudio) {
      this._currentBgmAudio.pause();
      this._currentBgmAudio.currentTime = 0;
      this._currentBgmAudio = null;
    }
    this._bgmPlaying = false;
    this.currentBgm = null;
  },

  playTrack(trackName) {
    this.init();
    this.stop();
    this.currentTrack = trackName;
    this.playing = true;

    if (this._audioElements[trackName]) {
      const audio = this._audioElements[trackName];
      audio.loop = false;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      this._currentAudio = audio;
      audio.onended = () => {
        if (this.currentTrack === trackName) {
          this.playing = false;
          this.currentTrack = null;
        }
      };
    } else {
      this._playProcedural(trackName);
    }
  },

  playRandom() {
    if (this.tracks.length === 0) return;
    const idx = Math.floor(Math.random() * this.tracks.length);
    this.playTrack(this.tracks[idx]);
  },

  stop() {
    if (this._currentAudio) {
      this._currentAudio.pause();
      this._currentAudio.currentTime = 0;
      this._currentAudio = null;
    }
    if (this._nodes) {
      try { this._nodes.forEach(n => n.stop()); } catch(e) {}
      this._nodes = null;
    }
    this.playing = false;
    this.currentTrack = null;
  },

  _playProcedural(name) {
    if (!this.ctx) return;
    const ac = this.ctx;
    const now = ac.currentTime;
    const nodes = [];

    const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const baseFreq = 200 + (seed % 200);
    const notes = [1, 1.25, 1.5, 1.333, 1.125, 1.667, 1, 0.875];

    for (let i = 0; i < notes.length; i++) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.value = baseFreq * notes[i];
      osc.type = 'sine';
      const t = now + i * 0.5;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.5);
      nodes.push(osc);
    }

    this._nodes = nodes;
    const dur = notes.length * 0.5 + 0.5;
    setTimeout(() => {
      if (this.currentTrack === name) {
        this.playing = false;
        this.currentTrack = null;
      }
    }, dur * 1000);
  },

  playAmbient() {
    this.init();
    if (this._ambient) return;
    this._ambient = true;
    const ac = this.ctx;
    const bufSize = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    const gain = ac.createGain();
    gain.gain.value = 0.02;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    noise.start();
  }
};
