"use client";

import type React from "react";
import { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import { Button, Box } from "@mui/material";

interface MosaicPiece {
  id: string;
  type: "image" | "color";
  src?: string;
  color?: string;
  width: number;
  height: number;
  top: number;
  left: number;
}

// Grid snapping
const GRID_SIZE = 20;
const MIN_SIZE = 30;

/** Snap a value to the grid. */
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/** Check if two pieces overlap. */
function doOverlap(a: MosaicPiece, b: MosaicPiece): boolean {
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
function nudgeUntilNoOverlap(
  piece: MosaicPiece,
  others: MosaicPiece[],
  direction: { x: number; y: number }
): MosaicPiece {
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
      left: updated.left + direction.x * GRID_SIZE,
      top: updated.top + direction.y * GRID_SIZE,
    };
    iter++;
    if (iter > MAX_ITER) {
      break;
    }
  }
  return updated;
}

/** Repeatedly nudge pieces that collide until stable. */
function resolveAllCollisions(pieces: MosaicPiece[]): MosaicPiece[] {
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
            dir
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
function findNonOverlappingPlacement(
  newPiece: MosaicPiece,
  existingPieces: MosaicPiece[]
): MosaicPiece {
  const MAX_PLACE_ITER = 500;
  const candidate = { ...newPiece };
  let iteration = 0;
  while (iteration < MAX_PLACE_ITER) {
    const anyOverlap = existingPieces.some((o) => doOverlap(candidate, o));
    if (!anyOverlap) {
      return candidate;
    }
    candidate.top += GRID_SIZE;
    iteration++;
  }
  return candidate;
}

export default function MosaicPage() {
  const [pieces, setPieces] = useState<MosaicPiece[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resizing
  const [resizing, setResizing] = useState<{
    pieceId: string;
    edge: string;
  } | null>(null);
  const [initialSize, setInitialSize] = useState({
    w: 0,
    h: 0,
    top: 0,
    left: 0,
  });
  const [initialPointer, setInitialPointer] = useState({ x: 0, y: 0 });

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
  const [contextPieceId, setContextPieceId] = useState<string | null>(null);

  /** Add images. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onFileChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files) return;
    const files = Array.from(evt.target.files);

    let currentPieces = [...pieces];
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file);
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
      currentPieces = resolveAllCollisions(currentPieces);
    }
    setPieces(currentPieces);
  };

  /** Add color blocks. */
  const addColorBlocks = () => {
    let currentPieces = [...pieces];
    const colors = ["#FFC107", "#8BC34A", "#F44336", "#3F51B5", "#E91E63"];
    for (const c of colors) {
      const candidate: MosaicPiece = {
        id: crypto.randomUUID(),
        type: "color",
        color: c,
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

  /** Bring piece to front. */
  const bringToFront = useCallback((pieceId: string) => {
    setPieces((prev) => {
      const idx = prev.findIndex((p) => p.id === pieceId);
      if (idx === -1) return prev;
      const piece = prev[idx];
      const newArr = [...prev];
      newArr.splice(idx, 1);
      newArr.push(piece);
      return newArr;
    });
  }, []);

  /** handlePiecePointerDown => start dragging if not resizing. */
  const handlePiecePointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>, pieceId: string) => {
      if (!containerRef.current) return;
      if (resizing) return; // skip if resizing

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
    [bringToFront, resizing]
  );

  /** handlePointerMove => handle dragging or resizing. */
  const handlePointerMove = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      // Resizing
      if (resizing) {
        setPieces((prev) => {
          const idx = prev.findIndex((p) => p.id === resizing.pieceId);
          if (idx === -1) return prev;
          const piece = prev[idx];

          const dx = evt.clientX - initialPointer.x;
          const dy = evt.clientY - initialPointer.y;

          let newLeft = piece.left;
          let newTop = piece.top;
          let newW = piece.width;
          let newH = piece.height;

          switch (resizing.edge) {
            case "left": {
              const candidateLeft = initialSize.left + dx;
              const candidateW = initialSize.w - dx;
              if (candidateW >= MIN_SIZE) {
                newLeft = snapToGrid(candidateLeft);
                newW = snapToGrid(candidateW);
              }
              break;
            }
            case "right": {
              const candidateW = initialSize.w + dx;
              if (candidateW >= MIN_SIZE) {
                newW = snapToGrid(candidateW);
              }
              break;
            }
            case "top": {
              const candidateTop = initialSize.top + dy;
              const candidateH = initialSize.h - dy;
              if (candidateH >= MIN_SIZE) {
                newTop = snapToGrid(candidateTop);
                newH = snapToGrid(candidateH);
              }
              break;
            }
            case "bottom": {
              const candidateH = initialSize.h + dy;
              if (candidateH >= MIN_SIZE) {
                newH = snapToGrid(candidateH);
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
          return resolveAllCollisions(newArr);
        });
        evt.preventDefault();
        return;
      }

      // Dragging
      if (draggingId) {
        setPieces((prev) => {
          const idx = prev.findIndex((p) => p.id === draggingId);
          if (idx === -1) return prev;
          const piece = prev[idx];

          const newLeft = evt.clientX - containerRect.left - dragOffset.x;
          const newTop = evt.clientY - containerRect.top - dragOffset.y;
          const updated = {
            ...piece,
            left: snapToGrid(newLeft),
            top: snapToGrid(newTop),
          };

          const newArr = [...prev];
          newArr[idx] = updated;
          return resolveAllCollisions(newArr);
        });
        evt.preventDefault();
      }
    },
    [resizing, draggingId, dragOffset, initialPointer, initialSize]
  );

  /** Stop dragging/resizing. */
  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
    setResizing(null);
  }, []);

  /** handleResizeEdgePointerDown => start resizing on the chosen edge. */
  const handleResizeEdgePointerDown = useCallback(
    (
      evt: React.PointerEvent<HTMLDivElement>,
      pieceId: string,
      edge: string
    ) => {
      if (!containerRef.current) return;
      if (draggingId || resizing) return;

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
    },
    [bringToFront, draggingId, resizing, pieces]
  );

  /**
   * handleContextMenu: right-click on a piece => open custom context menu
   */
  const handleContextMenu = useCallback(
    (evt: React.MouseEvent<HTMLDivElement>, pieceId: string) => {
      evt.preventDefault();
      evt.stopPropagation();
      setContextMenuOpen(true);
      setContextMenuPosition({ x: evt.clientX, y: evt.clientY });
      setContextPieceId(pieceId);
    },
    []
  );

  /**
   * handleGlobalContextMenu: if user right-clicks outside any piece, close context menu
   */
  const handleGlobalContextMenu = useCallback(
    (evt: React.MouseEvent<HTMLDivElement>) => {
      if (evt.target === containerRef.current) {
        evt.preventDefault();
        setContextMenuOpen(false);
        setContextPieceId(null);
      }
    },
    []
  );

  /** handleChangeColor => set piece color. */
  const handleChangeColor = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (!contextPieceId) return;
      const newColor = evt.target.value;
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === contextPieceId && p.type === "color") {
            return { ...p, color: newColor };
          }
          return p;
        })
      );
      setContextMenuOpen(false);
    },
    [contextPieceId]
  );

  /** handleChangeImage => open file input to pick new image. */
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const handleChangeImageClick = useCallback(() => {
    if (imageFileRef.current) {
      imageFileRef.current.value = "";
      imageFileRef.current.click();
    }
  }, []);
  const handleChangeImageFile = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (!evt.target.files || !contextPieceId) return;
      const file = evt.target.files[0];
      if (!file) return;

      const dataUrl = await readFileAsDataURL(file);
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === contextPieceId && p.type === "image") {
            return { ...p, src: dataUrl };
          }
          return p;
        })
      );
      setContextMenuOpen(false);
    },
    [contextPieceId]
  );

  /** handleDeletePiece => remove piece. */
  const handleDeletePiece = useCallback(() => {
    if (!contextPieceId) return;
    setPieces((prev) => prev.filter((p) => p.id !== contextPieceId));
    setContextMenuOpen(false);
  }, [contextPieceId]);

  /** Utility to check if selected piece is color or image. */
  const selectedPiece = pieces.find((p) => p.id === contextPieceId);

  return (
    <Box
      sx={{ padding: 4 }}
      style={{ touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleGlobalContextMenu}
    >
      <h1>Custom Context Menu Example</h1>

      <div className={styles.controls}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        <Button
          variant="contained"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Images
        </Button>
        <Button variant="outlined" onClick={addColorBlocks}>
          Add Color Blocks
        </Button>
      </div>

      {/* Hidden file input for changing image src in context menu */}
      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleChangeImageFile}
      />

      <div className={styles.mosaicContainer} ref={containerRef}>
        {pieces.map((piece) => {
          const { id, type, src, color, width, height, top, left } = piece;
          return (
            <div
              key={id}
              className={styles.mosaicPiece}
              style={{ width, height, top, left }}
              onPointerDown={(e) => handlePiecePointerDown(e, id)}
              onContextMenu={(e) => handleContextMenu(e, id)}
            >
              {/* Content */}
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

              {/* Resize edges */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "6px",
                  cursor: "row-resize",
                }}
                onPointerDown={(evt) =>
                  handleResizeEdgePointerDown(evt, id, "top")
                }
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "6px",
                  cursor: "row-resize",
                }}
                onPointerDown={(evt) =>
                  handleResizeEdgePointerDown(evt, id, "bottom")
                }
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: "6px",
                  cursor: "col-resize",
                }}
                onPointerDown={(evt) =>
                  handleResizeEdgePointerDown(evt, id, "left")
                }
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  height: "100%",
                  width: "6px",
                  cursor: "col-resize",
                }}
                onPointerDown={(evt) =>
                  handleResizeEdgePointerDown(evt, id, "right")
                }
              />
            </div>
          );
        })}
      </div>

      {/* Our custom context menu, shown if contextMenuOpen */}
      {contextMenuOpen && selectedPiece && (
        <div
          style={{
            position: "fixed",
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "8px",
            zIndex: 9999,
          }}
        >
          {selectedPiece.type === "color" && (
            <label style={{ display: "block", marginBottom: "8px" }}>
              Change color:
              <input
                type="color"
                style={{ marginLeft: "8px" }}
                onChange={handleChangeColor}
              />
            </label>
          )}

          {selectedPiece.type === "image" && (
            <>
              <Button
                onClick={handleChangeImageClick}
                variant="outlined"
                size="small"
                sx={{ mb: 1 }}
              >
                Change Image
              </Button>
              <br />
            </>
          )}

          <Button
            onClick={handleDeletePiece}
            variant="contained"
            color="error"
            size="small"
          >
            Delete
          </Button>
        </div>
      )}
    </Box>
  );
}

/** readFileAsDataURL => create Data URL from file. */
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
