/**
 * Service de sons pour le livreur (nouvelle course, commande prête, etc.)
 * Utilise expo-audio (expo-av est déprécié à partir du SDK 54).
 */
import * as Audio from 'expo-audio';
import { Vibration, Platform } from 'react-native';

class SoundService {
  constructor() {
    this._soundErrorLogged = false;
    this._initialized = false;
    this._loopingPlayer = null;
    this._loopingInterval = null;
  }

  async initialize() {
    if (this._initialized) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
      this._initialized = true;
      if (__DEV__) console.log('🔊 Service audio livreur initialisé (expo-audio)');
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Erreur init audio livreur:', error?.message);
    }
  }

  _getSoundUri(type) {
    const urls = {
      newDelivery: 'https://cdn.pixabay.com/audio/2024/02/19/audio_e4043ef8f6.mp3',
      orderReady: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
      alert: 'https://cdn.pixabay.com/audio/2024/02/19/audio_e4043ef8f6.mp3',
    };
    return urls[type] || urls.newDelivery;
  }

  vibrate(type = 'newDelivery') {
    const patterns = {
      newDelivery: [0, 400, 200, 400],
      orderReady: [0, 200, 100, 200],
      alert: [0, 500],
    };
    const pattern = patterns[type] || patterns.newDelivery;
    if (Platform.OS !== 'web') {
      Vibration.vibrate(Array.isArray(pattern) ? pattern : pattern);
    }
  }

  async playSound(type = 'newDelivery') {
    try {
      if (!this._initialized) await this.initialize();
      const uri = this._getSoundUri(type);
      const player = Audio.createAudioPlayer(uri, { downloadFirst: true });
      const removeWhenDone = (status) => {
        if (status?.didJustFinish) {
          try {
            player.remove();
          } catch (_) {}
        }
      };
      player.addListener('playbackStatusUpdate', removeWhenDone);
      player.play();
      // Fallback: retirer le player après 15 s pour éviter fuite mémoire si didJustFinish ne fuse pas
      setTimeout(() => {
        try {
          player.remove();
        } catch (_) {}
      }, 15000);
    } catch (error) {
      if (!this._soundErrorLogged) {
        this._soundErrorLogged = true;
        if (__DEV__) console.warn('⚠️ Son non disponible (403/réseau), vibration uniquement.');
      }
      this.vibrate(type);
    }
  }

  async alertNewDelivery() {
    this.vibrate('newDelivery');
    await this.playSound('newDelivery');
  }

  async alertOrderReady() {
    this.vibrate('orderReady');
    await this.playSound('orderReady');
  }

  async alert() {
    this.vibrate('alert');
    await this.playSound('alert');
  }

  /**
   * Démarrer une alerte sonore en boucle (nouvelle course)
   * Rejoue le son toutes les 4 secondes jusqu'à stopLoopingAlert()
   */
  async startLoopingAlert() {
    this.stopLoopingAlert();
    this.vibrate('newDelivery');
    await this.playSound('newDelivery');
    this._loopingInterval = setInterval(async () => {
      this.vibrate('newDelivery');
      await this.playSound('newDelivery');
    }, 4000);
  }

  /**
   * Arrêter l'alerte sonore en boucle
   */
  stopLoopingAlert() {
    if (this._loopingInterval) {
      clearInterval(this._loopingInterval);
      this._loopingInterval = null;
    }
    if (this._loopingPlayer) {
      try { this._loopingPlayer.remove(); } catch (_) {}
      this._loopingPlayer = null;
    }
    Vibration.cancel();
  }
}

const soundService = new SoundService();
export default soundService;
