/**
 * Service de sons pour les notifications de commandes
 * Joue des sons distincts pour différents types d'événements
 */
import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_PREFERENCES_KEY = 'sound_preferences';

class SoundService {
  constructor() {
    this.sounds = {
      newOrder: null,
      urgentOrder: null,
      orderReady: null,
      alert: null,
    };
    this.isLoaded = false;
    this.preferences = {
      soundEnabled: true,
      vibrationEnabled: true,
      volume: 1.0,
      soundType: 'default', // default, urgent, gentle
    };
  }

  /**
   * Initialiser le service audio
   */
  async initialize() {
    try {
      // Charger les préférences
      await this.loadPreferences();

      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isLoaded = true;
      console.log('🔊 Service audio initialisé');
    } catch (error) {
      console.warn('⚠️ Erreur initialisation audio:', error.message);
    }
  }

  /**
   * Charger les préférences de sons
   */
  async loadPreferences() {
    try {
      const stored = await AsyncStorage.getItem(SOUND_PREFERENCES_KEY);
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Erreur chargement préférences audio:', error);
    }
  }

  /**
   * Sauvegarder les préférences
   */
  async savePreferences(newPrefs) {
    try {
      this.preferences = { ...this.preferences, ...newPrefs };
      await AsyncStorage.setItem(SOUND_PREFERENCES_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Erreur sauvegarde préférences audio:', error);
    }
  }

  /**
   * Jouer un son de notification
   * @param {string} type - Type de son: 'newOrder', 'urgentOrder', 'orderReady', 'alert'
   * @param {boolean} repeat - Répéter le son (pour alertes urgentes)
   */
  async playSound(type = 'newOrder', repeat = false) {
    if (!this.preferences.soundEnabled) {
      console.log('🔇 Sons désactivés');
      return;
    }

    try {
      // Créer le son
      const { sound } = await Audio.Sound.createAsync(
        this._getSoundSource(type),
        { 
          volume: this.preferences.volume,
          shouldPlay: true,
          isLooping: repeat,
        }
      );

      // Jouer le son
      await sound.playAsync();

      // Si pas de répétition, libérer après lecture
      if (!repeat) {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } else {
        // Stocker pour pouvoir arrêter plus tard
        this.sounds[type] = sound;
      }

      console.log(`🔊 Son joué: ${type}`);
    } catch (error) {
      console.warn('⚠️ Erreur lecture son:', error.message);
      // Fallback: vibration
      this.vibrate(type);
    }
  }

  /**
   * Arrêter un son en répétition
   */
  async stopSound(type) {
    if (this.sounds[type]) {
      try {
        await this.sounds[type].stopAsync();
        await this.sounds[type].unloadAsync();
        this.sounds[type] = null;
        console.log(`🔇 Son arrêté: ${type}`);
      } catch (error) {
        console.warn('Erreur arrêt son:', error);
      }
    }
  }

  /**
   * Arrêter tous les sons
   */
  async stopAllSounds() {
    for (const type of Object.keys(this.sounds)) {
      await this.stopSound(type);
    }
  }

  /**
   * Obtenir la source du son selon le type
   * Utilise des sons en ligne libres de droits
   */
  _getSoundSource(type) {
    // Sons hébergés (freesound.org - domaine public)
    const soundUrls = {
      // Son de notification standard
      newOrder: { uri: 'https://cdn.pixabay.com/audio/2024/02/19/audio_e4043ef8f6.mp3' },
      // Son urgent/alarme
      urgentOrder: { uri: 'https://cdn.pixabay.com/audio/2024/11/04/audio_434f31c6f1.mp3' },
      // Son court succès
      orderReady: { uri: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3' },
      // Son alerte
      alert: { uri: 'https://cdn.pixabay.com/audio/2024/02/19/audio_e4043ef8f6.mp3' },
    };

    return soundUrls[type] || soundUrls.newOrder;
  }

  /**
   * Vibrer le téléphone
   */
  vibrate(type = 'newOrder') {
    if (!this.preferences.vibrationEnabled) return;

    const patterns = {
      newOrder: [0, 400, 200, 400, 200, 400],      // Pattern standard
      urgentOrder: [0, 500, 100, 500, 100, 500, 100, 500], // Pattern urgent
      orderReady: [0, 200, 100, 200],               // Pattern court
      alert: [0, 1000],                             // Pattern long
    };

    const pattern = patterns[type] || patterns.newOrder;
    
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern);
    } else {
      // iOS ne supporte pas les patterns personnalisés
      Vibration.vibrate();
    }
  }

  /**
   * Alerte pour nouvelle commande
   */
  async alertNewOrder() {
    console.log('🔔 Alerte nouvelle commande!');
    this.vibrate('newOrder');
    await this.playSound('newOrder');
  }

  /**
   * Alerte urgente (commande non acceptée depuis trop longtemps)
   */
  async alertUrgent() {
    console.log('🚨 Alerte urgente!');
    this.vibrate('urgentOrder');
    await this.playSound('urgentOrder', true); // Répéter jusqu'à action
  }

  /**
   * Alerte commande prête
   */
  async alertOrderReady() {
    this.vibrate('orderReady');
    await this.playSound('orderReady');
  }

  /**
   * Alerte simple
   */
  async alert() {
    this.vibrate('alert');
    await this.playSound('alert');
  }

  /**
   * Activer/désactiver les sons
   */
  async toggleSound(enabled) {
    await this.savePreferences({ soundEnabled: enabled });
  }

  /**
   * Activer/désactiver les vibrations
   */
  async toggleVibration(enabled) {
    await this.savePreferences({ vibrationEnabled: enabled });
  }

  /**
   * Définir le volume
   */
  async setVolume(volume) {
    await this.savePreferences({ volume: Math.min(1, Math.max(0, volume)) });
  }

  /**
   * Obtenir les préférences actuelles
   */
  getPreferences() {
    return { ...this.preferences };
  }
}

// Instance singleton
const soundService = new SoundService();
export default soundService;
