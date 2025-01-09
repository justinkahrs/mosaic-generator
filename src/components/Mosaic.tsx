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
import {
  Container,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Button,
} from "@mui/material";
import MosaicPiece from "./MosaicPiece";
import MosaicContextMenu from "./MosaicContextMenu";
import ColorPalette from "./ColorPalette";
import styles from "@/app/page.module.css";
import type { MosaicPiece as MosaicPieceData } from "@/types/types";
import { generateUUID } from "@/utils/UUID";
import {
  snapToGrid,
  readFileAsDataURL,
  resolveAllCollisions,
  findNonOverlappingPlacement,
} from "@/utils/mosaicUtils";
import {
  beginDrag,
  updateDrag,
  endDrag,
  beginResize,
  updateResize,
  endResize,
} from "@/utils/dragResizeUtils";
import CanvasSettings from "./CanvasSettings";

/** Constants and Utility Functions **/
const MIN_SIZE = 30;

/** Mosaic Component **/
export default function Mosaic() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const handleCanvasSizeChange = (width: number, height: number) => {
    setCanvasSize({ width, height });
  };

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [contextPieceId, setContextPieceId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialPointer, setInitialPointer] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({
    w: 0,
    h: 0,
    top: 0,
    left: 0,
  });
  const [pieces, setPieces] = useState<MosaicPieceData[]>([]);
  const [resizing, setResizing] = useState<{
    pieceId: string;
    edge: string;
  } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // New color palette: four default colors
  const [colorPalette, setColorPalette] = useState<string[]>([
    "#FF0000", // red
    "#00FF00", // lime
    "#0000FF", // blue
    "#FFFF00", // yellow
  ]);

  // Handle color palette changes => update colorPalette state
  const handlePaletteChange = useCallback((index: number, newColor: string) => {
    setColorPalette((prev) => {
      const updated = [...prev];
      updated[index] = newColor;
      return updated;
    });
    // Also update any pieces referencing this palette index
    setPieces((prev) =>
      prev.map((p) => {
        if (p.paletteIndex === index) {
          return {
            ...p,
            color: newColor,
          };
        }
        return p;
      })
    );
  }, []);

  const maybeSnap = useCallback(
    (val: number) => (snapEnabled ? snapToGrid(val) : val),
    [snapEnabled]
  );

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

  /** Add color blocks => use every color in palette. */
  const addColorBlocks = () => {
    let currentPieces = [...pieces];
    for (let i = 0; i < colorPalette.length; i++) {
      const candidate: MosaicPieceData = {
        id: generateUUID(),
        type: "color",
        color: colorPalette[i],
        paletteIndex: i,
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
      beginDrag(evt, pieceId, bringToFront, setDraggingId, setDragOffset);
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
        updateResize(
          evt,
          resizing,
          initialPointer,
          initialSize,
          MIN_SIZE,
          maybeSnap,
          setPieces
        );
        evt.preventDefault();
        return;
      }

      // Dragging
      if (draggingId) {
        updateDrag(
          evt,
          containerRect,
          draggingId,
          dragOffset,
          maybeSnap,
          setPieces
        );
        evt.preventDefault();
      }
    },
    [resizing, draggingId, dragOffset, initialPointer, initialSize, maybeSnap]
  );

  /** Stop dragging/resizing. */
  const handlePointerUp = useCallback(() => {
    if (draggingId) {
      endDrag(setDraggingId);
    }
    if (resizing) {
      endResize(setResizing);
    }
  }, [draggingId, resizing]);

  /** handleResizeEdgePointerDown => start resizing on the chosen edge. */
  const handleResizeEdgePointerDown = useCallback(
    (
      evt: React.PointerEvent<HTMLDivElement>,
      pieceId: string,
      edge: string
    ) => {
      if (!containerRef.current) return;
      if (draggingId || resizing) return;

      beginResize(
        evt,
        pieceId,
        edge,
        bringToFront,
        setResizing,
        setInitialSize,
        setInitialPointer,
        pieces
      );
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

  /** handleChangeColorIndex => set piece color from palette. */
  const handleChangeColorIndex = useCallback(
    (index: number) => {
      if (!contextPieceId) return;
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === contextPieceId && p.type === "color") {
            return { ...p, color: colorPalette[index], paletteIndex: index };
          }
          return p;
        })
      );
      setContextMenuOpen(false);
    },
    [contextPieceId, colorPalette]
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
    <Container maxWidth="lg" sx={{ py: 4, touchAction: "none" }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2}>
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

          <Button variant="contained" onClick={addColorBlocks}>
            Add Color Blocks
          </Button>
        </Stack>

        {/* ColorPalette and Canvas Settings */}
        <Stack direction="row" spacing={2}>
          <ColorPalette
            colorPalette={colorPalette}
            onChangeColor={handlePaletteChange}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <CanvasSettings onChange={handleCanvasSizeChange} />
        </Stack>
        <Stack direction="row" spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={snapEnabled}
                onChange={() => setSnapEnabled((prev) => !prev)}
                color="primary"
              />
            }
            label={snapEnabled ? "Snap to Grid" : "Enable Snap"}
          />
        </Stack>
        {/* Hidden file input for changing image src in context menu */}
        <input
          ref={imageFileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleChangeImageFile}
        />

        <Paper
          elevation={3}
          sx={{
            width: canvasSize.width,
            height: canvasSize.height,
            position: "relative",
            margin: "0 auto",
            p: 1,
          }}
        >
          <div
            className={styles.mosaicContainer}
            ref={containerRef}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={handleGlobalContextMenu}
          >
            {pieces.map((piece) => {
              // If paletteIndex is defined, override the piece.color
              const displayColor =
                piece.type === "color" && piece.paletteIndex !== undefined
                  ? colorPalette[piece.paletteIndex]
                  : piece.color;

              return (
                <MosaicPiece
                  key={piece.id}
                  piece={{ ...piece, color: displayColor }}
                  onPointerDown={handlePiecePointerDown}
                  onContextMenu={handleContextMenu}
                  onResizeEdgePointerDown={handleResizeEdgePointerDown}
                />
              );
            })}
          </div>
        </Paper>

        <MosaicContextMenu
          open={contextMenuOpen && !!selectedPiece}
          position={contextMenuPosition}
          piece={selectedPiece || null}
          colorPalette={colorPalette}
          onChangeColorIndex={handleChangeColorIndex}
          onChangeImageClick={handleChangeImageClick}
          onDeletePiece={handleDeletePiece}
          closeMenu={() => setContextMenuOpen(false)}
        />
      </Stack>
    </Container>
  );
}
