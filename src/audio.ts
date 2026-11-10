type AudioBus = { context: AudioContext; master: GainNode };

/**
 * Tiny Web Audio instrument: a mechanical shutter and a soft two-note chime.
 * The AudioContext is only created in response to a user gesture, and every
 * sound is silent while muted.
 */
export class CaptureAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;

  constructor(muted = false) {
    this.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.82, now, 0.02);
    }
  }

  unlock(): void {
    if (this.muted) return;
    void this.ready().catch(() => undefined);
  }

  playShutter(): void {
    void this.shutter().catch(() => undefined);
  }

  playChime(): void {
    void this.chime().catch(() => undefined);
  }

  playError(): void {
    void this.error().catch(() => undefined);
  }

  private async ready(): Promise<AudioBus | null> {
    if (this.muted) return null;

    if (!this.context) {
      const AudioConstructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioConstructor) return null;
      const context = new AudioConstructor();
      const master = context.createGain();
      master.gain.value = 0.82;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return { context: this.context, master: this.master as GainNode };
  }

  private async shutter(): Promise<void> {
    const bus = await this.ready();
    if (!bus) return;
    const { context, master } = bus;
    const now = context.currentTime + 0.005;

    // The soft air of a leaf shutter.
    const length = Math.floor(context.sampleRate * 0.11);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const decay = Math.pow(1 - i / length, 2.4);
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 850;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 7200;
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.34, now + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
    noise.connect(highpass).connect(lowpass).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 0.12);

    // The mechanical body.
    const body = context.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(320, now + 0.003);
    body.frequency.exponentialRampToValueAtTime(92, now + 0.075);
    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(0.2, now + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
    body.connect(bodyGain).connect(master);
    body.start(now);
    body.stop(now + 0.1);

    // A tiny second click, like the shutter closing.
    const click = context.createOscillator();
    click.type = "square";
    click.frequency.setValueAtTime(1450, now + 0.045);
    const clickGain = context.createGain();
    clickGain.gain.setValueAtTime(0.0001, now + 0.045);
    clickGain.gain.linearRampToValueAtTime(0.018, now + 0.047);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    click.connect(clickGain).connect(master);
    click.start(now + 0.045);
    click.stop(now + 0.07);
  }

  private async chime(): Promise<void> {
    const bus = await this.ready();
    if (!bus) return;
    const { context, master } = bus;
    const now = context.currentTime + 0.01;
    const notes = [
      { frequency: 1046.5, delay: 0, gain: 0.065, duration: 0.42 },
      { frequency: 1568.0, delay: 0.055, gain: 0.05, duration: 0.4 },
      { frequency: 2093.0, delay: 0.115, gain: 0.027, duration: 0.34 },
    ];

    for (const note of notes) {
      const start = now + note.delay;
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = note.frequency;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(note.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + note.duration + 0.03);
    }
  }

  private async error(): Promise<void> {
    const bus = await this.ready();
    if (!bus) return;
    const { context, master } = bus;
    const now = context.currentTime + 0.01;
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(185, now);
    oscillator.frequency.exponentialRampToValueAtTime(135, now + 0.16);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  }
}
