import Base, { ExportJsonOptions } from '../core/Base'
import Formatter from '../utils/Formatter'
import Point, { LinkedPoint } from './Point'
import Size, { LinkedSize } from './Size'
import ItemSelection from '../item/ItemSelection'
import {
    Point as PointType,
    Size as SizeType,
    Rectangle as RectangleType
} from './Types'
import { Exportable, ReadIndex } from '../utils/Decorators'

@ReadIndex()
@Exportable()
export default class Rectangle extends Base {
    protected _class = 'Rectangle'

    beans = true

    protected _x: number
    protected _y: number
    protected _width: number
    protected _height: number

    protected _fw = 1
    protected _fh = 1
    protected _sx: number
    protected _sy: number

    /**
     * Creates a Rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Point} point the top-left point of the rectangle
     * @param {Size} size the size of the rectangle
     */
    constructor(point: PointType, size: SizeType)

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
    constructor(rectangle: { from: PointType; to: PointType })
    constructor(rectangle: { point: PointType; size: PointType })
    constructor(rectangle?: {
        x: number
        y: number
        width: number
        height: number
    })

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
    constructor(from: PointType, to: PointType)

    /**
     * Creates a new rectangle object from the passed rectangle object.
     *
     * @name Rectangle#initialize
     * @param {Rectangle} rectangle
     */

    constructor(...args: any[]) {
        super(...args)
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
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    protected _set(x?: number, y?: number, width?: number, height?: number) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        return this
    }

    get x() {
        return this._x
    }

    set x(value: number) {
        this._x = value
    }

    get y() {
        return this._y
    }

    set y(value: number) {
        this._y = value
    }

    get width() {
        return this._width
    }

    set width(value: number) {
        this._width = value
    }

    get height() {
        return this._height
    }

    set height(value: number) {
        this._height = value
    }

    /**
     * Checks whether the coordinates and size of the rectangle are equal to
     * that of the supplied rectangle.
     *
     * @param {Rectangle} rect
     * @return {Boolean} {@true if the rectangles are equal}
     */
    equals(point: PointType, size: SizeType): boolean
    equals(rectangle: RectangleType): boolean
    equals(x: number, y: number, width: number, height: number): boolean
    equals(from: PointType, to: PointType): boolean
    equals(...args: any[]): boolean {
        const rt = Rectangle.read(args)
        return (
            rt === this ||
            (rt &&
                this.x === rt.x &&
                this.y === rt.y &&
                this.width === rt.width &&
                this.height === rt.height) ||
            false
        )
    }

    /**
     * Returns a copy of the rectangle.
     * @return {Rectangle}
     */
    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height)
    }

    /**
     * @return {String} a string representation of this rectangle
     */
    toString(): string {
        return (
            '{ x: ' +
            Formatter.number(this.x) +
            ', y: ' +
            Formatter.number(this.y) +
            ', width: ' +
            Formatter.number(this.width) +
            ', height: ' +
            Formatter.number(this.height) +
            ' }'
        )
    }

    protected _serialize(options: ExportJsonOptions) {
        const f = options.formatter
        return [
            f.number(this.x),
            f.number(this.y),
            f.number(this.width),
            f.number(this.height)
        ]
    }

    get point() {
        return this.getPoint()
    }

    set point(point: PointType) {
        this.setPoint(point)
    }

    protected getPoint(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(this.x, this.y, this, 'setPoint')
    }

    protected setPoint(...args: any[]) {
        const point = Point.read(args)
        this.x = point.x
        this.y = point.y
    }

    get size() {
        return this.getSize()
    }

    set size(size: SizeType) {
        this.setSize(size)
    }

    protected getSize(_dontLink?: boolean) {
        const Ctor = _dontLink ? Size : LinkedSize
        return new Ctor(this.width, this.height, this, 'setSize')
    }

    protected setSize(...args: any[]) {
        const size = Size.read(args)
        const sx = this._sx
        const sy = this._sy
        const w = size.width
        const h = size.height

        if (sx) {
            this.x += (this.width - w) * sx
        }
        if (sy) {
            this.y += (this.height - h) * sy
        }
        this.width = w
        this.height = h
        this._fw = this._fh = 1
    }

    get left() {
        return this.getLeft()
    }

    set left(left: number) {
        this.setLeft(left)
    }

    protected getLeft() {
        return this.x
    }

    protected setLeft(left?: number) {
        if (!this._fw) {
            const amount = left - this.x
            this.width -= this._sx === 0.5 ? amount * 2 : amount
        }
        this.x = left
        this._sx = this._fw = 0
    }

    get top() {
        return this.getTop()
    }

    set top(top: number) {
        this.setTop(top)
    }

    protected getTop() {
        return this.y
    }

    protected setTop(top?: number) {
        if (!this._fh) {
            const amount = top - this.y
            this.height -= this._sy === 0.5 ? amount * 2 : amount
        }
        this.y = top
        this._sy = this._fh = 0
    }

    get right() {
        return this.getRight()
    }

    set right(right: number) {
        this.setRight(right)
    }

    protected getRight() {
        return this.x + this.width
    }

    protected setRight(right?: number) {
        if (!this._fw) {
            const amount = right - this.x
            this.width = this._sx === 0.5 ? amount * 2 : amount
        }
        this.x = right - this.width
        this._sx = 1
        this._fw = 0
    }

    get bottom() {
        return this.getBottom()
    }

    set bottom(bottom: number) {
        this.setBottom(bottom)
    }

    protected getBottom() {
        return this.y + this.height
    }

    protected setBottom(bottom?: number) {
        if (!this._fh) {
            const amount = bottom - this.y
            this.height = this._sy === 0.5 ? amount * 2 : amount
        }
        this.y = bottom - this.height
        this._sy = 1
        this._fh = 0
    }

    get centerX() {
        return this.getCenterX()
    }

    set centerX(x: number) {
        this.setCenterX(x)
    }

    protected getCenterX() {
        return this.x + this.width / 2
    }

    protected setCenterX(x?: number) {
        if (this._fw || this._sx === 0.5) {
            this.x = x - this.width / 2
        } else {
            if (this._sx) {
                this.x += (x - this.x) * 2 * this._sx
            }
            this.width = (x - this.x) * 2
        }
        this._sx = 0.5
        this._fw = 0
    }

    get centerY() {
        return this.getCenterY()
    }

    set centerY(y: number) {
        this.setCenterY(y)
    }

    protected getCenterY() {
        return this.y + this.height / 2
    }

    protected setCenterY(y?: number) {
        if (this._fh || this._sy === 0.5) {
            this.y = y - this.height / 2
        } else {
            if (this._sy) {
                this.y += (y - this.y) * 2 * this._sy
            }
            this.height = (y - this.y) * 2
        }
        this._sy = 0.5
        this._fh = 0
    }

    get center() {
        return this.getCenter()
    }

    set center(point: PointType) {
        this.setCenter(point)
    }

    protected getCenter(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(this.getCenterX(), this.getCenterY(), this, 'setCenter')
    }

    protected setCenter(...args: any) {
        const point = Point.read(args)
        this.setCenterX(point.x)
        this.setCenterY(point.y)

        return this
    }

    get topLeft() {
        return this.getTopLeft()
    }

    set topLeft(point: Point) {
        this.setTopLeft(point)
    }

    protected getTopLeft(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(this.getLeft(), this.getTop(), this, 'setTopLeft')
    }

    protected setTopLeft(...args: any) {
        const point = Point.read(args)
        this.setLeft(point.x)
        this.setTop(point.y)
    }

    get topRight() {
        return this.getTopRight()
    }

    set topRight(point: Point) {
        this.setTopRight(point)
    }

    protected getTopRight(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(this.getRight(), this.getTop(), this, 'setTopRight')
    }

    protected setTopRight(...args: any) {
        const point = Point.read(args)
        this.setRight(point.x)
        this.setTop(point.y)
    }

    get bottomLeft() {
        return this.getBottomLeft()
    }

    set bottomLeft(point: Point) {
        this.setBottomLeft(point)
    }

    protected getBottomLeft(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(this.getLeft(), this.getBottom(), this, 'setBottomLeft')
    }

    protected setBottomLeft(...args: any) {
        const point = Point.read(args)
        this.setLeft(point.x)
        this.setBottom(point.y)
    }

    get bottomRight() {
        return this.getBottomRight()
    }

    set bottomRight(point: Point) {
        this.setBottomRight(point)
    }

    protected getBottomRight(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(
            this.getRight(),
            this.getBottom(),
            this,
            'setBottomRight'
        )
    }

    protected setBottomRight(...args: any) {
        const point = Point.read(args)
        this.setRight(point.x)
        this.setBottom(point.y)
    }

    get leftCenter() {
        return this.getLeftCenter()
    }

    set leftCenter(point: Point) {
        this.setLeftCenter(point)
    }

    protected getLeftCenter(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(
            this.getLeft(),
            this.getCenterY(),
            this,
            'setLeftCenter'
        )
    }

    protected setLeftCenter(...args: any) {
        const point = Point.read(args)
        this.setLeft(point.x)
        this.setCenterY(point.y)
    }

    get topCenter() {
        return this.getTopCenter()
    }

    set topCenter(point: Point) {
        this.setTopCenter(point)
    }

    protected getTopCenter(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(this.getCenterX(), this.getTop(), this, 'setTopCenter')
    }

    protected setTopCenter(...args: any) {
        const point = Point.read(args)
        this.setCenterX(point.x)
        this.setTop(point.y)
    }

    get rightCenter() {
        return this.getRightCenter()
    }

    set rightCenter(point: Point) {
        this.setRightCenter(point)
    }

    protected getRightCenter(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(
            this.getRight(),
            this.getCenterY(),
            this,
            'setRightCenter'
        )
    }

    protected setRightCenter(...args: any) {
        const point = Point.read(args)
        this.setRight(point.x)
        this.setCenterY(point.y)
    }

    get bottomCenter() {
        return this.getBottomCenter()
    }

    set bottomCenter(point: Point) {
        this.setBottomCenter(point)
    }

    protected getBottomCenter(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        return new Ctor(
            this.getCenterX(),
            this.getBottom(),
            this,
            'setRightCenter'
        )
    }

    protected setBottomCenter(...args: any) {
        const point = Point.read(args)
        this.setCenterX(point.x)
        this.setBottom(point.y)
    }

    get area() {
        return this.getArea()
    }

    protected getArea() {
        return this.width * this.height
    }

    /**
     * @return {Boolean} {@true if the rectangle is empty}
     */
    isEmpty(): boolean {
        return this.width === 0 || this.height === 0
    }

    /**
     * {@grouptitle Geometric Tests}
     *
     * Tests if the specified point is inside the boundary of the rectangle.
     *
     * @name Rectangle#contains
     * @function
     * @param {Point} point the specified point
     * @return {Boolean} {@true if the point is inside the rectangle's boundary}
     *
     * @example {@paperscript}
     * // Checking whether the mouse position falls within the bounding
     * // rectangle of an item:
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 30.
     * var circle = new Path.Circle(new Point(80, 50), 30);
     * circle.fillColor = 'red';
     *
     * function onMouseMove(event) {
     *     // Check whether the mouse position intersects with the
     *     // bounding box of the item:
     *     if (circle.bounds.contains(event.point)) {
     *         // If it intersects, fill it with green:
     *         circle.fillColor = 'green';
     *     } else {
     *         // If it doesn't intersect, fill it with red:
     *         circle.fillColor = 'red';
     *     }
     * }
     */
    contains(x: number, y: number): boolean
    contains(point: PointType): boolean

    /**
     * Tests if the interior of the rectangle entirely contains the specified
     * rectangle.
     *
     * @name Rectangle#contains
     * @function
     * @param {Rectangle} rect the specified rectangle
     * @return {Boolean} {@true if the rectangle entirely contains the specified
     * rectangle}
     *
     * @example {@paperscript}
     * // Checking whether the bounding box of one item is contained within
     * // that of another item:
     *
     * // All newly created paths will inherit these styles:
     * project.currentStyle = {
     *     fillColor: 'green',
     *     strokeColor: 'black'
     * };
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 45.
     * var largeCircle = new Path.Circle(new Point(80, 50), 45);
     *
     * // Create a smaller circle shaped path in the same position
     * // with a radius of 30.
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * function onMouseMove(event) {
     *     // Move the circle to the position of the mouse:
     *     circle.position = event.point;
     *
     *     // Check whether the bounding box of the smaller circle
     *     // is contained within the bounding box of the larger item:
     *     if (largeCircle.bounds.contains(circle.bounds)) {
     *         // If it does, fill it with green:
     *         circle.fillColor = 'green';
     *         largeCircle.fillColor = 'green';
     *     } else {
     *         // If doesn't, fill it with red:
     *         circle.fillColor = 'red';
     *         largeCircle.fillColor = 'red';
     *     }
     * }
     */
    contains(point: PointType, size: SizeType): boolean
    contains(rectangle: RectangleType): boolean
    contains(x: number, y: number, width: number, height: number): boolean
    contains(from: PointType, to: PointType): boolean
    contains(...args: any[]): boolean {
        return (args[0] && args[0].width !== undefined) ||
            (Array.isArray(args[0]) ? args[0] : args).length === 4
            ? this._containsRectangle(Rectangle.read(args))
            : this._containsPoint(Point.read(args))
    }

    protected _containsPoint(point: Point): boolean {
        const x = point.x
        const y = point.y
        return (
            x >= this.x &&
            y >= this.y &&
            x <= this.x + this.width &&
            y <= this.y + this.height
        )
    }

    protected _containsRectangle(rect: Rectangle): boolean {
        const x = rect.x
        const y = rect.y
        return (
            x >= this.x &&
            y >= this.y &&
            x + rect.width <= this.x + this.width &&
            y + rect.height <= this.y + this.height
        )
    }

    /**
     * Tests if the interior of this rectangle intersects the interior of
     * another rectangle. Rectangles just touching each other are considered as
     * non-intersecting, except if a `epsilon` value is specified by which this
     * rectangle's dimensions are increased before comparing.
     *
     * @param {Rectangle} rect the specified rectangle
     * @param {Number} [epsilon=0] the epsilon against which to compare the
     *     rectangle's dimensions
     * @return {Boolean} {@true if the rectangle and the specified rectangle
     *     intersect each other}
     *
     * @example {@paperscript}
     * // Checking whether the bounding box of one item intersects with
     * // that of another item:
     *
     * // All newly created paths will inherit these styles:
     * project.currentStyle = {
     *     fillColor: 'green',
     *     strokeColor: 'black'
     * };
     *
     * // Create a circle shaped path at {x: 80, y: 50}
     * // with a radius of 45.
     * var largeCircle = new Path.Circle(new Point(80, 50), 45);
     *
     * // Create a smaller circle shaped path in the same position
     * // with a radius of 30.
     * var circle = new Path.Circle(new Point(80, 50), 30);
     *
     * function onMouseMove(event) {
     *     // Move the circle to the position of the mouse:
     *     circle.position = event.point;
     *
     *     // Check whether the bounding box of the two circle
     *     // shaped paths intersect:
     *     if (largeCircle.bounds.intersects(circle.bounds)) {
     *         // If it does, fill it with green:
     *         circle.fillColor = 'green';
     *         largeCircle.fillColor = 'green';
     *     } else {
     *         // If doesn't, fill it with red:
     *         circle.fillColor = 'red';
     *         largeCircle.fillColor = 'red';
     *     }
     * }
     */
    intersects(point: PointType, size: SizeType, epsilon?: number): boolean
    intersects(rectangle: RectangleType, epsilon?: number): boolean
    intersects(
        x: number,
        y: number,
        width: number,
        height: number,
        epsilon?: number
    ): boolean

    intersects(from: PointType, to: PointType, epsilon?: number): boolean
    intersects(rect: Rectangle, epsilon?: number): boolean
    intersects(...args: any[]) {
        const rect = Rectangle.read(args)
        const epsilon: any = Base.read(args) || 0 // Todo: fix any
        return (
            rect.x + rect.width > this.x - epsilon &&
            rect.y + rect.height > this.y - epsilon &&
            rect.x < this.x + this.width + epsilon &&
            rect.y < this.y + this.height + epsilon
        )
    }

    /**
     * {@grouptitle Boolean Operations}
     *
     * Returns a new rectangle representing the intersection of this rectangle
     * with the specified rectangle.
     *
     * @param {Rectangle} rect the rectangle to be intersected with this
     * rectangle
     * @return {Rectangle} the largest rectangle contained in both the specified
     * rectangle and in this rectangle
     *
     * @example {@paperscript}
     * // Intersecting two rectangles and visualizing the result using rectangle
     * // shaped paths:
     *
     * // Create two rectangles that overlap each other
     * var size = new Size(50, 50);
     * var rectangle1 = new Rectangle(new Point(25, 15), size);
     * var rectangle2 = new Rectangle(new Point(50, 40), size);
     *
     * // The rectangle that represents the intersection of the
     * // two rectangles:
     * var intersected = rectangle1.intersect(rectangle2);
     *
     * // To visualize the intersecting of the rectangles, we will
     * // create rectangle shaped paths using the Path.Rectangle
     * // constructor.
     *
     * // Have all newly created paths inherit a black stroke:
     * project.currentStyle.strokeColor = 'black';
     *
     * // Create two rectangle shaped paths using the abstract rectangles
     * // we created before:
     * new Path.Rectangle(rectangle1);
     * new Path.Rectangle(rectangle2);
     *
     * // Create a path that represents the intersected rectangle,
     * // and fill it with red:
     * var intersectionPath = new Path.Rectangle(intersected);
     * intersectionPath.fillColor = 'red';
     */
    intersect(point: PointType, size: SizeType): Rectangle
    intersect(rectangle: RectangleType): Rectangle
    intersect(x: number, y: number, width: number, height: number): Rectangle
    intersect(from: PointType, to: PointType): Rectangle
    intersect(rect: Rectangle): Rectangle
    intersect(...args: any[]): Rectangle {
        const rect = Rectangle.read(args)
        const x1 = Math.max(this.x, rect.x)
        const y1 = Math.max(this.y, rect.y)
        const x2 = Math.min(this.x + this.width, rect.x + rect.width)
        const y2 = Math.min(this.y + this.height, rect.y + rect.height)
        return new Rectangle(x1, y1, x2 - x1, y2 - y1)
    }

    /**
     * Returns a new rectangle representing the union of this rectangle with the
     * specified rectangle.
     *
     * @param {Rectangle} rect the rectangle to be combined with this rectangle
     * @return {Rectangle} the smallest rectangle containing both the specified
     * rectangle and this rectangle
     */
    unite(point: PointType, size: SizeType): Rectangle
    unite(rectangle: RectangleType): Rectangle
    unite(x: number, y: number, width: number, height: number): Rectangle
    unite(from: PointType, to: PointType): Rectangle
    unite(rect: Rectangle): Rectangle
    unite(...args: any[]): Rectangle {
        const rect = Rectangle.read(args)
        const x1 = Math.min(this.x, rect.x)
        const y1 = Math.min(this.y, rect.y)
        const x2 = Math.max(this.x + this.width, rect.x + rect.width)
        const y2 = Math.max(this.y + this.height, rect.y + rect.height)
        return new Rectangle(x1, y1, x2 - x1, y2 - y1)
    }

    /**
     * Adds a point to this rectangle. The resulting rectangle is the smallest
     * rectangle that contains both the original rectangle and the specified
     * point.
     *
     * After adding a point, a call to {@link #contains(point)} with the added
     * point as an argument does not necessarily return `true`. The {@link
     * Rectangle#contains(point)} method does not return `true` for points on
     * the right or bottom edges of a rectangle. Therefore, if the added point
     * falls on the left or bottom edge of the enlarged rectangle, {@link
     * Rectangle#contains(point)} returns `false` for that point.
     *
     * @param {Point} point
     * @return {Rectangle} the smallest rectangle that contains both the
     * original rectangle and the specified point
     */
    include(x: number, y: number): Rectangle
    include(point: PointType): Rectangle
    include(...args: any[]) {
        const point = Point.read(args)
        const x1 = Math.min(this.x, point.x)
        const y1 = Math.min(this.y, point.y)
        const x2 = Math.max(this.x + this.width, point.x)
        const y2 = Math.max(this.y + this.height, point.y)
        return new Rectangle(x1, y1, x2 - x1, y2 - y1)
    }

    /**
     * Returns a new rectangle expanded by the specified amount in horizontal
     * and vertical directions.
     *
     * @name Rectangle#expand
     * @function
     * @param {Number|Size|Point} amount the amount to expand the rectangle in
     * both directions
     * @return {Rectangle} the expanded rectangle
     */
    expand(amount: Number | Size | Point): Rectangle

    /**
     * Returns a new rectangle expanded by the specified amounts in horizontal
     * and vertical directions.
     *
     * @name Rectangle#expand
     * @function
     * @param {Number} hor the amount to expand the rectangle in horizontal
     * direction
     * @param {Number} ver the amount to expand the rectangle in vertical
     * direction
     * @return {Rectangle} the expanded rectangle
     */
    expand(hor: number, ver: number): Rectangle

    expand(...args: any[]): Rectangle {
        const amount = Size.read(args)
        const hor = amount.width
        const ver = amount.height
        return new Rectangle(
            this.x - hor / 2,
            this.y - ver / 2,
            this.width + hor,
            this.height + ver
        )
    }

    /**
     * Returns a new rectangle scaled by the specified amount from its center.
     *
     * @name Rectangle#scale
     * @function
     * @param {Number} amount
     * @return {Rectangle} the scaled rectangle
     */
    scale(amount: number): Rectangle

    /**
     * Returns a new rectangle scaled in horizontal direction by the specified
     * `hor` amount and in vertical direction by the specified `ver` amount
     * from its center.
     *
     * @name Rectangle#scale
     * @function
     * @param {Number} hor
     * @param {Number} ver
     * @return {Rectangle} the scaled rectangle
     */

    scale(hor: number, ver?: number): Rectangle
    scale(...args: any[]): Rectangle {
        const amount = Size.read(args)
        const hor = amount.width
        const ver = amount.height

        return this.expand(
            this.width * hor - this.width,
            this.height * (ver === undefined ? hor : ver) - this.height
        )
    }
}

export class LinkedRectangle extends Rectangle {
    protected _owner: any
    protected _setter: string
    protected _x: number
    protected _y: number
    protected _width: number
    protected _height: number
    protected _dontNotify: boolean

    initialize(
        x: number,
        y: number,
        width: number,
        height: number,
        owner: any,
        setter: string
    ) {
        this._set(x, y, width, height, true)
        this._owner = owner
        this._setter = setter

        return this
    }

    protected _set(
        x: number,
        y: number,
        width: number,
        height: number,
        _dontNotify?: boolean
    ) {
        this._x = x
        this._y = y
        this._width = width
        this._height = height
        if (!_dontNotify) this._owner[this._setter](this)
        return this
    }

    get x() {
        return this._x
    }

    set x(value: number) {
        this._x = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    get y() {
        return this._y
    }

    set y(value: number) {
        this._y = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    get width() {
        return this._y
    }

    set width(value: number) {
        this._width = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    get height() {
        return this._y
    }

    set height(value: number) {
        this._height = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    protected setPoint(...args: any) {
        this._dontNotify = true
        super.setPoint(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setSize(...args: any) {
        this._dontNotify = true
        super.setSize(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setCenter(...args: any) {
        this._dontNotify = true
        super.setCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)

        return this
    }

    protected setLeft(...args: any) {
        this._dontNotify = true
        super.setLeft(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTop(...args: any) {
        this._dontNotify = true
        super.setTop(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setRight(...args: any) {
        this._dontNotify = true
        super.setRight(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottom(...args: any) {
        this._dontNotify = true
        super.setBottom(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setCenterX(...args: any) {
        this._dontNotify = true
        super.setCenterX(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setCenterY(...args: any) {
        this._dontNotify = true
        super.setCenterY(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTopLeft(...args: any) {
        this._dontNotify = true
        super.setTopLeft(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTopRight(...args: any) {
        this._dontNotify = true
        super.setTopRight(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottomLeft(...args: any) {
        this._dontNotify = true
        super.setBottomLeft(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottomRight(...args: any) {
        this._dontNotify = true
        super.setBottomRight(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setLeftCenter(...args: any) {
        this._dontNotify = true
        super.setLeftCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTopCenter(...args: any) {
        this._dontNotify = true
        super.setTopCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setRightCenter(...args: any) {
        this._dontNotify = true
        super.setRightCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottomCenter(...args: any) {
        this._dontNotify = true
        super.setBottomCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    isSelected() {
        return !!(this._owner._selection & ItemSelection.BOUNDS)
    }

    setSelected(selected: boolean) {
        const owner = this._owner
        if (owner._changeSelection) {
            owner._changeSelection(ItemSelection.BOUNDS, selected)
        }
    }
}
