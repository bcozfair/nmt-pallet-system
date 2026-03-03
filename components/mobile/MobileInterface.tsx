import React, { useState, useEffect, useRef } from 'react';
import { User, Department, PalletStatus } from '../../types';
import { fetchDepartments, subscribeToDepartments } from '../../services/departmentService';
import { checkOutPallet, checkInPallet } from '../../services/transactionService';
import { getPalletById } from '../../services/palletService';
import { supabase } from '../../services/supabase';
import { toast } from '../../services/toast';
import QRScanner from './QRScanner';
import { useScannerFeedback } from '../../hooks/useScannerFeedback';

import { MobileHistory } from './MobileHistory';
import { MobileHome } from './MobileHome';
import { LocationSelector } from './LocationSelector';
import { BatchScanList } from './BatchScanList';
import { FeedbackOverlay } from './FeedbackOverlay';
import { DamageForm, DamageManualEntry } from './DamageForm';

export type MobileMode = 'idle' | 'checkout_select_dept' | 'checkout_scanning' | 'checkin_scanning' | 'damage_scanning' | 'damage_form' | 'history';

export interface StagedItem {
  id: string;
  status: PalletStatus | 'unknown';
  location: string;
}

export type { Department };

interface MobileInterfaceProps {
  user: User;
  onLogout: () => void;
}

const MobileInterface: React.FC<MobileInterfaceProps> = ({ user, onLogout }) => {
  // 1. Initialize from URL
  const queryParams = new URLSearchParams(window.location.search);
  const initialMode = (queryParams.get('mode') as MobileMode) || 'idle';
  const initialDeptId = queryParams.get('deptId');
  const initialPalletId = queryParams.get('palletId');

  const [mode, setModeState] = useState<MobileMode>(initialMode);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Batch Scanning State
  const [pendingScans, setPendingScans] = useState<StagedItem[]>(() => {
    try {
      const saved = localStorage.getItem('nmt_mobile_pending_scans');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load pending scans", e);
      return [];
    }
  });

  // Persist pending scans
  useEffect(() => {
    localStorage.setItem('nmt_mobile_pending_scans', JSON.stringify(pendingScans));
  }, [pendingScans]);

  // Logic Refs
  const isProcessingRef = useRef(false);

  // Feedback
  const { triggerFeedback, stopFeedback } = useScannerFeedback();
  const [feedbackOverlay, setFeedbackOverlay] = useState<{ status: 'success' | 'error', text: string } | null>(null);

  // Damage Report State
  const [lastScannedForDamage, setLastScannedForDamage] = useState<string | null>(initialPalletId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Sync URL
  const updateUrl = (newMode: MobileMode, deptId?: string, palletId?: string) => {
    const params = new URLSearchParams();
    if (newMode !== 'idle') params.set('mode', newMode);
    if (deptId) params.set('deptId', deptId);
    if (palletId) params.set('palletId', palletId);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  useEffect(() => {
    const loadDepts = async () => {
      const depts = await fetchDepartments();
      setDepartments(depts);

      // Restore selected dept if present in URL
      if (initialDeptId) {
        const found = depts.find(d => d.id === initialDeptId);
        if (found) setSelectedDept(found);
      }
    };
    loadDepts();

    const subscription = subscribeToDepartments(() => {
      loadDepts();
    });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const dismissError = () => {
    stopFeedback();
    setFeedbackOverlay(null);
    isProcessingRef.current = false;
  };

  const handleFeedback = (status: 'success' | 'error', text: string) => {
    triggerFeedback(status);

    if (status === 'success') {
      setFeedbackOverlay({ status, text });
      setTimeout(() => {
        setFeedbackOverlay(prev => prev?.status === 'success' ? null : prev);
      }, 1000);
    } else {
      setFeedbackOverlay({ status, text });
    }
  };

  const handleScan = async (decodedText: string) => {
    if (isProcessingRef.current || feedbackOverlay) return;

    // Duplicate Check
    if (['checkout_scanning', 'checkin_scanning'].includes(mode)) {
      if (pendingScans.some(item => item.id === decodedText)) {
        isProcessingRef.current = true;
        handleFeedback('error', 'Already in List');
        return;
      }
    }

    isProcessingRef.current = true;

    try {
      if (mode === 'checkout_scanning' && selectedDept) {
        const pallet = await getPalletById(decodedText);
        if (!pallet) {
          handleFeedback('error', 'Pallet Not Found');
        } else if (pallet.status === 'damaged') {
          handleFeedback('error', 'Pallet Damaged');
        } else {
          setPendingScans(prev => [{ id: decodedText, status: pallet.status, location: pallet.current_location }, ...prev]);
          handleFeedback('success', decodedText);
        }

      } else if (mode === 'checkin_scanning') {
        const pallet = await getPalletById(decodedText);
        if (!pallet) {
          handleFeedback('error', 'Pallet Not Found');
        } else if (pallet.status === 'damaged') {
          handleFeedback('error', 'Error: Pallet Damaged');
        } else {
          setPendingScans(prev => [{ id: decodedText, status: pallet.status, location: pallet.current_location }, ...prev]);
          handleFeedback('success', decodedText);
        }

      } else if (mode === 'damage_scanning') {
        const pallet = await getPalletById(decodedText);

        if (!pallet) {
          handleFeedback('error', 'Pallet Not Found');
        } else if (pallet.status === 'damaged') {
          handleFeedback('error', 'Already Damaged');
        } else {
          setLastScannedForDamage(decodedText);
          handleFeedback('success', decodedText);
          setTimeout(() => {
            setModeState('damage_form');
            updateUrl('damage_form', undefined, decodedText);
            isProcessingRef.current = false;
          }, 1000);
          return;
        }
      }
    } catch (error) {
      console.error(error);
      handleFeedback('error', 'Scan Error');
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 2000);
  };

  const handleBatchConfirm = async () => {
    if (pendingScans.length === 0) return;
    setIsSubmitting(true);

    try {
      if (mode === 'checkout_scanning' && selectedDept) {
        await Promise.all(pendingScans.map(item =>
          checkOutPallet(item.id, selectedDept.id, selectedDept.name, user.id)
        ));
        toast.success(`Successfully Checked Out ${pendingScans.length} pallets.`);
      } else if (mode === 'checkin_scanning') {
        await Promise.all(pendingScans.map(item =>
          checkInPallet(item.id, user.id)
        ));
        toast.success(`Successfully Returned ${pendingScans.length} pallets.`);
      }
      // Reset
      setModeState('idle');
      updateUrl('idle');
      setPendingScans([]);
      setSelectedDept(null);
    } catch (e) {
      toast.error("Error processing batch. Please try again.");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeItem = (id: string) => {
    setPendingScans(prev => prev.filter(i => i.id !== id));
  };

  const startMode = (newMode: MobileMode, deptId?: string) => {
    setPendingScans([]);
    isProcessingRef.current = false;
    setModeState(newMode);

    // If deptId provided, use it, otherwise use current selectedDept id if exists
    // But if we are starting a mode that isn't checkout, we might want to clear dept?
    // For now, flexible:
    const targetDeptId = deptId || (newMode === 'checkout_scanning' ? selectedDept?.id : undefined);
    updateUrl(newMode, targetDeptId);
  };


  // --- RENDER ---

  if (mode === 'history') {
    return (
      <MobileHistory
        userId={user.id}
        onBack={() => {
          setModeState('idle');
          updateUrl('idle');
        }}
      />
    );
  }

  if (mode === 'damage_form') {
    return (
      <DamageForm
        palletId={lastScannedForDamage || ''}
        userId={user.id}
        onSuccess={() => {
          setModeState('idle');
          updateUrl('idle');
          setLastScannedForDamage(null);
        }}
        onCancel={() => {
          setModeState('idle');
          updateUrl('idle');
          setLastScannedForDamage(null);
        }}
      />
    );
  }

  if (mode === 'checkout_select_dept') {
    return (
      <LocationSelector
        departments={departments.filter(d => d.is_active)}
        onSelect={(dept) => {
          setSelectedDept(dept);
          startMode('checkout_scanning', dept.id);
        }}
        onCancel={() => {
          setModeState('idle');
          updateUrl('idle');
        }}
      />
    );
  }

  if (['checkout_scanning', 'checkin_scanning', 'damage_scanning'].includes(mode)) {
    return (
      <>
        <QRScanner
          onScanSuccess={handleScan}
          onClose={() => {
            setModeState('idle');
            updateUrl('idle');
          }}
        />

        {/* VISUAL FEEDBACK OVERLAY */}
        {feedbackOverlay && (
          <FeedbackOverlay
            status={feedbackOverlay.status}
            text={feedbackOverlay.text}
            onDismiss={dismissError} // Only used for error status inside the component logic
          />
        )}

        {/* BOTTOM SHEET / DAMAGE MANUAL ENTRY */}
        {mode === 'damage_scanning' ? (
          <DamageManualEntry onSubmit={(id) => handleScan(id)} />
        ) : (
          <BatchScanList
            mode={mode}
            pendingScans={pendingScans}
            selectedDept={selectedDept}
            isSubmitting={isSubmitting}
            onRemoveItem={removeItem}
            onConfirm={handleBatchConfirm}
          />
        )}
      </>
    );
  }

  // Default: Home
  return <MobileHome user={user} onLogout={onLogout} onSetMode={(m) => startMode(m)} />;
};

export default MobileInterface;
