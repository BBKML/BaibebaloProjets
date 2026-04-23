// Génère des sons via Web Audio API (pas de fichier audio nécessaire)
let ctx = null;

const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
};

const beep = (frequency, duration, type = 'sine', gain = 0.3) => {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.setValueAtTime(gain, ac.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch (e) {
    // AudioContext non disponible (ex: SSR, test)
  }
};

const adminSound = {
  // Ding montant : nouvelle commande
  newOrder: () => {
    beep(880, 0.15, 'sine', 0.25);
    setTimeout(() => beep(1100, 0.2, 'sine', 0.25), 180);
    setTimeout(() => beep(1320, 0.3, 'sine', 0.2), 380);
  },

  // Double bip urgent : commande en retard critique
  alert: () => {
    beep(660, 0.12, 'square', 0.2);
    setTimeout(() => beep(660, 0.12, 'square', 0.2), 200);
    setTimeout(() => beep(880, 0.2, 'square', 0.2), 440);
  },

  // Simple clic : action confirmée
  success: () => {
    beep(1047, 0.1, 'sine', 0.15);
    setTimeout(() => beep(1319, 0.15, 'sine', 0.12), 120);
  },
};

export default adminSound;
