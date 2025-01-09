"use client";

import type React from "react";
import { Button } from "@mui/material";
import type { MosaicPiece } from "@/types/types";

interface MosaicContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  piece: MosaicPiece | null;
  onChangeColor: (evt: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeImageClick: () => void;
  onDeletePiece: () => void;
  closeMenu: () => void;
}

export default function MosaicContextMenu({
  open,
  position,
  piece,
  onChangeColor,
  onChangeImageClick,
  onDeletePiece,
}: MosaicContextMenuProps) {
  if (!open || !piece) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "8px",
        zIndex: 9999,
      }}
      // Optional: close if user clicks outside
      onContextMenu={(evt) => {
        // Prevent the global context menu from popping again
        evt.preventDefault();
        evt.stopPropagation();
      }}
    >
      {piece.type === "color" && (
        <label style={{ display: "block", marginBottom: "8px" }}>
          Change color:
          <input
            type="color"
            style={{ marginLeft: "8px" }}
            onChange={onChangeColor}
          />
        </label>
      )}

      {piece.type === "image" && (
        <>
          <Button
            onClick={onChangeImageClick}
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
        onClick={onDeletePiece}
        variant="contained"
        color="error"
        size="small"
      >
        Delete
      </Button>
    </div>
  );
}
