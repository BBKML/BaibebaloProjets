import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOTP, verifyOTP } from '../api/auth';
import { setAuthStore } from './authStoreRef';

const useAuthStore = create((set, get) => ({
  // État
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
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
    set({
      isLoading: true,
      phoneNumber,
      otpAttempts: 0,
      otpExpiresAt: Date.now() + 5 * 60 * 1000,
    });
    try {
      const response = await sendOTP(phoneNumber);
      console.log('✅ Réponse API sendOTP complète:', JSON.stringify(response, null, 2));
      
      const isSuccess = response?.success === true;
      
      console.log('📊 Analyse réponse:', {
        isSuccess,
        response,
        success: response?.success,
      });
      
      if (isSuccess) {
        console.log('✅ OTP envoyé avec succès');
        console.log('✅ Retour du store: { success: true }');
        
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
        console.error('❌ Réponse non réussie:', errorMsg);
        set({ isLoading: false, otpSent: false });
        throw new Error(errorMsg);
      }
    } catch (error) {
      set({ isLoading: false, otpSent: false });
      
      let errorMessage = 'Erreur lors de l\'envoi du code';
      
      if (error.response?.status === 429) {
        errorMessage = error.response?.data?.error?.message 
          || error.response?.data?.message 
          || error.message
          || 'Trop de tentatives. Veuillez attendre avant de réessayer.';
      } else if (error.message?.includes('attendre') || error.message?.includes('minute')) {
        errorMessage = error.message;
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré et que l\'URL de l\'API est correcte.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('❌ Erreur sendOTP:', {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        response: error.response?.data,
      });
      
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

    set({ isLoading: true });
    try {
      const response = await verifyOTP(phoneNumber, code);
      const payload = response?.data ? response.data : response;
      const data = payload?.data ? payload.data : payload;
      const isNewUser = payload?.isNewUser ?? data?.isNewUser ?? false;
      const { user, accessToken, refreshToken } = data || {};
      
      // Sauvegarder les tokens
      await get().setTokens(accessToken, refreshToken);
      
      // Sauvegarder l'utilisateur
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        otpSent: false,
        otpAttempts: 0,
        otpExpiresAt: null,
      });
      
      return { success: true, data: { ...(data || {}), isNewUser } };
    } catch (error) {
      set((state) => ({
        isLoading: false,
        otpAttempts: state.otpAttempts + 1,
      }));
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Code invalide',
      };
    }
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
      // Timeout de sécurité pour éviter un chargement infini
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const storagePromise = AsyncStorage.multiGet([
        'accessToken',
        'refreshToken',
        'user',
      ]);

      const [accessToken, refreshToken, userStr] = await Promise.race([
        storagePromise,
        timeoutPromise,
      ]);

      if (accessToken && accessToken[1] && refreshToken && refreshToken[1] && userStr && userStr[1]) {
        try {
          const user = JSON.parse(userStr[1]);
          set({
            user,
            accessToken: accessToken[1],
            refreshToken: refreshToken[1],
            isAuthenticated: true,
          });
        } catch (parseError) {
          console.error('Erreur lors du parsing de l\'utilisateur:', parseError);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'auth:', error);
      // En cas d'erreur, on continue quand même
    } finally {
      set({ isLoading: false });
    }
  },
}));

setAuthStore(useAuthStore);

export default useAuthStore;
