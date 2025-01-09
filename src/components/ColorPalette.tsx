/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useState } from "react";
import { Box, Button, Menu, MenuItem } from "@mui/material";
import { HexColorPicker } from "react-colorful";

interface ColorPaletteProps {
  colorPalette: string[];
  onChangeColor: (index: number, newColor: string) => void;
}

/**
 * Renders a list of circular color swatches. When clicked, opens a color picker menu with confirm/cancel buttons.
 */
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Render color swatches */}
      <Box sx={{ display: "flex", gap: 2 }}>
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
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                handleSwatchClick(e as any, index);
              }
            }}
          />
        ))}
      </Box>

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
