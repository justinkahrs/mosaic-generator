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
 * - 'hero': optional marker for hero image styling (no extra styling now)
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

export default function MosaicPage() {
  const [pieces, setPieces] = useState<MosaicPiece[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement | null>(null);

  // Reference to the mosaic container
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Resizing state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [initialPointer, setInitialPointer] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  /**
   * onFileChange handles normal images (non-hero).
   */
  const onFileChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files) return;
    const files = Array.from(evt.target.files);

    const newPieces: MosaicPiece[] = [];
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file);
      const width = Math.floor(150 + Math.random() * 100);
      const height = Math.floor(100 + Math.random() * 80);
      const top = Math.floor(Math.random() * 300);
      const left = Math.floor(Math.random() * 300);

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
   * onHeroFileChange handles a single "hero" image upload. We no longer style hero specially,
   * but we keep the property for possible future logic.
   */
  const onHeroFileChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files || !evt.target.files[0]) return;
    const file = evt.target.files[0];
    const dataUrl = await readFileAsDataURL(file);

    const heroPiece: MosaicPiece = {
      id: crypto.randomUUID(),
      type: "image",
      src: dataUrl,
      width: 300,
      height: 200,
      top: 20,
      left: 20,
      hero: true,
    };
    setPieces((prev) => [heroPiece, ...prev]);
  };

  /**
   * Add random color blocks.
   */
  const addColorBlocks = () => {
    const colors = ["#FFC107", "#8BC34A", "#F44336", "#3F51B5", "#E91E63"];
    const newBlocks: MosaicPiece[] = colors.map((color) => {
      const size = 60 + Math.random() * 60;
      const top = Math.floor(Math.random() * 300);
      const left = Math.floor(Math.random() * 300);
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
   * MOUSE / POINTER EVENTS: handle dragging.
   * If the user pointer-down on the main body of the piece, we set up drag.
   * If they pointer-down on the resize handle, we set up resize instead.
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
              // new width & height
              let newW = initialSize.w + deltaX;
              let newH = initialSize.h + deltaY;

              // enforce minimal size (say 30px)
              if (newW < 30) newW = 30;
              if (newH < 30) newH = 30;

              return {
                ...piece,
                width: newW,
                height: newH,
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
                left: newLeft,
                top: newTop,
              };
            }
            return piece;
          })
        );
        evt.preventDefault();
      }
    },
    [draggingId, resizingId, dragOffset, initialPointer, initialSize]
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
      <h1>Dynamic Mosaic</h1>
      <div className={styles.controls}>
        {/* Normal images */}
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
        {/* Hero image */}
        <input
          ref={heroFileInputRef}
          type="file"
          accept="image/*"
          onChange={onHeroFileChange}
          style={{ display: "none" }}
        />
        <Button
          variant="outlined"
          onClick={() => heroFileInputRef.current?.click()}
        >
          Upload Hero Image
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
              className={`${styles.mosaicPiece}`}
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
                  width: "14px",
                  height: "14px",
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
