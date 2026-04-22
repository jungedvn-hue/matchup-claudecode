import { useMemo } from "react";

/**
 * Generate a simple deterministic QR-like SVG pattern from a string.
 * This is a UI demo — not a real QR encoder.
 */
export const useQRCode = (data: string, size = 120) => {
  return useMemo(() => {
    const grid = 9;
    const cellSize = size / grid;
    // Simple hash to create deterministic pattern
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
    }

    const cells: boolean[][] = Array.from({ length: grid }, (_, row) =>
      Array.from({ length: grid }, (_, col) => {
        // Corner markers (always filled)
        if (
          (row < 3 && col < 3) ||
          (row < 3 && col >= grid - 3) ||
          (row >= grid - 3 && col < 3)
        ) {
          const isOuter =
            row === 0 || col === 0 ||
            row === 2 || col === 2 ||
            row === grid - 1 || col === grid - 1 ||
            row === grid - 3 || col === grid - 3;
          const isCenter =
            (row === 1 && col === 1) ||
            (row === 1 && col === grid - 2) ||
            (row === grid - 2 && col === 1);
          return isOuter || isCenter;
        }
        // Data area — deterministic from hash
        const seed = (hash + row * 31 + col * 17) >>> 0;
        return seed % 3 !== 0;
      })
    );

    return { cells, grid, cellSize, size };
  }, [data, size]);
};
