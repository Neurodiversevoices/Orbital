import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { hasAcceptedCurrentTerms, recordTermsAcceptance } from '../storage';
import { TermsAcceptanceModal } from '../../components/legal';
import { router } from 'expo-router';

interface TermsAcceptanceContextType {
  hasAccepted: boolean;
  isLoading: boolean;
  showTermsModal: () => void;
  hideTermsModal: () => void;
}

const TermsAcceptanceContext = createContext<TermsAcceptanceContextType | undefined>(undefined);

interface TermsAcceptanceProviderProps {
  children: ReactNode;
}

export function TermsAcceptanceProvider({ children }: TermsAcceptanceProviderProps) {
  const [hasAccepted, setHasAccepted] = useState(true); // Default to true to avoid flash
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkTermsAcceptance();
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const accepted = await hasAcceptedCurrentTerms();
      setHasAccepted(accepted);
      if (!accepted) {
        setShowModal(true);
      }
    } catch (error) {
      console.error('[Terms] Error checking acceptance:', error);
      // On error, assume accepted to not block the user
      setHasAccepted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = useCallback(async () => {
    try {
      await recordTermsAcceptance('explicit_click');
      setHasAccepted(true);
      setShowModal(false);
    } catch (error) {
      console.error('[Terms] Error recording acceptance:', error);
      // Still close modal to not block user
      setHasAccepted(true);
      setShowModal(false);
    }
  }, []);

  const handleViewFullTerms = useCallback(() => {
    // Close modal temporarily and navigate to full terms
    setShowModal(false);
    router.push('/legal');
  }, []);

  const showTermsModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const hideTermsModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <TermsAcceptanceContext.Provider
      value={{
        hasAccepted,
        isLoading,
        showTermsModal,
        hideTermsModal,
      }}
    >
      {children}
      <TermsAcceptanceModal
        visible={showModal && !hasAccepted}
        onAccept={handleAccept}
        onViewFullTerms={handleViewFullTerms}
      />
    </TermsAcceptanceContext.Provider>
  );
}

export function useTermsAcceptance() {
  const context = useContext(TermsAcceptanceContext);
  if (context === undefined) {
    throw new Error('useTermsAcceptance must be used within a TermsAcceptanceProvider');
  }
  return context;
}
