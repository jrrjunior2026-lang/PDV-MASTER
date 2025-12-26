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
    const loadRegister = async () => {
      const user = StorageService.getCurrentUser();
      if (!user) return;

      const currentReg = await StorageService.getCurrentRegister(user.id);
      setRegister(currentReg);
      if (!currentReg) {
        const lastClosed = await StorageService.getLastClosedRegister();
        setLastClosedRegister(lastClosed);
        setModal('OPEN_BOX');
      }
    };
    loadRegister();
  }, []);

  const openRegister = useCallback(async () => {
    const value = parseFloat(openingBalance.replace(',', '.'));
    if (isNaN(value)) {
      // Consider returning an error message
      return;
    }

    const user = StorageService.getCurrentUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    const newReg = await StorageService.openRegister(value, user.id);
    setRegister(newReg);
    setModal('NONE');
    setOpeningBalance('');
  }, [openingBalance]);

  const addCashTransaction = useCallback(async (type: 'BLEED' | 'SUPPLY') => {
    const value = parseFloat(transactionAmount.replace(',', '.'));
    if (isNaN(value) || !transactionReason) {
      // Consider returning an error
      return;
    }

    if (!register) return;

    await StorageService.addCashTransaction({
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

    const user = StorageService.getCurrentUser();
    if (user) {
      const updatedReg = await StorageService.getCurrentRegister(user.id);
      setRegister(updatedReg);
    }
    setModal('NONE');
    setTransactionAmount('');
    setTransactionReason('');
    // Consider returning a success message
  }, [transactionAmount, transactionReason, register]);

  const initiateCloseRegister = useCallback(async () => {
    if (!register) return;
    const summary = await StorageService.getRegisterSummary(register.id);
    setClosingSummary(summary);
    setClosingCount('');
    setModal('CLOSE_BOX');
  }, [register]);

  const executeCloseRegister = useCallback(async () => {
    if (!register) return null;
    const count = parseFloat(closingCount.replace(',', '.'));
    if (isNaN(count)) {
      // Return error
      return null;
    }
    await StorageService.closeRegister(register.id, count);
    // After closing, get the updated register data
    const closedReg = await StorageService.getLastClosedRegister();
    if (closedReg) {
      setClosedRegisterData(closedReg);
      setRegister(null);
      setModal('NONE');
    }
    return closedReg;
  }, [closingCount, register]);

  const resetAndPrepareForNewRegister = async () => {
    setClosedRegisterData(null);
    const lastClosed = await StorageService.getLastClosedRegister();
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

