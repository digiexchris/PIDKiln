/**
 * Minimal type declarations for uPlot
 * Based on uPlot v1.6.x API
 */

declare class uPlot {
  constructor(opts: uPlot.Options, data: uPlot.AlignedData, target: HTMLElement);
  
  readonly root: HTMLElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly bbox: uPlot.BBox;
  readonly scales: { [key: string]: uPlot.Scale };
  readonly series: uPlot.Series[];
  
  setData(data: uPlot.AlignedData, resetScales?: boolean): void;
  setScale(key: string, minMax: { min: number; max: number }): void;
  setSize(size: { width: number; height: number }): void;
  setSeries(idx: number, opts: Partial<uPlot.Series>): void;
  destroy(): void;
  valToPos(val: number, scale: string, canvasPixels?: boolean): number;
  posToVal(pos: number, scale: string): number;
}

declare namespace uPlot {
  type AlignedData = (number | null | undefined)[][];
  
  interface BBox {
    top: number;
    left: number;
    width: number;
    height: number;
  }
  
  interface Scale {
    min: number;
    max: number;
    key?: string;
  }
  
  interface Series {
    show?: boolean;
    label?: string;
    stroke?: string;
    fill?: string;
    width?: number;
    dash?: number[];
    points?: {
      show?: boolean;
      size?: number;
      fill?: string;
      stroke?: string;
    };
  }
  
  interface Axis {
    show?: boolean;
    stroke?: string;
    font?: string;
    size?: number;
    label?: string;
    grid?: {
      show?: boolean;
      stroke?: string;
      width?: number;
    };
    ticks?: {
      show?: boolean;
      stroke?: string;
      width?: number;
      size?: number;
    };
    values?: (self: uPlot, vals: number[], space: number) => string[];
  }
  
  interface Cursor {
    show?: boolean;
    drag?: {
      x?: boolean;
      y?: boolean;
    };
  }
  
  interface Legend {
    show?: boolean;
  }
  
  interface Scales {
    [key: string]: {
      auto?: boolean;
      time?: boolean;
      range?: (self: uPlot, min: number, max: number) => [number, number];
    };
  }
  
  interface Hooks {
    init?: ((self: uPlot) => void)[];
    ready?: ((self: uPlot) => void)[];
    draw?: ((self: uPlot) => void)[];
    setScale?: ((self: uPlot, key: string) => void)[];
    setData?: ((self: uPlot) => void)[];
    destroy?: ((self: uPlot) => void)[];
  }
  
  interface Plugin {
    hooks?: Hooks;
  }
  
  interface Options {
    width: number;
    height: number;
    title?: string;
    series: Series[];
    axes?: Axis[];
    scales?: Scales;
    cursor?: Cursor;
    legend?: Legend;
    plugins?: Plugin[];
    hooks?: Hooks;
  }
}

export = uPlot;
export as namespace uPlot;

