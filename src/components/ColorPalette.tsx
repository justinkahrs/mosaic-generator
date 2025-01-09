// Full Component with Fixed Tetrad Generation

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useState } from "react";
import { Box, Button, Menu, MenuItem } from "@mui/material";
import { HexColorPicker } from "react-colorful";
import chroma from "chroma-js";

interface ColorPaletteProps {
  colorPalette: string[];
  onChangeColor: (index: number, newColor: string) => void;
}

export default function ColorPalette({
  colorPalette,
  onChangeColor,
}: ColorPaletteProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);

  const handleSwatchClick = (
    event: React.MouseEvent<HTMLDivElement>,
    index: number
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedIndex(index);
    setTempColor(colorPalette[index]); // Initialize picker with the current swatch color
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedIndex(null);
    setTempColor(null);
  };

  const handleConfirm = () => {
    if (selectedIndex !== null && tempColor) {
      onChangeColor(selectedIndex, tempColor);
    }
    handleClose();
  };

  // Fixed random tetrad color scheme generator
  const generateRandomTetrad = () => {
    const baseColor = chroma.random(); // Generate a random base color
    const tetrad = [
      baseColor.hex(),
      baseColor.set("hsl.h", "+90").hex(),
      baseColor.set("hsl.h", "+180").hex(),
      baseColor.set("hsl.h", "+270").hex(),
    ];

    return tetrad;
  };

  const handleRandomize = () => {
    const newPalette = generateRandomTetrad();
    newPalette.forEach((color, index) => {
      if (index < colorPalette.length) {
        onChangeColor(index, color);
      }
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Render color swatches */}
      <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
        {colorPalette.map((color, index) => (
          <div
            key={`${color + index}`}
            style={{
              width: 32,
              height: 32,
              backgroundColor: color,
              cursor: "pointer",
              border: "2px solid #999",
            }}
            onClick={(event) => handleSwatchClick(event, index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleSwatchClick(e as any, index);
              }
            }}
          />
        ))}
      </Box>

      {/* Randomize Button */}
      <Button variant="contained" color="primary" onClick={handleRandomize}>
        Randomize Palette
      </Button>

      {/* Color picker menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <MenuItem disableRipple>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <HexColorPicker
              color={tempColor || "#ffffff"}
              onChange={setTempColor}
            />
            <Box sx={{ display: "flex", gap: 1, marginTop: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleConfirm}
              >
                Confirm
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
}
