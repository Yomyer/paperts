import Base, { ExportJsonOptions } from '../core/Base'
import Formatter from '../utils/Formatter'
import Numerical from '../utils/Numerical'

export default class Point extends Base {
    protected _class = 'point'
    protected _readIndex = true
    protected _angle = 0

    x?: number
    y?: number
    lenght?: number
    angle?: number

    constructor()

    /**
     * Creates a Point object with the given x and y coordinates.
     *
     * @name Point#initialize
     * @param {Number} x the x coordinate
     * @param {Number} y the y coordinate
     *
     * @example
     * // Create a point at x: 10, y: 5
     * var point = new Point(10, 5);
     * console.log(point.x); // 10
     * console.log(point.y); // 5
     */
    constructor(x: number, y: number)

    /**
     * Creates a Point object using the numbers in the given array as
     * coordinates.
     *
     * @name Point#initialize
     * @param {Array} array
     *
     * @example
     * // Creating a point at x: 10, y: 5 using an array of numbers:
     * var array = [10, 5];
     * var point = new Point(array);
     * console.log(point.x); // 10
     * console.log(point.y); // 5
     *
     * @example
     * // Passing an array to a functionality that expects a point:
     *
     * // Create a circle shaped path at x: 50, y: 50
     * // with a radius of 30:
     * var path = new Path.Circle([50, 50], 30);
     * path.fillColor = 'red';
     *
     * // Which is the same as doing:
     * var path = new Path.Circle(new Point(50, 50), 30);
     * path.fillColor = 'red';
     */
    constructor(array: number[])

    /**
     * Creates a Point object using the properties in the given object.
     *
     * @name Point#initialize
     * @param {Object} object the object describing the point's properties
     *
     * @example
     * // Creating a point using an object literal with length and angle
     * // properties:
     *
     * var point = new Point({
     *     length: 10,
     *     angle: 90
     * });
     * console.log(point.length); // 10
     * console.log(point.angle); // 90
     *
     * @example
     * // Creating a point at x: 10, y: 20 using an object literal:
     *
     * var point = new Point({
     *     x: 10,
     *     y: 20
     * });
     * console.log(point.x); // 10
     * console.log(point.y); // 20
     *
     * @example
     * // Passing an object to a functionality that expects a point:
     *
     * var center = {
     *     x: 50,
     *     y: 50
     * };
     *
     * // Creates a circle shaped path at x: 50, y: 50
     * // with a radius of 30:
     * var path = new Path.Circle(center, 30);
     * path.fillColor = 'red';
     */
    constructor(object: Object)

    /**
     * Creates a Point object using the width and height values of the given
     * Size object.
     *
     * @name Point#initialize
     * @param {Size} size
     *
     * @example
     * // Creating a point using a size object.
     *
     * // Create a Size with a width of 100pt and a height of 50pt
     * var size = new Size(100, 50);
     * console.log(size); // { width: 100, height: 50 }
     * var point = new Point(size);
     * console.log(point); // { x: 100, y: 50 }
     */
    constructor(object: Size)

    constructor(...args: any[]) {
        super(args)
    }

    protected initialize(arg0?: any, arg1?: any) {
        const type = typeof arg0
        const reading = this.__read
        let read = 0

        if (type === 'number') {
            const hasY = typeof arg1 === 'number'
            this._set(arg0, hasY ? arg1 : arg0)
            if (reading) read = hasY ? 2 : 1
        } else if (type === 'undefined' || arg0 === null) {
            this._set(0, 0)
            if (reading) read = arg0 === null ? 1 : 0
        } else {
            const obj = type === 'string' ? arg0.split(/[\s,]+/) || [] : arg0
            read = 1
            if (Array.isArray(obj)) {
                this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]))
            } else if ('x' in obj) {
                this._set(obj.x || 0, obj.y || 0)
            } else if ('width' in obj) {
                this._set(obj.width || 0, obj.height || 0)
            } else if ('angle' in obj) {
                this._set(obj.length || 0, 0)
                this.setAngle(obj.angle || 0)
            } else {
                this._set(0, 0)
                read = 0
            }
        }
        if (reading) this.__read = read
        return this
    }

    /**
     * Sets the point to the passed values. Note that any sequence of parameters
     * that is supported by the various {@link Point()} constructors also work
     * for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Point}
     */
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    protected _set(x: number, y: number): this {
        this.x = x
        this.y = y
        return this
    }

    /**
     * Checks whether the coordinates of the point are equal to that of the
     * supplied point.
     *
     * @param {Point} point
     * @return {Boolean} {@true if the points are equal}
     *
     * @example
     * var point = new Point(5, 10);
     * console.log(point == new Point(5, 10)); // true
     * console.log(point == new Point(1, 1)); // false
     * console.log(point != new Point(1, 1)); // true
     */
    equals(point: Point): boolean {
        return (
            this === point ||
            (point &&
                ((this.x === point.x && this.y === point.y) ||
                    (Array.isArray(point) &&
                        this.x === point[0] &&
                        this.y === point[1]))) ||
            false
        )
    }

    /**
     * Returns a copy of the point.
     *
     * @example
     * var point1 = new Point();
     * var point2 = point1;
     * point2.x = 1; // also changes point1.x
     *
     * var point2 = point1.clone();
     * point2.x = 1; // doesn't change point1.x
     *
     * @return {Point} the cloned point
     */
    clone(): Point {
        return new Point(this.x, this.y)
    }

    /**
     * @return {String} a string representation of the point
     */
    toString(): string {
        return (
            '{ x: ' +
            Formatter.number(this.x) +
            ', y: ' +
            Formatter.number(this.y) +
            ' }'
        )
    }

    _serialize(options?: ExportJsonOptions) {
        return [
            options.formatter.number(this.x),
            options.formatter.number(this.y)
        ]
    }

    /**
     * The length of the vector that is represented by this point's coordinates.
     * Each point can be interpreted as a vector that points from the origin (`x
     * = 0`, `y = 0`) to the point's location. Setting the length changes the
     * location but keeps the vector's angle.
     *
     * @bean
     * @type Number
     */
    getLength(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    setLength(length: number) {
        if (this.isZero()) {
            const angle = this._angle || 0
            this._set(Math.cos(angle) * length, Math.sin(angle) * length)
        } else {
            const scale = length / this.getLength()
            if (Numerical.isZero(scale)) this.getAngle()
            this._set(this.x * scale, this.y * scale)
        }
    }

    /**
     * Returns the smaller angle between two vectors. The angle is unsigned, no
     * information about rotational direction is given.
     *
     * @name Point#getAngle
     * @function
     * @param {Point} point
     * @return {Number} the angle in degrees
     */
    getAngle(point?: Point): number
    /**
     * The vector's angle in degrees, measured from the x-axis to the vector.
     *
     * @bean
     * @name Point#getAngle
     * @type Number
     */
    getAngle(...args: any[]): number {
        return (this.getAngleInRadians(...args) * 180) / Math.PI
    }

    setAngle(angle: number) {
        this.setAngleInRadians((angle * Math.PI) / 180)
    }

    getAngleInDegrees = this.getAngle
    setAngleInDegrees = this.setAngle

    /**
     * Returns the smaller angle between two vectors in radians. The angle is
     * unsigned, no information about rotational direction is given.
     *
     * @name Point#getAngleInRadians
     * @function
     * @param {Point} point
     * @return {Number} the angle in radians
     */
    getAngleInRadians(point?: Point): number

    /**
     * The vector's angle in radians, measured from the x-axis to the vector.
     *
     * @bean
     * @name Point#getAngleInRadians
     * @type Number
     */
    getAngleInRadians(...args: any[]): number {
        if (!arguments.length) {
            return this.isZero()
                ? this._angle || 0
                : (this._angle = Math.atan2(this.y, this.x))
        } else {
            const point = Point.read(...args)
            const div = this.getLength() * point.getLength()
            if (Numerical.isZero(div)) {
                return NaN
            } else {
                const a = this.dot(point) / div
                return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a)
            }
        }
    }

    setAngleInRadians(angle: number) {
        this._angle = angle
        if (!this.isZero()) {
            const length = this.getLength()
            this._set(Math.cos(angle) * length, Math.sin(angle) * length)
        }
    }

    /**
     * The quadrant of the {@link #angle} of the point.
     *
     * Angles between 0 and 90 degrees are in quadrant `1`. Angles between 90
     * and 180 degrees are in quadrant `2`, angles between 180 and 270 degrees
     * are in quadrant `3` and angles between 270 and 360 degrees are in
     * quadrant `4`.
     *
     * @bean
     * @type Number
     *
     * @example
     * var point = new Point({
     *     angle: 10,
     *     length: 20
     * });
     * console.log(point.quadrant); // 1
     *
     * point.angle = 100;
     * console.log(point.quadrant); // 2
     *
     * point.angle = 190;
     * console.log(point.quadrant); // 3
     *
     * point.angle = 280;
     * console.log(point.quadrant); // 4
     */
    getQuadrant(): number {
        return this.x >= 0 ? (this.y >= 0 ? 1 : 4) : this.y >= 0 ? 2 : 3
    }

    /**
     * Returns the angle between two vectors. The angle is directional and
     * signed, giving information about the rotational direction.
     *
     * Read more about angle units and orientation in the description of the
     * {@link #angle} property.
     *
     * @param {Point} point
     * @return {Number} the angle between the two vectors
     */
    getDirectedAngle(...args: any[]) {
        const point = Point.read(...args)
        return (Math.atan2(this.cross(point), this.dot(point)) * 180) / Math.PI
    }

    /**
     * Returns the distance between the point and another point.
     *
     * @param {Point} point
     * @param {Boolean} [squared=false] Controls whether the distance should
     * remain squared, or its square root should be calculated
     * @return {Number}
     */
    getDistance(...args: any[]): number {
        const point = Point.read(...args)
        const x = point.x - this.x
        const y = point.y - this.y
        const d = x * x + y * y
        const squared = Base.read(...args)
        return squared ? d : Math.sqrt(d)
    }

    /**
     * Normalize modifies the {@link #length} of the vector to `1` without
     * changing its angle and returns it as a new point. The optional `length`
     * parameter defines the length to normalize to. The object itself is not
     * modified!
     *
     * @param {Number} [length=1] The length of the normalized vector
     * @return {Point} the normalized vector of the vector that is represented
     *     by this point's coordinates
     */
    normalize(length: number): Point {
        if (length === undefined) length = 1
        const current = this.getLength()
        const scale = current !== 0 ? length / current : 0
        const point = new Point(this.x * scale, this.y * scale)

        if (scale >= 0) point._angle = this._angle
        return point
    }

    /**
     * Rotates the point by the given angle around an optional center point.
     * The object itself is not modified.
     *
     * Read more about angle units and orientation in the description of the
     * {@link #angle} property.
     *
     * @param {Number} angle the rotation angle
     * @param {Point} center the center point of the rotation
     * @return {Point} the rotated point
     */
    rotate(angle: number, center: Point) {
        if (angle === 0) return this.clone()
        angle = (angle * Math.PI) / 180
        let point = center ? this.subtract(center) : this
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)
        point = new Point(
            point.x * cos - point.y * sin,
            point.x * sin + point.y * cos
        )
        return center ? point.add(center) : point
    }

    /**
     * Transforms the point by the matrix as a new point. The object itself is
     * not modified!
     *
     * @param {Matrix} matrix
     * @return {Point} the transformed point
     */
    transform(matrix: Matrix) {
        return matrix ? matrix._transformPoint(this) : this
    }
}
