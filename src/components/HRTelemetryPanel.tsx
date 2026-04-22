import React from 'react';

interface TelemetryData {
  irisRatio: number;
  shoulderSymmetry: number;
  handVisibility: {
    left: boolean;
    right: boolean;
  };
}

interface HRTelemetryPanelProps {
  data: TelemetryData;
  isVisible: boolean;
}

export const HRTelemetryPanel: React.FC<HRTelemetryPanelProps> = ({ data, isVisible }) => {
  if (!isVisible) return null;

  const getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-cyan-400';
    if (value >= threshold * 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHandStatusColor = (visible: boolean) => {
    return visible ? 'text-cyan-400' : 'text-red-400';
  };

  return (
    <div className="fixed right-0 top-12 bottom-8 w-80 bg-slate-900 border-l border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] z-30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/30 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">HR Telemetry</h2>
        </div>
        <p className="text-[8px] text-cyan-400/60 font-mono mt-1">CYBER-AUDIT MODE</p>
      </div>

      {/* Telemetry Grid */}
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        {/* Iris Ratio */}
        <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">Iris Ratio</h3>
            <span className="text-[7px] font-mono text-cyan-400/60">RCA Math</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold ${getStatusColor(data.irisRatio * 100, 85)}`}>
              {(data.irisRatio * 100).toFixed(1)}%
            </span>
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${data.irisRatio >= 0.85 ? 'bg-cyan-400' : data.irisRatio >= 0.7 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${data.irisRatio * 100}%` }}
              />
            </div>
          </div>
          <p className="text-[7px] text-cyan-400/40 font-mono mt-2">
            {data.irisRatio >= 0.85 ? 'OPTIMAL' : data.irisRatio >= 0.7 ? 'MARGINAL' : 'DEVIATION'}
          </p>
        </div>

        {/* Shoulder Symmetry */}
        <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">Shoulder Symmetry</h3>
            <span className="text-[7px] font-mono text-cyan-400/60">POSTURE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-bold ${getStatusColor(data.shoulderSymmetry * 100, 90)}`}>
              {(data.shoulderSymmetry * 100).toFixed(1)}%
            </span>
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${data.shoulderSymmetry >= 0.9 ? 'bg-cyan-400' : data.shoulderSymmetry >= 0.75 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${data.shoulderSymmetry * 100}%` }}
              />
            </div>
          </div>
          <p className="text-[7px] text-cyan-400/40 font-mono mt-2">
            {data.shoulderSymmetry >= 0.9 ? 'BALANCED' : data.shoulderSymmetry >= 0.75 ? 'LEANING' : 'SEVERE LEAN'}
          </p>
        </div>

        {/* Hand Visibility */}
        <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">Hand Visibility</h3>
            <span className="text-[7px] font-mono text-cyan-400/60">GESTURE</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${data.handVisibility.left ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
              <span className={`text-[8px] font-mono ${getHandStatusColor(data.handVisibility.left)}`}>
                LEFT: {data.handVisibility.left ? 'VISIBLE' : 'HIDDEN'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${data.handVisibility.right ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
              <span className={`text-[8px] font-mono ${getHandStatusColor(data.handVisibility.right)}`}>
                RIGHT: {data.handVisibility.right ? 'VISIBLE' : 'HIDDEN'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="bg-slate-800/30 border border-cyan-500/10 rounded-lg p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[7px] text-cyan-400/60 font-mono">FPS</span>
              <span className="text-[7px] text-cyan-400 font-mono">30.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[7px] text-cyan-400/60 font-mono">LATENCY</span>
              <span className="text-[7px] text-cyan-400 font-mono">12ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[7px] text-cyan-400/60 font-mono">CONFIDENCE</span>
              <span className="text-[7px] text-cyan-400 font-mono">94.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
