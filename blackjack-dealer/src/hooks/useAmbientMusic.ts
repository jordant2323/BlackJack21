import { useState, useRef, useCallback, useEffect } from "react";

// Jazz lounge chord progression: Cmaj7 → Am7 → Fmaj7 → G7
const CHORDS = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0,  261.63, 329.63, 392.0 ],
  [174.61, 220.0,  261.63, 329.63],
  [196.0,  246.94, 293.66, 349.23],
];
const BASS = [65.41, 55.0, 43.65, 49.0];
const CHORD_DURATION = 4; // seconds per chord

export function useAmbientMusic() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chordIndexRef = useRef(0);

  const stopAll = useCallback(() => {
    nodesRef.current.forEach(n => {
      try { (n as OscillatorNode).stop?.(); } catch (_) {}
    });
    nodesRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const scheduleChord = useCallback((ctx: AudioContext, master: GainNode) => {
    const idx = chordIndexRef.current % CHORDS.length;
    const chord = CHORDS[idx];
    const bassFreq = BASS[idx];
    const now = ctx.currentTime;
    const dur = CHORD_DURATION;

    // Bass oscillator — deep sine, very slow attack/release
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(bassFreq, now);
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.28, now + 0.8);
    bassGain.gain.linearRampToValueAtTime(0.22, now + dur - 0.5);
    bassGain.gain.linearRampToValueAtTime(0, now + dur);
    bassOsc.connect(bassGain);
    bassGain.connect(master);
    bassOsc.start(now);
    bassOsc.stop(now + dur + 0.1);
    nodesRef.current.push(bassOsc, bassGain);

    // Sub bass — one octave lower, sine, very soft
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(bassFreq / 2, now);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.12, now + 1.0);
    subGain.gain.linearRampToValueAtTime(0, now + dur);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + dur + 0.1);
    nodesRef.current.push(subOsc, subGain);

    // Chord pads — soft triangle oscillators
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      // Slight detune for warmth
      osc.detune.setValueAtTime((i % 2 === 0 ? 1 : -1) * 3, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 1.2);
      gain.gain.linearRampToValueAtTime(0.035, now + dur - 0.8);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.1);
      nodesRef.current.push(osc, gain);
    });

    // Upper chord shimmer (one octave up, very soft)
    chord.slice(0, 2).forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 2, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.012, now + 1.5);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.1);
      nodesRef.current.push(osc, gain);
    });

    chordIndexRef.current++;

    // Overlap slightly so there's no silence between chords
    timerRef.current = setTimeout(() => {
      if (ctxRef.current && masterRef.current) {
        scheduleChord(ctxRef.current, masterRef.current);
      }
    }, (dur - 0.3) * 1000);
  }, []);

  const start = useCallback(() => {
    if (playing) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);

    // Warm low-pass filter for the whole mix
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    master.connect(filter);
    filter.connect(ctx.destination);

    ctxRef.current = ctx;
    masterRef.current = master;
    chordIndexRef.current = 0;
    scheduleChord(ctx, master);
    setPlaying(true);
  }, [playing, scheduleChord]);

  const stop = useCallback(() => {
    if (!playing) return;
    const master = masterRef.current;
    const ctx = ctxRef.current;
    if (master && ctx) {
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        stopAll();
        ctx.close();
        ctxRef.current = null;
        masterRef.current = null;
      }, 1600);
    }
    setPlaying(false);
  }, [playing, stopAll]);

  const toggle = useCallback(() => {
    if (playing) stop(); else start();
  }, [playing, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      ctxRef.current?.close();
    };
  }, [stopAll]);

  return { playing, toggle };
}
