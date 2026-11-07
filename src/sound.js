// Continuous sound sources are allocated once, never per frame.
export function createDrivingSound(context) {
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const node = (type, freq) => {
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    return { osc, gain };
  };
  const engine = node("sawtooth", 45),
    sub = node("triangle", 24),
    siren = node("sine", 700);
  const buffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    ),
    data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = (frequency, type) => {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = frequency;
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    return gain;
  };
  const skid = noise(1800, "bandpass"),
    boost = noise(700, "lowpass");
  const set = (param, v) => param.setTargetAtTime(v, context.currentTime, 0.06);
  return {
    update({ on, car, input, heat, nearestCop, time }) {
      set(master.gain, on ? 0.23 : 0);
      set(
        engine.osc.frequency,
        38 + (Math.abs(car.speed) % 14) * 8 + Math.abs(input.throttle) * 18,
      );
      set(engine.gain.gain, 0.12);
      set(sub.osc.frequency, 26 + Math.abs(car.speed) * 0.6);
      set(sub.gain.gain, 0.12);
      set(skid.gain, input.handbrake && Math.abs(car.speed) > 6 ? 0.23 : 0);
      set(
        boost.gain,
        input.boost && car.nitro > 0 && input.throttle > 0 ? 0.28 : 0,
      );
      set(siren.osc.frequency, 700 + Math.sin(time * 5) * 320);
      set(
        siren.gain.gain,
        heat > 0 ? Math.max(0, 1 - nearestCop / 220) * 0.2 : 0,
      );
    },
  };
}
