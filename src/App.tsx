import React, { useState, useRef } from 'react';
import { useLockdown } from './hooks/useLockdown';
import { useGaze } from './hooks/useGaze';
import { GazeTrackerMediaPipe } from './components/GazeTrackerMediaPipe';
import { HRTelemetryPanel } from './components/HRTelemetryPanel';
import { PreFlight } from './components/PreFlight';
import { useTrustStore } from './store/useTrustStore';

const TrustScreenApp: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isHRMode, setIsHRMode] = useState(false);
  const [showPreFlight, setShowPreFlight] = useState(true);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<number | null>(null);
  const { requestFullscreen } = useLockdown(isStarted);
  const { irisRatio, shoulderSymmetry, handVisibility, isSimulated } = useGaze();
  const { 
    trustScore, 
    violations, 
    isFullscreenExited, 
    setFullscreenExited,
    isFinished,
    startTime,
    startSession,
    endSession,
    generateReport,
    reset
  } = useTrustStore();

  const handlePreFlightComplete = async () => {
    setShowPreFlight(false);
  };

  const handleStart = async () => {
    startSession();
    await requestFullscreen();
    setIsStarted(true);
  };

  const handleResume = async () => {
    await requestFullscreen();
    setFullscreenExited(false);
  };

  const handleSubmit = () => {
    endSession();
    setIsStarted(false);
  };

  const handleDownloadReport = () => {
    const report = generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustScreen_Report_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSecure = trustScore >= 90 && !isFullscreenExited;

  const handleTrustScoreClick = () => {
    clickCountRef.current += 1;
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 500);
    
    if (clickCountRef.current === 3) {
      setIsHRMode(prev => !prev);
      clickCountRef.current = 0;
    }
  };

  // PreFlight Validation Screen
  if (showPreFlight) {
    return <PreFlight onValidationComplete={handlePreFlightComplete} />;
  }

  // Final Report View
  if (isFinished) {
    const report = generateReport();
    const verdictColor = 
      report.verdict === 'Verified Integrity' ? 'text-success' :
      report.verdict === 'Flagged for Review' ? 'text-primary' : 'text-danger';

    return (
      <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center p-12 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_100%)]">
        <div className="w-full max-w-4xl bg-bg-card border border-white/5 shadow-2xl p-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-primary shadow-[0_0_20px_var(--primary-glow)]" />
          
          <header className="mb-16 border-b border-white/5 pb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Finalization Summary</h1>
              <p className="text-[10px] font-mono text-text-muted tracking-[0.4em] uppercase">Session Audit Log 0x{startTime}</p>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-mono font-black ${verdictColor}`}>{report.score}%</span>
              <p className="text-[8px] uppercase tracking-widest text-text-muted mt-1">Integrity Quotient</p>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-16 mb-16">
            <div className="space-y-2">
              <p className="text-[10px] text-text-muted uppercase tracking-widest">Verdict</p>
              <p className={`text-xl font-bold uppercase ${verdictColor}`}>{report.verdict}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-text-muted uppercase tracking-widest">Duration</p>
              <p className="text-xl font-bold uppercase">{Math.floor(report.duration / 60)}m {report.duration % 60}s</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-text-muted uppercase tracking-widest">Total Deviations</p>
              <p className="text-xl font-bold uppercase">{report.violations.length}</p>
            </div>
          </div>

          <div className="mb-16 bg-bg-dark/40 border border-white/5 p-8 max-h-64 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-2">Full Audit Trail</p>
            <div className="space-y-4">
              {report.violations.length === 0 ? (
                <p className="text-xs italic text-text-muted/40">Clean record. No deviations detected.</p>
              ) : (
                report.violations.map((v, i) => (
                  <div key={i} className="flex gap-4 text-[10px] font-mono leading-relaxed">
                    <span className="text-primary opacity-50">[{i+1}]</span>
                    <span className="text-text-muted">{v}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-6">
            <button 
              onClick={handleDownloadReport}
              className="flex-1 px-8 py-4 bg-primary text-bg-dark font-black uppercase text-[10px] tracking-[.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_var(--primary-glow)]"
            >
              Export JSON Report
            </button>
            <button 
              onClick={reset}
              className="px-8 py-4 border border-white/10 text-white font-black uppercase text-[10px] tracking-[.3em] hover:bg-white/5 transition-all"
            >
              New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col font-sans selection:bg-primary/30">
      {/* Security Violation Overlay */}
      {isStarted && isFullscreenExited && !isFinished && (
        <div className="fixed inset-0 z-[100] bg-bg-dark flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 border border-danger rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_var(--danger-glow)]">
             <span className="text-danger text-2xl font-mono">!</span>
          </div>
          <h2 className="text-3xl font-mono mb-2 tracking-widest text-danger uppercase">Security Breach</h2>
          <p className="text-text-muted text-sm mb-8 max-w-md">
            Environment integrity compromised: Fullscreen exited. 
            All activity has been logged.
          </p>
          <button 
            onClick={handleResume}
            className="px-8 py-3 border border-text-main hover:bg-text-main hover:text-bg-dark transition-all duration-300 uppercase tracking-widest text-[10px] font-bold"
          >
            Restore Session
          </button>
        </div>
      )}

      {/* Minimalism Top Bar */}
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-bg-dark/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">TrustScreen</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
            {isStarted ? 'Session: SECURED' : 'Session: IDLE'}
          </div>
        </div>
        
        <div className="flex items-center gap-12">
          {isStarted && (
            <button 
              onClick={handleSubmit}
              className="text-[9px] font-black uppercase tracking-[0.3em] text-danger border border-danger/30 px-4 py-1 hover:bg-danger hover:text-white transition-all duration-300"
            >
              Submit Interview
            </button>
          )}
          <div className="flex items-center gap-4 cursor-pointer" onClick={handleTrustScoreClick}>
            <span className="text-[9px] uppercase tracking-widest text-text-muted">Trust Score</span>
            <span className={`text-xs font-mono font-bold ${trustScore > 80 ? 'text-success' : 'text-danger'}`}>
              {trustScore}%
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] uppercase tracking-widest text-text-muted">Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${isSecure ? 'bg-success animate-pulse' : 'bg-danger shadow-[0_0_5px_var(--danger)]'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isSecure ? 'text-success' : 'text-danger'}`}>
                {isSecure ? 'Secure' : 'Alert'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 flex overflow-hidden border-b border-white/5 ${isHRMode ? 'border-cyan-500/30' : ''}`}>
        {/* Left: Feed Area */}
        <div className="flex-1 p-12 flex items-center justify-center relative">
          {!isStarted ? (
            <div className="flex flex-col items-center max-w-sm text-center">
              <h2 className="text-xl font-light mb-4 tracking-widest uppercase">Initializing Perimeter</h2>
              <p className="text-text-muted text-xs mb-8 leading-relaxed">
                Click below to begin the secured proctoring session. Your camera, keyboard, and window focus will be monitored.
              </p>
              <button 
                onClick={handleStart}
                className="group relative px-10 py-4 overflow-hidden border border-primary/50 transition-all duration-500 hover:border-primary"
              >
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
                <span className="relative text-[10px] font-bold tracking-[0.3em] uppercase text-primary">Engage Lockdown</span>
              </button>
            </div>
          ) : (
            <div className="w-full h-full max-w-3xl flex flex-col items-center justify-center">
               <GazeTrackerMediaPipe isSecure={isSecure} />
               <div className="mt-8 flex gap-12 text-[9px] text-text-muted font-mono uppercase tracking-[0.2em] opacity-40">
                  <span>Engine: {isSimulated ? 'Simulated_Gaze' : 'MediaPipe_v4'}</span>
                  <span>Target: Linux_20</span>
                  {isSimulated && <span className="text-danger animate-pulse">! Simulated Gaze Fallback Active</span>}
               </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar Activity */}
        <div className={`w-72 border-l flex flex-col bg-bg-card/30 ${isHRMode ? 'border-l-cyan-500/30' : 'border-l-white/5'}`}>
          <div className="p-6 border-b border-white/5">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted mb-6">Device Matrix</h3>
            <div className="space-y-4">
              <Indicator label="Camera" active={isStarted} />
              <Indicator label="Overlay" active={isStarted} />
              <Indicator label="Focus" active={!isFullscreenExited} />
            </div>
          </div>

          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted mb-6 flex items-center justify-between">
              Audit Stream
              <span className="text-[8px] opacity-30">HEX_0x{violations.length.toString(16).toUpperCase()}</span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {violations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                   <div className="w-px h-12 bg-white/50 mb-4" />
                   <span className="text-[8px] font-bold uppercase tracking-widest">Idle</span>
                </div>
              ) : (
                violations.map((v, i) => (
                  <div key={i} className="group border-l border-danger/30 pl-3 py-1">
                    <p className="text-[9px] font-mono leading-relaxed text-text-muted group-hover:text-danger/80 transition-colors">
                      {v}
                    </p>
                  </div>
                )).reverse()
              )}
            </div>
          </div>
        </div>
      </main>

      {/* HR Telemetry Panel */}
      <HRTelemetryPanel 
        isVisible={isHRMode}
        data={{
          irisRatio,
          shoulderSymmetry,
          handVisibility
        }}
      />

      {/* Mini Footer */}
      <footer className="h-8 px-6 flex items-center justify-between text-[8px] font-mono text-text-muted opacity-30 uppercase tracking-[0.2em]">
        <div>P99: 14ms | Latency: 8ms</div>
        <div>Orchestrator: PRO_Lvl2</div>
      </footer>
    </div>
  );
};

const Indicator: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div className="flex items-center justify-between">
    <span className="text-[9px] text-text-muted/60 uppercase tracking-widest">{label}</span>
    <div className={`w-1 h-1 rounded-full ${active ? 'bg-primary shadow-[0_0_4px_var(--primary)]' : 'bg-white/5'}`} />
  </div>
);

export default TrustScreenApp;
