import type React from "react";
import type { MosaicPiece as MosaicPieceData } from "@/types/types";
import { resolveAllCollisions } from "@/utils/mosaicUtils";

/**
 * beginDrag:
 * 1. Bring piece to front.
 * 2. Set dragging piece ID.
 * 3. Record offset (mouse position vs. piece's bounding rect).
 */
export function beginDrag(
  evt: React.PointerEvent<HTMLDivElement>,
  pieceId: string,
  bringToFront: (id: string) => void,
  setDraggingId: React.Dispatch<React.SetStateAction<string | null>>,
  setDragOffset: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
    }>
  >
): void {
  bringToFront(pieceId);
  setDraggingId(pieceId);

  const rect = evt.currentTarget.getBoundingClientRect();
  setDragOffset({
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  });

  evt.preventDefault();
  evt.stopPropagation();
}

/**
 * updateDrag:
 * 1. Update piece position based on mouse pointer (minus offset).
 * 2. Snap to grid if needed.
 * 3. Resolve collisions.
 */
export function updateDrag(
  evt: React.PointerEvent<HTMLDivElement>,
  containerRect: DOMRect,
  draggingId: string | null,
  dragOffset: { x: number; y: number },
  maybeSnap: (val: number) => number,
  setPieces: React.Dispatch<React.SetStateAction<MosaicPieceData[]>>
): void {
  if (!draggingId) return;

  setPieces((prev) => {
    const idx = prev.findIndex((p) => p.id === draggingId);
    if (idx === -1) return prev;
    const piece = prev[idx];

    const newLeft = evt.clientX - containerRect.left - dragOffset.x;
    const newTop = evt.clientY - containerRect.top - dragOffset.y;
    const updated = {
      ...piece,
      left: maybeSnap(newLeft),
      top: maybeSnap(newTop),
    };

    const newArr = [...prev];
    newArr[idx] = updated;
    return resolveAllCollisions(newArr, maybeSnap);
  });

  evt.preventDefault();
}

/** endDrag => simply clears the draggingId. */
export function endDrag(
  setDraggingId: React.Dispatch<React.SetStateAction<string | null>>
): void {
  setDraggingId(null);
}

/**
 * beginResize:
 * 1. Bring piece to front.
 * 2. Store piece's initial size, position, and pointer coords.
 * 3. Set resizing metadata (pieceId + which edge).
 */
export function beginResize(
  evt: React.PointerEvent<HTMLDivElement>,
  pieceId: string,
  edge: string,
  bringToFront: (id: string) => void,
  setResizing: React.Dispatch<
    React.SetStateAction<{
      pieceId: string;
      edge: string;
    } | null>
  >,
  setInitialSize: React.Dispatch<
    React.SetStateAction<{
      w: number;
      h: number;
      top: number;
      left: number;
    }>
  >,
  setInitialPointer: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
    }>
  >,
  pieces: MosaicPieceData[]
): void {
  bringToFront(pieceId);
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return;

  setResizing({ pieceId, edge });
  setInitialSize({
    w: piece.width,
    h: piece.height,
    top: piece.top,
    left: piece.left,
  });
  setInitialPointer({ x: evt.clientX, y: evt.clientY });

  evt.preventDefault();
  evt.stopPropagation();
}

/**
 * updateResize:
 * 1. Adjust piece size/position according to mouse delta.
 * 2. Snap to grid if needed.
 * 3. Enforce min size constraint.
 * 4. Resolve collisions.
 */
export function updateResize(
  evt: React.PointerEvent<HTMLDivElement>,
  resizing: { pieceId: string; edge: string } | null,
  initialPointer: { x: number; y: number },
  initialSize: { w: number; h: number; top: number; left: number },
  MIN_SIZE: number,
  maybeSnap: (val: number) => number,
  setPieces: React.Dispatch<React.SetStateAction<MosaicPieceData[]>>
): void {
  if (!resizing) return;

  const { pieceId, edge } = resizing;
  const dx = evt.clientX - initialPointer.x;
  const dy = evt.clientY - initialPointer.y;

  setPieces((prev) => {
    const idx = prev.findIndex((p) => p.id === pieceId);
    if (idx === -1) return prev;
    const piece = prev[idx];

    let newLeft = piece.left;
    let newTop = piece.top;
    let newW = piece.width;
    let newH = piece.height;

    switch (edge) {
      case "left": {
        const candidateLeft = initialSize.left + dx;
        const candidateW = initialSize.w - dx;
        if (candidateW >= MIN_SIZE) {
          newLeft = maybeSnap(candidateLeft);
          newW = maybeSnap(candidateW);
        }
        break;
      }
      case "right": {
        const candidateW = initialSize.w + dx;
        if (candidateW >= MIN_SIZE) {
          newW = maybeSnap(candidateW);
        }
        break;
      }
      case "top": {
        const candidateTop = initialSize.top + dy;
        const candidateH = initialSize.h - dy;
        if (candidateH >= MIN_SIZE) {
          newTop = maybeSnap(candidateTop);
          newH = maybeSnap(candidateH);
        }
        break;
      }
      case "bottom": {
        const candidateH = initialSize.h + dy;
        if (candidateH >= MIN_SIZE) {
          newH = maybeSnap(candidateH);
        }
        break;
      }
    }

    const updated = {
      ...piece,
      left: newLeft,
      top: newTop,
      width: newW,
      height: newH,
    };
    const newArr = [...prev];
    newArr[idx] = updated;
    return resolveAllCollisions(newArr, maybeSnap);
  });

  evt.preventDefault();
}

/** endResize => clears the resizing state. */
export function endResize(
  setResizing: React.Dispatch<
    React.SetStateAction<{ pieceId: string; edge: string } | null>
  >
): void {
  setResizing(null);
}