import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOTP, verifyOTP } from '../api/auth';
import { getMyProfile } from '../api/users';
import { setAuthStore } from './authStoreRef';
import { getExpoPushToken } from '../services/notificationService';

const useAuthStore = create((set, get) => ({
  // État (isLoading: true au démarrage = on n'affiche rien tant que le token n'est pas chargé)
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  phoneNumber: null,
  otpSent: false,
  otpAttempts: 0,
  otpMaxAttempts: 3,
  otpExpiresAt: null,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setTokens: async (accessToken, refreshToken) => {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  sendOTP: async (phoneNumber) => {
    // Ne pas toucher isLoading ici — il contrôle le SplashScreen dans AppNavigator
    // et le démonter pendant sendOTP casse la navigation
    set({
      phoneNumber,
      otpAttempts: 0,
      otpExpiresAt: Date.now() + 5 * 60 * 1000,
    });
    try {
      const response = await sendOTP(phoneNumber);
      const isSuccess = response?.success === true;

      if (isSuccess) {
        if (__DEV__) console.log('✅ OTP envoyé avec succès');
        
        // ⚠️ NE PAS mettre isLoading à false ici
        // Le composant le fera après la navigation
        set({ otpSent: true });
        
        return { 
          success: true, 
          data: response,
          message: response?.message || 'Code envoyé avec succès'
        };
      } else {
        const errorMsg = response?.message || response?.error?.message || 'Erreur lors de l\'envoi du code';
        if (__DEV__) console.warn('❌ Réponse non réussie:', errorMsg);
        set({ otpSent: false });
        throw new Error(errorMsg);
      }
    } catch (error) {
      set({ otpSent: false });
      
      let errorMessage = 'Erreur lors de l\'envoi du code';
      
      if (error.response?.status === 429) {
        errorMessage = error.response?.data?.error?.message 
          || error.response?.data?.message 
          || error.message
          || 'Trop de tentatives. Veuillez attendre avant de réessayer.';
      } else if (error.message?.includes('attendre') || error.message?.includes('minute')) {
        errorMessage = error.message;
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMessage = 'Impossible de se connecter. Vérifiez votre connexion internet.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (__DEV__) console.warn('❌ Erreur sendOTP:', error?.message || error);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  verifyOTP: async (code) => {
    const { phoneNumber, otpAttempts, otpMaxAttempts, otpExpiresAt } = get();
    if (!phoneNumber) {
      return { success: false, error: 'Numéro de téléphone manquant' };
    }
    if (otpAttempts >= otpMaxAttempts) {
      return { success: false, error: 'Nombre maximal de tentatives atteint. Réessayez plus tard.' };
    }
    if (otpExpiresAt && Date.now() > otpExpiresAt) {
      return { success: false, error: 'Le code OTP a expiré. Veuillez demander un nouveau code.' };
    }

    try {
      let fcmToken = null;
      try {
        fcmToken = await getExpoPushToken();
      } catch (_) {}
      const response = await verifyOTP(phoneNumber, code, null, null, fcmToken);
      const payload = response?.data ? response.data : response;
      const data = payload?.data ? payload.data : payload;
      const isNewUser = payload?.isNewUser ?? data?.isNewUser ?? false;
      const { user, accessToken, refreshToken } = data || {};
      const userToSave = { ...user, isNewUser };

      // Sauvegarder les tokens
      await get().setTokens(accessToken, refreshToken);

      // Sauvegarder l'utilisateur (avec isNewUser pour la redirection au prochain démarrage)
      await AsyncStorage.setItem('user', JSON.stringify(userToSave));

      set({
        user: userToSave,
        isAuthenticated: true,
        otpSent: false,
        otpAttempts: 0,
        otpExpiresAt: null,
      });

      return { success: true, data: { ...(data || {}), isNewUser } };
    } catch (error) {
      set((state) => ({
        otpAttempts: state.otpAttempts + 1,
      }));
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Code invalide',
      };
    }
  },

  /** Met à jour le profil et persiste (après création de profil). Marque isNewUser: false. */
  completeProfile: async (updates) => {
    const { user } = get();
    if (!user) return;
    const merged = { ...user, ...updates, isNewUser: false };
    set({ user: merged });
    await AsyncStorage.setItem('user', JSON.stringify(merged));
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      phoneNumber: null,
      otpSent: false,
    });
  },

  loadAuth: async () => {
    set({ isLoading: true });
    try {
      const [[, accessTokenVal], [, refreshTokenVal], [, userStr]] = await AsyncStorage.multiGet([
        'accessToken',
        'refreshToken',
        'user',
      ]);

      if (accessTokenVal && refreshTokenVal && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            user,
            accessToken: accessTokenVal,
            refreshToken: refreshTokenVal,
            isAuthenticated: true,
          });

          // Recharger le profil complet depuis l'API pour avoir full_name / first_name / last_name
          // et éviter la redirection vers ProfileCreation alors que le compte existe déjà
          try {
            const response = await getMyProfile();
            const profileUser = response?.data?.user ?? response?.user ?? response;
            if (profileUser && typeof profileUser === 'object') {
              const mergedUser = {
                ...user,
                ...profileUser,
                isNewUser: false,
                // full_name pour compatibilité avec getInitialRoute
                full_name:
                  profileUser.full_name ||
                  (profileUser.first_name && profileUser.last_name
                    ? `${profileUser.first_name} ${profileUser.last_name}`.trim()
                    : user?.full_name),
              };
              set({ user: mergedUser });
              await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
            }
          } catch (profileError) {
            if (__DEV__) console.warn('Profil non rechargé (réseau ou token):', profileError?.message);
            // On garde l'utilisateur tel qu'en storage
          }
        } catch (parseError) {
          if (__DEV__) console.warn('Erreur lors du parsing de l\'utilisateur:', parseError?.message || parseError);
        }
      }
    } catch (error) {
      if (__DEV__) console.warn('Erreur lors du chargement de l\'auth:', error?.message || error);
      // En cas d'erreur, on continue quand même
    } finally {
      set({ isLoading: false });
    }
  },
}));

setAuthStore(useAuthStore);

export default useAuthStore;
