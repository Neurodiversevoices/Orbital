import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ViewContext, ViewMode } from '../../types';
import { validateShareAccess, ValidationResult } from '../sharing';

interface ViewModeContextValue {
  viewContext: ViewContext;
  isReadOnly: boolean;
  validateToken: (token: string) => Promise<ValidationResult>;
  resetToOwnerMode: () => void;
}

const defaultContext: ViewContext = {
  mode: 'owner',
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewContext, setViewContext] = useState<ViewContext>(defaultContext);

  const validateToken = useCallback(async (token: string): Promise<ValidationResult> => {
    const result = await validateShareAccess(token);

    if (result.isValid && result.context) {
      setViewContext(result.context);
    }

    return result;
  }, []);

  const resetToOwnerMode = useCallback(() => {
    setViewContext(defaultContext);
  }, []);

  const isReadOnly = viewContext.mode === 'shared-readonly';

  return (
    <ViewModeContext.Provider
      value={{
        viewContext,
        isReadOnly,
        validateToken,
        resetToOwnerMode,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
