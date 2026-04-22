import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FinalReport {
  score: number;
  verdict: 'Verified Integrity' | 'Flagged for Review' | 'Integrity Compromised';
  duration: number;
  violations: string[];
}

interface TrustState {
  trustScore: number;
  violations: string[];
  isFullscreenExited: boolean;
  isFinished: boolean;
  startTime: number | null;
  endTime: number | null;
  
  startSession: () => void;
  endSession: () => void;
  deductPoints: (points: number, reason: string) => void;
  addViolation: (reason: string) => void;
  setFullscreenExited: (exited: boolean) => void;
  reset: () => void;
  generateReport: () => FinalReport;
}

export const useTrustStore = create<TrustState>()(
  persist(
    (set, get) => ({
      trustScore: 100,
      violations: [],
      isFullscreenExited: false,
      isFinished: false,
      startTime: null,
      endTime: null,

      startSession: () => set({ 
        startTime: Date.now(), 
        isFinished: false, 
        trustScore: 100, 
        violations: [],
        endTime: null 
      }),

      endSession: () => set({ 
        isFinished: true, 
        endTime: Date.now() 
      }),

      deductPoints: (points, reason) => set((state) => {
        if (state.isFinished) return state;
        const timestamp = new Date().toLocaleTimeString();
        return {
          trustScore: Math.max(0, state.trustScore - points),
          violations: [...state.violations, `${timestamp}: ${reason} (-${points} pts)`],
        };
      }),

      addViolation: (reason) => set((state) => {
        if (state.isFinished) return state;
        const timestamp = new Date().toLocaleTimeString();
        return {
          violations: [...state.violations, `${timestamp}: ${reason}`],
        };
      }),

      setFullscreenExited: (exited) => set({ isFullscreenExited: exited }),

      reset: () => set({ 
        trustScore: 100, 
        violations: [], 
        isFullscreenExited: false, 
        isFinished: false, 
        startTime: null,
        endTime: null
      }),

      generateReport: () => {
        const state = get();
        const duration = state.startTime && state.endTime 
          ? Math.floor((state.endTime - state.startTime) / 1000) 
          : 0;
        
        let verdict: FinalReport['verdict'] = 'Verified Integrity';
        if (state.trustScore < 60) verdict = 'Integrity Compromised';
        else if (state.trustScore < 85) verdict = 'Flagged for Review';

        return {
          score: state.trustScore,
          verdict,
          duration,
          violations: state.violations,
        };
      },
    }),
    {
      name: 'trust-screen-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
