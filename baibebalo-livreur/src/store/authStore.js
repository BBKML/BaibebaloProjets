import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set, get) => ({
  // État
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  
  // État d'inscription
  registrationStep: 0, // 0: non commencé, 1-5: étapes d'inscription
  registrationData: {},
  pendingRegistration: false, // true si inscription soumise mais pas encore validée
  
  // État de validation
  validationStatus: null, // 'pending', 'approved', 'rejected'
  trainingCompleted: false,
  quizPassed: false,
  contractSigned: false,
  isActivated: false,

  // Actions d'authentification
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: async (token) => {
    set({ token });
    if (token) {
      await AsyncStorage.setItem('delivery_token', token);
    } else {
      await AsyncStorage.removeItem('delivery_token');
    }
  },

  login: async (user, token) => {
    // Le backend envoie "status" pour les livreurs, pas "validation_status"
    const userStatus = user.status || user.validation_status || 'pending';
    const isActive = userStatus === 'active';
    
    console.log('Login - user status:', userStatus, 'isActive:', isActive);
    
    set({ 
      user, 
      token, 
      isAuthenticated: true,
      pendingRegistration: false,
      // Si le livreur est actif, pas besoin de validation
      validationStatus: isActive ? 'approved' : userStatus,
      // Pour un livreur actif, on considère que tout est complété
      trainingCompleted: isActive || user.training_completed || false,
      quizPassed: isActive || user.quiz_passed || false,
      contractSigned: isActive || user.contract_signed || false,
      isActivated: isActive || user.is_activated || false,
    });
    await AsyncStorage.setItem('delivery_token', token);
    await AsyncStorage.setItem('delivery_user', JSON.stringify(user));
  },

  logout: async () => {
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false,
      registrationStep: 0,
      registrationData: {},
      pendingRegistration: false,
      validationStatus: null,
      trainingCompleted: false,
      quizPassed: false,
      contractSigned: false,
      isActivated: false,
    });
    await AsyncStorage.removeItem('delivery_token');
    await AsyncStorage.removeItem('delivery_user');
    await AsyncStorage.removeItem('registration_data');
    await AsyncStorage.removeItem('pending_registration');
  },
  
  // Marquer l'inscription comme soumise (en attente de validation)
  setPendingRegistration: async (pending) => {
    set({ pendingRegistration: pending });
    if (pending) {
      await AsyncStorage.setItem('pending_registration', 'true');
    } else {
      await AsyncStorage.removeItem('pending_registration');
    }
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('delivery_token');
      const userData = await AsyncStorage.getItem('delivery_user');
      const registrationData = await AsyncStorage.getItem('registration_data');
      const pendingReg = await AsyncStorage.getItem('pending_registration');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        // Le backend envoie "status" pour les livreurs (pas "validation_status")
        const userStatus = user.status || user.validation_status || 'pending';
        const isActive = userStatus === 'active';
        
        console.log('LoadStoredAuth - user status:', userStatus, 'isActive:', isActive);
        
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          validationStatus: isActive ? 'approved' : userStatus,
          trainingCompleted: isActive || user.training_completed || false,
          quizPassed: isActive || user.quiz_passed || false,
          contractSigned: isActive || user.contract_signed || false,
          isActivated: isActive || user.is_activated || false,
          isLoading: false 
        });
      } else if (pendingReg === 'true') {
        // Inscription soumise, en attente de validation
        set({ 
          pendingRegistration: true,
          isLoading: false 
        });
      } else if (registrationData) {
        const data = JSON.parse(registrationData);
        set({ 
          registrationData: data,
          registrationStep: data.step || 0,
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false });
    }
  },

  // Actions d'inscription
  updateRegistrationData: async (data) => {
    const currentData = get().registrationData;
    const newData = { ...currentData, ...data };
    set({ registrationData: newData });
    await AsyncStorage.setItem('registration_data', JSON.stringify(newData));
  },

  setRegistrationStep: async (step) => {
    const currentData = get().registrationData;
    const newData = { ...currentData, step };
    set({ registrationStep: step, registrationData: newData });
    await AsyncStorage.setItem('registration_data', JSON.stringify(newData));
  },

  clearRegistrationData: async () => {
    set({ registrationStep: 0, registrationData: {} });
    await AsyncStorage.removeItem('registration_data');
  },

  // Actions de mise à jour du profil
  updateUser: async (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      set({ user: updatedUser });
      await AsyncStorage.setItem('delivery_user', JSON.stringify(updatedUser));
    }
  },

  // Actions de validation
  setValidationStatus: (status) => set({ validationStatus: status }),
  setTrainingCompleted: (completed) => set({ trainingCompleted: completed }),
  setQuizPassed: (passed) => set({ quizPassed: passed }),
  setContractSigned: (signed) => set({ contractSigned: signed }),
  setIsActivated: (activated) => set({ isActivated: activated }),
}));

export default useAuthStore;
