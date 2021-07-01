import Base, { ExportJsonOptions } from '../core/Base'
import { Point as PointType } from '../basic/Types'
import { Exportable, ReadIndex } from '../utils/Decorators'
import { ColorOptions, ColorTypes, Color as ColorType } from './Types'
import CanvasProvider from '../canvas/CanvasProvider'
import Gradient from './Gradient'
import { Change } from '../item/ChangeFlag'
import Formatter from '../utils/Formatter'
import Matrix from '../basic/Matrix'
import Point from '../basic/Point'

const types = {
    gray: ['gray'],
    rgb: ['red', 'green', 'blue'],
    hsb: ['hue', 'saturation', 'brightness'],
    hsl: ['hue', 'saturation', 'lightness'],
    gradient: ['gradient', 'origin', 'destination', 'highlight']
}

const componentParsers = {}
const namedColors = {
    transparent: [0, 0, 0, 0]
}

let colorCtx: CanvasRenderingContext2D

const fromCSS = (string: string) => {
    let match =
        string.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i) ||
        string.match(/^#([\da-f])([\da-f])([\da-f])([\da-f])?$/i)
    let type = 'rgb'
    let components: any[]

    if (match) {
        const amount = match[4] ? 4 : 3
        components = new Array(amount)
        for (let i = 0; i < amount; i++) {
            const value = match[i + 1]
            components[i] =
                parseInt(value.length === 1 ? value + value : value, 16) / 255
        }
    } else if ((match = string.match(/^(rgb|hsl)a?\((.*)\)$/))) {
        type = match[1]
        components = match[2].trim().split(/[,\s]+/g)
        const isHSL = type === 'hsl'
        for (let i = 0, l = Math.min(components.length, 4); i < l; i++) {
            const component = components[i]
            let value = parseFloat(component)
            if (isHSL) {
                if (i === 0) {
                    const unit = component.match(/([a-z]*)$/)[1]
                    value *=
                        {
                            turn: 360,
                            rad: 180 / Math.PI,
                            grad: 0.9 // 360 / 400
                        }[unit] || 1
                } else if (i < 3) {
                    value /= 100
                }
            } else if (i < 3) {
                value /= /%$/.test(component) ? 100 : 255
            }
            components[i] = value
        }
    } else {
        let color = namedColors[string]
        if (!color) {
            if (window) {
                if (!colorCtx) {
                    colorCtx = CanvasProvider.getContext(1, 1)
                    colorCtx.globalCompositeOperation = 'copy'
                }

                colorCtx.fillStyle = 'rgba(0,0,0,0)'

                colorCtx.fillStyle = string
                colorCtx.fillRect(0, 0, 1, 1)
                const data = colorCtx.getImageData(0, 0, 1, 1).data
                color = namedColors[string] = [
                    data[0] / 255,
                    data[1] / 255,
                    data[2] / 255
                ]
            } else {
                color = [0, 0, 0]
            }
        }
        components = color.slice()
    }
    return [type, components]
}

const hsbIndices = [
    [0, 3, 1],
    [2, 0, 1],
    [1, 0, 3],
    [1, 2, 0],
    [3, 1, 0],
    [0, 1, 2]
]

const converters = {
    'rgb-hsb': (r: number, g: number, b: number) => {
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const delta = max - min
        const h =
            delta === 0
                ? 0
                : (max === r
                      ? (g - b) / delta + (g < b ? 6 : 0)
                      : max === g
                      ? (b - r) / delta + 2
                      : (r - g) / delta + 4) * 60
        return [h, max === 0 ? 0 : delta / max, max]
    },

    'hsb-rgb': (h: number, s: number, b: number) => {
        h = (((h / 60) % 6) + 6) % 6
        const i = Math.floor(h)
        const f = h - i
        const is = hsbIndices[i]
        const v = [
            b, // b, index 0
            b * (1 - s), // p, index 1
            b * (1 - s * f), // q, index 2
            b * (1 - s * (1 - f)) // t, index 3
        ]
        return [v[is[0]], v[is[1]], v[is[2]]]
    },

    'rgb-hsl': (r: number, g: number, b: number) => {
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const delta = max - min
        const achromatic = delta === 0
        const h = achromatic
            ? 0
            : (max === r
                  ? (g - b) / delta + (g < b ? 6 : 0)
                  : max === g
                  ? (b - r) / delta + 2
                  : (r - g) / delta + 4) * 60
        const l = (max + min) / 2
        const s = achromatic
            ? 0
            : l < 0.5
            ? delta / (max + min)
            : delta / (2 - max - min)
        return [h, s, l]
    },

    'hsl-rgb': (h: number, s: number, l: number) => {
        h = (((h / 360) % 1) + 1) % 1
        if (s === 0) return [l, l, l]
        const t3s = [h + 1 / 3, h, h - 1 / 3]
        const t2 = l < 0.5 ? l * (1 + s) : l + s - l * s
        const t1 = 2 * l - t2
        const c = []
        for (let i = 0; i < 3; i++) {
            let t3 = t3s[i]
            if (t3 < 0) t3 += 1
            if (t3 > 1) t3 -= 1
            c[i] =
                6 * t3 < 1
                    ? t1 + (t2 - t1) * 6 * t3
                    : 2 * t3 < 1
                    ? t2
                    : 3 * t3 < 2
                    ? t1 + (t2 - t1) * (2 / 3 - t3) * 6
                    : t1
        }
        return c
    },

    'rgb-gray': (r: number, g: number, b: number) => {
        return [r * 0.2989 + g * 0.587 + b * 0.114]
    },

    'gray-rgb': (g: number) => {
        return [g, g, g]
    },

    'gray-hsb': (g: number) => {
        return [0, 0, g]
    },

    'gray-hsl': (g: number) => {
        return [0, 0, g]
    }

    /*
    'gradient-rgb' => () {
        return []
    },

    'rgb-gradient': function () {
        // TODO: Implement
        return []
    }
    */
}

@ReadIndex()
@Exportable()
export default class Color extends Base {
    protected _class = 'Color'
    private _type: ColorTypes
    private _canvasStyle: CanvasGradient | string
    private _alpha: number
    private _components: any[]
    private _properties: string[]
    private _owner: Base
    private _setter: string

    private static types = types

    /**
     * Creates a RGB Color object.
     *
     * @name Color#initialize
     * @param {Number} red the amount of red in the color as a value between
     *     `0` and `1`
     * @param {Number} green the amount of green in the color as a value
     *     between `0` and `1`
     * @param {Number} blue the amount of blue in the color as a value
     *     between `0` and `1`
     * @param {Number} [alpha] the alpha of the color as a value between `0`
     *     and `1`
     *
     * @example {@paperscript}
     * // Creating a RGB Color:
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 30:
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * // 100% red, 0% blue, 50% blue:
     * circle.fillColor = new Color(1, 0, 0.5);
     */
    constructor(red: number, green: number, blue: number, alpha?: number)

    /**
     * Creates a gray Color object.
     *
     * @name Color#initialize
     * @param {Number} gray the amount of gray in the color as a value
     *     between `0` and `1`
     * @param {Number} [alpha] the alpha of the color as a value between `0`
     *     and `1`
     *
     * @example {@paperscript}
     * // Creating a gray Color:
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 30:
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * // Create a GrayColor with 50% gray:
     * circle.fillColor = new Color(0.5);
     */
    constructor(gray: number, alpha: number)

    /**
     * Creates a HSB, HSL or gradient Color object from the properties of
     * the provided object:
     *
     * @option hsb.hue {Number} the hue of the color as a value in degrees
     *     between `0` and `360`
     * @option hsb.saturation {Number} the saturation of the color as a
     *     value between `0` and `1`
     * @option hsb.brightness {Number} the brightness of the color as a
     *     value between `0` and `1`
     * @option hsb.alpha {Number} the alpha of the color as a value between
     *     `0` and `1`
     *
     * @option hsl.hue {Number} the hue of the color as a value in degrees
     *     between `0` and `360`
     * @option hsl.saturation {Number} the saturation of the color as a
     *     value between `0` and `1`
     * @option hsl.lightness {Number} the lightness of the color as a value
     *     between `0` and `1`<br>
     * @option hsl.alpha {Number} the alpha of the color as a value between
     *     `0` and `1`
     *
     * @option gradient.gradient {Gradient} the gradient object that
     *     describes the color stops and type of gradient to be used
     * @option gradient.origin {Point} the origin point of the gradient
     * @option gradient.destination {Point} the destination point of the
     *     gradient
     * @option gradient.stops {GradientStop[]} the gradient stops describing
     *     the gradient, as an alternative to providing a gradient object
     * @option gradient.radial {Boolean} controls whether the gradient is
     *     radial, as an alternative to providing a gradient object
     *
     * @name Color#initialize
     * @param {Object} object an object describing the components and
     * properties of the color
     *
     * @example {@paperscript}
     * // Creating a HSB Color:
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 30:
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * // Create an HSB Color with a hue of 90 degrees, a saturation
     * // 100% and a brightness of 100%:
     * circle.fillColor = { hue: 90, saturation: 1, brightness: 1 };
     *
     * @example {@paperscript}
     * // Creating a HSL Color:
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 30:
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * // Create an HSL Color with a hue of 90 degrees, a saturation
     * // 100% and a lightness of 50%:
     * circle.fillColor = { hue: 90, saturation: 1, lightness: 0.5 };
     *
     * @example {@paperscript height=200}
     * // Creating a gradient color from an object literal:
     *
     * // Define two points which we will be using to construct
     * // the path and to position the gradient color:
     * var topLeft = view.center - [80, 80];
     * var bottomRight = view.center + [80, 80];
     *
     * var path = new Path.Rectangle({
     *  topLeft: topLeft,
     *  bottomRight: bottomRight,
     *  // Fill the path with a gradient of three color stops
     *  // that runs between the two points we defined earlier:
     *  fillColor: {
     *      stops: ['yellow', 'red', 'blue'],
     *      origin: topLeft,
     *      destination: bottomRight
     *  }
     * });
     */
    constructor(options: ColorOptions)

    /**
     * Creates a Color object from a CSS string. All common CSS color string
     * formats are supported:
     * - Named colors (e.g. `'red'`, `'fuchsia'`, …)
     * - Hex strings (`'#ffff00'`, `'#ff0'`, …)
     * - RGB strings (`'rgb(255, 128, 0)'`, `'rgba(255, 128, 0, 0.5)'`, …)
     * - HSL strings (`'hsl(180deg, 20%, 50%)'`,
     *   `'hsla(3.14rad, 20%, 50%, 0.5)'`, …)
     *
     * @name Color#initialize
     * @param {String} color the color's CSS string representation
     *
     * @example {@paperscript}
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: new Color('rgba(255, 255, 0, 0.5)')
     * });
     */
    constructor(color?: ColorType)

    /**
     * Creates a gradient Color object.
     *
     * @name Color#initialize
     * @param {Gradient} gradient
     * @param {Point} origin
     * @param {Point} destination
     * @param {Point} [highlight]
     *
     * @example {@paperscript height=200}
     * // Applying a linear gradient color containing evenly distributed
     * // color stops:
     *
     * // Define two points which we will be using to construct
     * // the path and to position the gradient color:
     * var topLeft = view.center - [80, 80];
     * var bottomRight = view.center + [80, 80];
     *
     * // Create a rectangle shaped path between
     * // the topLeft and bottomRight points:
     * var path = new Path.Rectangle(topLeft, bottomRight);
     *
     * // Create the gradient, passing it an array of colors to be converted
     * // to evenly distributed color stops:
     * var gradient = new Gradient(['yellow', 'red', 'blue']);
     *
     * // Have the gradient color run between the topLeft and
     * // bottomRight points we defined earlier:
     * var gradientColor = new Color(gradient, topLeft, bottomRight);
     *
     * // Set the fill color of the path to the gradient color:
     * path.fillColor = gradientColor;
     *
     * @example {@paperscript height=200}
     * // Applying a radial gradient color containing unevenly distributed
     * // color stops:
     *
     * // Create a circle shaped path at the center of the view
     * // with a radius of 80:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 80
     * });
     *
     * // The stops array: yellow mixes with red between 0 and 15%,
     * // 15% to 30% is pure red, red mixes with black between 30% to 100%:
     * var stops = [
     *     ['yellow', 0],
     *     ['red', 0.15],
     *     ['red', 0.3],
     *     ['black', 0.9]
     * ];
     *
     * // Create a radial gradient using the color stops array:
     * var gradient = new Gradient(stops, true);
     *
     * // We will use the center point of the circle shaped path as
     * // the origin point for our gradient color
     * var from = path.position;
     *
     * // The destination point of the gradient color will be the
     * // center point of the path + 80pt in horizontal direction:
     * var to = path.position + [80, 0];
     *
     * // Create the gradient color:
     * var gradientColor = new Color(gradient, from, to);
     *
     * // Set the fill color of the path to the gradient color:
     * path.fillColor = gradientColor;
     */
    constructor(
        gradient: Gradient,
        origin: PointType,
        destination: PointType,
        highlight?: PointType
    )

    constructor(type: ColorTypes, components: ColorType, alpha: number)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]): this {
        const reading = this.__read
        let read = 0
        let arg
        let type
        let components: any
        let alpha
        let values

        this.initComponents()

        if (Array.isArray(args)) {
            arg = args[0]
        }
        let argType = arg != null && typeof arg

        if (argType === 'string' && arg in Color.types) {
            type = arg
            arg = args[1]
            if (Array.isArray(arg)) {
                components = arg
                alpha = args[2]
            } else {
                if (reading) read = 1
                args = Base.slice(args, 1)
                argType = typeof arg
            }
        }
        if (!components) {
            values =
                argType === 'number'
                    ? args
                    : // Do not use Array.isArray() to also support arguments
                    argType === 'object' && arg.length != null
                    ? arg
                    : null

            if (values) {
                if (!type) type = values.length >= 3 ? 'rgb' : 'gray'
                const length = Color.types[type].length
                alpha = values[length]
                if (reading) {
                    read +=
                        values === args ? length + (alpha != null ? 1 : 0) : 1
                }
                if (values.length > length)
                    values = Base.slice(values, 0, length)
            } else if (argType === 'string') {
                const converted = fromCSS(arg)
                type = converted[0]
                components = converted[1]
                if (components.length === 4) {
                    alpha = components[3]
                    components.length--
                }
            } else if (argType === 'object') {
                if (arg.constructor === Color) {
                    type = arg._type
                    components = arg._components.slice()
                    alpha = arg._alpha
                    if (type === 'gradient') {
                        for (let i = 1, l = components.length; i < l; i++) {
                            const point = components[i]
                            if (point) components[i] = point.clone()
                        }
                    }
                } else if (arg.constructor === Gradient) {
                    type = 'gradient'
                    values = args
                } else {
                    type =
                        'hue' in arg
                            ? 'lightness' in arg
                                ? 'hsl'
                                : 'hsb'
                            : 'gradient' in arg ||
                              'stops' in arg ||
                              'radial' in arg
                            ? 'gradient'
                            : 'gray' in arg
                            ? 'gray'
                            : 'rgb'

                    const properties = Color.types[type]
                    const parsers = componentParsers[type]
                    this._components = components = []
                    for (let i = 0, l = properties.length; i < l; i++) {
                        let value = arg[properties[i]]
                        if (
                            value == null &&
                            !i &&
                            type === 'gradient' &&
                            'stops' in arg
                        ) {
                            value = {
                                stops: arg.stops,
                                radial: arg.radial
                            }
                        }
                        value = parsers[i].call(this, value)
                        if (value != null) components[i] = value
                    }
                    alpha = arg.alpha
                }
            }
            if (reading && type) read = 1
        }
        this._type = type || 'rgb'
        if (!components) {
            this._components = components = []
            const parsers = componentParsers[this._type]
            for (let i = 0, l = parsers.length; i < l; i++) {
                const value = parsers[i].call(this, values && values[i])
                if (value != null) components[i] = value
            }
        }
        this._components = components
        this._properties = Color.types[this._type]
        this._alpha = alpha

        if (reading) this.__read = read

        return this
    }

    /**
     * Sets the color to the passed values. Note that any sequence of
     * parameters that is supported by the various {@link Color()}
     * constructors also work for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Color}
     */
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    /**
     * Called by various setters whenever a color value changes
     */
    protected _changed() {
        this._canvasStyle = null
        if (this._owner) {
            if (this._setter) {
                this._owner[this._setter](this)
            } else {
                this._owner.changed(Change.STYLE)
            }
        }
    }

    protected _serialize(options?: ExportJsonOptions, dictionary?: any) {
        const components = this.getComponents()
        return Base.serialize(
            // We can omit the type for gray and rgb:
            /^(gray|rgb)$/.test(this._type)
                ? components
                : [this._type].concat(components),
            options,
            true,
            dictionary
        )
    }

    /**
     * @return {Number[]} the converted components as an array
     */
    protected _convert(type: ColorTypes): number[] {
        const converter = converters[this._type + '-' + type]

        return this._type === type
            ? this._components.slice()
            : converter
            ? converter.apply(this, this._components)
            : converters['rgb-' + type].apply(
                  this,
                  converters[this._type + '-rgb'].apply(this, this._components)
              )
    }

    /**
     * Converts the color to another type.
     *
     * @param {String} type the color type to convert to. Possible values:
     * {@values 'rgb', 'gray', 'hsb', 'hsl'}
     * @return {Color} the converted color as a new instance
     */
    convert(type: ColorTypes): Color {
        return new Color(type, this._convert(type), this._alpha)
    }

    /**
     * The type of the color as a string.
     *
     * @bean
     * @type String
     * @values 'rgb', 'gray', 'hsb', 'hsl'
     *
     * @example
     * var color = new Color(1, 0, 0);
     * console.log(color.type); // 'rgb'
     */
    getType(): ColorTypes {
        return this._type
    }

    setType(type: ColorTypes) {
        this._components = this._convert(type)
        this._properties = Color.types[type]
        this._type = type
    }

    /**
     * The color components that define the color, including the alpha value
     * if defined.
     *
     * @bean
     * @type Number[]
     */
    getComponents() {
        const components = this._components.slice()
        if (this._alpha != null) components.push(this._alpha)
        return components
    }

    /**
     * The color's alpha value as a number between `0` and `1`.
     * All colors of the different subclasses support alpha values.
     *
     * @bean
     * @type Number
     * @default 1
     *
     * @example {@paperscript}
     * // A filled path with a half transparent stroke:
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * // Fill the circle with red and give it a 20pt green stroke:
     * circle.style = {
     *  fillColor: 'red',
     *  strokeColor: 'green',
     *  strokeWidth: 20
     * };
     *
     * // Make the stroke half transparent:
     * circle.strokeColor.alpha = 0.5;
     */
    getAlpha(): number {
        return this._alpha != null ? this._alpha : 1
    }

    setAlpha(alpha: number) {
        this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1)
        this._changed()
    }

    /**
     * Checks if the color has an alpha value.
     *
     * @return {Boolean} {@true if the color has an alpha value}
     */
    hasAlpha(): boolean {
        return this._alpha != null
    }

    /**
     * Checks if the component color values of the color are the
     * same as those of the supplied one.
     *
     * @param {Color} color the color to compare with
     * @return {Boolean} {@true if the colors are the same}
     */

    equals(color: ColorType): boolean
    equals(gray: number, alpha: number): boolean
    equals(red: number, green: number, blue: number, alpha?: number): boolean
    equals(
        gradient: Gradient,
        origin: PointType,
        destination: PointType,
        highlight?: PointType
    ): boolean

    equals(...args: any[]): boolean {
        const col = Base.isPlainValue(args[0], true)
            ? Color.read(args)
            : args[0]
        return (
            col === this ||
            (col &&
                this._class === col._class &&
                this._type === col._type &&
                this.getAlpha() === col.getAlpha() &&
                Base.equals(this._components, col._components)) ||
            false
        )
    }

    clone(): Color {
        return Base.clone(this)
    }

    /**
     * {@grouptitle String Representations}
     * @return {String} a string representation of the color
     */
    toString(): string {
        const properties = this._properties
        const parts = []
        const isGradient = this._type === 'gradient'

        for (let i = 0, l = properties.length; i < l; i++) {
            const value = this._components[i]
            if (value != null)
                parts.push(
                    properties[i] +
                        ': ' +
                        (isGradient ? value : Formatter.number(value))
                )
        }
        if (this._alpha != null)
            parts.push('alpha: ' + Formatter.number(this._alpha))
        return '{ ' + parts.join(', ') + ' }'
    }

    /**
     * Returns the color as a CSS string.
     *
     * @param {Boolean} hex whether to return the color in hexadecimal
     * representation or as a CSS RGB / RGBA string.
     * @return {String} a CSS string representation of the color
     */
    toCSS(hex?: boolean): string {
        // TODO: Support HSL / HSLA CSS3 colors directly, without conversion
        let components = this._convert('rgb')
        const alpha = hex || this._alpha == null ? 1 : this._alpha
        function convert(val: number) {
            return Math.round((val < 0 ? 0 : val > 1 ? 1 : val) * 255)
        }
        components = [
            convert(components[0]),
            convert(components[1]),
            convert(components[2])
        ]
        if (alpha < 1) components.push(alpha < 0 ? 0 : alpha)
        return hex
            ? '#' +
                  (
                      (1 << 24) +
                      (components[0] << 16) +
                      (components[1] << 8) +
                      components[2]
                  )
                      .toString(16)
                      .slice(1)
            : (components.length === 4 ? 'rgba(' : 'rgb(') +
                  components.join(',') +
                  ')'
    }

    toCanvasStyle(
        ctx: CanvasRenderingContext2D,
        matrix: Matrix
    ): CanvasGradient | string {
        if (this._canvasStyle) return this._canvasStyle
        // Normal colors are simply represented by their CSS string.
        if (this._type !== 'gradient') return (this._canvasStyle = this.toCSS())
        // Gradient code form here onwards
        const components = this._components
        const gradient = components[0]
        const stops = gradient._stops
        let origin = components[1]
        let destination = components[2]
        let highlight = components[3]
        const inverse = matrix && matrix.inverted()
        let canvasGradient

        if (inverse) {
            origin = inverse._transformPoint(origin)
            destination = inverse._transformPoint(destination)
            if (highlight) highlight = inverse._transformPoint(highlight)
        }
        if (gradient._radial) {
            const radius = destination.getDistance(origin)
            if (highlight) {
                const vector = highlight.subtract(origin)
                if (vector.getLength() > radius)
                    highlight = origin.add(vector.normalize(radius - 0.1))
            }
            const start = highlight || origin
            canvasGradient = ctx.createRadialGradient(
                start.x,
                start.y,
                0,
                origin.x,
                origin.y,
                radius
            )
        } else {
            canvasGradient = ctx.createLinearGradient(
                origin.x,
                origin.y,
                destination.x,
                destination.y
            )
        }
        for (let i = 0, l = stops.length; i < l; i++) {
            const stop = stops[i]
            const offset = stop._offset

            canvasGradient.addColorStop(
                offset == null ? i / (l - 1) : offset,
                stop._color.toCanvasStyle()
            )
        }
        return (this._canvasStyle = canvasGradient)
    }

    /**
     * Transform the gradient color by the specified matrix.
     *
     * @param {Matrix} matrix the matrix to transform the gradient color by
     */
    transform(matrix: Matrix) {
        if (this._type === 'gradient') {
            const components = this._components
            for (let i = 1, l = components.length; i < l; i++) {
                const point = components[i]
                matrix._transformPoint(point, point, true)
            }
            this._changed()
        }
    }

    /**
     * Returns a color object with random {@link #red}, {@link #green}
     * and {@link #blue} values between `0` and `1`.
     *
     * @return {Color} the newly created color object
     * @static
     *
     * @example {@paperscript}
     * var circle = new Path.Circle(view.center, 50);
     * // Set a random color as circle fill color.
     * circle.fillColor = Color.random();
     */
    static random(): Color {
        const random = Math.random
        return new Color(random(), random(), random())
    }

    static _setOwner(color: Color, owner: Base, setter?: string) {
        if (color) {
            if (color._owner && owner && color._owner !== owner) {
                color = color.clone()
            }
            if (!color._owner !== !owner) {
                color._owner = owner || null
                color._setter = setter || null
            }
        }
        return color
    }

    private hasOverlap(name: string) {
        return /^(hue|saturation)$/.test(name)
    }

    private parser(name: string, type: string) {
        return type === 'gradient'
            ? name === 'gradient'
                ? // gradient property of gradient color:
                  (...args: any[]) => {
                      const current = this._components[0]
                      const value: any = Gradient.read(
                          Array.isArray(args[0]) ? args[0] : args,
                          0,
                          { readNull: true }
                      )
                      if (current !== value) {
                          if (current) current._removeOwner(this)
                          if (value) value._addOwner(this)
                      }
                      return value
                  }
                : (...args: any[]) => {
                      return Point.read(args, 0, {
                          readNull: name === 'highlight',
                          clone: true
                      })
                  }
            : (value: any) => {
                  return value == null || isNaN(value) ? 0 : +value
              }
    }

    private initComponents() {
        Base.each(
            Color.types,
            (propeties, type) => {
                componentParsers[type] = []
                Base.each(
                    propeties,
                    (name, index) => {
                        componentParsers[type][index] = this.parser(name, type)
                    },
                    this
                )
            },
            this
        )
    }

    private getParam(type: ColorTypes, name: string) {
        const index = Color.types[type].findIndex((prop) => prop === name)

        return this._type === type ||
            (this.hasOverlap(name) && /^hs[bl]$/.test(this._type))
            ? this._components[index]
            : this._convert(type)[index]
    }

    private setParam(
        type: ColorTypes,
        name: string,
        value: Gradient | PointType | number
    ) {
        const index = Color.types[type].findIndex((prop) => prop === name)

        if (
            this._type !== type &&
            !(this.hasOverlap(name) && /^hs[bl]$/.test(this._type))
        ) {
            this._components = this._convert(type)
            this._properties = Color.types[type]
            this._type = type
        }
        this._components[index] = this.parser(name, type)(value)
        this._changed()
    }

    get alpha() {
        return this.getAlpha()
    }

    set alpha(alpha: number) {
        this.setAlpha(alpha)
    }

    get red() {
        return this.getParam('rgb', 'red')
    }

    set red(value: number) {
        this.setParam('rgb', 'red', value)
    }

    get green() {
        return this.getParam('rgb', 'green')
    }

    set green(value: number) {
        this.setParam('rgb', 'green', value)
    }

    get blue() {
        return this.getParam('rgb', 'blue')
    }

    set blue(value: number) {
        this.setParam('rgb', 'blue', value)
    }

    get gray() {
        return this.getParam('gray', 'gray')
    }

    set gray(value: number) {
        this.setParam('gray', 'gray', value)
    }

    get hue() {
        return this.getParam('hsb', 'hue')
    }

    set hue(value: number) {
        this.setParam('hsb', 'hue', value)
    }

    get saturation() {
        return this.getParam('hsb', 'saturation')
    }

    set saturation(value: number) {
        this.setParam('hsb', 'saturation', value)
    }

    get brightness() {
        return this.getParam('hsb', 'brightness')
    }

    set brightness(value: number) {
        this.setParam('hsb', 'brightness', value)
    }

    get lightness() {
        return this.getParam('hsl', 'lightness')
    }

    set lightness(value: number) {
        this.setParam('hsl', 'lightness', value)
    }

    get gradient() {
        return this.getParam('gradient', 'gradient')
    }

    set gradient(value: Gradient) {
        this.setParam('gradient', 'gradient', value)
    }

    get origin() {
        return this.getParam('gradient', 'origin')
    }

    set origin(value: PointType) {
        this.setParam('gradient', 'origin', value)
    }

    get destination() {
        return this.getParam('gradient', 'destination')
    }

    set destination(value: PointType) {
        this.setParam('gradient', 'destination', value)
    }

    get highlight() {
        return this.getParam('gradient', 'highlight')
    }

    set highlight(value: PointType) {
        this.setParam('gradient', 'highlight', value)
    }

    private applyOperator(
        operator: (a: number, b: number) => number,
        ...args: any[]
    ): Color {
        const color = Color.read(args)
        const type = this._type
        const components1 = this._components
        const components2 = color._convert(type)

        for (let i = 0, l = components1.length; i < l; i++)
            components2[i] = operator(components1[i], components2[i])

        return new Color(
            type,
            components2,
            this._alpha != null
                ? operator(this._alpha, color.getAlpha())
                : undefined
        )
    }

    /**
     * Returns the addition of the supplied color to the color as a new
     * color.
     * The object itself is not modified!
     *
     * @name Color#add
     * @function
     * @operator
     * @param {Color} color the color to add
     * @return {Color} the addition of the two colors as a new color
     *
     * @example
     * var color1 = new Color(0, 1, 1);
     * var color2 = new Color(1, 0, 0);
     * var result = color1 + color2;
     * console.log(result); // { red: 1, blue: 1, green: 1 }
     */
    add(color: ColorType): Color
    add(gray: number, alpha: number): Color
    add(red: number, green: number, blue: number, alpha?: number): Color
    add(
        gradient: Gradient,
        origin: PointType,
        destination: PointType,
        highlight?: PointType
    ): Color

    add(...args: any[]): Color {
        return this.applyOperator((a: number, b: number) => a + b, ...args)
    }

    /**
     * Returns the subtraction of the supplied color to the color as a new
     * color.
     * The object itself is not modified!
     *
     * @name Color#subtract
     * @function
     * @operator
     * @param {Color} color the color to subtract
     * @return {Color} the subtraction of the two colors as a new color
     *
     * @example
     * var color1 = new Color(0, 1, 1);
     * var color2 = new Color(1, 0, 0);
     * var result = color1 - color2;
     * console.log(result); // { red: 0, blue: 1, green: 1 }
     */
    subtract(color: ColorType): Color
    subtract(gray: number, alpha: number): Color
    subtract(red: number, green: number, blue: number, alpha?: number): Color
    subtract(
        gradient: Gradient,
        origin: PointType,
        destination: PointType,
        highlight?: PointType
    ): Color

    subtract(...args: any[]): Color {
        return this.applyOperator((a: number, b: number) => a - b, ...args)
    }

    /**
     * Returns the multiplication of the supplied color to the color as a
     * new color.
     * The object itself is not modified!
     *
     * @name Color#multiply
     * @function
     * @operator
     * @param {Color} color the color to multiply
     * @return {Color} the multiplication of the two colors as a new color
     *
     * @example
     * var color1 = new Color(0, 1, 1);
     * var color2 = new Color(0.5, 0, 0.5);
     * var result = color1 * color2;
     * console.log(result); // { red: 0, blue: 0, green: 0.5 }
     */
    multiply(color: ColorType): Color
    multiply(gray: number, alpha: number): Color
    multiply(red: number, green: number, blue: number, alpha?: number): Color
    multiply(
        gradient: Gradient,
        origin: PointType,
        destination: PointType,
        highlight?: PointType
    ): Color

    multiply(...args: any[]): Color {
        return this.applyOperator((a: number, b: number) => a * b, ...args)
    }

    /**
     * Returns the division of the supplied color to the color as a new
     * color.
     * The object itself is not modified!
     *
     * @name Color#divide
     * @function
     * @operator
     * @param {Color} color the color to divide
     * @return {Color} the division of the two colors as a new color
     *
     * @example
     * var color1 = new Color(0, 1, 1);
     * var color2 = new Color(0.5, 0, 0.5);
     * var result = color1 / color2;
     * console.log(result); // { red: 0, blue: 0, green: 1 }
     */
    divide(color: ColorType): Color
    divide(gray: number, alpha: number): Color
    divide(red: number, green: number, blue: number, alpha?: number): Color
    divide(
        gradient: Gradient,
        origin: PointType,
        destination: PointType,
        highlight?: PointType
    ): Color

    divide(...args: any[]): Color {
        return this.applyOperator((a: number, b: number) => a / b, ...args)
    }
}
