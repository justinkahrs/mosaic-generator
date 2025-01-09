import React, { useState, useCallback } from "react";
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from "@mui/material";

interface CanvasSettingsProps {
  onChange: (width: number, height: number) => void;
}

const tShirtSizes = {
  small: { width: 400, height: 300 },
  medium: { width: 800, height: 600 },
  large: { width: 1200, height: 900 },
};

export default function CanvasSettings({ onChange }: CanvasSettingsProps) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [preset, setPreset] = useState<"small" | "medium" | "large">("medium");
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);

  const handlePresetChange = (value: "small" | "medium" | "large") => {
    setPreset(value);
    const { width, height } = tShirtSizes[value];
    onChange(width, height);
  };

  const handleCustomChange = useCallback(() => {
    onChange(customWidth, customHeight);
  }, [customWidth, customHeight, onChange]);

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
      <FormControl>
        <InputLabel>Mode</InputLabel>
        <Select
          value={mode}
          label="Mode"
          onChange={(e) => setMode(e.target.value as "preset" | "custom")}
        >
          <MenuItem value="preset">Preset Sizes</MenuItem>
          <MenuItem value="custom">Custom Dimensions</MenuItem>
        </Select>
      </FormControl>

      {mode === "preset" && (
        <FormControl>
          <InputLabel>Size</InputLabel>
          <Select
            value={preset}
            label="Size"
            onChange={(e) => handlePresetChange(e.target.value as "small" | "medium" | "large")}
          >
            <MenuItem value="small">Small (400x300)</MenuItem>
            <MenuItem value="medium">Medium (800x600)</MenuItem>
            <MenuItem value="large">Large (1200x900)</MenuItem>
          </Select>
        </FormControl>
      )}

      {mode === "custom" && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="Width"
            type="number"
            value={customWidth}
            onChange={(e) => setCustomWidth(parseInt(e.target.value, 10) || 0)}
            onBlur={handleCustomChange}
          />
          <TextField
            label="Height"
            type="number"
            value={customHeight}
            onChange={(e) => setCustomHeight(parseInt(e.target.value, 10) || 0)}
            onBlur={handleCustomChange}
          />
        </Box>
      )}
    </Box>
  );
}