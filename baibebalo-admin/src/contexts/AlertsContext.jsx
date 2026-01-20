import { createContext, useContext, useState } from 'react';

const AlertsContext = createContext();

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertsProvider');
  }
  return context;
};

export const AlertsProvider = ({ children }) => {
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  return (
    <AlertsContext.Provider value={{ showAlertsPanel, setShowAlertsPanel }}>
      {children}
    </AlertsContext.Provider>
  );
};
