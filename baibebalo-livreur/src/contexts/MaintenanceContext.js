import React from 'react';

/** Callback pour re-vérifier le mode maintenance (évite de passer une fonction dans les params de navigation). */
export const MaintenanceContext = React.createContext(null);

export function useMaintenanceRetry() {
  return React.useContext(MaintenanceContext);
}
