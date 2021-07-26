import {
    Base,
    Dictionary,
    Segment,
    Matrix,
    Line,
    Point,
    ExportJsonOptions,
    Rectangle,
    SegmentPoint,
    CurveLocation,
    Numerical,
    CollisionDetection,
    Path
} from '@paperts'

import { Point as PointType } from '../basic/Types'

export type CurveClassifyType =
    | 'line'
    | 'quadratic'
    | 'serpentine'
    | 'cusp'
    | 'loop'
    | 'arch'

export type CurveClassify = {
    type: CurveClassifyType
    roots: number[]
}

export type CurveObject = Partial<
    | Curve
    | {
          segment1: Segment | number[]
          segment2: Segment | number[]
      }
>

export class Curve extends Base {
    protected _class = 'Curve'
    protected _path: Path
    protected _segment1: Segment
    protected _segment2: Segment
    protected _length: number
    protected _bounds: { [key: string]: Rectangle }

    beans = true

    constructor()

    // constructor(parts: number[])

    /**
     * Creates a new curve object.
     *
     * @name Curve#initialize
     * @param {Segment} segment1
     * @param {Segment} segment2
     */
    constructor(segment1: Segment, segment2: Segment)

    /**
     * Creates a new curve object.
     *
     * @name Curve#initialize
     * @param {Point} point1
     * @param {Point} handle1
     * @param {Point} handle2
     * @param {Point} point2
     */
    constructor(
        point1: PointType,
        handle1: PointType,
        handle2?: PointType,
        point2?: PointType
    )

    /**
     * Creates a new curve object.
     *
     * @name Curve#initialize
     * @ignore
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} handle1x
     * @param {Number} handle1y
     * @param {Number} handle2x
     * @param {Number} handle2y
     * @param {Number} x2
     * @param {Number} y2
     */
    constructor(
        x1: number,
        y1: number,
        handle1x: number,
        handle1y: number,
        handle2x: number,
        handle2y: number,
        x2: number,
        y2: number
    )

    constructor(path: Path, segment1: Segment, segment2: Segment)

    constructor(object?: CurveObject)

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]) {
        const count = args.length
        let seg1
        let seg2
        let point1
        let point2
        let handle1
        let handle2

        if (count === 3) {
            this._path = args[0]
            seg1 = args[1]
            seg2 = args[2]
        } else if (!count) {
            seg1 = new Segment()
            seg2 = new Segment()
        } else if (count === 1) {
            if ('segment1' in args[0]) {
                seg1 = new Segment(args[0].segment1)
                seg2 = new Segment(args[0].segment2)
            } else if ('point1' in args[0]) {
                point1 = args[0].point1
                handle1 = args[0].handle1
                handle2 = args[0].handle2
                point2 = args[0].point2
            } else if (Array.isArray(args[0])) {
                point1 = [args[0][0], args[0][1]]
                point2 = [args[0][6], args[0][7]]
                handle1 = [args[0][2] - args[0][0], args[0][3] - args[0][1]]
                handle2 = [args[0][4] - args[0][6], args[0][5] - args[0][7]]
            }
        } else if (count === 2) {
            seg1 = new Segment(args[0])
            seg2 = new Segment(args[1])
        } else if (count === 4) {
            point1 = args[0]
            handle1 = args[1]
            handle2 = args[2]
            point2 = args[3]
        } else if (count === 8) {
            point1 = [args[0], args[1]]
            point2 = [args[6], args[7]]
            handle1 = [args[2] - args[0], args[3] - args[1]]
            handle2 = [args[4] - args[6], args[5] - args[7]]
        }

        this._segment1 = seg1 || new Segment(point1, null, handle1)
        this._segment2 = seg2 || new Segment(point2, handle2, null)
    }

    _serialize(options?: ExportJsonOptions, dictionary?: Dictionary) {
        return Base.serialize(
            this.hasHandles()
                ? [
                      this.getPoint1(),
                      this.getHandle1(),
                      this.getHandle2(),
                      this.getPoint2()
                  ]
                : [this.getPoint1(), this.getPoint2()],
            options,
            true,
            dictionary
        )
    }

    protected _changed() {
        this._length = this._bounds = undefined
    }

    /**
     * Returns a copy of the curve.
     *
     * @return {Curve}
     */
    clone(): this {
        return new Curve(this._segment1, this._segment2) as this
    }

    /**
     * @return {String} a string representation of the curve
     */
    toString(): string {
        console.log(this._segment1.point, this._segment1.point.toString())
        const parts = ['point1: ' + this._segment1.point]
        if (!this._segment1.handleOut.isZero())
            parts.push('handle1: ' + this._segment1.handleOut)
        if (!this._segment2.handleIn.isZero())
            parts.push('handle2: ' + this._segment2.handleIn)
        parts.push('point2: ' + this._segment2.point)
        return '{ ' + parts.join(', ') + ' }'
    }

    /**
     * Determines the type of cubic Bézier curve via discriminant
     * classification, as well as the curve-time parameters of the associated
     * points of inflection, loops, cusps, etc.
     *
     * @return {Object} the curve classification information as an object, see
     *     options
     * @result info.type {String} the type of Bézier curve, possible values are:
     *     {@values 'line', 'quadratic', 'serpentine', 'cusp', 'loop', 'arch'}
     * @result info.roots {Number[]} the curve-time parameters of the
     *     associated points of inflection for serpentine curves, loops, cusps,
           etc
     */
    classify(): CurveClassify {
        return Curve.classify(this.getValues())
    }

    /**
     * Removes the curve from the path that it belongs to, by removing its
     * second segment and merging its handle with the first segment.
     * @return {Boolean} {@true if the curve was removed}
     */
    remove(): boolean {
        let removed = false
        if (this._path) {
            const segment2 = this._segment2
            const handleOut = segment2.handleOut
            removed = segment2.remove()
            if (removed) this._segment1.handleOut.set(handleOut)
        }
        return removed
    }

    /**
     * The first anchor point of the curve.
     *
     * @bean
     * @type Point
     */
    getPoint1(): SegmentPoint {
        return this._segment1.point
    }

    setPoint1(x: number, y: number): void
    setPoint1(point: PointType): void
    setPoint1(...args: any[]): void {
        this._segment1.point.set(Point.read(args))
    }

    get point1(): SegmentPoint {
        return this.getPoint1()
    }

    set point1(point: PointType) {
        this.setPoint1(point)
    }

    /**
     * The second anchor point of the curve.
     *
     * @bean
     * @type Point
     */
    getPoint2(): SegmentPoint {
        return this._segment2.point
    }

    setPoint2(x: number, y: number): void
    setPoint2(point: PointType): void
    setPoint2(...args: any[]) {
        this._segment2.point.set(Point.read(args))
    }

    get point2(): SegmentPoint {
        return this.getPoint2()
    }

    set point2(point: PointType) {
        this.setPoint2(point)
    }

    /**
     * The handle point that describes the tangent in the first anchor point.
     *
     * @bean
     * @type Point
     */
    getHandle1(): SegmentPoint {
        return this._segment1.handleOut
    }

    setHandle1(x: number, y: number): void
    setHandle1(point: PointType): void
    setHandle1(...args: any[]) {
        this._segment1.handleOut.set(Point.read(args))
    }

    get handle1(): SegmentPoint {
        return this.getHandle1()
    }

    set handle1(point: PointType) {
        this.setHandle1(point)
    }

    /**
     * The handle point that describes the tangent in the second anchor point.
     *
     * @bean
     * @type Point
     */
    getHandle2(): SegmentPoint {
        return this._segment2.handleIn
    }

    setHandle2(x: number, y: number): void
    setHandle2(point: PointType): void
    setHandle2(...args: any[]) {
        this._segment2.handleIn.set(Point.read(args))
    }

    get handle2(): SegmentPoint {
        return this.getHandle2()
    }

    set handle2(point: PointType) {
        this.setHandle2(point)
    }

    /**
     * The first segment of the curve.
     *
     * @bean
     * @type Segment
     */
    getSegment1(): Segment {
        return this._segment1
    }

    get segment1(): Segment {
        return this.getSegment1()
    }

    set segment1(segment1: Segment | number[]) {
        this._segment1 = segment1 as Segment
    }

    /**
     * The second segment of the curve.
     *
     * @bean
     * @type Segment
     */
    getSegment2(): Segment {
        return this._segment2
    }

    get segment2(): Segment {
        return this.getSegment2()
    }

    set segment2(segment2: Segment | number[]) {
        this._segment2 = segment2 as Segment
    }

    /**
     * The path that the curve belongs to.
     *
     * @bean
     * @type Path
     */
    getPath(): Path {
        return this._path
    }

    get path(): Path {
        return this.getPath()
    }

    set path(path: Path) {
        this._path = path
    }

    /**
     * The index of the curve in the {@link Path#curves} array.
     *
     * @bean
     * @type Number
     */
    getIndex(): number {
        return this._segment1.index
    }

    get index(): number {
        return this.getIndex()
    }

    set index(index: number) {
        this._index = index
    }

    /**
     * The next curve in the {@link Path#curves} array that the curve
     * belongs to.
     *
     * @bean
     * @type Curve
     */
    getNext(): Curve {
        const curves = this._path && this._path.curves
        return (
            (curves &&
                (curves[this._segment1.index + 1] ||
                    (this._path.closed && curves[0]))) ||
            null
        )
    }

    next(): Curve {
        return this.getNext()
    }

    /**
     * The previous curve in the {@link Path#curves} array that the curve
     * belongs to.
     *
     * @bean
     * @type Curve
     */
    getPrevious(): Curve {
        const curves = this._path && this._path.curves
        return (
            (curves &&
                (curves[this._segment1.index - 1] ||
                    (this._path.closed && curves[curves.length - 1]))) ||
            null
        )
    }

    previous(): Curve {
        return this.getPrevious()
    }

    /**
     * Checks if the this is the first curve in the {@link Path#curves} array.
     *
     * @return {Boolean} {@true if this is the first curve}
     */
    isFirst(): boolean {
        return !this._segment1.index
    }

    /**
     * Checks if the this is the last curve in the {@link Path#curves} array.
     *
     * @return {Boolean} {@true if this is the last curve}
     */
    isLast(): boolean {
        const path = this._path
        return (
            (path && this._segment1.index === path.curves.length - 1) || false
        )
    }

    /**
     * Specifies whether the points and handles of the curve are selected.
     *
     * @bean
     * @type Boolean
     */
    isSelected(): boolean {
        return (
            this.getPoint1().isSelected() &&
            this.getHandle1().isSelected() &&
            this.getHandle2().isSelected() &&
            this.getPoint2().isSelected()
        )
    }

    setSelected(selected: boolean) {
        this.getPoint1().setSelected(selected)
        this.getHandle1().setSelected(selected)
        this.getHandle2().setSelected(selected)
        this.getPoint2().setSelected(selected)
    }

    get selected(): boolean {
        return this.isSelected()
    }

    set selected(selected: boolean) {
        this.setSelected(selected)
    }

    /**
     * An array of 8 float values, describing this curve's geometry in four
     * absolute x/y pairs (point1, handle1, handle2, point2). This format is
     * used internally for efficient processing of curve geometries, e.g. when
     * calculating intersections or bounds.
     *
     * Note that the handles are converted to absolute coordinates.
     *
     * @bean
     * @type Number[]
     */
    getValues(matrix?: Matrix) {
        return Curve.getValues(this._segment1, this._segment2, matrix)
    }

    /**
     * An array of 4 point objects, describing this curve's geometry in absolute
     * coordinates (point1, handle1, handle2, point2).
     *
     * Note that the handles are converted to absolute coordinates.
     *
     * @bean
     * @type Point[]
     */
    getPoints(): Point[] {
        const coords = this.getValues()
        const points = []
        for (let i = 0; i < 8; i += 2)
            points.push(new Point(coords[i], coords[i + 1]))
        return points
    }

    /**
     * The approximated length of the curve.
     *
     * @bean
     * @type Number
     */
    getLength(): number {
        if (this._length == null)
            this._length = Curve.getLength(this.getValues(), 0, 1)
        return this._length
    }

    get length() {
        return this.getLength()
    }

    /**
     * The area that the curve's geometry is covering.
     *
     * @bean
     * @type Number
     */
    getArea() {
        return Curve.getArea(this.getValues())
    }

    get area(): number {
        return this.getArea()
    }

    /**
     * @bean
     * @type Line
     * @private
     */
    getLine(): Line {
        return new Line(this._segment1.point, this._segment2.point)
    }

    get line(): Line {
        return this.getLine()
    }

    /**
     * Creates a new curve as a sub-curve from this curve, its range defined by
     * the given curve-time parameters. If `from` is larger than `to`, then
     * the resulting curve will have its direction reversed.
     *
     * @param {Number} from the curve-time parameter at which the sub-curve
     * starts
     * @param {Number} to the curve-time parameter at which the sub-curve
     * ends
     * @return {Curve} the newly create sub-curve
     */
    getPart(from: number, to: number): Curve {
        return new Curve(Curve.getPart(this.getValues(), from, to))
    }

    getPartLength(from: number, to: number): number {
        return Curve.getLength(this.getValues(), from, to)
    }

    /**
     * Divides the curve into two curves at the given offset or location. The
     * curve itself is modified and becomes the first part, the second part is
     * returned as a new curve. If the curve belongs to a path item, a new
     * segment is inserted into the path at the given location, and the second
     * part becomes a part of the path as well.
     *
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve at which to divide
     * @return {Curve} the second part of the divided curve if the location is
     *     valid, {code null} otherwise
     * @see #divideAtTime(time)
     */
    divideAt(location: number | CurveLocation): Curve {
        return this.divideAtTime(
            location instanceof CurveLocation && location.curve === this
                ? location.time
                : this.getTimeAt(location as number)
        )
    }

    /**
     * Divides the curve into two curves at the given curve-time parameter. The
     * curve itself is modified and becomes the first part, the second part is
     * returned as a new curve. If the modified curve belongs to a path item,
     * the second part is also added to the path.
     *
     * @param {Number} time the curve-time parameter on the curve at which to
     *     divide
     * @return {Curve} the second part of the divided curve, if the offset is
     *     within the valid range, {code null} otherwise.
     * @see #divideAt(offset)
     */
    divideAtTime(time: number, _setHandles?: boolean): Curve {
        const tMin = Numerical.CURVETIME_EPSILON
        const tMax = 1 - tMin
        let res = null

        if (time >= tMin && time <= tMax) {
            const parts = Curve.subdivide(this.getValues(), time)
            const left = parts[0]
            const right = parts[1]
            const setHandles = _setHandles || this.hasHandles()
            const seg1 = this._segment1
            const seg2 = this._segment2
            const path = this._path

            if (setHandles) {
                seg1.handleOut._set(left[2] - left[0], left[3] - left[1])
                seg2.handleIn._set(right[4] - right[6], right[5] - right[7])
            }
            // Create the new segment:
            const x = left[6]
            const y = left[7]
            const segment = new Segment(
                new Point(x, y),
                setHandles && new Point(left[4] - x, left[5] - y),
                setHandles && new Point(right[2] - x, right[3] - y)
            )
            if (path) {
                path.insert(seg1.index + 1, segment)
                res = this.getNext()
            } else {
                this._segment2 = segment
                this._changed()
                res = new Curve(segment, seg2)
            }
        }
        return res
    }

    /**
     * Splits the path this curve belongs to at the given offset. After
     * splitting, the path will be open. If the path was open already, splitting
     * will result in two paths.
     *
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve at which to split
     * @return {Path} the newly created path after splitting, if any
     * @see Path#splitAt(offset)
     */
    splitAt(location: number | CurveLocation): Path {
        const path = this._path
        return path ? path.splitAt(location) : null
    }

    /**
     * Splits the path this curve belongs to at the given offset. After
     * splitting, the path will be open. If the path was open already, splitting
     * will result in two paths.
     *
     * @param {Number} time the curve-time parameter on the curve at which to
     *     split
     * @return {Path} the newly created path after splitting, if any
     * @see Path#splitAt(offset)
     */
    splitAtTime(time: number): Path {
        return this.splitAt(this.getLocationAtTime(time))
    }

    /**
     * Returns a reversed version of the curve, without modifying the curve
     * itself.
     *
     * @return {Curve} a reversed version of the curve
     */
    reversed(): Curve {
        return new Curve(this._segment2.reversed(), this._segment1.reversed())
    }

    /**
     * Clears the curve's handles by setting their coordinates to zero,
     * turning the curve into a straight line.
     */
    clearHandles() {
        this._segment1.handleOut._set(0, 0)
        this._segment2.handleIn._set(0, 0)
    }

    static getValues(
        segment1: Segment,
        segment2: Segment,
        matrix?: Matrix,
        straight?: boolean
    ) {
        const p1 = segment1.point
        const h1 = segment1.handleOut
        const h2 = segment2.handleIn
        const p2 = segment2.point
        const x1 = p1.x
        const y1 = p1.y
        const x2 = p2.x
        const y2 = p2.y
        const values = straight
            ? [x1, y1, x1, y1, x2, y2, x2, y2]
            : [x1, y1, x1 + h1.x, y1 + h1.y, x2 + h2.x, y2 + h2.y, x2, y2]
        if (matrix) matrix.transformCoordinates(values, values, 4)
        return values
    }

    static subdivide(v: number[], t: number): number[][] {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        if (t === undefined) t = 0.5
        const u = 1 - t
        const x4 = u * x0 + t * x1
        const y4 = u * y0 + t * y1
        const x5 = u * x1 + t * x2
        const y5 = u * y1 + t * y2
        const x6 = u * x2 + t * x3
        const y6 = u * y2 + t * y3
        const x7 = u * x4 + t * x5
        const y7 = u * y4 + t * y5
        const x8 = u * x5 + t * x6
        const y8 = u * y5 + t * y6
        const x9 = u * x7 + t * x8
        const y9 = u * y7 + t * y8
        return [
            [x0, y0, x4, y4, x7, y7, x9, y9],
            [x9, y9, x8, y8, x6, y6, x3, y3]
        ]
    }

    /**
     * Splits the specified curve values into curves that are monotone in the
     * specified coordinate direction.
     *
     * @param {Number[]} v the curve values, as returned by {@link Curve#values}
     * @param {Boolean} [dir=false] the direction in which the curves should be
     *     monotone, `false`: in x-direction, `true`: in y-direction
     * @return {Number[][]} an array of curve value arrays of the resulting
     *     monotone curve. If the original curve was already monotone, an array
     *     only containing its values are returned.
     * @private
     */
    static getMonoCurves(v: number[], dir?: number): number[][] {
        const curves: number[][] = []
        const io = dir ? 0 : 1
        const o0 = v[io + 0]
        const o1 = v[io + 2]
        const o2 = v[io + 4]
        const o3 = v[io + 6]
        if (
            (o0 >= o1 === o1 >= o2 && o1 >= o2 === o2 >= o3) ||
            Curve.isStraight(v)
        ) {
            curves.push(v)
        } else {
            const a = 3 * (o1 - o2) - o0 + o3
            const b = 2 * (o0 + o2) - 4 * o1
            const c = o1 - o0
            const tMin = Numerical.CURVETIME_EPSILON
            const tMax = 1 - tMin
            const roots: number[] = []
            const n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax)
            if (!n) {
                curves.push(v)
            } else {
                roots.sort()
                let t = roots[0]
                let parts = Curve.subdivide(v, t)
                curves.push(parts[0])
                if (n > 1) {
                    t = (roots[1] - t) / (1 - t)
                    parts = Curve.subdivide(parts[1], t)
                    curves.push(parts[0])
                }
                curves.push(parts[1])
            }
        }
        return curves
    }

    static solveCubic(
        v: number[],
        coord: number,
        val: number,
        roots: number[],
        min: number,
        max: number
    ) {
        const v0 = v[coord]
        const v1 = v[coord + 2]
        const v2 = v[coord + 4]
        const v3 = v[coord + 6]
        let res = 0

        if (
            !(
                (v0 < val && v3 < val && v1 < val && v2 < val) ||
                (v0 > val && v3 > val && v1 > val && v2 > val)
            )
        ) {
            const c = 3 * (v1 - v0)
            const b = 3 * (v2 - v1) - c
            const a = v3 - v0 - c - b
            res = Numerical.solveCubic(a, b, c, v0 - val, roots, min, max)
        }
        return res
    }

    static getTimeOf(v: number[], point: Point) {
        const p0 = new Point(v[0], v[1])
        const p3 = new Point(v[6], v[7])
        const epsilon = Numerical.EPSILON
        const geomEpsilon = Numerical.GEOMETRIC_EPSILON
        const t = point.isClose(p0, epsilon)
            ? 0
            : point.isClose(p3, epsilon)
            ? 1
            : null

        if (t === null) {
            const coords = [point.x, point.y]
            const roots: number[] = []
            for (let c = 0; c < 2; c++) {
                const count = Curve.solveCubic(v, c, coords[c], roots, 0, 1)
                for (let i = 0; i < count; i++) {
                    const u = roots[i]
                    if (point.isClose(Curve.getPoint(v, u), geomEpsilon))
                        return u
                }
            }
        }

        return point.isClose(p0, geomEpsilon)
            ? 0
            : point.isClose(p3, geomEpsilon)
            ? 1
            : null
    }

    static getNearestTime(v: number[], point: Point) {
        if (Curve.isStraight(v)) {
            const x0 = v[0]
            const y0 = v[1]
            const x3 = v[6]
            const y3 = v[7]
            const vx = x3 - x0
            const vy = y3 - y0
            const det = vx * vx + vy * vy

            if (det === 0) return 0

            const u = ((point.x - x0) * vx + (point.y - y0) * vy) / det
            return u < Numerical.EPSILON
                ? 0
                : u > 1 - Numerical.EPSILON
                ? 1
                : Curve.getTimeOf(v, new Point(x0 + u * vx, y0 + u * vy))
        }

        const count = 100
        let minDist = Infinity
        let minT = 0

        function refine(t: number) {
            if (t >= 0 && t <= 1) {
                // const dist = point.getDistance(Curve.getPoint(v, t), true)
                const dist = point.getDistance(Curve.getPoint(v, t))
                if (dist < minDist) {
                    minDist = dist
                    minT = t
                    return true
                }
            }

            return false
        }

        for (let i = 0; i <= count; i++) refine(i / count)

        let step = 1 / (count * 2)
        while (step > Numerical.CURVETIME_EPSILON) {
            if (!refine(minT - step) && !refine(minT + step)) step /= 2
        }
        return minT
    }

    static getPart(v: number[], from: number, to: number) {
        const flip = from > to
        if (flip) {
            const tmp = from
            from = to
            to = tmp
        }
        if (from > 0) v = Curve.subdivide(v, from)[1]
        if (to < 1) v = Curve.subdivide(v, (to - from) / (1 - from))[0]
        return flip ? [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]] : v
    }

    /**
     * Determines if a curve is sufficiently flat, meaning it appears as a
     * straight line and has curve-time that is enough linear, as specified by
     * the given `flatness` parameter.
     *
     * @param {Number} flatness the maximum error allowed for the straight line
     *     to deviate from the curve
     *
     * @private
     */
    static isFlatEnough(v: number[], flatness: number) {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        const ux = 3 * x1 - 2 * x0 - x3
        const uy = 3 * y1 - 2 * y0 - y3
        const vx = 3 * x2 - 2 * x3 - x0
        const vy = 3 * y2 - 2 * y3 - y0
        return (
            Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy) <=
            16 * flatness * flatness
        )
    }

    static getArea(v: number[]) {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        return (
            (3 *
                ((y3 - y0) * (x1 + x2) -
                    (x3 - x0) * (y1 + y2) +
                    y1 * (x0 - x2) -
                    x1 * (y0 - y2) +
                    y3 * (x2 + x0 / 3) -
                    x3 * (y2 + y0 / 3))) /
            20
        )
    }

    static getBounds(v: number[]) {
        const min = v.slice(0, 2)
        const max = min.slice()
        const roots = [0, 0]
        for (let i = 0; i < 2; i++)
            Curve._addBounds(
                v[i],
                v[i + 2],
                v[i + 4],
                v[i + 6],
                i,
                0,
                min,
                max,
                roots
            )
        return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1])
    }

    /**
     * Private helper for both Curve.getBounds() and Path.getBounds(), which
     * finds the 0-crossings of the derivative of a bezier curve polynomial, to
     * determine potential extremas when finding the bounds of a curve.
     * NOTE: padding is only used for Path.getBounds().
     */
    static _addBounds(
        v0: number,
        v1: number,
        v2: number,
        v3: number,
        coord: number,
        padding: number,
        min: number[],
        max: number[],
        roots?: number[]
    ) {
        function add(value: number, padding: number) {
            const left = value - padding
            const right = value + padding
            if (left < min[coord]) min[coord] = left
            if (right > max[coord]) max[coord] = right
        }

        padding /= 2
        const minPad = min[coord] + padding
        const maxPad = max[coord] - padding

        if (
            v0 < minPad ||
            v1 < minPad ||
            v2 < minPad ||
            v3 < minPad ||
            v0 > maxPad ||
            v1 > maxPad ||
            v2 > maxPad ||
            v3 > maxPad
        ) {
            if (v1 < v0 !== v1 < v3 && v2 < v0 !== v2 < v3) {
                add(v0, 0)
                add(v3, 0)
            } else {
                const a = 3 * (v1 - v2) - v0 + v3
                const b = 2 * (v0 + v2) - 4 * v1
                const c = v1 - v0
                const count = Numerical.solveQuadratic(a, b, c, roots)

                const tMin = Numerical.CURVETIME_EPSILON
                const tMax = 1 - tMin

                add(v3, 0)

                for (let i = 0; i < count; i++) {
                    const t = roots[i]
                    const u = 1 - t

                    if (tMin <= t && t <= tMax)
                        add(
                            u * u * u * v0 +
                                3 * u * u * t * v1 +
                                3 * u * t * t * v2 +
                                t * t * t * v3,
                            padding
                        )
                }
            }
        }
    }

    getBounds() {
        if (!this._bounds) this._bounds = {}
        let bounds = this._bounds.getBounds
        if (!bounds) {
            bounds = this._bounds.getBounds = Path.getBounds(
                [this._segment1, this._segment2],
                false,
                this._path
            )
        }
        return bounds.clone()
    }

    get bounds() {
        return this.getBounds()
    }

    getStrokeBounds() {
        if (!this._bounds) this._bounds = {}
        let bounds = this._bounds.getStrokeBounds
        if (!bounds) {
            bounds = this._bounds.getStrokeBounds = Path.getStrokeBounds(
                [this._segment1, this._segment2],
                false,
                this._path
            )
        }
        return bounds.clone()
    }

    get strokeBounds() {
        return this.getStrokeBounds()
    }

    getHandleBounds() {
        if (!this._bounds) this._bounds = {}
        let bounds = this._bounds.getHandleBounds
        if (!bounds) {
            bounds = this._bounds.getHandleBounds = Path.getHandleBounds(
                [this._segment1, this._segment2],
                false,
                this._path
            )
        }
        return bounds.clone()
    }

    get handleBounds() {
        return this.getHandleBounds()
    }

    private static _isStraight(
        p1: Point,
        h1: Point,
        h2: Point,
        p2: Point
    ): boolean {
        if (h1.isZero() && h2.isZero()) {
            return true
        } else {
            const v = p2.subtract(p1)
            if (v.isZero()) {
                return false
            } else if (v.isCollinear(h1) && v.isCollinear(h2)) {
                const l = new Line(p1, p2)
                const epsilon = Numerical.GEOMETRIC_EPSILON
                if (
                    l.getDistance(p1.add(h1)) < epsilon &&
                    l.getDistance(p2.add(h2)) < epsilon
                ) {
                    const div = v.dot(v)
                    const s1 = v.dot(h1) / div
                    const s2 = v.dot(h2) / div
                    return s1 >= 0 && s1 <= 1 && s2 <= 0 && s2 >= -1
                }
            }
        }
        return false
    }

    private static _isLinear(
        p1: Point,
        h1: Point,
        h2: Point,
        p2: Point
    ): boolean {
        const third = p2.subtract(p1).divide(3)
        return h1.equals(third) && h2.negate().equals(third)
    }

    /**
     * Checks if this curve appears as a straight line. This can mean that
     * it has no handles defined, or that the handles run collinear with the
     * line that connects the curve's start and end point, not falling
     * outside of the line.
     *
     * @name Curve#isStraight
     * @function
     * @return {Boolean} {@true if the curve is straight}
     */
    isStraight(): boolean {
        const seg1 = this._segment1
        const seg2 = this._segment2
        return Curve._isStraight(
            seg1.point,
            seg1.handleOut,
            seg2.handleIn,
            seg2.point
        )
    }

    /**
     * Checks if this curve is parametrically linear, meaning that it is
     * straight and its handles are positioned at 1/3 and 2/3 of the total
     * length of the curve.
     *
     * @name Curve#isLinear
     * @function
     * @return {Boolean} {@true if the curve is parametrically linear}
     */
    isLinear(): boolean {
        const seg1 = this._segment1
        const seg2 = this._segment2
        return Curve._isLinear(
            seg1.point,
            seg1.handleOut,
            seg2.handleIn,
            seg2.point
        )
    }

    static isStraight(v: number[]): boolean {
        const x0 = v[0]
        const y0 = v[1]
        const x3 = v[6]
        const y3 = v[7]
        return Curve._isStraight(
            new Point(x0, y0),
            new Point(v[2] - x0, v[3] - y0),
            new Point(v[4] - x3, v[5] - y3),
            new Point(x3, y3)
        )
    }

    static isLinear(v: number[]): boolean {
        const x0 = v[0]
        const y0 = v[1]
        const x3 = v[6]
        const y3 = v[7]
        return Curve._isLinear(
            new Point(x0, y0),
            new Point(v[2] - x0, v[3] - y0),
            new Point(v[4] - x3, v[5] - y3),
            new Point(x3, y3)
        )
    }

    /**
     * {@grouptitle Curve Tests}
     *
     * Checks if this curve has any curve handles set.
     *
     * @return {Boolean} {@true if the curve has handles set}
     * @see Curve#handle1
     * @see Curve#handle2
     * @see Segment#hasHandles()
     * @see Path#hasHandles()
     */
    hasHandles(): boolean {
        return (
            !this._segment1.handleOut.isZero() ||
            !this._segment2.handleIn.isZero()
        )
    }

    /**
     * Checks if this curve has any length.
     *
     * @param {Number} [epsilon=0] the epsilon against which to compare the
     *     curve's length
     * @return {Boolean} {@true if the curve is longer than the given epsilon}
     */
    hasLength(epsilon?: number): boolean {
        return (
            (!this.getPoint1().equals(this.getPoint2()) || this.hasHandles()) &&
            this.getLength() > (epsilon || 0)
        )
    }

    /**
     * Checks if the the two curves describe straight lines that are
     * collinear, meaning they run in parallel.
     *
     * @param {Curve} curve the other curve to check against
     * @return {Boolean} {@true if the two lines are collinear}
     */
    isCollinear(curve: Curve): boolean {
        return (
            curve &&
            this.isStraight() &&
            curve.isStraight() &&
            this.getLine().isCollinear(curve.getLine())
        )
    }

    /**
     * Checks if the curve is a straight horizontal line.
     *
     * @return {Boolean} {@true if the line is horizontal}
     */
    isHorizontal(): boolean {
        return (
            this.isStraight() &&
            Math.abs(this.getTangentAtTime(0.5).y) <
                Numerical.TRIGONOMETRIC_EPSILON
        )
    }

    /**
     * Checks if the curve is a straight vertical line.
     *
     * @return {Boolean} {@true if the line is vertical}
     */
    isVertical(): boolean {
        return (
            this.isStraight() &&
            Math.abs(this.getTangentAtTime(0.5).x) <
                Numerical.TRIGONOMETRIC_EPSILON
        )
    }

    /**
     * {@grouptitle Positions on Curves}
     *
     * Calculates the curve location at the specified offset on the curve.
     *
     * @param {Number} offset the offset on the curve
     * @return {CurveLocation} the curve location at the specified the offset
     */
    getLocationAt(offset: number, _isTime?: boolean): CurveLocation {
        return this.getLocationAtTime(_isTime ? offset : this.getTimeAt(offset))
    }

    /**
     * Calculates the curve location at the specified curve-time parameter on
     * the curve.
     *
     * @param {Number} time the curve-time parameter on the curve
     * @return {CurveLocation} the curve location at the specified the location
     */
    getLocationAtTime(t: number): CurveLocation {
        return t != null && t >= 0 && t <= 1 ? new CurveLocation(this, t) : null
    }

    /**
     * Calculates the curve-time parameter of the specified offset on the path,
     * relative to the provided start parameter. If offset is a negative value,
     * the parameter is searched to the left of the start parameter. If no start
     * parameter is provided, a default of `0` for positive values of `offset`
     * and `1` for negative values of `offset`.
     *
     * @param {Number} offset the offset at which to find the curve-time, in
     *     curve length units
     * @param {Number} [start] the curve-time in relation to which the offset is
     *     determined
     * @return {Number} the curve-time parameter at the specified location
     */
    getTimeAt(offset: number, start?: number): number {
        return Curve.getTimeAt(this.getValues(), offset, start)
    }

    /**
     * Calculates the curve-time parameters where the curve is tangential to
     * provided tangent. Note that tangents at the start or end are included.
     *
     * @param {Point} tangent the tangent to which the curve must be tangential
     * @return {Number[]} at most two curve-time parameters, where the curve is
     * tangential to the given tangent
     */
    getTimesWithTangent(x: number, y: number): number[]
    getTimesWithTangent(point?: PointType): number[]
    getTimesWithTangent(...args: any[]): number[] {
        const tangent = Point.read(args)
        return tangent.isZero()
            ? []
            : Curve.getTimesWithTangent(this.getValues(), tangent)
    }

    /**
     * Calculates the curve offset at the specified curve-time parameter on
     * the curve.
     *
     * @param {Number} time the curve-time parameter on the curve
     * @return {Number} the curve offset at the specified the location
     */
    getOffsetAtTime(t: number): number {
        return this.getPartLength(0, t)
    }

    /**
     * Returns the curve location of the specified point if it lies on the
     * curve, `null` otherwise.
     *
     * @param {Point} point the point on the curve
     * @return {CurveLocation} the curve location of the specified point
     */
    getLocationOf(x: number, y: number): CurveLocation
    getLocationOf(point: PointType): CurveLocation
    getLocationOf(...args: any[]): CurveLocation
    getLocationOf(...args: any[]): CurveLocation {
        return this.getLocationAtTime(this.getTimeOf(Point.read(args)))
    }

    /**
     * Returns the length of the path from its beginning up to up to the
     * specified point if it lies on the path, `null` otherwise.
     *
     * @param {Point} point the point on the path
     * @return {Number} the length of the path up to the specified point
     */
    getOffsetOf(x: number, y: number): number
    getOffsetOf(point: PointType): number
    getOffsetOf(...args: any[]): number {
        const loc = this.getLocationOf(...args)
        return loc ? loc.getOffset() : null
    }

    /**
     * Returns the curve-time parameter of the specified point if it lies on the
     * curve, `null` otherwise.
     * Note that if there is more than one possible solution in a
     * self-intersecting curve, the first found result is returned.
     *
     * @param {Point} point the point on the curve
     * @return {Number} the curve-time parameter of the specified point
     */
    getTimeOf(x: number, y: number): number
    getTimeOf(point: PointType): number
    getTimeOf(...args: any[]): number {
        return Curve.getTimeOf(this.getValues(), Point.read(args))
    }

    /**
     * Returns the nearest location on the curve to the specified point.
     *
     * @function
     * @param {Point} point the point for which we search the nearest location
     * @return {CurveLocation} the location on the curve that's the closest to
     * the specified point
     */
    getNearestLocation(x: number, y: number): CurveLocation
    getNearestLocation(point: PointType): CurveLocation
    getNearestLocation(...args: any[]): CurveLocation
    getNearestLocation(...args: any[]): CurveLocation {
        const point = Point.read(args)
        const values = this.getValues()
        const t = Curve.getNearestTime(values, point)
        const pt = Curve.getPoint(values, t)
        return new CurveLocation(this, t, pt, null, point.getDistance(pt))
    }

    /**
     * Returns the nearest point on the curve to the specified point.
     *
     * @function
     * @param {Point} point the point for which we search the nearest point
     * @return {Point} the point on the curve that's the closest to the
     * specified point
     */
    getNearestPoint(x: number, y: number): Point
    getNearestPoint(point: PointType): Point
    getNearestPoint(...args: any[]): Point {
        const loc = this.getNearestLocation(...args)
        return (loc ? loc.getPoint() : loc) as Point
    }

    /**
     * Calculates the point on the curve at the given location.
     *
     * @name Curve#getPointAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the point on the curve at the given location
     */
    getPointAt(location: number, _isTime?: boolean): Point {
        const values = this.getValues()
        return Curve.getPoint(
            values,
            _isTime ? location : Curve.getTimeAt(values, location)
        )
    }

    /**
     * Calculates the normalized tangent vector of the curve at the given
     * location.
     *
     * @name Curve#getTangentAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the normalized tangent of the curve at the given location
     */
    getTangentAt(location: number, _isTime?: boolean): Point {
        const values = this.getValues()
        return Curve.getTangent(
            values,
            _isTime ? location : Curve.getTimeAt(values, location)
        )
    }

    /**
     * Calculates the normal vector of the curve at the given location.
     *
     * @name Curve#getNormalAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the normal of the curve at the given location
     */
    getNormalAt(location: number, _isTime?: boolean): Point {
        const values = this.getValues()
        return Curve.getNormal(
            values,
            _isTime ? location : Curve.getTimeAt(values, location)
        )
    }

    /**
     * Calculates the weighted tangent vector of the curve at the given
     * location, its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedTangentAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the weighted tangent of the curve at the given location
     */
    getWeightedTangentAt(location: number, _isTime?: boolean): Point {
        const values = this.getValues()
        return Curve.getWeightedTangent(
            values,
            _isTime ? location : Curve.getTimeAt(values, location)
        )
    }

    /**
     * Calculates the weighted normal vector of the curve at the given location,
     * its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedNormalAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the weighted normal of the curve at the given location
     */
    getWeightedNormalAt(location: number, _isTime?: boolean): Point {
        const values = this.getValues()
        return Curve.getWeightedNormal(
            values,
            _isTime ? location : Curve.getTimeAt(values, location)
        )
    }

    /**
     * Calculates the curvature of the curve at the given location. Curvatures
     * indicate how sharply a curve changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The curve's radius
     * at the given location is the reciprocal value of its curvature.
     *
     * @name Curve#getCurvatureAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Number} the curvature of the curve at the given location
     */
    getCurvatureAt(location: number, _isTime?: boolean): number {
        const values = this.getValues()
        return Curve.getCurvature(
            values,
            _isTime ? location : Curve.getTimeAt(values, location)
        )
    }

    /**
     * Calculates the point on the curve at the given location.
     *
     * @name Curve#getPointAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the point on the curve at the given location
     */
    getPointAtTime(time: number): Point {
        return Curve.getPoint(this.getValues(), time)
    }

    /**
     * Calculates the normalized tangent vector of the curve at the given
     * location.
     *
     * @name Curve#getTangentAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the normalized tangent of the curve at the given location
     */
    getTangentAtTime(time: number): Point {
        return Curve.getTangent(this.getValues(), time)
    }

    /**
     * Calculates the normal vector of the curve at the given location.
     *
     * @name Curve#getNormalAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the normal of the curve at the given location
     */
    getNormalAtTime(time: number): Point {
        return Curve.getNormal(this.getValues(), time)
    }

    /**
     * Calculates the weighted tangent vector of the curve at the given
     * location, its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedTangentAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the weighted tangent of the curve at the given location
     */
    getWeightedTangentAtTime(time: number): Point {
        return Curve.getWeightedTangent(this.getValues(), time)
    }

    /**
     * Calculates the weighted normal vector of the curve at the given location,
     * its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedNormalAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the weighted normal of the curve at the given location
     */
    getWeightedNormalAtTime(time: number): Point {
        return Curve.getWeightedNormal(this.getValues(), time)
    }

    /**
     * Calculates the curvature of the curve at the given location. Curvatures
     * indicate how sharply a curve changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The curve's radius
     * at the given location is the reciprocal value of its curvature.
     *
     * @name Curve#getCurvatureAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Number} the curvature of the curve at the given location
     */
    getCurvatureAtTime(time: number): number {
        return Curve.getCurvature(this.getValues(), time)
    }

    private static _getLengthIntegrand(v: number[]) {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        const ax = 9 * (x1 - x2) + 3 * (x3 - x0)
        const bx = 6 * (x0 + x2) - 12 * x1
        const cx = 3 * (x1 - x0)
        const ay = 9 * (y1 - y2) + 3 * (y3 - y0)
        const by = 6 * (y0 + y2) - 12 * y1
        const cy = 3 * (y1 - y0)

        return function (t: number) {
            const dx = (ax * t + bx) * t + cx
            const dy = (ay * t + by) * t + cy
            return Math.sqrt(dx * dx + dy * dy)
        }
    }

    private static _getIterations(a: number, b: number) {
        return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)))
    }

    private static _evaluate(
        v: number[],
        t: number,
        type: number,
        normalized: boolean
    ) {
        if (t == null || t < 0 || t > 1) return null
        const x0 = v[0]
        const y0 = v[1]
        let x1 = v[2]
        let y1 = v[3]
        let x2 = v[4]
        let y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        const isZero = Numerical.isZero

        if (isZero(x1 - x0) && isZero(y1 - y0)) {
            x1 = x0
            y1 = y0
        }
        if (isZero(x2 - x3) && isZero(y2 - y3)) {
            x2 = x3
            y2 = y3
        }

        const cx = 3 * (x1 - x0)
        const bx = 3 * (x2 - x1) - cx
        const ax = x3 - x0 - cx - bx
        const cy = 3 * (y1 - y0)
        const by = 3 * (y2 - y1) - cy
        const ay = y3 - y0 - cy - by
        let x
        let y
        if (type === 0) {
            x = t === 0 ? x0 : t === 1 ? x3 : ((ax * t + bx) * t + cx) * t + x0
            y = t === 0 ? y0 : t === 1 ? y3 : ((ay * t + by) * t + cy) * t + y0
        } else {
            const tMin = Numerical.CURVETIME_EPSILON
            const tMax = 1 - tMin

            if (t < tMin) {
                x = cx
                y = cy
            } else if (t > tMax) {
                x = 3 * (x3 - x2)
                y = 3 * (y3 - y2)
            } else {
                x = (3 * ax * t + 2 * bx) * t + cx
                y = (3 * ay * t + 2 * by) * t + cy
            }
            if (normalized) {
                if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
                    x = x2 - x1
                    y = y2 - y1
                }

                const len = Math.sqrt(x * x + y * y)
                if (len) {
                    x /= len
                    y /= len
                }
            }
            if (type === 3) {
                const x2 = 6 * ax * t + 2 * bx
                const y2 = 6 * ay * t + 2 * by
                const d = Math.pow(x * x + y * y, 3 / 2)

                x = d !== 0 ? (x * y2 - y * x2) / d : 0
                y = 0
            }
        }
        return type === 2 ? new Point(y, -x) : new Point(x, y)
    }

    static classify(v: number[]): CurveClassify {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]

        const a1 = x0 * (y3 - y2) + y0 * (x2 - x3) + x3 * y2 - y3 * x2
        const a2 = x1 * (y0 - y3) + y1 * (x3 - x0) + x0 * y3 - y0 * x3
        const a3 = x2 * (y1 - y0) + y2 * (x0 - x1) + x1 * y0 - y1 * x0
        let d3 = 3 * a3
        let d2 = d3 - a2
        let d1 = d2 - a2 + a1

        const l = Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3)
        const s = l !== 0 ? 1 / l : 0
        const isZero = Numerical.isZero
        const serpentine = 'serpentine'
        d1 *= s
        d2 *= s
        d3 *= s

        function type(
            type: CurveClassifyType,
            t1?: number,
            t2?: number
        ): CurveClassify {
            const hasRoots = t1 !== undefined
            let t1Ok = hasRoots && t1 > 0 && t1 < 1
            let t2Ok = hasRoots && t2 > 0 && t2 < 1

            if (
                hasRoots &&
                (!(t1Ok || t2Ok) || (type === 'loop' && !(t1Ok && t2Ok)))
            ) {
                type = 'arch'
                t1Ok = t2Ok = false
            }
            return {
                type: type,
                roots:
                    t1Ok || t2Ok
                        ? t1Ok && t2Ok
                            ? t1 < t2
                                ? [t1, t2]
                                : [t2, t1]
                            : [t1Ok ? t1 : t2]
                        : null
            }
        }

        if (isZero(d1)) {
            return isZero(d2)
                ? type(isZero(d3) ? 'line' : 'quadratic')
                : type(serpentine, d3 / (3 * d2))
        }
        const d = 3 * d2 * d2 - 4 * d1 * d3

        if (isZero(d)) {
            return type('cusp', d2 / (2 * d1))
        }
        const f1 = d > 0 ? Math.sqrt(d / 3) : Math.sqrt(-d)
        const f2 = 2 * d1
        return type(d > 0 ? serpentine : 'loop', (d2 + f1) / f2, (d2 - f1) / f2)
    }

    static getLength(
        v: number[],
        a: number,
        b: number,
        ds?: (n: number) => number
    ) {
        if (a === undefined) a = 0
        if (b === undefined) b = 1
        if (Curve.isStraight(v)) {
            let c = v
            if (b < 1) {
                c = Curve.subdivide(c, b)[0]
                a /= b
            }
            if (a > 0) {
                c = Curve.subdivide(c, a)[1]
            }

            const dx = c[6] - c[0]
            const dy = c[7] - c[1]
            return Math.sqrt(dx * dx + dy * dy)
        }
        return Numerical.integrate(
            ds || Curve._getLengthIntegrand(v),
            a,
            b,
            Curve._getIterations(a, b)
        )
    }

    static getTimeAt(v: number[], offset: number, start?: number) {
        if (start === undefined) start = offset < 0 ? 1 : 0
        if (offset === 0) return start

        const abs = Math.abs
        const epsilon = Numerical.EPSILON
        const forward = offset > 0
        const a = forward ? start : 0
        const b = forward ? 1 : start

        const ds = Curve._getLengthIntegrand(v)

        const rangeLength = Curve.getLength(v, a, b, ds)
        const diff = abs(offset) - rangeLength
        if (abs(diff) < epsilon) {
            return forward ? b : a
        } else if (diff > epsilon) {
            return null
        }

        const guess = offset / rangeLength
        let length = 0

        function f(t: number) {
            length += Numerical.integrate(
                ds,
                start,
                t,
                Curve._getIterations(start, t)
            )
            start = t
            return length - offset
        }

        return Numerical.findRoot(
            f,
            ds,
            start + guess,
            a,
            b,
            32,
            Numerical.EPSILON
        )
    }

    static getPoint(v: number[], t: number) {
        return Curve._evaluate(v, t, 0, false)
    }

    static getTangent(v: number[], t: number) {
        return Curve._evaluate(v, t, 1, true)
    }

    static getWeightedTangent(v: number[], t: number) {
        return Curve._evaluate(v, t, 1, false)
    }

    static getNormal(v: number[], t: number) {
        return Curve._evaluate(v, t, 2, true)
    }

    static getWeightedNormal(v: number[], t: number) {
        return Curve._evaluate(v, t, 2, false)
    }

    static getCurvature(v: number[], t: number) {
        return Curve._evaluate(v, t, 3, false).x
    }

    /**
     * Returns the t values for the "peaks" of the curve. The peaks are
     * calculated by finding the roots of the dot product of the first and
     * second derivative.
     *
     * Peaks are locations sharing some qualities of curvature extrema but
     * are cheaper to compute. They fulfill their purpose here quite well.
     * See:
     * https://math.stackexchange.com/questions/1954845/bezier-curvature-extrema
     *
     * @param {Number[]} v the curve values array
     * @return {Number[]} the roots of all found peaks
     */
    static getPeaks(v: number[]): number[] {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        const ax = -x0 + 3 * x1 - 3 * x2 + x3
        const bx = 3 * x0 - 6 * x1 + 3 * x2
        const cx = -3 * x0 + 3 * x1
        const ay = -y0 + 3 * y1 - 3 * y2 + y3
        const by = 3 * y0 - 6 * y1 + 3 * y2
        const cy = -3 * y0 + 3 * y1
        const tMin = Numerical.CURVETIME_EPSILON
        const tMax = 1 - tMin
        const roots: number[] = []

        Numerical.solveCubic(
            9 * (ax * ax + ay * ay),
            9 * (ax * bx + by * ay),
            2 * (bx * bx + by * by) + 3 * (cx * ax + cy * ay),
            cx * bx + by * cy,
            roots,
            tMin,
            tMax
        )
        return roots.sort()
    }

    static addLocation(
        locations: CurveLocation[],
        include: (location: CurveLocation) => boolean,
        c1: Curve,
        t1: number,
        c2: Curve,
        t2: number,
        overlap?: boolean
    ) {
        const excludeStart = !overlap && c1.getPrevious() === c2
        const excludeEnd = !overlap && c1 !== c2 && c1.getNext() === c2
        const tMin = Numerical.CURVETIME_EPSILON
        const tMax = 1 - tMin

        if (
            t1 !== null &&
            t1 >= (excludeStart ? tMin : 0) &&
            t1 <= (excludeEnd ? tMax : 1)
        ) {
            if (
                t2 !== null &&
                t2 >= (excludeEnd ? tMin : 0) &&
                t2 <= (excludeStart ? tMax : 1)
            ) {
                const loc1 = new CurveLocation(c1, t1, null, overlap)
                const loc2 = new CurveLocation(c2, t2, null, overlap)

                loc1.intersection = loc2
                loc2.intersection = loc1
                if (!include || include(loc1)) {
                    CurveLocation.insert(locations, loc1, true)
                }
            }
        }
    }

    static addCurveIntersections(
        v1: number[],
        v2: number[],
        c1: Curve,
        c2: Curve,
        locations: CurveLocation[],
        include?: (location: CurveLocation) => boolean,
        flip?: boolean,
        recursion?: number,
        calls?: number,
        tMin?: number,
        tMax?: number,
        uMin?: number,
        uMax?: number
    ): number {
        if (++calls >= 4096 || ++recursion >= 40) return calls

        const fatLineEpsilon = 1e-9
        const q0x = v2[0]
        const q0y = v2[1]
        const q3x = v2[6]
        const q3y = v2[7]
        const getSignedDistance = Line.getSignedDistance
        const d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3])
        const d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5])
        const factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9
        const dMin = factor * Math.min(0, d1, d2)
        const dMax = factor * Math.max(0, d1, d2)

        const dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1])
        const dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3])
        const dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5])
        const dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7])

        const hull = Curve.getConvexHull(dp0, dp1, dp2, dp3)
        const top = hull[0]
        const bottom = hull[1]
        let tMinClip
        let tMaxClip

        if (
            (d1 === 0 &&
                d2 === 0 &&
                dp0 === 0 &&
                dp1 === 0 &&
                dp2 === 0 &&
                dp3 === 0) ||
            (tMinClip = Curve.clipConvexHull(top, bottom, dMin, dMax)) ==
                null ||
            (tMaxClip = Curve.clipConvexHull(
                top.reverse(),
                bottom.reverse(),
                dMin,
                dMax
            )) == null
        )
            return calls

        const tMinNew = tMin + (tMax - tMin) * tMinClip
        const tMaxNew = tMin + (tMax - tMin) * tMaxClip
        if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
            const t = (tMinNew + tMaxNew) / 2
            const u = (uMin + uMax) / 2
            Curve.addLocation(
                locations,
                include,
                flip ? c2 : c1,
                flip ? u : t,
                flip ? c1 : c2,
                flip ? t : u
            )
        } else {
            v1 = Curve.getPart(v1, tMinClip, tMaxClip)
            const uDiff = uMax - uMin
            if (tMaxClip - tMinClip > 0.8) {
                if (tMaxNew - tMinNew > uDiff) {
                    const parts = Curve.subdivide(v1, 0.5)
                    const t = (tMinNew + tMaxNew) / 2
                    calls = Curve.addCurveIntersections(
                        v2,
                        parts[0],
                        c2,
                        c1,
                        locations,
                        include,
                        !flip,
                        recursion,
                        calls,
                        uMin,
                        uMax,
                        tMinNew,
                        t
                    )
                    calls = Curve.addCurveIntersections(
                        v2,
                        parts[1],
                        c2,
                        c1,
                        locations,
                        include,
                        !flip,
                        recursion,
                        calls,
                        uMin,
                        uMax,
                        t,
                        tMaxNew
                    )
                } else {
                    const parts = Curve.subdivide(v2, 0.5)
                    const u = (uMin + uMax) / 2
                    calls = Curve.addCurveIntersections(
                        parts[0],
                        v1,
                        c2,
                        c1,
                        locations,
                        include,
                        !flip,
                        recursion,
                        calls,
                        uMin,
                        u,
                        tMinNew,
                        tMaxNew
                    )
                    calls = Curve.addCurveIntersections(
                        parts[1],
                        v1,
                        c2,
                        c1,
                        locations,
                        include,
                        !flip,
                        recursion,
                        calls,
                        u,
                        uMax,
                        tMinNew,
                        tMaxNew
                    )
                }
            } else {
                if (uDiff === 0 || uDiff >= fatLineEpsilon) {
                    calls = Curve.addCurveIntersections(
                        v2,
                        v1,
                        c2,
                        c1,
                        locations,
                        include,
                        !flip,
                        recursion,
                        calls,
                        uMin,
                        uMax,
                        tMinNew,
                        tMaxNew
                    )
                } else {
                    calls = Curve.addCurveIntersections(
                        v1,
                        v2,
                        c1,
                        c2,
                        locations,
                        include,
                        flip,
                        recursion,
                        calls,
                        tMinNew,
                        tMaxNew,
                        uMin,
                        uMax
                    )
                }
            }
        }
        return calls
    }

    /**
     * Calculate the convex hull for the non-parametric bezier curve D(ti, di(t))
     * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
     * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
     * curve are already sorted in the X axis in the increasing order.
     * Calculating convex-hull is much easier than a set of arbitrary points.
     *
     * The convex-hull is returned as two parts [TOP, BOTTOM]:
     * (both are in a coordinate space where y increases upwards with origin at
     * bottom-left)
     * TOP: The part that lies above the 'median' (line connecting end points of
     * the curve)
     * BOTTOM: The part that lies below the median.
     */
    static getConvexHull(dq0: number, dq1: number, dq2: number, dq3: number) {
        const p0 = [0, dq0]
        const p1 = [1 / 3, dq1]
        const p2 = [2 / 3, dq2]
        const p3 = [1, dq3]

        const dist1 = dq1 - (2 * dq0 + dq3) / 3
        const dist2 = dq2 - (dq0 + 2 * dq3) / 3
        let hull

        if (dist1 * dist2 < 0) {
            hull = [
                [p0, p1, p3],
                [p0, p2, p3]
            ]
        } else {
            const distRatio = dist1 / dist2
            hull = [
                distRatio >= 2
                    ? [p0, p1, p3]
                    : distRatio <= 0.5
                    ? [p0, p2, p3]
                    : [p0, p1, p2, p3],
                [p0, p3]
            ]
        }
        return (dist1 || dist2) < 0 ? hull.reverse() : hull
    }

    static clipConvexHull(
        hullTop: number[][],
        hullBottom: number[][],
        dMin: number,
        dMax: number
    ) {
        if (hullTop[0][1] < dMin) {
            return Curve.clipConvexHullPart(hullTop, true, dMin)
        } else if (hullBottom[0][1] > dMax) {
            return Curve.clipConvexHullPart(hullBottom, false, dMax)
        } else {
            return hullTop[0][0]
        }
    }

    static clipConvexHullPart(
        part: number[][],
        top: boolean,
        threshold: number
    ): number {
        let px = part[0][0]
        let py = part[0][1]
        for (let i = 1, l = part.length; i < l; i++) {
            const qx = part[i][0]
            const qy = part[i][1]
            if (top ? qy >= threshold : qy <= threshold) {
                return qy === threshold
                    ? qx
                    : px + ((threshold - py) * (qx - px)) / (qy - py)
            }
            px = qx
            py = qy
        }

        return null
    }

    /**
     * Intersections between curve and line becomes rather simple here mostly
     * because of Numerical class. We can rotate the curve and line so that the
     * line is on the X axis, and solve the implicit equations for the X axis
     * and the curve.
     */
    static getCurveLineIntersections(
        v: number[],
        px: number,
        py: number,
        vx: number,
        vy: number
    ) {
        const isZero = Numerical.isZero
        if (isZero(vx) && isZero(vy)) {
            const t = Curve.getTimeOf(v, new Point(px, py))
            return t === null ? [] : [t]
        }

        const angle = Math.atan2(-vy, vx)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)

        const rv: number[] = []
        const roots: number[] = []
        for (let i = 0; i < 8; i += 2) {
            const x = v[i] - px
            const y = v[i + 1] - py
            rv.push(x * cos - y * sin, x * sin + y * cos)
        }

        Curve.solveCubic(rv, 1, 0, roots, 0, 1)
        return roots
    }

    static addCurveLineIntersections(
        v1: number[],
        v2: number[],
        c1: Curve,
        c2: Curve,
        locations: CurveLocation[],
        include: (location: CurveLocation) => boolean,
        flip?: boolean,
        _recursion?: number,
        _calls?: number,
        _tMin?: number,
        _tMax?: number,
        _uMin?: number,
        _uMax?: number
    ) {
        const x1 = v2[0]
        const y1 = v2[1]
        const x2 = v2[6]
        const y2 = v2[7]
        const roots = Curve.getCurveLineIntersections(
            v1,
            x1,
            y1,
            x2 - x1,
            y2 - y1
        )

        for (let i = 0, l = roots.length; i < l; i++) {
            const t1 = roots[i]
            const p1 = Curve.getPoint(v1, t1)
            const t2 = Curve.getTimeOf(v2, p1)
            if (t2 !== null) {
                Curve.addLocation(
                    locations,
                    include,
                    flip ? c2 : c1,
                    flip ? t2 : t1,
                    flip ? c1 : c2,
                    flip ? t1 : t2
                )
            }
        }
    }

    static addLineIntersection(
        v1: number[],
        v2: number[],
        c1: Curve,
        c2: Curve,
        locations: CurveLocation[],
        include: (location: CurveLocation) => boolean
    ) {
        const pt = Line.intersect(
            v1[0],
            v1[1],
            v1[6],
            v1[7],
            v2[0],
            v2[1],
            v2[6],
            v2[7]
        )

        if (pt) {
            Curve.addLocation(
                locations,
                include,
                c1,
                Curve.getTimeOf(v1, pt),
                c2,
                Curve.getTimeOf(v2, pt)
            )
        }
    }

    static getCurveIntersections(
        v1: number[],
        v2: number[],
        c1: Curve,
        c2: Curve,
        locations: CurveLocation[],
        include?: (location: CurveLocation) => boolean
    ): CurveLocation[] {
        const epsilon = Numerical.EPSILON
        const min = Math.min
        const max = Math.max

        if (
            max(v1[0], v1[2], v1[4], v1[6]) + epsilon >
                min(v2[0], v2[2], v2[4], v2[6]) &&
            min(v1[0], v1[2], v1[4], v1[6]) - epsilon <
                max(v2[0], v2[2], v2[4], v2[6]) &&
            max(v1[1], v1[3], v1[5], v1[7]) + epsilon >
                min(v2[1], v2[3], v2[5], v2[7]) &&
            min(v1[1], v1[3], v1[5], v1[7]) - epsilon <
                max(v2[1], v2[3], v2[5], v2[7])
        ) {
            const overlaps = Curve.getOverlaps(v1, v2)
            if (overlaps) {
                for (let i = 0; i < 2; i++) {
                    const overlap = overlaps[i]
                    Curve.addLocation(
                        locations,
                        include,
                        c1,
                        overlap[0],
                        c2,
                        overlap[1],
                        true
                    )
                }
            } else {
                const straight1 = Curve.isStraight(v1)
                const straight2 = Curve.isStraight(v2)
                const straight = straight1 && straight2
                const flip = straight1 && !straight2
                const before = locations.length

                ;(straight
                    ? Curve.addLineIntersection
                    : straight1 || straight2
                    ? Curve.addCurveLineIntersections
                    : Curve.addCurveIntersections)(
                    flip ? v2 : v1,
                    flip ? v1 : v2,
                    flip ? c2 : c1,
                    flip ? c1 : c2,
                    locations,
                    include,
                    flip,
                    0,
                    0,
                    0,
                    1,
                    0,
                    1
                )

                if (!straight || locations.length === before) {
                    for (let i = 0; i < 4; i++) {
                        const t1 = i >> 1
                        const t2 = i & 1
                        const i1 = t1 * 6
                        const i2 = t2 * 6
                        const p1 = new Point(v1[i1], v1[i1 + 1])
                        const p2 = new Point(v2[i2], v2[i2 + 1])
                        if (p1.isClose(p2, epsilon)) {
                            Curve.addLocation(
                                locations,
                                include,
                                c1,
                                t1,
                                c2,
                                t2
                            )
                        }
                    }
                }
            }
        }
        return locations
    }

    static getSelfIntersection(
        v1: number[],
        c1: Curve,
        locations: CurveLocation[],
        include?: (location: CurveLocation) => boolean
    ) {
        const info = Curve.classify(v1)
        if (info.type === 'loop') {
            const roots = info.roots
            Curve.addLocation(locations, include, c1, roots[0], c1, roots[1])
        }
        return locations
    }

    static getIntersections(
        curves1: Curve[],
        curves2: Curve[],
        include: (location: CurveLocation) => boolean,
        matrix1?: Matrix,
        matrix2?: Matrix,
        _returnFirst?: boolean
    ) {
        const epsilon = Numerical.GEOMETRIC_EPSILON
        const self = !curves2
        if (self) curves2 = curves1
        const length1 = curves1.length
        const length2 = curves2.length
        const values1 = new Array(length1)
        const values2 = self ? values1 : new Array(length2)
        const locations: CurveLocation[] = []

        for (let i = 0; i < length1; i++) {
            values1[i] = curves1[i].getValues(matrix1)
        }
        if (!self) {
            for (let i = 0; i < length2; i++) {
                values2[i] = curves2[i].getValues(matrix2)
            }
        }
        const boundsCollisions = CollisionDetection.findCurveBoundsCollisions(
            values1,
            values2,
            epsilon
        ) as any

        for (let index1 = 0; index1 < length1; index1++) {
            const curve1 = curves1[index1]
            const v1 = values1[index1]
            if (self) {
                Curve.getSelfIntersection(v1, curve1, locations, include)
            }
            const collisions1 = boundsCollisions[index1]
            if (collisions1) {
                for (let j = 0; j < collisions1.length; j++) {
                    if (_returnFirst && locations.length) return locations
                    const index2 = collisions1[j]
                    if (!self || index2 > index1) {
                        const curve2 = curves2[index2]
                        const v2 = values2[index2]
                        Curve.getCurveIntersections(
                            v1,
                            v2,
                            curve1,
                            curve2,
                            locations,
                            include
                        )
                    }
                }
            }
        }
        return locations
    }

    static getOverlaps(v1: number[], v2: number[]) {
        function getSquaredLineLength(v: number[]) {
            const x = v[6] - v[0]
            const y = v[7] - v[1]
            return x * x + y * y
        }

        const abs = Math.abs
        const getDistance = Line.getDistance
        const timeEpsilon = Numerical.CURVETIME_EPSILON
        const geomEpsilon = Numerical.GEOMETRIC_EPSILON
        let straight1 = Curve.isStraight(v1)
        let straight2 = Curve.isStraight(v2)
        let straightBoth = straight1 && straight2
        const flip = getSquaredLineLength(v1) < getSquaredLineLength(v2)
        const l1 = flip ? v2 : v1
        const l2 = flip ? v1 : v2
        const px = l1[0]
        const py = l1[1]
        const vx = l1[6] - px
        const vy = l1[7] - py

        if (
            getDistance(px, py, vx, vy, l2[0], l2[1], true) < geomEpsilon &&
            getDistance(px, py, vx, vy, l2[6], l2[7], true) < geomEpsilon
        ) {
            if (
                !straightBoth &&
                getDistance(px, py, vx, vy, l1[2], l1[3], true) < geomEpsilon &&
                getDistance(px, py, vx, vy, l1[4], l1[5], true) < geomEpsilon &&
                getDistance(px, py, vx, vy, l2[2], l2[3], true) < geomEpsilon &&
                getDistance(px, py, vx, vy, l2[4], l2[5], true) < geomEpsilon
            ) {
                straight1 = straight2 = straightBoth = true
            }
        } else if (straightBoth) {
            return null
        }
        if (+straight1 ^ +straight2) {
            return null
        }

        const v = [v1, v2]
        let pairs: number[][] = []

        for (let i = 0; i < 4 && pairs.length < 2; i++) {
            const i1 = i & 1
            const i2 = i1 ^ 1
            const t1 = i >> 1
            const t2 = Curve.getTimeOf(
                v[i1],
                new Point(v[i2][t1 ? 6 : 0], v[i2][t1 ? 7 : 1])
            )
            if (t2 != null) {
                const pair = i1 ? [t1, t2] : [t2, t1]
                if (
                    !pairs.length ||
                    (abs(pair[0] - pairs[0][0]) > timeEpsilon &&
                        abs(pair[1] - pairs[0][1]) > timeEpsilon)
                ) {
                    pairs.push(pair)
                }
            }
            if (i > 2 && !pairs.length) break
        }
        if (pairs.length !== 2) {
            pairs = null
        } else if (!straightBoth) {
            const o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0])
            const o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1])
            if (
                abs(o2[2] - o1[2]) > geomEpsilon ||
                abs(o2[3] - o1[3]) > geomEpsilon ||
                abs(o2[4] - o1[4]) > geomEpsilon ||
                abs(o2[5] - o1[5]) > geomEpsilon
            )
                pairs = null
        }
        return pairs
    }

    static getTimesWithTangent(v: number[], tangent: Point) {
        const x0 = v[0]
        const y0 = v[1]
        const x1 = v[2]
        const y1 = v[3]
        const x2 = v[4]
        const y2 = v[5]
        const x3 = v[6]
        const y3 = v[7]
        const normalized = tangent.normalize()
        const tx = normalized.x
        const ty = normalized.y
        const ax = 3 * x3 - 9 * x2 + 9 * x1 - 3 * x0
        const ay = 3 * y3 - 9 * y2 + 9 * y1 - 3 * y0
        const bx = 6 * x2 - 12 * x1 + 6 * x0
        const by = 6 * y2 - 12 * y1 + 6 * y0
        const cx = 3 * x1 - 3 * x0
        const cy = 3 * y1 - 3 * y0
        let den = 2 * ax * ty - 2 * ay * tx
        const times = []
        if (Math.abs(den) < Numerical.CURVETIME_EPSILON) {
            const num = ax * cy - ay * cx
            den = ax * by - ay * bx
            if (den !== 0) {
                const t = -num / den
                if (t >= 0 && t <= 1) times.push(t)
            }
        } else {
            const delta =
                (bx * bx - 4 * ax * cx) * ty * ty +
                (-2 * bx * by + 4 * ay * cx + 4 * ax * cy) * tx * ty +
                (by * by - 4 * ay * cy) * tx * tx
            const k = bx * ty - by * tx
            if (delta >= 0 && den !== 0) {
                const d = Math.sqrt(delta)
                const t0 = -(k + d) / den
                const t1 = (-k + d) / den
                if (t0 >= 0 && t0 <= 1) times.push(t0)
                if (t1 >= 0 && t1 <= 1) times.push(t1)
            }
        }
        return times
    }

    /**
     * Returns all intersections between two {@link Curve} objects as an
     * array of {@link CurveLocation} objects.
     *
     * @param {Curve} curve the other curve to find the intersections with
     *     (if the curve itself or `null` is passed, the self intersection
     *     of the curve is returned, if it exists)
     * @return {CurveLocation[]} the locations of all intersections between
     *     the curves
     */
    getIntersections(curve: Curve): CurveLocation[] {
        const v1 = this.getValues()
        const v2 = curve && curve !== this && curve.getValues()
        return v2
            ? Curve.getCurveIntersections(v1, v2, this, curve, [])
            : Curve.getSelfIntersection(v1, this, [])
    }
}
