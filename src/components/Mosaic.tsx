"use client";

import type React from "react";
import {
  useState,
  useRef,
  useCallback,
  type MouseEvent,
  type PointerEvent,
  type ChangeEvent,
} from "react";
import { Button, Box } from "@mui/material";
import MosaicPiece from "./MosaicPiece";
import MosaicContextMenu from "./MosaicContextMenu";
import styles from "@/app/page.module.css";
import type { MosaicPiece as MosaicPieceData } from "@/types/types";
import { generateUUID } from "@/utils/UUID";

/** Constants and Utility Functions **/
const GRID_SIZE = 20;
const MIN_SIZE = 30;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * readFileAsDataURL => create Data URL from file.
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

/** Check if two pieces overlap. */
function doOverlap(a: MosaicPieceData, b: MosaicPieceData): boolean {
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
function resolveAllCollisions(
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
function findNonOverlappingPlacement(
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

/** Mosaic Component **/
export default function Mosaic() {
  const [pieces, setPieces] = useState<MosaicPieceData[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Let the user toggle snapping
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Helper function to conditionally snap
  const maybeSnap = useCallback(
    (val: number) => (snapEnabled ? snapToGrid(val) : val),
    [snapEnabled]
  );

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
  }>({ x: 0, y: 0 });
  const [contextPieceId, setContextPieceId] = useState<string | null>(null);

  /** Add images. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onFileChange = async (evt: ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files) return;
    const files = Array.from(evt.target.files);

    let currentPieces = [...pieces];
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file);
      const candidate: MosaicPieceData = {
        id: generateUUID(),
        type: "image",
        src: dataUrl,
        width: maybeSnap(150 + Math.random() * 100),
        height: maybeSnap(100 + Math.random() * 80),
        top: maybeSnap(Math.random() * 200),
        left: maybeSnap(Math.random() * 200),
      };
      const placed = findNonOverlappingPlacement(
        candidate,
        currentPieces,
        maybeSnap
      );
      currentPieces.push(placed);
      currentPieces = resolveAllCollisions(currentPieces, maybeSnap);
    }
    setPieces(currentPieces);
  };

  /** Add color blocks. */
  const addColorBlocks = () => {
    let currentPieces = [...pieces];
    const colors = ["#FFC107", "#8BC34A", "#F44336", "#3F51B5", "#E91E63"];
    for (const c of colors) {
      const candidate: MosaicPieceData = {
        id: generateUUID(),
        type: "color",
        color: c,
        width: maybeSnap(60 + Math.random() * 60),
        height: maybeSnap(60 + Math.random() * 60),
        top: maybeSnap(Math.random() * 200),
        left: maybeSnap(Math.random() * 200),
      };
      const placed = findNonOverlappingPlacement(
        candidate,
        currentPieces,
        maybeSnap
      );
      currentPieces.push(placed);
      currentPieces = resolveAllCollisions(currentPieces, maybeSnap);
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
    (evt: PointerEvent<HTMLDivElement>, pieceId: string) => {
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
    (evt: PointerEvent<HTMLDivElement>) => {
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
            left: maybeSnap(newLeft),
            top: maybeSnap(newTop),
          };

          const newArr = [...prev];
          newArr[idx] = updated;
          return resolveAllCollisions(newArr, maybeSnap);
        });
        evt.preventDefault();
      }
    },
    [resizing, draggingId, dragOffset, initialPointer, initialSize, maybeSnap]
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
    (evt: MouseEvent<HTMLDivElement>, pieceId: string) => {
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
    (evt: MouseEvent<HTMLDivElement>) => {
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
    (evt: ChangeEvent<HTMLInputElement>) => {
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
    async (evt: ChangeEvent<HTMLInputElement>) => {
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

  const selectedPiece = pieces.find((p) => p.id === contextPieceId);

  return (
    <Box
      sx={{ padding: 4 }}
      style={{ touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleGlobalContextMenu}
    >
      <div className={styles.controls}>
        <div style={{ display: "flex", gap: "8px" }}>
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

          <Button
            variant="outlined"
            color={snapEnabled ? "success" : "warning"}
            onClick={() => setSnapEnabled((prev) => !prev)}
          >
            {snapEnabled ? "Disable Snap" : "Enable Snap"}
          </Button>
        </div>
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
        {pieces.map((piece) => (
          <MosaicPiece
            key={piece.id}
            piece={piece}
            onPointerDown={handlePiecePointerDown}
            onContextMenu={handleContextMenu}
            onResizeEdgePointerDown={handleResizeEdgePointerDown}
          />
        ))}
      </div>

      <MosaicContextMenu
        open={contextMenuOpen && !!selectedPiece}
        position={contextMenuPosition}
        piece={selectedPiece || null}
        onChangeColor={handleChangeColor}
        onChangeImageClick={handleChangeImageClick}
        onDeletePiece={handleDeletePiece}
        closeMenu={() => setContextMenuOpen(false)}
      />
    </Box>
  );
}