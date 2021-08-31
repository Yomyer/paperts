import {
    Base,
    ExportJsonOptions,
    Formatter,
    Numerical,
    Exportable,
    ReadIndex,
    Matrix,
    Rectangle,
    ItemSelection
} from '../'

import {
    Point as PointType,
    Size as SizeType,
    Rectangle as RectangleType
} from './Types'

@ReadIndex()
@Exportable()
export class Point extends Base {
    protected _class = 'Point'
    protected _angle = 0
    protected _x: number
    protected _y: number

    /**
     * Creates a Point object with the given width and height values.
     *
     * @name Point#initialize
     * @param {Number} number the width
     *
     * @example
     * // Create a point that is 10pt x and y
     * var point = new Point(10);
     * console.log(point.width); // 10
     * console.log(point.height); // 10
     */
    constructor(number: number)

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
    constructor(x: number, y?: number)

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
    constructor(size: { width: number; height: number })

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
    constructor(point: { angle: number; length: number })
    constructor(point?: { x: number; y: number })

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
        this._x = x
        this._y = y
        return this
    }

    getX() {
        return this._x
    }

    setX(x: number) {
        this._x = x
    }

    get x() {
        return this.getX()
    }

    set x(x: number) {
        this.setX(x)
    }

    getY() {
        return this._y
    }

    setY(y: number) {
        this._y = y
    }

    get y() {
        return this.getY()
    }

    set y(y: number) {
        this.setY(y)
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
    equals(x: number, y: number): boolean
    equals(point: PointType): boolean
    equals(...args: any[]): boolean {
        const point = (args[0] instanceof Point && args[0]) || Point.read(args)

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
    clone(): this {
        return new Point(this.x, this.y) as this
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

    protected _serialize(options?: ExportJsonOptions) {
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

    get length() {
        return this.getLength()
    }

    set length(length: number) {
        this.setLength(length)
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
    getAngle(x: number, y: number): number
    getAngle(point: PointType): number

    /**
     * The vector's angle in degrees, measured from the x-axis to the vector.
     *
     * @bean
     * @name Point#getAngle
     * @type Number
     */
    getAngle(): number

    getAngle(...args: any[]): number {
        return (
            ((args.length
                ? this.getAngleInRadians(args[0], args[1])
                : this.getAngleInRadians()) *
                180) /
            Math.PI
        )
    }

    setAngle(angle: number) {
        this.setAngleInRadians((angle * Math.PI) / 180)
    }

    get angle() {
        return this.getAngle()
    }

    set angle(angle: number) {
        this.setAngle(angle)
    }

    getAngleInDegrees = this.getAngle
    setAngleInDegrees = this.setAngle

    get angleInDegrees() {
        return this.getAngleInDegrees()
    }

    set angleInDegrees(angle: number) {
        this.setAngleInDegrees(angle)
    }

    /**
     * Returns the smaller angle between two vectors in radians. The angle is
     * unsigned, no information about rotational direction is given.
     *
     * @name Point#getAngleInRadians
     * @function
     * @param {Point} point
     * @return {Number} the angle in radians
     */
    getAngleInRadians(x: number, y: number): number
    getAngleInRadians(point: PointType): number

    /**
     * The vector's angle in radians, measured from the x-axis to the vector.
     *
     * @bean
     * @name Point#getAngleInRadians
     * @type Number
     */
    getAngleInRadians(): number
    getAngleInRadians(...args: any[]): number {
        if (!args.length) {
            return this.isZero()
                ? this._angle || 0
                : (this._angle = Math.atan2(this.y, this.x))
        } else {
            const point = Point.read(args)
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

    get angleInRadians() {
        return this.getAngleInRadians()
    }

    set angleInRadians(angle: number) {
        this.setAngleInRadians(angle)
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

    get quadrant() {
        return this.getQuadrant()
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
    getDirectedAngle(x: number, y: number): number
    getDirectedAngle(point: PointType): number
    getDirectedAngle(...args: any[]) {
        const point = Point.read(args)
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
    getDistance(x: number, y: number, squared?: number): number
    getDistance(point: PointType, squared?: number): number
    getDistance(...args: any[]): number {
        const point = Point.read(args)
        const x = point.x - this.x
        const y = point.y - this.y
        const d = x * x + y * y

        const squared = Base.read(args)
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
    normalize(length?: number): Point {
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

    rotate(angle: number, point?: PointType): Point
    rotate(angle: number, center?: any): Point {
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
    transform(matrix: Matrix): Point {
        return matrix ? matrix.transformPoint(this) : this
    }

    /**
     * Returns the addition of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#add
     * @function
     * @operator
     * @param {Point} point the point to add
     * @return {Point} the addition of the two points as a new point
     *
     * @example
     * var point1 = new Point(5, 10);
     * var point2 = new Point(10, 20);
     * var result = point1 + point2;
     * console.log(result); // {x: 15, y: 30}
     */
    add(x: number, y: number): Point
    add(point: PointType): Point
    add(...args: any[]): Point {
        const point = Point.read(args)
        return new Point(this.x + point.x, this.y + point.y)
    }

    /**
     * Returns the subtraction of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#subtract
     * @function
     * @operator
     * @param {Point} point the point to subtract
     * @return {Point} the subtraction of the two points as a new point
     *
     * @example
     * var firstPoint = new Point(10, 20);
     * var secondPoint = new Point(5, 5);
     * var result = firstPoint - secondPoint;
     * console.log(result); // {x: 5, y: 15}
     */
    subtract(x: number, y: number): Point
    subtract(point: PointType): Point
    subtract(...args: any[]): Point {
        const point = Point.read(args)
        return new Point(this.x - point.x, this.y - point.y)
    }

    /**
     * Returns the multiplication of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#multiply
     * @function
     * @operator
     * @param {Point} point the point to multiply by
     * @return {Point} the multiplication of the two points as a new point
     *
     * @example
     * var firstPoint = new Point(5, 10);
     * var secondPoint = new Point(4, 2);
     * var result = firstPoint * secondPoint;
     * console.log(result); // {x: 20, y: 20}
     */
    multiply(x: number, y: number): Point
    multiply(point: PointType): Point
    multiply(...args: any[]): Point {
        const point = Point.read(args)
        return new Point(this.x * point.x, this.y * point.y)
    }

    /**
     * Returns the division of the supplied point to the point as a new
     * point.
     * The object itself is not modified!
     *
     * @name Point#divide
     * @function
     * @operator
     * @param {Point} point the point to divide by
     * @return {Point} the division of the two points as a new point
     *
     * @example
     * var firstPoint = new Point(8, 10);
     * var secondPoint = new Point(2, 5);
     * var result = firstPoint / secondPoint;
     * console.log(result); // {x: 4, y: 2}
     */
    divide(x: number, y: number): Point
    divide(point: PointType): Point
    divide(...args: any[]): Point {
        const point = Point.read(args)
        return new Point(this.x / point.x, this.y / point.y)
    }

    /**
     * The modulo operator returns the integer remainders of dividing the point
     * by the supplied value as a new point.
     *
     * @name Point#modulo
     * @function
     * @operator
     * @param {Number} value
     * @return {Point} the integer remainders of dividing the point by the value
     * as a new point
     *
     * @example
     * var point = new Point(12, 6);
     * console.log(point % 5); // {x: 2, y: 1}
     */
    modulo(number: number): Point

    /**
     * The modulo operator returns the integer remainders of dividing the point
     * by the supplied value as a new point.
     *
     * @name Point#modulo
     * @function
     * @operator
     * @param {Point} point
     * @return {Point} the integer remainders of dividing the points by each
     * other as a new point
     *
     * @example
     * var point = new Point(12, 6);
     * console.log(point % new Point(5, 2)); // {x: 2, y: 0}
     */
    modulo(x: number, y: number): Point
    modulo(point: PointType): Point
    modulo(...args: any[]): Point {
        const point = Point.read(args)
        return new Point(this.x % point.x, this.y % point.y)
    }

    negate(): Point {
        return new Point(-this.x, -this.y)
    }

    /**
     * {@grouptitle Tests}
     *
     * Checks whether the point is inside the boundaries of the rectangle.
     *
     * @param {Rectangle} rect the rectangle to check against
     * @return {Boolean} {@true if the point is inside the rectangle}
     */
    isInside(point: PointType, size: SizeType): boolean
    isInside(rectangle: RectangleType): boolean
    isInside(x: number, y: number, width: number, height: number): boolean
    isInside(from: PointType, to: PointType): boolean
    isInside(...args: any[]): boolean {
        return Rectangle.read(args).contains(this)
    }

    /**
     * Checks if the point is within a given distance of another point.
     *
     * @param {Point} point the point to check against
     * @param {Number} tolerance the maximum distance allowed
     * @return {Boolean} {@true if it is within the given distance}
     */
    isClose(x: number, y: number, tolerance: number): boolean
    isClose(point: PointType, tolerance: number): boolean
    isClose(...args: any[]): boolean {
        const point = Point.read(args)
        const tolerance: any = Base.read(args) // Todo: fix any
        return this.getDistance(point) <= tolerance
    }

    /**
     * Checks if the vector represented by this point is collinear (parallel) to
     * another vector.
     *
     * @param {Point} point the vector to check against
     * @return {Boolean} {@true it is collinear}
     */
    isCollinear(x: number, y: number): boolean
    isCollinear(point: PointType): boolean
    isCollinear(...args: any[]): boolean {
        const point = Point.read(args)
        return Point.isCollinear(this.x, this.y, point.x, point.y)
    }

    /**
     * Checks if the vector represented by this point is orthogonal
     * (perpendicular) to another vector.
     *
     * @param {Point} point the vector to check against
     * @return {Boolean} {@true it is orthogonal}
     */
    isOrthogonal(x: number, y: number): boolean
    isOrthogonal(point: PointType): boolean
    isOrthogonal(...args: any[]): boolean {
        const point = Point.read(args)
        return Point.isOrthogonal(this.x, this.y, point.x, point.y)
    }

    /**
     * Checks if this point has both the x and y coordinate set to 0.
     *
     * @return {Boolean} {@true if both x and y are 0}
     */
    isZero(): boolean {
        const isZero = Numerical.isZero
        return isZero(this.x) && isZero(this.y)
    }

    /**
     * Checks if this point has an undefined value for at least one of its
     * coordinates.
     *
     * @return {Boolean} {@true if either x or y are not a number}
     */
    isNaN(): boolean {
        return isNaN(this.x) || isNaN(this.y)
    }

    /**
     * Checks if the vector is within the specified quadrant. Note that if the
     * vector lies on the boundary between two quadrants, `true` will be
     * returned for both quadrants.
     *
     * @param {Number} quadrant the quadrant to check against
     * @return {Boolean} {@true if either x or y are not a number}
     * @see #quadrant
     */
    isInQuadrant(quadrant: number): boolean {
        // Map quadrant to x & y coordinate pairs and multiply with coordinates,
        // then check sign:
        // 1: [ 1,  1]
        // 2: [-1,  1]
        // 3: [-1, -1]
        // 4: [ 1, -1]
        return (
            this.x * (quadrant > 1 && quadrant < 4 ? -1 : 1) >= 0 &&
            this.y * (quadrant > 2 ? -1 : 1) >= 0
        )
    }

    /**
     * {@grouptitle Vector Math Functions}
     * Returns the dot product of the point and another point.
     *
     * @param {Point} point
     * @return {Number} the dot product of the two points
     */
    dot(x: number, y: number): number
    dot(point: PointType): number
    dot(...args: any[]): number {
        const point = Point.read(args)
        return this.x * point.x + this.y * point.y
    }

    /**
     * Returns the cross product of the point and another point.
     *
     * @param {Point} point
     * @return {Number} the cross product of the two points
     */
    cross(x: number, y: number): number
    cross(point: PointType): number
    cross(...args: any[]): number {
        const point = Point.read(args)
        return this.x * point.y - this.y * point.x
    }

    /**
     * Returns the projection of the point onto another point.
     * Both points are interpreted as vectors.
     *
     * @param {Point} point
     * @return {Point} the projection of the point onto another point
     */
    project(x: number, y: number): Point
    project(point: PointType): Point
    project(...args: any[]): Point {
        const point = Point.read(args)
        const scale = point.isZero() ? 0 : this.dot(point) / point.dot(point)
        return new Point(point.x * scale, point.y * scale)
    }

    /**
     * This property is only valid if the point is an anchor or handle point
     * of a {@link Segment} or a {@link Curve}, or the position of an
     * {@link Item}, as returned by {@link Item#position},
     * {@link Segment#point}, {@link Segment#handleIn},
     * {@link Segment#handleOut}, {@link Curve#point1}, {@link Curve#point2},
     * {@link Curve#handle1}, {@link Curve#handle2}.
     *
     * In those cases, it returns {@true if it the point is selected}.
     *
     * Paper.js renders selected points on top of your project. This is very
     * useful when debugging.
     *
     * @name Point#selected
     * @property
     * @type Boolean
     * @default false
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40
     * });
     *
     * // Select the third segment point:
     * path.segments[2].point.selected = true;
     *
     * // Select the item's position, which is the pivot point
     * // around which it is transformed:
     * path.position.selected = true;
     */
    get selected(): boolean {
        return false
    }

    /**
     * {@grouptitle Math Functions}
     *
     * Returns a new point with rounded {@link #x} and {@link #y} values. The
     * object itself is not modified!
     *
     * @name Point#round
     * @function
     * @return {Point}
     *
     * @example
     * var point = new Point(10.2, 10.9);
     * var roundPoint = point.round();
     * console.log(roundPoint); // {x: 10, y: 11}
     */
    round(): Point {
        const op = Math.round
        return new Point(op(this.x), op(this.y))
    }

    /**
     * Returns a new point with the nearest greater non-fractional values to the
     * specified {@link #x} and {@link #y} values. The object itself is not
     * modified!
     *
     * @name Point#ceil
     * @function
     * @return {Point}
     *
     * @example
     * var point = new Point(10.2, 10.9);
     * var ceilPoint = point.ceil();
     * console.log(ceilPoint); // {x: 11, y: 11}
     */
    ceil(): Point {
        const op = Math.ceil
        return new Point(op(this.x), op(this.y))
    }

    /**
     * Returns a new point with the nearest smaller non-fractional values to the
     * specified {@link #x} and {@link #y} values. The object itself is not
     * modified!
     *
     * @name Point#floor
     * @function
     * @return {Point}
     *
     * @example
     * var point = new Point(10.2, 10.9);
     * var floorPoint = point.floor();
     * console.log(floorPoint); // {x: 10, y: 10}
     */
    floor(): Point {
        const op = Math.floor
        return new Point(op(this.x), op(this.y))
    }

    /**
     * Returns a new point with the absolute values of the specified {@link #x}
     * and {@link #y} values. The object itself is not modified!
     *
     * @name Point#abs
     * @function
     * @return {Point}
     *
     * @example
     * var point = new Point(-5, 10);
     * var absPoint = point.abs();
     * console.log(absPoint); // {x: 5, y: 10}
     */
    abs(): Point {
        const op = Math.abs
        return new Point(op(this.x), op(this.y))
    }

    /**
     * Returns a new point object with the smallest {@link #x} and
     * {@link #y} of the supplied points.
     *
     * @static
     * @param {Point} point1
     * @param {Point} point2
     * @return {Point} the newly created point object
     *
     * @example
     * var point1 = new Point(10, 100);
     * var point2 = new Point(200, 5);
     * var minPoint = Point.min(point1, point2);
     * console.log(minPoint); // {x: 10, y: 5}
     *
     * @example
     * // Find the minimum of multiple points:
     * var point1 = new Point(60, 100);
     * var point2 = new Point(200, 5);
     * var point3 = new Point(250, 35);
     * [point1, point2, point3].reduce(Point.min) // {x: 60, y: 5}
     */
    static min(x1: number, y1: number, x2: number, y2: number): Point
    static min(point1: PointType, point2: PointType): Point
    static min(...args: any[]): Point {
        const point1 = Point.read(args)
        const point2 = Point.read(args)
        return new Point(
            Math.min(point1.x, point2.x),
            Math.min(point1.y, point2.y)
        )
    }

    /**
     * Returns a new point object with the largest {@link #x} and
     * {@link #y} of the supplied points.
     *
     * @static
     * @param {Point} point1
     * @param {Point} point2
     * @return {Point} the newly created point object
     *
     * @example
     * var point1 = new Point(10, 100);
     * var point2 = new Point(200, 5);
     * var maxPoint = Point.max(point1, point2);
     * console.log(maxPoint); // {x: 200, y: 100}
     *
     * @example
     * // Find the maximum of multiple points:
     * var point1 = new Point(60, 100);
     * var point2 = new Point(200, 5);
     * var point3 = new Point(250, 35);
     * [point1, point2, point3].reduce(Point.max) // {x: 250, y: 100}
     */
    static max(x1: number, y1: number, x2: number, y2: number): Point
    static max(point1: PointType, point2: PointType): Point
    static max(...args: any[]): Point {
        const point1 = Point.read(args)
        const point2 = Point.read(args)
        return new Point(
            Math.max(point1.x, point2.x),
            Math.max(point1.y, point2.y)
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
    static random(): Point {
        return new Point(Math.random(), Math.random())
    }

    static isCollinear(
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): boolean {
        return (
            Math.abs(x1 * y2 - y1 * x2) <=
            Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)) *
                Numerical.TRIGONOMETRIC_EPSILON
        )
    }

    static isOrthogonal(
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): boolean {
        return (
            Math.abs(x1 * x2 + y1 * y2) <=
            Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)) *
                Numerical.TRIGONOMETRIC_EPSILON
        )
    }
}

export class LinkedPoint extends Point {
    protected _owner: any
    protected _setter: string

    constructor(x: number, y: number, owner: Base, setter: string)
    constructor(...args: any[]) {
        super()
        if (this.constructor.name === 'LinkedPoint') {
            this.initialize(...args)
        }
    }

    initialize(x?: number, y?: number, owner?: Base, setter?: string): this {
        this._x = x
        this._y = y
        this._owner = owner
        this._setter = setter

        return this
    }

    set(...args: any[]): this {
        return super.initialize(...args)
    }

    protected _set(x: number, y: number, _dontNotify?: boolean) {
        this._x = x
        this._y = y
        if (!_dontNotify) this._owner[this._setter](this)
        return this
    }

    getX() {
        return this._x
    }

    setX(x: number) {
        this._x = x
        this._owner[this._setter](this)
    }

    getY() {
        return this._y
    }

    setY(y: number) {
        this._y = y
        this._owner[this._setter](this)
    }

    isSelected() {
        return !!(this._owner._selection & this._getSelection())
    }

    setSelected(selected: boolean) {
        this._owner._changeSelection(this._getSelection(), selected)
    }

    get selected(): boolean {
        return this.isSelected()
    }

    set selected(selected: boolean) {
        this.setSelected(selected)
    }

    protected _getSelection() {
        return this._setter === 'setPosition' ? ItemSelection.POSITION : 0
    }
}
