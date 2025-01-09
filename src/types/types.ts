export interface MosaicPiece {
  id: string;
  type: "image" | "color";
  src?: string;
  color?: string;
  width: number;
  height: number;
  top: number;
  left: number;
}