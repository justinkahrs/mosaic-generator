export interface MosaicPiece {
  id: string;
  type: "image" | "color";
  src?: string;
  color?: string;
  paletteIndex?: number;
  width: number;
  height: number;
  top: number;
  left: number;
}