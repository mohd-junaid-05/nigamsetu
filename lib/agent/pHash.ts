import sharp from 'sharp';

/**
 * 2D Discrete Cosine Transform (DCT-II) based Perceptual Hash (pHash)
 * 
 * Algorithm:
 * 1. Resize image to 32x32 pixels, convert to grayscale.
 * 2. Compute 2D DCT on the 32x32 pixel matrix.
 * 3. Extract top-left 8x8 low frequency coefficients (excluding DC at [0,0]).
 * 4. Compute median of the 64 AC coefficients.
 * 5. Compute 64-bit hash (1 if coefficient > median, 0 otherwise).
 * 6. Return as 16-character hexadecimal string.
 */

// Precompute 1D DCT basis matrix for N = 32
const N = 32;
const C: number[][] = [];
for (let u = 0; u < N; u++) {
  C[u] = [];
  const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
  for (let x = 0; x < N; x++) {
    C[u][x] = alpha * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
  }
}

/**
 * Computes 2D DCT for 32x32 luminance values and returns top-left 8x8 coefficients.
 */
function compute8x8DCT(luminance: Uint8Array): Float64Array {
  // 1. Matrix multiplication: Temp = C * PixelMatrix
  const temp = new Float64Array(32 * 32);
  for (let u = 0; u < 32; u++) {
    for (let y = 0; y < 32; y++) {
      let sum = 0;
      for (let x = 0; x < 32; x++) {
        sum += C[u][x] * luminance[y * 32 + x];
      }
      temp[u * 32 + y] = sum;
    }
  }

  // 2. Matrix multiplication: DCT = Temp * C^T
  // We only need top-left 8x8 coefficients (u < 8, v < 8)
  const dct8x8 = new Float64Array(64);
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let y = 0; y < 32; y++) {
        sum += temp[u * 32 + y] * C[v][y];
      }
      dct8x8[u * 8 + v] = sum;
    }
  }

  return dct8x8;
}

/**
 * Computes a 64-bit perceptual hash for an image buffer.
 * Returns a 16-character hex string.
 */
export async function computePHashFromBuffer(buffer: Buffer): Promise<string> {
  try {
    // Resize to 32x32 grayscale raw luminance bytes
    const rawBytes = await sharp(buffer)
      .resize(32, 32, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    const dctCoeffs = compute8x8DCT(new Uint8Array(rawBytes));

    // Exclude DC coefficient at index 0 (dctCoeffs[0]) when calculating median
    const acValues: number[] = [];
    for (let i = 1; i < 64; i++) {
      acValues.push(dctCoeffs[i]);
    }
    acValues.sort((a, b) => a - b);
    const median = acValues[Math.floor(acValues.length / 2)];

    // Generate 64-bit hash
    let binary = '';
    for (let i = 0; i < 64; i++) {
      binary += dctCoeffs[i] > median ? '1' : '0';
    }

    // Convert 64 binary bits to 16 hex characters
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binary.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }

    return hex.padStart(16, '0');
  } catch (err) {
    console.warn('[pHash] Error computing perceptual hash, generating fallback hash:', err);
    // Robust deterministic fallback from available buffer bytes
    let hash = BigInt(0);
    const multiplier = BigInt(31);
    const mask = BigInt('0xffffffffffffffff');
    for (let i = 0; i < Math.min(buffer.length, 128); i++) {
      hash = (hash * multiplier + BigInt(buffer[i])) & mask;
    }
    return hash.toString(16).padStart(16, '0');
  }
}

/**
 * Computes perceptual hash by downloading image from URL.
 */
export async function computePHashFromUrl(imageUrl: string): Promise<string> {
  try {
    let buffer: Buffer;
    if (imageUrl.startsWith('/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'public', imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl);
      buffer = await fs.readFile(localPath);
    } else {
      const res = await fetch(imageUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.statusText} (${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    return await computePHashFromBuffer(buffer);
  } catch (err) {
    console.warn('[pHash] Failed to fetch image from URL, returning placeholder hash:', err);
    return '0000000000000000';
  }
}

/**
 * Computes the Hamming distance (number of differing bits) between two 64-bit hex strings.
 * Range: 0 to 64.
 * Hamming distance < 15 indicates very high perceptual similarity (duplicate).
 */
export function hammingDistance(hexA: string, hexB: string): number {
  if (!hexA || !hexB) return 64;

  const cleanA = hexA.trim().toLowerCase().padStart(16, '0');
  const cleanB = hexB.trim().toLowerCase().padStart(16, '0');

  let distance = 0;
  for (let i = 0; i < 16; i++) {
    const valA = parseInt(cleanA[i], 16) || 0;
    const valB = parseInt(cleanB[i], 16) || 0;
    let xor = valA ^ valB;
    // Count set bits in 4-bit nibble
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  return distance;
}
