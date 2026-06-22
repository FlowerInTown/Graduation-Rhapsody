export const audio = {
  ctx: null,

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  play(type) {
    if (!this.ctx) return;
    const ac = this.ctx;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    switch(type) {
      case 'click':
        osc.frequency.value = 600;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
        break;
      case 'pickup':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
        break;
      case 'success': {
        osc.frequency.setValueAtTime(523, now);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
        const osc2 = ac.createOscillator();
        const g2 = ac.createGain();
        osc2.connect(g2); g2.connect(ac.destination);
        osc2.frequency.value = 659; osc2.type = 'sine';
        g2.gain.setValueAtTime(0.2, now + 0.15);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.start(now + 0.15); osc2.stop(now + 0.6);
        const osc3 = ac.createOscillator();
        const g3 = ac.createGain();
        osc3.connect(g3); g3.connect(ac.destination);
        osc3.frequency.value = 784; osc3.type = 'sine';
        g3.gain.setValueAtTime(0.2, now + 0.3);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc3.start(now + 0.3); osc3.stop(now + 0.8);
        break;
      }
      case 'error':
        osc.frequency.value = 200;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
        break;
      case 'whoosh':
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
        break;
      case 'chime':
        osc.frequency.value = 1200;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
        break;
    }
  },

  playAmbient() {
    if (!this.ctx || this._ambient) return;
    this._ambient = true;
    const ac = this.ctx;
    const bufSize = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 200;
    const gain = ac.createGain();
    gain.gain.value = 0.03;
    noise.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    noise.start();
  }
};
