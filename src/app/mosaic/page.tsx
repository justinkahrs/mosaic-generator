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
 * - 'hero': optional marker for hero image styling
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

  // Reference to the mosaic container for accurate boundingRect calculations
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * onFileChange handles normal images (non-hero). Convert each file to data URL,
   * and position them randomly for demonstration. In practice, you'd refine the
   * layout logic or let the user drag them after dropping in the mosaic.
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
        hero: false,
      });
    }
    setPieces((prev) => [...prev, ...newPieces]);
  };

  /**
   * onHeroFileChange handles a single hero image upload. We set 'hero: true'
   * and optionally place it at a default location. We'll just use the first file.
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
    // Prepend hero piece
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
        hero: false,
      };
    });
    setPieces((prev) => [...prev, ...newBlocks]);
  };

  /**
   * MOUSE / POINTER EVENTS: handle dragging. We'll store the piece ID that
   * we’re dragging and track offset so we can move it smoothly. Now referencing
   * the container’s bounding rect to ensure correct alignment under cursor.
   */

  const handlePointerDown = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>, pieceId: string) => {
      if (!containerRef.current) return;

      // Bring this piece to "front" by reordering state
      setPieces((prev) => {
        const index = prev.findIndex((p) => p.id === pieceId);
        if (index === -1) return prev;
        const piece = prev[index];
        const newArr = [...prev];
        newArr.splice(index, 1);
        newArr.push(piece);
        return newArr;
      });

      setDraggingId(pieceId);

      // measure the piece’s boundingRect
      const pieceRect = evt.currentTarget.getBoundingClientRect();
      // measure container boundingRect
      const containerRect = containerRef.current.getBoundingClientRect();

      // dragOffset is how far inside the piece the pointer was clicked
      setDragOffset({
        x: evt.clientX - pieceRect.left,
        y: evt.clientY - pieceRect.top,
      });

      // Prevent default to ensure pointer events are captured
      evt.preventDefault();
      evt.stopPropagation();
    },
    []
  );

  const handlePointerMove = useCallback(
    (evt: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingId || !containerRef.current) return;

      // measure container boundingRect so we can position piece inside container
      const containerRect = containerRef.current.getBoundingClientRect();

      // compute new top/left relative to container
      const newLeft = evt.clientX - containerRect.left - dragOffset.x;
      const newTop = evt.clientY - containerRect.top - dragOffset.y;

      setPieces((prev) =>
        prev.map((piece) => {
          if (piece.id === draggingId) {
            return {
              ...piece,
              top: newTop,
              left: newLeft,
            };
          }
          return piece;
        })
      );
      evt.preventDefault();
    },
    [draggingId, dragOffset]
  );

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  return (
    <Box
      sx={{ padding: 4 }}
      style={{ touchAction: "none" }}
      // Attach pointer events to the container so we can track moves
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
        <Button variant="contained" onClick={() => fileInputRef.current?.click()}>
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
        <Button variant="outlined" onClick={() => heroFileInputRef.current?.click()}>
          Upload Hero Image
        </Button>

        <Button variant="outlined" onClick={addColorBlocks}>
          Add Color Blocks
        </Button>
      </div>

      <div className={styles.mosaicContainer} ref={containerRef}>
        {pieces.map((piece) => {
          if (piece.type === "color") {
            return (
              <div
                key={piece.id}
                className={`${styles.mosaicPiece} ${styles.colorBlock}`}
                style={{
                  width: piece.width,
                  height: piece.height,
                  top: piece.top,
                  left: piece.left,
                  backgroundColor: piece.color,
                }}
                onPointerDown={(e) => handlePointerDown(e, piece.id)}
              />
            );
          }

          // Image piece
          return (
            <div
              key={piece.id}
              className={`${styles.mosaicPiece} ${piece.hero ? styles.hero : ""}`}
              style={{
                width: piece.width,
                height: piece.height,
                top: piece.top,
                left: piece.left,
              }}
              onPointerDown={(e) => handlePointerDown(e, piece.id)}
            >
              {piece.src && (
                <Image
                  src={piece.src}
                  alt="mosaic-piece"
                  width={piece.width}
                  height={piece.height}
                  style={{ objectFit: "cover" }}
                />
              )}
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