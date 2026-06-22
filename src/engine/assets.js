const cache = {};
const sheets = {};
let totalQueued = 0;
let totalLoaded = 0;

export const assets = {
  get progress() {
    return totalQueued === 0 ? 1 : totalLoaded / totalQueued;
  },

  get loaded() {
    return totalQueued === totalLoaded;
  },

  load(key, src) {
    if (cache[key]) return Promise.resolve(cache[key]);
    totalQueued++;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        cache[key] = img;
        totalLoaded++;
        resolve(img);
      };
      img.onerror = () => {
        totalLoaded++;
        resolve(null);
      };
      img.src = src;
    });
  },

  loadSheet(key, src, { frameW, frameH, count, cols }) {
    if (sheets[key]) return Promise.resolve(sheets[key]);
    totalQueued++;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = cols || Math.floor(img.width / frameW);
        sheets[key] = { img, frameW, frameH, count: count || c * Math.floor(img.height / frameH), cols: c };
        totalLoaded++;
        resolve(sheets[key]);
      };
      img.onerror = () => {
        totalLoaded++;
        resolve(null);
      };
      img.src = src;
    });
  },

  async loadManifest(manifest) {
    const promises = [];
    for (const entry of manifest) {
      if (entry.sheet) {
        promises.push(this.loadSheet(entry.key, entry.src, entry.sheet));
      } else {
        promises.push(this.load(entry.key, entry.src));
      }
    }
    return Promise.all(promises);
  },

  get(key) {
    return cache[key] || null;
  },

  getSheet(key) {
    return sheets[key] || null;
  },

  has(key) {
    return key in cache && cache[key] !== null;
  },

  hasSheet(key) {
    return key in sheets && sheets[key] !== null;
  },

  register(key, img) {
    cache[key] = img;
  },
};
