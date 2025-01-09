"use client";

import React from "react";
import Image from "next/image";
import styles from "@/app/page.module.css"; // Reuse page.module.css for styling
import type { MosaicPiece as MosaicPieceData } from "@/types/types";

interface MosaicPieceProps {
  piece: MosaicPieceData;
  onPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    pieceId: string
  ) => void;
  onContextMenu: (
    e: React.MouseEvent<HTMLDivElement>,
    pieceId: string
  ) => void;
  onResizeEdgePointerDown: (
    evt: React.PointerEvent<HTMLDivElement>,
    pieceId: string,
    edge: string
  ) => void;
}

export default function MosaicPiece({
  piece,
  onPointerDown,
  onContextMenu,
  onResizeEdgePointerDown,
}: MosaicPieceProps) {
  const { id, type, src, color, width, height, top, left } = piece;

  return (
    <div
      className={styles.mosaicPiece}
      style={{ width, height, top, left }}
      onPointerDown={(e) => onPointerDown(e, id)}
      onContextMenu={(e) => onContextMenu(e, id)}
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
        onPointerDown={(evt) => onResizeEdgePointerDown(evt, id, "top")}
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
        onPointerDown={(evt) => onResizeEdgePointerDown(evt, id, "bottom")}
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
        onPointerDown={(evt) => onResizeEdgePointerDown(evt, id, "left")}
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
        onPointerDown={(evt) => onResizeEdgePointerDown(evt, id, "right")}
      />
    </div>
  );
}