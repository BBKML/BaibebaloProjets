/**
 * Service son pour l'app client (ex. notification "livreur arrivé")
 * Utilise expo-audio (expo-av est déprécié à partir du SDK 54).
 */
import * as Audio from 'expo-audio';
import { Vibration, Platform } from 'react-native';

const DELIVERY_ARRIVED_SOUND_URI = 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3';

let audioModeSet = false;

async function ensureAudioMode() {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
    audioModeSet = true;
  } catch (e) {
    if (__DEV__) console.warn('soundService: setAudioModeAsync', e?.message);
  }
}

/**
 * Joue un son + vibration pour "livreur arrivé"
 */
export async function playDeliveryArrived() {
  try {
    await ensureAudioMode();
    const player = Audio.createAudioPlayer(DELIVERY_ARRIVED_SOUND_URI, { downloadFirst: true });
    const removeWhenDone = (status) => {
      if (status?.didJustFinish) {
        try {
          player.remove();
        } catch (_) {}
      }
    };
    player.addListener('playbackStatusUpdate', removeWhenDone);
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch (_) {}
    }, 15000);
  } catch (e) {
    if (__DEV__) console.warn('soundService: play failed', e?.message);
  }
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 400, 200, 400]);
    } else {
      Vibration.vibrate();
    }
  } catch (_) {}
}
