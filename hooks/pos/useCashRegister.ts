import { useState, useEffect, useCallback } from 'react';
import { ICashRegister } from '../../types';
import { StorageService } from '../../services/storageService';
import { AuditService } from '../../services/auditService';

type CashRegisterModal = 'NONE' | 'OPEN_BOX' | 'CLOSE_BOX' | 'SANGRIA' | 'SUPRIMENTO';

export const useCashRegister = () => {
  const [register, setRegister] = useState<ICashRegister | null>(null);
  const [lastClosedRegister, setLastClosedRegister] = useState<ICashRegister | null>(null);
  const [modal, setModal] = useState<CashRegisterModal>('NONE');

  // Form states for modals
  const [openingBalance, setOpeningBalance] = useState(''); // Formerly cashValue
  const [transactionAmount, setTransactionAmount] = useState(''); // For sangria/suprimento
  const [transactionReason, setTransactionReason] = useState(''); // For sangria/suprimento

  // Closing register states
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [closingCount, setClosingCount] = useState('');
  const [closedRegisterData, setClosedRegisterData] = useState<ICashRegister | null>(null);

  // Initial load
  useEffect(() => {
    const currentReg = StorageService.getCurrentRegister();
    setRegister(currentReg);
    if (!currentReg) {
      const lastClosed = StorageService.getLastClosedRegister();
      setLastClosedRegister(lastClosed);
      setModal('OPEN_BOX');
    }
  }, []);

  const openRegister = useCallback(() => {
    const value = parseFloat(openingBalance.replace(',', '.'));
    if (isNaN(value)) {
      // Consider returning an error message
      return;
    }
    
    const newReg = StorageService.openRegister(value, 'ADMIN'); // Assuming ADMIN user for now
    setRegister(newReg);
    setModal('NONE');
    setOpeningBalance('');
  }, [openingBalance]);

  const addCashTransaction = useCallback((type: 'BLEED' | 'SUPPLY') => {
    const value = parseFloat(transactionAmount.replace(',', '.'));
    if (isNaN(value) || !transactionReason) {
      // Consider returning an error
      return;
    }

    if (!register) return;

    StorageService.addCashTransaction({
      id: crypto.randomUUID(),
      registerId: register.id,
      type: type,
      amount: value,
      description: transactionReason,
      date: new Date().toISOString()
    });
    
    AuditService.log(
      'CASH_OPERATION', 
      `${type === 'BLEED' ? 'Sangria' : 'Suprimento'}: ${value.toFixed(2)}. Motivo: ${transactionReason}`, 
      type === 'BLEED' ? 'WARNING' : 'INFO'
    );

    setRegister(StorageService.getCurrentRegister());
    setModal('NONE');
    setTransactionAmount('');
    setTransactionReason('');
    // Consider returning a success message
  }, [transactionAmount, transactionReason, register]);

  const initiateCloseRegister = useCallback(() => {
    const summary = StorageService.getRegisterSummary();
    setClosingSummary(summary);
    setClosingCount('');
    setModal('CLOSE_BOX');
  }, []);

  const executeCloseRegister = useCallback(() => {
    const count = parseFloat(closingCount.replace(',', '.'));
    if (isNaN(count)) {
      // Return error
      return null;
    }
    const closedReg = StorageService.closeRegister(count);
    if (closedReg) {
        setClosedRegisterData(closedReg);
        setRegister(null);
        setModal('NONE');
    }
    return closedReg;
  }, [closingCount]);

  const resetAndPrepareForNewRegister = () => {
    setClosedRegisterData(null);
    const lastClosed = StorageService.getLastClosedRegister();
    setLastClosedRegister(lastClosed);
    setModal('OPEN_BOX');
  };

  return {
    // State
    register,
    lastClosedRegister,
    modal,
    openingBalance,
    transactionAmount,
    transactionReason,
    closingSummary,
    closingCount,
    closedRegisterData,

    // State Setters
    setModal,
    setOpeningBalance,
    setTransactionAmount,
    setTransactionReason,
    setClosingCount,

    // Actions
    openRegister,
    addCashTransaction,
    initiateCloseRegister,
    executeCloseRegister,
    resetAndPrepareForNewRegister,
  };
};
