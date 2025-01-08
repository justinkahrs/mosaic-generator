"use client";

import React, { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import { Button, Box } from "@mui/material";

/**
 * Represents a single piece in the mosaic:
 * - 'type': "image" | "color"
 * - 'src': data URL or file path for images
 * - 'width','height' : piece dimension
 * - 'top','left' : piece position
 * - 'hero': optional marker for future logic
 */
interface MosaicPiece {
  id: string;
  type: "image" | "color";
  src?: string;
  color?: string;
  width: number;
  height: number;
  top: number;
  left: number;
  hero?: boolean;
}

// Grid snapping
const GRID_SIZE = 20;
// Minimum piece dimension
const MIN_SIZE = 30;

/**
 * Helper to snap a value to the grid
 */
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Collision detection: checks if two pieces overlap
 */
function doOverlap(a: MosaicPiece, b: MosaicPiece): boolean {
  const rectA = { left: a.left, right: a.left + a.width, top: a.top, bottom: a.top + a.height };
  const rectB = { left: b.left, right: b.left + b.width, top: b.top, bottom: b.top + b.height };

  return !(
    rectA.right <= rectB.left ||
    rectA.left >= rectB.right ||
    rectA.bottom <= rectB.top ||
    rectA.top >= rectB.bottom
  );
}

/**
 * Nudges a piece in the specified direction until it's no longer overlapping others,
 * or we hit a max iteration.
 */
function nudgeUntilNoOverlap(
  piece: MosaicPiece,
  others: MosaicPiece[],
  direction: { x: number; y: number }
): MosaicPiece {
  let updated = piece;
  const MAX_ITER = 200; // to avoid infinite loops
  let iter = 0;
  while (true) {
    // Check for overlap with any piece in `others`
    const anyOverlap = others.some(
      (o) => o.id !== updated.id && doOverlap(updated, o)
    );
    if (!anyOverlap) break;
    // Nudge piece
    updated = {
      ...updated,
      left: updated.left + direction.x * GRID_SIZE,
      top: updated.top + direction.y * GRID_SIZE,
    };
    iter++;
    if (iter > MAX_ITER) {
      // Fallback: break to avoid infinite loop
      break;
    }
  }
  return updated;
}

/**
 * Fully resolves collisions in the entire set by repeatedly nudging pieces that collide
 * until no collisions remain or we exceed a max iteration count.
 */
function resolveAllCollisions(pieces: MosaicPiece[]): MosaicPiece[] {
  const MAX_GLOBAL_ITER = 500;
  let iteration = 0;
  let updatedPieces = [...pieces];

  // We'll do a naive repeated pass until stable or max iteration
  while (iteration < MAX_GLOBAL_ITER) {
    let collisionFound = false;
    for (let i = 0; i < updatedPieces.length; i++) {
      for (let j = i + 1; j < updatedPieces.length; j++) {
        const p1 = updatedPieces[i];
        const p2 = updatedPieces[j];
        if (doOverlap(p1, p2)) {
          collisionFound = true;

          // We'll nudge p2 downward or to the right if it collides
          // Or for variety, we can pick direction based on whichever has smaller area
          const dir = p1.width * p1.height < p2.width * p2.height ? { x: 1, y: 0 } : { x: 0, y: 1 };

          const newP2 = nudgeUntilNoOverlap(p2, updatedPieces.filter((_, idx) => idx !== j), dir);
          updatedPieces[j] = newP2;
        }
      }
    }
    if (!collisionFound) break;
    iteration++;
  }

  return updatedPieces;
}

/**
 * Attempts to place a new piece at or near (left, top). If that position collides, we nudge it
 * until no collision remains. Returns the final placed piece.
 */
function findNonOverlappingPlacement(
  newPiece: MosaicPiece,
  existingPieces: MosaicPiece[]
): MosaicPiece {
  // We do a naive approach: increment top in grid steps until no collision is found
  // (or we give up).
  const MAX_PLACE_ITER = 500;
  let candidate = { ...newPiece };
  let iteration = 0;
  while (iteration < MAX_PLACE_ITER) {
    const anyOverlap = existingPieces.some((o) => doOverlap(candidate, o));
    if (!anyOverlap) {
      return candidate;
    }
    // Move down one grid step
    candidate.top += GRID_SIZE;
    iteration++;
  }
  // If we can't find a spot, return as is
  return candidate;
}

export default function MosaicPage() {
  const [pieces, setPieces] = useState<MosaicPiece[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resize state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [initialPointer, setInitialPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // For simple BFS-like insertion, we place pieces using findNonOverlappingPlacement.

  /**
   * Creates new image pieces for each file, places them collision-free.
   */
  const onFileChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files) return;
    const files = Array.from(evt.target.files);

    let currentPieces = [...pieces];
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file);
      // We'll start at random top/left
      const candidate: MosaicPiece = {
        id: crypto.randomUUID(),
        type: "image",
        src: dataUrl,
        width: snapToGrid(150 + Math.random() * 100),
        height: snapToGrid(100 + Math.random() * 80),
        top: snapToGrid(Math.random() * 200),
        left: snapToGrid(Math.random() * 200),
      };
      const placed = findNonOverlappingPlacement(candidate, currentPieces);
      currentPieces.push(placed);
      // then globally resolve collisions
      currentPieces = resolveAllCollisions(currentPieces);
    }
    setPieces(currentPieces);
  };

  /**
   * Creates random color blocks, places them collision-free.
   */
  const addColorBlocks = () => {
    let currentPieces = [...pieces];
    const colors = ["#FFC107", "#8BC34A", "#F44336", "#3F51B5", "#E91E63"];
    for (const color of colors) {
      const candidate: MosaicPiece = {
        id: crypto.randomUUID(),
        type: "color",
        color,
        width: snapToGrid(60 + Math.random() * 60),
        height: snapToGrid(60 + Math.random() * 60),
        top: snapToGrid(Math.random() * 200),
        left: snapToGrid(Math.random() * 200),
      };
      const placed = findNonOverlappingPlacement(candidate, currentPieces);
      currentPieces.push(placed);
      currentPieces = resolveAllCollisions(currentPieces);
    }
    setPieces(currentPieces);
  };

  /**
   * Brings piece to front by splicing it to the end
   */
  const bringToFront = (pieceId: string) => {
    setPieces((prev) => {
      const idx = prev.findIndex((p) => p.id === pieceId);
      if (idx === -1) return prev;
      const piece = prev[idx];
      const newArr = [...prev];
      newArr.splice(idx, 1);
      newArr.push(piece);
      return newArr;
    });
  };

  /**
   * handlePiecePointerDown => start dragging if not resizing
   */
  const handlePiecePointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>, pieceId: string) => {
      if (!containerRef.current) return;
      if (resizingId || draggingId) return; // skip if already resizing/dragging

      bringToFront(pieceId);
      setDraggingId(pieceId);

      const rect = evt.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      });
      evt.preventDefault();
      evt.stopPropagation();
    },
    [bringToFront, draggingId, resizingId]
  );

  /**
   * handlePointerMove => drag or resize in real time
   */
  const handlePointerMove = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      // Resizing
      if (resizingId) {
        setPieces((prev) => {
          const index = prev.findIndex((p) => p.id === resizingId);
          if (index === -1) return prev;
          const piece = prev[index];
          const deltaX = evt.clientX - containerRect.left - initialPointer.x;
          const deltaY = evt.clientY - containerRect.top - initialPointer.y;
          let newW = piece.width;
          let newH = piece.height;
          newW = initialSize.w + deltaX;
          newH = initialSize.h + deltaY;
          if (newW < MIN_SIZE) newW = MIN_SIZE;
          if (newH < MIN_SIZE) newH = MIN_SIZE;

          // Snap
          newW = snapToGrid(newW);
          newH = snapToGrid(newH);

          const updated = { ...piece, width: newW, height: newH };
          const newPieces = [...prev];
          newPieces[index] = updated;
          // After each resize step, we do a collision resolution pass
          return resolveAllCollisions(newPieces);
        });
        evt.preventDefault();
        return;
      }

      // Dragging
      if (draggingId) {
        setPieces((prev) => {
          const index = prev.findIndex((p) => p.id === draggingId);
          if (index === -1) return prev;
          const piece = prev[index];
          const newLeft = evt.clientX - containerRect.left - dragOffset.x;
          const newTop = evt.clientY - containerRect.top - dragOffset.y;
          const updated = {
            ...piece,
            left: snapToGrid(newLeft),
            top: snapToGrid(newTop),
          };
          const newPieces = [...prev];
          newPieces[index] = updated;
          return resolveAllCollisions(newPieces);
        });
        evt.preventDefault();
      }
    },
    [draggingId, resizingId, dragOffset, initialPointer, initialSize]
  );

  /**
   * handlePointerUp => stop dragging/resizing
   */
  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
    setResizingId(null);
  }, []);

  /**
   * handleResizeHandlePointerDown => start resizing
   */
  const handleResizeHandlePointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>, pieceId: string) => {
      if (!containerRef.current) return;
      if (draggingId || resizingId) return;

      bringToFront(pieceId);
      setResizingId(pieceId);

      const containerRect = containerRef.current.getBoundingClientRect();
      const pointerX = evt.clientX - containerRect.left;
      const pointerY = evt.clientY - containerRect.top;

      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      setInitialPointer({ x: pointerX, y: pointerY });
      setInitialSize({ w: piece.width, h: piece.height });

      evt.preventDefault();
      evt.stopPropagation();
    },
    [bringToFront, draggingId, resizingId, pieces]
  );

  return (
    <Box
      sx={{ padding: 4 }}
      style={{ touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <h1>Collision-Free Mosaic</h1>
      <div className={styles.controls}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        <Button variant="contained" onClick={() => fileInputRef.current?.click()}>
          Upload Images
        </Button>
        <Button variant="outlined" onClick={addColorBlocks}>
          Add Color Blocks
        </Button>
      </div>

      <div className={styles.mosaicContainer} ref={containerRef}>
        {pieces.map((piece) => {
          const { id, type, src, color, width, height, top, left } = piece;
          return (
            <div
              key={id}
              className={styles.mosaicPiece}
              style={{ width, height, top, left }}
              onPointerDown={(e) => handlePiecePointerDown(e, id)}
            >
              {type === "color" ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: color,
                  }}
                />
              ) : (
                src && (
                  <Image
                    src={src}
                    alt="mosaic-piece"
                    width={width}
                    height={height}
                    style={{ objectFit: "cover" }}
                  />
                )
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  cursor: "se-resize",
                }}
                onPointerDown={(e) => handleResizeHandlePointerDown(e, id)}
              />
            </div>
          );
        })}
      </div>
    </Box>
  );
}

/**
 * Utility to convert file into a data URL
 */
function readFileAsDataURL(file: File): Promise<string> {
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