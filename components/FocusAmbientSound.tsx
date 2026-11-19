'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Pause,
  CloudRain,
  Waves,
  Radio,
  Sparkles,
  Disc,
  X,
  Sliders,
  Maximize2,
  Minimize2
} from 'lucide-react';

export type AmbientSoundType = 'rain' | 'binaural' | 'brown' | 'lofi';

interface SoundOption {
  id: AmbientSoundType;
  name: string;
  subtitle: string;
  freq: string;
  icon: React.ElementType;
}

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'rain',
    name: 'Rain & Storm',
    subtitle: 'Filtered pink noise & droplet resonance',
    freq: 'Multi-band (400-1400 Hz)',
    icon: CloudRain
  },
  {
    id: 'binaural',
    name: 'Binaural Alpha (10 Hz)',
    subtitle: '200Hz L / 210Hz R stereo brainwave entrainment',
    freq: '10.0 Hz Alpha Differential',
    icon: Waves
  },
  {
    id: 'brown',
    name: 'Deep Brown Noise',
    subtitle: 'Brownian integrated noise for ADHD flow state',
    freq: 'Sub-bass roll-off (< 380 Hz)',
    icon: Radio
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Vinyl Static',
    subtitle: 'Analog surface hiss & subtle vinyl crackle',
    freq: 'Highpass band (1.2-5.5 kHz)',
    icon: Disc
  }
];

interface FocusAmbientSoundProps {
  isOpen?: boolean;
  onClose?: () => void;
  floating?: boolean;
}

export const FocusAmbientSound: React.FC<FocusAmbientSoundProps> = ({
  isOpen = true,
  onClose,
  floating = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSound, setActiveSound] = useState<AmbientSoundType>('rain');
  const [volume, setVolume] = useState(0.45); // 0.0 to 1.0
  const [isMuted, setIsMuted] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Web Audio Context & Node Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<Array<{ stop?: () => void; disconnect: () => void }>>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or resume AudioContext
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Stop currently playing synth graph
  const stopAudioGraph = () => {
    activeSourcesRef.current.forEach((src) => {
      try {
        if (src.stop) src.stop();
        src.disconnect();
      } catch {
        // Node already stopped/disconnected
      }
    });
    activeSourcesRef.current = [];
  };

  // Build mathematical Web Audio synth based on chosen ambient mode
  const startAudioGraph = (type: AmbientSoundType) => {
    try {
      const ctx = getAudioContext();
      stopAudioGraph();

      // Master Gain
      const masterGain = ctx.createGain();
      const targetGain = isMuted ? 0 : volume;
      masterGain.gain.setValueAtTime(targetGain, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      if (type === 'brown') {
        // --- DEEP BROWN NOISE SYNTH ---
        // 5-second seamless looped brown noise buffer
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.8; // Gain normalization
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;

        // Warm 2-pole lowpass filter for deep cognitive focus
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        noiseNode.connect(filter);
        filter.connect(masterGain);
        noiseNode.start();

        activeSourcesRef.current.push(noiseNode, filter, masterGain);
      } else if (type === 'binaural') {
        // --- 10HZ ALPHA BINAURAL WAVE SYNTH ---
        // True stereo separation: Left 200 Hz, Right 210 Hz
        const baseFreq = 208; // Soothing carrier pitch
        const beatDelta = 10.0; // 10Hz Alpha state

        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        oscL.type = 'sine';
        oscR.type = 'sine';
        oscL.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        oscR.frequency.setValueAtTime(baseFreq + beatDelta, ctx.currentTime);

        const gainL = ctx.createGain();
        const gainR = ctx.createGain();
        gainL.gain.setValueAtTime(0.35, ctx.currentTime);
        gainR.gain.setValueAtTime(0.35, ctx.currentTime);

        // Merger node for distinct stereo channels
        const merger = ctx.createChannelMerger(2);
        oscL.connect(gainL);
        oscR.connect(gainR);
        gainL.connect(merger, 0, 0); // Left channel
        gainR.connect(merger, 0, 1); // Right channel

        // Add subtle harmonic warm undertone
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(baseFreq / 2, ctx.currentTime);
        subGain.gain.setValueAtTime(0.12, ctx.currentTime);
        subOsc.connect(subGain);
        subGain.connect(masterGain);

        merger.connect(masterGain);

        oscL.start();
        oscR.start();
        subOsc.start();

        activeSourcesRef.current.push(oscL, oscR, subOsc, gainL, gainR, subGain, merger, masterGain);
      } else if (type === 'rain') {
        // --- PROCEDURAL RAIN & ATMOSPHERE SYNTH ---
        // Pink noise buffer
        const bufferSize = ctx.sampleRate * 3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }

        const rainSource = ctx.createBufferSource();
        rainSource.buffer = buffer;
        rainSource.loop = true;

        // Bandpass to shape rainfall acoustic body
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(950, ctx.currentTime);
        bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

        // Lowpass for gentle ambient distance
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(3200, ctx.currentTime);

        rainSource.connect(bandpass);
        bandpass.connect(lowpass);
        lowpass.connect(masterGain);
        rainSource.start();

        activeSourcesRef.current.push(rainSource, bandpass, lowpass, masterGain);
      } else if (type === 'lofi') {
        // --- LO-FI VINYL STATIC & AIR SYNTH ---
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          // Mostly subtle highpass hiss
          let sample = (Math.random() * 2 - 1) * 0.08;
          // Occasional vinyl pops / dust clicks (0.08% chance)
          if (Math.random() < 0.0008) {
            sample += (Math.random() > 0.5 ? 0.7 : -0.7) * (Math.random() * 0.5 + 0.5);
          }
          data[i] = sample;
        }

        const lofiSource = ctx.createBufferSource();
        lofiSource.buffer = buffer;
        lofiSource.loop = true;

        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(1400, ctx.currentTime);

        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(6200, ctx.currentTime);

        lofiSource.connect(hpFilter);
        hpFilter.connect(lpFilter);
        lpFilter.connect(masterGain);
        lofiSource.start();

        activeSourcesRef.current.push(lofiSource, hpFilter, lpFilter, masterGain);
      }
    } catch (err) {
      console.warn('FocusAmbientSound synth error:', err);
    }
  };

  // Sync master gain when volume or mute state changes
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const targetGain = isMuted ? 0 : volume;
      masterGainRef.current.gain.linearRampToValueAtTime(
        targetGain,
        audioCtxRef.current.currentTime + 0.05
      );
    }
  }, [volume, isMuted]);

  // Handle play / pause toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudioGraph();
      setIsPlaying(false);
    } else {
      startAudioGraph(activeSound);
      setIsPlaying(true);
    }
  };

  // Switch sound mode
  const handleSelectSound = (id: AmbientSoundType) => {
    setActiveSound(id);
    if (isPlaying) {
      startAudioGraph(id);
    }
  };

  // Timer auto-stop effect
  const handleSetTimer = (minutes: number | null) => {
    setTimerMinutes(minutes);
    if (minutes === null) {
      setSecondsRemaining(null);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    setSecondsRemaining(minutes * 60);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          stopAudioGraph();
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioGraph();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`${
        floating
          ? 'fixed bottom-6 right-6 z-50 w-96 shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/10'
          : 'w-full'
      } bg-[#141416]/95 backdrop-blur-2xl rounded-3xl p-5 text-white transition-all duration-300 animate-in fade-in zoom-in-95`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isPlaying
                ? 'bg-[#A3E635] text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]'
                : 'bg-white/5 text-zinc-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Focus Ambient Synthesizer</span>
              {isPlaying && (
                <span className="flex gap-0.5 items-end h-3">
                  <span className="w-0.5 bg-[#A3E635] rounded-full animate-bounce h-2" />
                  <span className="w-0.5 bg-[#A3E635] rounded-full animate-bounce h-3 delay-75" />
                  <span className="w-0.5 bg-[#A3E635] rounded-full animate-bounce h-1.5 delay-150" />
                </span>
              )}
            </h3>
            <p className="text-[10px] text-zinc-400">Pure Web Audio math synth (0 assets)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close ambient sound panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preset Soundscapes */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {SOUND_OPTIONS.map((snd) => {
          const Icon = snd.icon;
          const isSelected = activeSound === snd.id;

          return (
            <button
              key={snd.id}
              onClick={() => handleSelectSound(snd.id)}
              className={`flex flex-col text-left p-2.5 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-white/10 border-[#A3E635]/60 shadow-[0_0_12px_rgba(163,230,53,0.15)]'
                  : 'bg-[#08080A]/60 border-white/5 hover:border-white/15 hover:bg-white/5 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Icon
                  className={`w-4 h-4 ${isSelected ? 'text-[#A3E635]' : 'text-zinc-500'}`}
                />
                <span className="text-[9px] font-mono text-zinc-500 tracking-tighter">
                  {snd.freq}
                </span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isSelected ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {snd.name}
              </span>
              <span className="text-[10px] text-zinc-500 leading-tight mt-0.5 truncate w-full">
                {snd.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Primary Player Controls */}
      <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          {/* Main Play / Pause Capsule */}
          <button
            onClick={handleTogglePlay}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-[#A3E635] text-black hover:bg-[#8fd02c]'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Ambient Sound</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start {SOUND_OPTIONS.find((s) => s.id === activeSound)?.name}</span>
              </>
            )}
          </button>

          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3 bg-[#08080A]/60 border border-white/5 px-3 py-2 rounded-2xl">
          <Volume1 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              if (isMuted && val > 0) setIsMuted(false);
            }}
            className="w-full accent-[#A3E635] h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right tabular-nums">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

        {/* Sleep / Session Timer Pills */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
          <span className="text-zinc-500 font-medium">Auto-Off:</span>
          <div className="flex items-center gap-1">
            {[null, 25, 50, 90].map((mins) => {
              const isSelected = timerMinutes === mins;
              return (
                <button
                  key={mins ?? 'off'}
                  onClick={() => handleSetTimer(mins)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                    isSelected
                      ? 'bg-[#A3E635] text-black'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {mins ? `${mins}m` : 'Off'}
                </button>
              );
            })}
          </div>
          {secondsRemaining !== null && (
            <span className="font-mono text-[10px] text-[#A3E635] tabular-nums">
              {Math.floor(secondsRemaining / 60)}:
              {(secondsRemaining % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
