let authStore = null;

export const setAuthStore = (store) => {
  authStore = store;
};

export const getAuthStore = () => authStore;
