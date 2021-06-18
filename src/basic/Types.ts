export type Point =
    | { x: number; y: number }
    | { width: number; height: number }
    | { angle: number; length: number }
    | number[]
    | number
export type Size =
    | { width: number; height: number }
    | { x: number; height: number }
    | { angle: number; length: number }
    | number[]
    | number
export type Rectangle = Size & Point
