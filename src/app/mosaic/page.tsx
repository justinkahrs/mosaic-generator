"use client";

import React, { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import { Button, Box } from "@mui/material";

/**
 * Represents a single piece in the mosaic:
 * - 'type': either "image" or "color"
 * - 'src': for images, the data URL or file path
 * - 'width', 'height': dimension of the piece
 * - 'top', 'left': position on the mosaic
 * - 'hero': optional marker for hero image styling (not currently used)
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

// We’ll snap to this grid size.
const GRID_SIZE = 20;

export default function MosaicPage() {
  const [pieces, setPieces] = useState<MosaicPiece[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reference to the mosaic container
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resizing state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [initialPointer, setInitialPointer] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  /**
   * Snap a position or size to our GRID_SIZE, using standard rounding.
   */
  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  /**
   * onFileChange handles normal images (non-hero).
   */
  const onFileChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files) return;
    const files = Array.from(evt.target.files);

    const newPieces: MosaicPiece[] = [];
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file);
      // Random approximate initial position
      const width = snapToGrid(Math.floor(150 + Math.random() * 100));
      const height = snapToGrid(Math.floor(100 + Math.random() * 80));
      const top = snapToGrid(Math.floor(Math.random() * 300));
      const left = snapToGrid(Math.floor(Math.random() * 300));

      newPieces.push({
        id: crypto.randomUUID(),
        type: "image",
        src: dataUrl,
        width,
        height,
        top,
        left,
      });
    }
    setPieces((prev) => [...prev, ...newPieces]);
  };

  /**
   * Add random color blocks.
   */
  const addColorBlocks = () => {
    const colors = ["#FFC107", "#8BC34A", "#F44336", "#3F51B5", "#E91E63"];
    const newBlocks: MosaicPiece[] = colors.map((color) => {
      const size = snapToGrid(60 + Math.random() * 60);
      const top = snapToGrid(Math.floor(Math.random() * 300));
      const left = snapToGrid(Math.floor(Math.random() * 300));
      return {
        id: crypto.randomUUID(),
        type: "color",
        color,
        width: size,
        height: size,
        top,
        left,
      };
    });
    setPieces((prev) => [...prev, ...newBlocks]);
  };

  /**
   * Bring a piece to "front" by splicing it to the end of the array.
   */
  const bringToFront = useCallback((pieceId: string) => {
    setPieces((prev) => {
      const index = prev.findIndex((p) => p.id === pieceId);
      if (index === -1) return prev;
      const piece = prev[index];
      const newArr = [...prev];
      newArr.splice(index, 1);
      newArr.push(piece);
      return newArr;
    });
  }, []);

  /**
   * handlePiecePointerDown: user pointer-down on the main body of the piece => start dragging.
   */
  const handlePiecePointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>, pieceId: string) => {
      if (!containerRef.current) return;
      // If we’re already resizing or dragging something else, ignore
      if (resizingId || draggingId) return;

      bringToFront(pieceId);
      setDraggingId(pieceId);

      const pieceRect = evt.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: evt.clientX - pieceRect.left,
        y: evt.clientY - pieceRect.top,
      });

      evt.preventDefault();
      evt.stopPropagation();
    },
    [bringToFront, draggingId, resizingId]
  );

  /**
   * handlePointerMove: handle both dragging & resizing in one event.
   */
  const handlePointerMove = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      // If resizing
      if (resizingId) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const deltaX = evt.clientX - containerRect.left - initialPointer.x;
        const deltaY = evt.clientY - containerRect.top - initialPointer.y;
        setPieces((prev) =>
          prev.map((piece) => {
            if (piece.id === resizingId) {
              let newW = initialSize.w + deltaX;
              let newH = initialSize.h + deltaY;
              if (newW < 30) newW = 30;
              if (newH < 30) newH = 30;
              // Snap new width/height
              return {
                ...piece,
                width: snapToGrid(newW),
                height: snapToGrid(newH),
              };
            }
            return piece;
          })
        );
        evt.preventDefault();
        return;
      }

      // If dragging
      if (draggingId) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeft = evt.clientX - containerRect.left - dragOffset.x;
        const newTop = evt.clientY - containerRect.top - dragOffset.y;
        setPieces((prev) =>
          prev.map((piece) => {
            if (piece.id === draggingId) {
              return {
                ...piece,
                left: snapToGrid(newLeft),
                top: snapToGrid(newTop),
              };
            }
            return piece;
          })
        );
        evt.preventDefault();
      }
    },
    [draggingId, resizingId, dragOffset, initialPointer, initialSize, snapToGrid]
  );

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
    setResizingId(null);
  }, []);

  /**
   * handleResizeHandlePointerDown: user clicked on the resize handle
   */
  const handleResizeHandlePointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>, pieceId: string) => {
      if (!containerRef.current) return;
      // If already dragging/resizing, ignore
      if (draggingId || resizingId) return;

      bringToFront(pieceId);
      setResizingId(pieceId);

      const containerRect = containerRef.current.getBoundingClientRect();
      const pointerX = evt.clientX - containerRect.left;
      const pointerY = evt.clientY - containerRect.top;

      // find the piece
      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      // store initial pointer coords and piece size
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
      <h1>Dynamic Mosaic (with Grid Snapping)</h1>
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
          const styleProps: React.CSSProperties = {
            width,
            height,
            top,
            left,
          };
          return (
            <div
              key={id}
              className={styles.mosaicPiece}
              style={styleProps}
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

              {/* Resize handle in bottom-right corner */}
              <div
                style={{
                  position: "absolute",
                  width: "28px",
                  height: "28px",
                  bottom: 0,
                  right: 0,
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
 * Utility to convert file into a Data URL for immediate usage in <Image />.
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