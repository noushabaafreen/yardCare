import { createContext, useContext } from "react";

const AppPageContext = createContext(null);

export function AppPageProvider({ value, children }) {
  return (
    <AppPageContext.Provider value={value}>
      {children}
    </AppPageContext.Provider>
  );
}

export function useAppPage() {
  const context = useContext(AppPageContext);

  if (!context) {
    throw new Error("Menu pages must be rendered inside AppPageProvider.");
  }

  return context;
}
