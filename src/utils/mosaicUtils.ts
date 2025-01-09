import type { MosaicPiece as MosaicPieceData } from "@/types/types";

export const GRID_SIZE = 20;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * readFileAsDataURL => create Data URL from file.
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("File reading error"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Check if two pieces overlap. */
export function doOverlap(a: MosaicPieceData, b: MosaicPieceData): boolean {
  const rectA = {
    left: a.left,
    right: a.left + a.width,
    top: a.top,
    bottom: a.top + a.height,
  };
  const rectB = {
    left: b.left,
    right: b.left + b.width,
    top: b.top,
    bottom: b.top + b.height,
  };

  return !(
    rectA.right <= rectB.left ||
    rectA.left >= rectB.right ||
    rectA.bottom <= rectB.top ||
    rectA.top >= rectB.bottom
  );
}

/** Nudges a piece until no overlap or hits max iteration. */
export function nudgeUntilNoOverlap(
  piece: MosaicPieceData,
  others: MosaicPieceData[],
  direction: { x: number; y: number },
  maybeSnap: (val: number) => number
): MosaicPieceData {
  let updated = piece;
  const MAX_ITER = 200;
  let iter = 0;
  while (true) {
    const anyOverlap = others.some(
      (o) => o.id !== updated.id && doOverlap(updated, o)
    );
    if (!anyOverlap) break;

    updated = {
      ...updated,
      left: maybeSnap(updated.left + direction.x * GRID_SIZE),
      top: maybeSnap(updated.top + direction.y * GRID_SIZE),
    };
    iter++;
    if (iter > MAX_ITER) {
      break;
    }
  }
  return updated;
}

/** Repeatedly nudge pieces that collide until stable. */
export function resolveAllCollisions(
  pieces: MosaicPieceData[],
  maybeSnap: (val: number) => number
): MosaicPieceData[] {
  const MAX_GLOBAL_ITER = 500;
  let iteration = 0;
  const updatedPieces = [...pieces];

  while (iteration < MAX_GLOBAL_ITER) {
    let collisionFound = false;
    for (let i = 0; i < updatedPieces.length; i++) {
      for (let j = i + 1; j < updatedPieces.length; j++) {
        const p1 = updatedPieces[i];
        const p2 = updatedPieces[j];
        if (doOverlap(p1, p2)) {
          collisionFound = true;
          const dir =
            p1.width * p1.height < p2.width * p2.height
              ? { x: 1, y: 0 }
              : { x: 0, y: 1 };
          const newP2 = nudgeUntilNoOverlap(
            p2,
            updatedPieces.filter((_, idx) => idx !== j),
            dir,
            maybeSnap
          );
          updatedPieces[j] = newP2;
        }
      }
    }
    if (!collisionFound) break;
    iteration++;
  }

  return updatedPieces;
}

/** Insert a new piece, find a non-overlapping place by shifting down if collisions. */
export function findNonOverlappingPlacement(
  newPiece: MosaicPieceData,
  existingPieces: MosaicPieceData[],
  maybeSnap: (val: number) => number
): MosaicPieceData {
  const MAX_PLACE_ITER = 500;
  const candidate = { ...newPiece };
  let iteration = 0;
  while (iteration < MAX_PLACE_ITER) {
    const anyOverlap = existingPieces.some((o) => doOverlap(candidate, o));
    if (!anyOverlap) {
      return candidate;
    }
    candidate.top = maybeSnap(candidate.top + GRID_SIZE);
    iteration++;
  }
  return candidate;
}