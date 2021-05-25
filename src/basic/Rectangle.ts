import { Base } from '../core'
import Point from './Point'

export default class Rectangle extends Base {
    protected _class = 'Rectangle'
    protected _readIndex: true
    beans = true

    x: number
    y: number
    width: number
    height: number

    constructor()

    /**
     * Creates a Rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Point} point the top-left point of the rectangle
     * @param {Size} size the size of the rectangle
     */
    constructor(point: Point, size: Size)

    /**
     * Creates a Rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Object} object an object containing properties to be set on the
     * rectangle
     *
     * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
     * var rectangle = new Rectangle({
     *     point: [20, 20],
     *     size: [60, 60]
     * });
     *
     * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
     * var rectangle = new Rectangle({
     *     from: [20, 20],
     *     to: [80, 80]
     * });
     */
    constructor(object: Object)

    /**
     * Creates a rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Number} x the left coordinate
     * @param {Number} y the top coordinate
     * @param {Number} width
     * @param {Number} height
     */
    constructor(x: number, y: number, width: number, height: number)

    /**
     * Creates a rectangle object from the passed points. These do not
     * necessarily need to be the top left and bottom right corners, the
     * constructor figures out how to fit a rectangle between them.
     *
     * @name Rectangle#initialize
     * @param {Point} from the first point defining the rectangle
     * @param {Point} to the second point defining the rectangle
     */
    constructor(from: Point, to: Point)

    /**
     * Creates a new rectangle object from the passed rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Rectangle} rectangle
     */
    constructor(rectangle: Rectangle)

    constructor(...args: any[]) {
        super(args)
    }

    initialize(...args: any) {
        const type = typeof args[0]
        let read

        if (type === 'number') {
            this._set(...args)
            read = 4
        } else if (type === 'undefined' || args[0] === null) {
            this._set(0, 0, 0, 0)
            read = args[0] === null ? 1 : 0
        } else if (args.length === 1) {
            if (Array.isArray(args[0])) {
                this._set(...args[0])
                read = 1
            } else if (args[0].x !== undefined || args[0].width !== undefined) {
                this._set(
                    args[0].x || 0,
                    args[0].y || 0,
                    args[0].width || 0,
                    args[0].height || 0
                )
                read = 1
            } else if (args[0].from === undefined && args[0].to === undefined) {
                this._set(0, 0, 0, 0)
                if (Base.readSupported(args, this)) {
                    read = 1
                }
            }
        }
        if (read === undefined) {
            const frm = Point.readNamed(args, 'from')
            const next = Base.peek(args)
            let x = frm.x
            let y = frm.y
            let width
            let height
            if ((next && next.x !== undefined) || Base.hasNamed(args, 'to')) {
                const to = Point.readNamed(args, 'to')
                width = to.x - x
                height = to.y - y

                if (width < 0) {
                    x = to.x
                    width = -width
                }
                if (height < 0) {
                    y = to.y
                    height = -height
                }
            } else {
                // new Rectangle(point, size)
                const size = Size.read(args)
                width = size.width
                height = size.height
            }
            this._set(x, y, width, height)
            read = args.__index
        }

        const filtered = args.__filtered
        if (filtered) this.__filtered = filtered
        if (this.__read) this.__read = read
        return this
    }

    /**
     * Sets the rectangle to the passed values. Note that any sequence of
     * parameters that is supported by the various {@link Rectangle()}
     * constructors also work for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Rectangle}
     */
    set(): this
    set(point: Point, size: Size): this
    set(object: Object): this
    set(x: number, y: number, width: number, height: number): this
    set(from: Point, to: Point): this
    set(rectangle: Rectangle): this
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    _set(x?: number, y?: number, width?: number, height?: number) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        return this
    }
}
