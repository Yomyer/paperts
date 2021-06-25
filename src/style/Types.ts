import { Point } from '../basic/Types'

export type ColorTypes = 'rgb' | 'gray' | 'hsb' | 'hsl' | 'gradient'

export type ColorOptions = {
    hsb?: {
        hue?: number
        saturation?: number
        brightness?: number
        alpha?: number
    }
    hsl?: {
        hue?: number
        saturation?: number
        lightness?: number
        alpha?: number
    }
    gradient?: {
        gradient?: any // Todo Gradient
        // gradient?: Gradient
        origin?: Point
        destination?: Point
        stops?: any // Todo GradientStop[]
        // stops?: GradientStop[]
        radial?: boolean
    }
}

export type ColorPropeties = {
    red?: number
    green?: number
    blue?: number
    gray?: number
    hue?: number
    saturation?: number
    brightness?: number
    lightness?: number
    alpha?: number
    gradient?: any // gradient?: Gradient
    // gradient?: Gradient
    origin?: Point
    destination?: Point
    stops?: any // Todo GradientStop[]
    // stops?: GradientStop[]
    radial?: boolean
}

export type Color = ColorOptions | string | number | number[] | ColorPropeties

export type GradientStopPropeties = {
    offset?: number
    rampPoint?: number
}
export type GradientStop =
    | Array<number | string>
    | {
          color?: Color
          offer?: number
      }
    | GradientStopPropeties
