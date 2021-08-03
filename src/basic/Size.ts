import {
    Base,
    ExportJsonOptions,
    Exportable,
    ReadIndex,
    Formatter,
    Numerical
} from '../'

import { Size as SizeType } from './Types'

@ReadIndex()
@Exportable()
export class Size extends Base {
    protected _class = 'Size'

    protected _width: number
    protected _height: number

    /**
     * Creates a Size object with the given width and height values.
     *
     * @name Size#initialize
     * @param {Number} number the width
     *
     * @example
     * // Create a size that is 10pt wide and high
     * var size = new Size(10);
     * console.log(size.width); // 10
     * console.log(size.height); // 10
     */
    constructor(number: number)

    /**
     * Creates a Size object with the given width and height values.
     *
     * @name Size#initialize
     * @param {Number} width the width
     * @param {Number} height the height
     *
     * @example
     * // Create a size that is 10pt wide and 5pt high
     * var size = new Size(10, 5);
     * console.log(size.width); // 10
     * console.log(size.height); // 5
     */
    constructor(width: number, height: number)

    /**
     * Creates a Size object using the numbers in the given array as
     * dimensions.
     *
     * @name Size#initialize
     * @param {Array} array
     *
     * @example
     * // Creating a size of width: 320, height: 240 using an array of numbers:
     * var array = [320, 240];
     * var size = new Size(array);
     * console.log(size.width); // 320
     * console.log(size.height); // 240
     */
    constructor(array: number[])

    /**
     * Creates a Size object using the properties in the given object.
     *
     * @name Size#initialize
     * @param {Object} object
     *
     * @example
     * // Creating a size of width: 10, height: 20 using an object literal:
     *
     * var size = new Size({
     *     width: 10,
     *     height: 20
     * });
     * console.log(size.width); // 10
     * console.log(size.height); // 20
     */
    constructor(size?: { width: number; height: number })

    /**
     * Creates a Size object using the {@link Point#x} and {@link Point#y}
     * values of the given Point object.
     *
     * @name Size#initialize
     * @param {Point} point
     *
     * @example
     * var point = new Point(50, 50);
     * var size = new Size(point);
     * console.log(size.width); // 50
     * console.log(size.height); // 50
     */
    constructor(point: { x: number; y: number })

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        const arg0 = args[0]
        const arg1 = args[1]
        const type = typeof arg0
        const reading = this.__read
        let read = 0

        if (type === 'number') {
            const hasHeight = typeof arg1 === 'number'
            this._set(arg0, hasHeight ? arg1 : arg0)
            if (reading) read = hasHeight ? 2 : 1
        } else if (type === 'undefined' || arg0 === null) {
            this._set(0, 0)
            if (reading) read = arg0 === null ? 1 : 0
        } else {
            const obj = type === 'string' ? arg0.split(/[\s,]+/) || [] : arg0
            read = 1
            if (Array.isArray(obj)) {
                this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]))
            } else if ('width' in obj) {
                this._set(obj.width || 0, obj.height || 0)
            } else if ('x' in obj) {
                this._set(obj.x || 0, obj.y || 0)
            } else {
                this._set(0, 0)
                read = 0
            }
        }
        if (reading) this.__read = read
        return this
    }

    /**
     * Sets the size to the passed values. Note that any sequence of parameters
     * that is supported by the various {@link Size()} constructors also work
     * for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Size}
     */
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    protected _set(width: number, height: number) {
        this.width = width
        this.height = height
        return this
    }

    get width(): number {
        return this._width
    }

    set width(width: number) {
        this._width = width
    }

    get height(): number {
        return this._height
    }

    set height(height: number) {
        this._height = height
    }

    /**
     * Checks whether the width and height of the size are equal to those of the
     * supplied size.
     *
     * @param {Size} size the size to compare to
     * @return {Boolean}
     *
     * @example
     * var size = new Size(5, 10);
     * console.log(size == new Size(5, 10)); // true
     * console.log(size == new Size(1, 1)); // false
     * console.log(size != new Size(1, 1)); // true
     */
    equals(size: Size): boolean {
        return (
            size === this ||
            (size &&
                ((this.width === size.width && this.height === size.height) ||
                    (Array.isArray(size) &&
                        this.width === size[0] &&
                        this.height === size[1]))) ||
            false
        )
    }

    /**
     * Returns a copy of the size.
     * @return {Size}
     */
    clone(): this {
        return new Size(this.width, this.height) as this
    }

    /**
     * @return {String} a string representation of the size
     */
    toString(): string {
        return (
            '{ width: ' +
            Formatter.number(this.width) +
            ', height: ' +
            Formatter.number(this.height) +
            ' }'
        )
    }

    protected _serialize(options: ExportJsonOptions) {
        const f = options.formatter
        return [f.number(this.width), f.number(this.height)]
    }

    /**
     * Returns the addition of the width and height of the supplied size to the
     * size as a new size. The object itself is not modified!
     *
     * @name Size#add
     * @function
     * @operator
     * @param {Size} size the size to add
     * @return {Size} the addition of the two sizes as a new size
     *
     * @example
     * var size1 = new Size(5, 10);
     * var size2 = new Size(10, 20);
     * var result = size1 + size2;
     * console.log(result); // {width: 15, height: 30}
     */
    add(width: number, height: number): Size
    add(size: SizeType): Size
    add(...args: any[]): Size {
        const size = Size.read(args)
        return new Size(this.width + size.width, this.height + size.height)
    }

    /**
     * Returns the subtraction of the width and height of the supplied size from
     * the size as a new size. The object itself is not modified!
     *
     * @name Size#subtract
     * @function
     * @operator
     * @param {Size} size the size to subtract
     * @return {Size} the subtraction of the two sizes as a new size
     *
     * @example
     * var firstSize = new Size(10, 20);
     * var secondSize = new Size(5, 5);
     * var result = firstSize - secondSize;
     * console.log(result); // {width: 5, height: 15}
     */
    subtract(width: number, height: number): Size
    subtract(size: SizeType): Size
    subtract(...args: any[]): Size {
        const size = Size.read(args)
        return new Size(this.width - size.width, this.height - size.height)
    }

    /**
     * Returns the multiplication of the width and height of the supplied size
     * with the size as a new size. The object itself is not modified!
     *
     * @name Size#multiply
     * @function
     * @operator
     * @param {Size} size the size to multiply by
     * @return {Size} the multiplication of the two sizes as a new size
     *
     * @example
     * var firstSize = new Size(5, 10);
     * var secondSize = new Size(4, 2);
     * var result = firstSize * secondSize;
     * console.log(result); // {width: 20, height: 20}
     */
    multiply(width: number, height: number): Size
    multiply(size: SizeType): Size
    multiply(...args: any[]): Size {
        const size = Size.read(args)
        return new Size(this.width * size.width, this.height * size.height)
    }

    /**
     * Returns the division of the width and height of the supplied size by the
     * size as a new size. The object itself is not modified!
     *
     * @name Size#divide
     * @function
     * @operator
     * @param {Size} size the size to divide by
     * @return {Size} the division of the two sizes as a new size
     *
     * @example
     * var firstSize = new Size(8, 10);
     * var secondSize = new Size(2, 5);
     * var result = firstSize / secondSize;
     * console.log(result); // {width: 4, height: 2}
     */
    divide(width: number, height: number): Size
    divide(size: SizeType): Size
    divide(...args: any[]): Size {
        const size = Size.read(args)
        return new Size(this.width / size.width, this.height / size.height)
    }

    /**
     * The modulo operator returns the integer remainders of dividing the size
     * by the supplied size as a new size.
     *
     * @name Size#modulo
     * @function
     * @operator
     * @param {Size} size
     * @return {Size} the integer remainders of dividing the sizes by each
     * other as a new size
     *
     * @example
     * var size = new Size(12, 6);
     * console.log(size % new Size(5, 2)); // {width: 2, height: 0}
     */
    modulo(width: number, height: number): Size
    modulo(size: SizeType): Size
    modulo(...args: any[]): Size {
        const size = Size.read(args)
        return new Size(this.width % size.width, this.height % size.height)
    }

    negate(): Size {
        return new Size(-this.width, -this.height)
    }

    /**
     * {@grouptitle Tests}
     * Checks if this size has both the width and height set to 0.
     *
     * @return {Boolean} {@true if both width and height are 0}
     */
    isZero(): boolean {
        const isZero = Numerical.isZero
        return isZero(this.width) && isZero(this.height)
    }

    /**
     * Checks if the width or the height of the size are NaN.
     *
     * @return {Boolean} {@true if the width or height of the size are NaN}
     */
    isNaN(): boolean {
        return isNaN(this.width) || isNaN(this.height)
    }

    /**
     * {@grouptitle Math Functions}
     *
     * Returns a new size with rounded {@link #width} and {@link #height}
     * values. The object itself is not modified!
     *
     * @name Size#round
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(10.2, 10.9);
     * var roundSize = size.round();
     * console.log(roundSize); // {x: 10, y: 11}
     */
    round(): Size {
        const op = Math.round
        return new Size(op(this.width), op(this.height))
    }

    /**
     * Returns a new size with the nearest greater non-fractional values to the
     * specified {@link #width} and {@link #height} values. The object itself is
     * not modified!
     *
     * @name Size#ceil
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(10.2, 10.9);
     * var ceilSize = size.ceil();
     * console.log(ceilSize); // {x: 11, y: 11}
     */
    ceil(): Size {
        const op = Math.ceil
        return new Size(op(this.width), op(this.height))
    }

    /**
     * Returns a new size with the nearest smaller non-fractional values to the
     * specified {@link #width} and {@link #height} values. The object itself is
     * not modified!
     *
     * @name Size#floor
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(10.2, 10.9);
     * var floorSize = size.floor();
     * console.log(floorSize); // {x: 10, y: 10}
     */
    floor(): Size {
        const op = Math.floor
        return new Size(op(this.width), op(this.height))
    }

    /**
     * Returns a new size with the absolute values of the specified
     * {@link #width} and {@link #height} values. The object itself is not
     * modified!
     *
     * @name Size#abs
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(-5, 10);
     * var absSize = size.abs();
     * console.log(absSize); // {x: 5, y: 10}
     */
    abs(): Size {
        const op = Math.abs
        return new Size(op(this.width), op(this.height))
    }

    /**
     * Returns a new size object with the smallest {@link #width} and
     * {@link #height} of the supplied sizes.
     *
     * @static
     * @param {Size} size1
     * @param {Size} size2
     * @return {Size} the newly created size object
     *
     * @example
     * var size1 = new Size(10, 100);
     * var size2 = new Size(200, 5);
     * var minSize = Size.min(size1, size2);
     * console.log(minSize); // {width: 10, height: 5}
     *
     * @example
     * // Find the minimum of multiple sizes:
     * var size1 = new Size(60, 100);
     * var size2 = new Size(200, 5);
     * var size3 = new Size(250, 35);
     * [size1, size2, size3].reduce(Size.min) // {width: 60, height: 5}
     */
    static min(
        width1: number,
        height1: number,
        xwidth2: number,
        height2: number
    ): Size

    static min(point1: SizeType, point2: SizeType): Size
    static min(...args: any[]): Size {
        const size1 = Size.read(args)
        const size2 = Size.read(args)

        return new Size(
            Math.min(size1.width, size2.width),
            Math.min(size1.height, size2.height)
        )
    }

    /**
     * Returns a new size object with the largest {@link #width} and
     * {@link #height} of the supplied sizes.
     *
     * @static
     * @param {Size} size1
     * @param {Size} size2
     * @return {Size} the newly created size object
     *
     * @example
     * var size1 = new Size(10, 100);
     * var size2 = new Size(200, 5);
     * var maxSize = Size.max(size1, size2);
     * console.log(maxSize); // {width: 200, height: 100}
     *
     * @example
     * // Find the maximum of multiple sizes:
     * var size1 = new Size(60, 100);
     * var size2 = new Size(200, 5);
     * var size3 = new Size(250, 35);
     * [size1, size2, size3].reduce(Size.max) // {width: 250, height: 100}
     */
    static max(
        width1: number,
        height1: number,
        xwidth2: number,
        height2: number
    ): Size

    static max(point1: SizeType, point2: SizeType): Size
    static max(...args: any[]): Size {
        const size1 = Size.read(args)
        const size2 = Size.read(args)
        return new Size(
            Math.max(size1.width, size2.width),
            Math.max(size1.height, size2.height)
        )
    }

    /**
     * Returns a point object with random {@link #x} and {@link #y} values
     * between `0` and `1`.
     *
     * @return {Point} the newly created point object
     * @static
     *
     * @example
     * var maxPoint = new Point(100, 100);
     * var randomPoint = Point.random();
     *
     * // A point between {x:0, y:0} and {x:100, y:100}:
     * var point = maxPoint * randomPoint;
     */
    static random(): Size {
        return new Size(Math.random(), Math.random())
    }
}

export class LinkedSize extends Size {
    protected _owner: any
    protected _setter: string

    constructor(widthx: number, height: number, owner: Base, setter: string)
    constructor(...args: any[]) {
        super()
        if (this.constructor.name === 'LinkedSize') {
            this.initialize(...args)
        }
    }

    initialize(
        width?: number,
        height?: number,
        owner?: Base,
        setter?: string
    ): this {
        this._width = width
        this._height = height
        this._owner = owner
        this._setter = setter

        return this
    }

    set(...args: any[]): this {
        return super.initialize(...args)
    }

    protected _set(width: number, height: number, _dontNotify?: boolean) {
        this._width = width
        this._height = height
        if (!_dontNotify) this._owner[this._setter](this)
        return this
    }

    get width(): number {
        return this._width
    }

    set width(width: number) {
        this._width = width
        this._owner[this._setter](this)
    }

    get height(): number {
        return this._height
    }

    set height(height: number) {
        this._height = height
        this._owner[this._setter](this)
    }
}
