/**
 * Pure JavaScript mulaw audio encoder
 * No external dependencies - works everywhere
 */

// mulaw encoding table (inverse of decode table)
const MULAW_ENCODE_TABLE = new Uint8Array(256);

// Build mulaw encode table
for (let i = 0; i < 256; i++) {
  let sample = i - 128;
  const sign = (sample < 0) ? 0x80 : 0x00;
  if (sample < 0) sample = -sample;
  
  sample += 132;
  let exponent = 7;
  for (let exp_mask = 0x4000; (sample & exp_mask) === 0 && exponent > 0; exponent--, exp_mask >>= 1);
  
  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  const mulaw = ~(sign | (exponent << 4) | mantissa);
  
  MULAW_ENCODE_TABLE[i] = mulaw & 0xFF;
}

/**
 * Convert linear PCM Int16 to mulaw
 * @param {Int16Array} pcmData - 16-bit PCM samples
 * @returns {Buffer} mulaw encoded audio
 */
export function pcm16ToMulaw(pcmData) {
  const mulawData = Buffer.alloc(pcmData.length);
  
  for (let i = 0; i < pcmData.length; i++) {
    // Convert Int16 (-32768 to 32767) to 0-255 range
    const sample = Math.max(-32768, Math.min(32767, pcmData[i]));
    const shifted = ((sample >> 8) + 128) & 0xFF;
    mulawData[i] = MULAW_ENCODE_TABLE[shifted];
  }
  
  return mulawData;
}

/**
 * Resample PCM audio to target sample rate
 * Simple linear interpolation
 * @param {Buffer} pcmBuffer - Raw PCM data (16-bit)
 * @param {number} fromRate - Source sample rate
 * @param {number} toRate - Target sample rate  
 * @returns {Int16Array} Resampled PCM data
 */
export function resamplePCM(pcmBuffer, fromRate, toRate) {
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
  const ratio = fromRate / toRate;
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Int16Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const frac = srcIndex - srcIndexFloor;
    
    // Linear interpolation
    output[i] = Math.round(
      samples[srcIndexFloor] * (1 - frac) + samples[srcIndexCeil] * frac
    );
  }
  
  return output;
}

/**
 * Convert stereo to mono by averaging channels
 * @param {Int16Array} stereoData - Interleaved stereo PCM
 * @returns {Int16Array} Mono PCM
 */
export function stereoToMono(stereoData) {
  const monoData = new Int16Array(stereoData.length / 2);
  
  for (let i = 0; i < monoData.length; i++) {
    const left = stereoData[i * 2];
    const right = stereoData[i * 2 + 1];
    monoData[i] = Math.round((left + right) / 2);
  }
  
  return monoData;
}
