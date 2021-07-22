import {
    Base,
    Dictionary,
    Point,
    Matrix,
    Change,
    ExportJsonOptions,
    SegmentPoint,
    SegmentSelection,
    CurveLocation,
    BooleanWinding,
    Path
} from '@paperts'

import { Point as PointType } from '../basic/Types'

export type SegmentSmoothOptions = {
    type: 'catmull-rom' | 'geometric'
    factor: number
}

export class Segment extends Base {
    protected _class = 'Segment'
    protected _selection = false
    protected _point: SegmentPoint
    protected _handleIn: SegmentPoint
    protected _handleOut: SegmentPoint
    protected _path: Path

    protected _visited: boolean
    protected _winding: BooleanWinding
    protected _intersection: CurveLocation

    beans = true

    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
     * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
     *     anchor point of the segment that describes the in tangent of the
     *     segment
     * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
     *     anchor point of the segment that describes the out tangent of the
     *     segment
     *
     * @example {@paperscript}
     * var handleIn = new Point(-80, -100);
     * var handleOut = new Point(80, 100);
     *
     * var firstPoint = new Point(100, 50);
     * var firstSegment = new Segment(firstPoint, null, handleOut);
     *
     * var secondPoint = new Point(300, 50);
     * var secondSegment = new Segment(secondPoint, handleIn, null);
     *
     * var path = new Path(firstSegment, secondSegment);
     * path.strokeColor = 'black';
     */
    constructor(point?: PointType, handleIn?: PointType, handleOut?: PointType)

    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Object} object an object containing properties to be set on the
     *     segment
     *
     * @example {@paperscript}
     * // Creating segments using object notation:
     * var firstSegment = new Segment({
     *     point: [100, 50],
     *     handleOut: [80, 100]
     * });
     *
     * var secondSegment = new Segment({
     *     point: [300, 50],
     *     handleIn: [-80, -100]
     * });
     *
     * var path = new Path({
     *     segments: [firstSegment, secondSegment],
     *     strokeColor: 'black'
     * });
     */
    constructor(object?: object)

    /**
     * Creates a new Segment object.
     *
     * @param {Number} x the x coordinate of the segment point
     * @param {Number} y the y coordinate of the segment point
     * @param {Number} inX the x coordinate of the the handle point relative to
     * the anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Number} inY the y coordinate of the the handle point relative to
     * the anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Number} outX the x coordinate of the the handle point relative to
     * the anchor point of the segment that describes the out tangent of the
     * segment
     * @param {Number} outY the y coordinate of the the handle point relative to
     * the anchor point of the segment that describes the out tangent of the
     * segment
     *
     * @example {@paperscript}
     * var inX = -80;
     * var inY = -100;
     * var outX = 80;
     * var outY = 100;
     *
     * var x = 100;
     * var y = 50;
     * var firstSegment = new Segment(x, y, inX, inY, outX, outY);
     *
     * var x2 = 300;
     * var y2 = 50;
     * var secondSegment = new Segment( x2, y2, inX, inY, outX, outY);
     *
     * var path = new Path(firstSegment, secondSegment);
     * path.strokeColor = 'black';
     * @ignore
     */
    constructor(
        x: number,
        y: number,
        inX: number,
        inY: number,
        outX: number,
        outY: number
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        const count = args.length
        let point
        let handleIn
        let handleOut
        let selection

        if (count > 0) {
            if (args[0] == null || typeof args[0] === 'object') {
                if (count === 1 && args[0] && 'point' in args[0]) {
                    point = args[0].point
                    handleIn = args[0].handleIn
                    handleOut = args[0].handleOut
                    selection = args[0].selection
                } else {
                    point = args[0]
                    handleIn = args[1]
                    handleOut = args[2]
                    selection = args[3]
                }
            } else {
                point = [args[0], args[1]]
                handleIn = args[2] !== undefined ? [args[2], args[3]] : null
                handleOut = args[4] !== undefined ? [args[4], args[5]] : null
            }
        }
        new SegmentPoint(point, this, '_point')
        new SegmentPoint(handleIn, this, '_handleIn')
        new SegmentPoint(handleOut, this, '_handleOut')
        if (selection) this.setSelection(selection)
    }

    protected _serialize(options?: ExportJsonOptions, dictionary?: Dictionary) {
        const point = this._point
        const selection = this._selection
        const obj = (
            selection || this.hasHandles()
                ? [point, this._handleIn, this._handleOut]
                : point
        ) as (SegmentPoint | boolean)[]

        if (selection) obj.push(selection)
        return Base.serialize(obj, options, true, dictionary)
    }

    protected _changed(point?: SegmentPoint): any {
        const path = this._path
        if (!path) return

        const curves = path.curves
        const index = this._index
        let curve
        if (curves) {
            if (
                (!point || point === this._point || point === this._handleIn) &&
                (curve =
                    index > 0
                        ? curves[index - 1]
                        : path.closed
                        ? curves[curves.length - 1]
                        : null)
            )
                curve.changed()

            if (
                (!point ||
                    point === this._point ||
                    point === this._handleOut) &&
                (curve = curves[index])
            )
                curve.changed()
        }
        path.changed(Change.SEGMENTS)
    }

    get visited() {
        return this._visited
    }

    set visited(visited: boolean) {
        this._visited = visited
    }

    get winding() {
        return this._winding
    }

    set winding(winding: BooleanWinding) {
        this._winding = winding
    }

    /**
     * The curve location on the intersecting curve, if this location is the
     * result of a call to {@link PathItem#getIntersections(path)} /
     * {@link Curve#getIntersections(curve)}.
     *
     * @bean
     * @type CurveLocation
     */
    getIntersection(): CurveLocation {
        return this._intersection
    }

    setIntersection(intersection: CurveLocation) {
        this._intersection = intersection
    }

    get intersection(): CurveLocation {
        return this.getIntersection()
    }

    set intersection(intersection: CurveLocation) {
        this.setIntersection(intersection)
    }

    /**
     * The anchor point of the segment.
     *
     * @bean
     * @type Point
     */
    getPoint(): SegmentPoint {
        return this._point
    }

    setPoint(x: number, y: number): void
    setPoint(point: PointType): void
    setPoint(...args: any[]): void {
        this._point.set(Point.read(args))
    }

    get point(): SegmentPoint {
        return this.getPoint()
    }

    set point(point: PointType) {
        this.setPoint(point)
    }

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the in tangent of the segment.
     *
     * @bean
     * @type Point
     */
    getHandleIn() {
        return this._handleIn
    }

    setHandleIn(x: number, y: number): void
    setHandleIn(point: PointType): void
    setHandleIn(...args: any[]): void {
        this._handleIn.set(Point.read(args))
    }

    get handleIn(): SegmentPoint {
        return this.getHandleIn()
    }

    set handleIn(point: PointType) {
        this.setHandleIn(point)
    }

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the out tangent of the segment.
     *
     * @bean
     * @type Point
     */
    getHandleOut() {
        return this._handleOut
    }

    setHandleOut(x: number, y: number): void
    setHandleOut(point: PointType): void
    setHandleOut(...args: any[]): void {
        this._handleOut.set(Point.read(args))
    }

    get handleOut(): SegmentPoint {
        return this.getHandleOut()
    }

    set handleOut(point: PointType) {
        this.setHandleOut(point)
    }

    /**
     * Checks if the segment has any curve handles set.
     *
     * @return {Boolean} {@true if the segment has handles set}
     * @see Segment#handleIn
     * @see Segment#handleOut
     * @see Curve#hasHandles()
     * @see Path#hasHandles()
     */
    hasHandles(): boolean {
        return !this._handleIn.isZero() || !this._handleOut.isZero()
    }

    /**
     * Checks if the segment connects two curves smoothly, meaning that its two
     * handles are collinear and segment does not form a corner.
     *
     * @return {Boolean} {@true if the segment is smooth}
     * @see Point#isCollinear()
     */
    isSmooth(): boolean {
        const handleIn = this._handleIn
        const handleOut = this._handleOut
        return (
            !handleIn.isZero() &&
            !handleOut.isZero() &&
            handleIn.isCollinear(handleOut)
        )
    }

    /**
     * Clears the segment's handles by setting their coordinates to zero,
     * turning the segment into a corner.
     */
    clearHandles() {
        this._handleIn._set(0, 0)
        this._handleOut._set(0, 0)
    }

    getSelection() {
        return this._selection
    }

    setSelection(selection: boolean) {
        const oldSelection = this._selection
        const path = this._path

        this._selection = selection = selection || false

        if (path && selection !== oldSelection) {
            path._updateSelection(this, oldSelection, selection)
            path.changed(Change.ATTRIBUTE)
        }
    }

    get selection() {
        return this.getSelection()
    }

    set selection(selection: boolean) {
        this.setSelection(selection)
    }

    _changeSelection(flag: SegmentSelection, selected: boolean) {
        const selection = this._selection
        this.setSelection(!!(selected ? +selection | flag : +selection & ~flag))
    }

    /**
     * Specifies whether the segment is selected.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40
     * });
     *
     * // Select the third segment point:
     * path.segments[2].selected = true;
     */
    isSelected() {
        return !!(+this._selection & SegmentSelection.ALL)
    }

    setSelected(selected: boolean) {
        this._changeSelection(SegmentSelection.ALL, selected)
    }

    /**
     * {@grouptitle Hierarchy}
     *
     * The index of the segment in the {@link Path#segments} array that the
     * segment belongs to.
     *
     * @bean
     * @type Number
     */
    getIndex() {
        return this._index !== undefined ? this._index : null
    }

    get index() {
        return this.getIndex()
    }

    set index(index: number) {
        this._index = index
    }

    /**
     * The path that the segment belongs to.
     *
     * @bean
     * @type Path
     */
    getPath() {
        return this._path || null
    }

    get path() {
        return this.getPath()
    }

    set path(path: Path) {
        this._path = path
    }

    /**
     * The curve that the segment belongs to. For the last segment of an open
     * path, the previous segment is returned.
     *
     * @bean
     * @type Curve
     */
    getCurve() {
        const path = this._path
        let index = this._index
        if (path) {
            // The last segment of an open path belongs to the last curve.
            if (index > 0 && !path.closed && index === path.segments.length - 1)
                index--
            return path.getCurves()[index] || null
        }
        return null
    }

    get curve() {
        return this.getCurve()
    }

    /**
     * The curve location that describes this segment's position on the path.
     *
     * @bean
     * @type CurveLocation
     */
    getLocation() {
        const curve = this.getCurve()
        return curve
            ? new CurveLocation(curve, this === curve.segment1 ? 0 : 1)
            : null
    }

    get location() {
        return this.getLocation()
    }

    /**
     * {@grouptitle Sibling Segments}
     *
     * The next segment in the {@link Path#segments} array that the segment
     * belongs to. If the segments belongs to a closed path, the first segment
     * is returned for the last segment of the path.
     *
     * @bean
     * @type Segment
     */
    getNext(): Segment {
        const segments = this._path && this._path.segments
        return (
            (segments &&
                (segments[this._index + 1] ||
                    (this._path.closed && segments[0]))) ||
            null
        )
    }

    /**
     * Smooths the bezier curves that pass through this segment by taking into
     * account the segment's position and distance to the neighboring segments
     * and changing the direction and length of the segment's handles
     * accordingly without moving the segment itself.
     *
     * Two different smoothing methods are available:
     *
     * - `'catmull-rom'` uses the Catmull-Rom spline to smooth the segment.
     *
     *     The optionally passed factor controls the knot parametrization of the
     *     algorithm:
     *
     *     - `0.0`: the standard, uniform Catmull-Rom spline
     *     - `0.5`: the centripetal Catmull-Rom spline, guaranteeing no
     *         self-intersections
     *     - `1.0`: the chordal Catmull-Rom spline
     *
     * - `'geometric'` use a simple heuristic and empiric geometric method to
     *     smooth the segment's handles. The handles were weighted, meaning that
     *     big differences in distances between the segments will lead to
     *     probably undesired results.
     *
     *     The optionally passed factor defines the tension parameter (`0...1`),
     *     controlling the amount of smoothing as a factor by which to scale
     *     each handle.
     *
     * @option [options.type='catmull-rom'] {String} the type of smoothing
     *     method: {@values 'catmull-rom', 'geometric'}
     * @option options.factor {Number} the factor parameterizing the smoothing
     *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
     *
     * @param {Object} [options] the smoothing options
     *
     * @see PathItem#smooth([options])
     */
    smooth(
        options: SegmentSmoothOptions,
        _first?: boolean,
        _last?: boolean
    ): any {
        const opts = (options || {}) as SegmentSmoothOptions
        const type = opts.type
        const factor = opts.factor
        const prev = this.getPrevious()
        const next = this.getNext()

        const p0 = (prev || this)._point
        const p1 = this._point
        const p2 = (next || this)._point
        const d1 = p0.getDistance(p1)
        const d2 = p1.getDistance(p2)
        if (!type || type === 'catmull-rom') {
            const a = factor === undefined ? 0.5 : factor
            const d1a = Math.pow(d1, a)
            const d12a = d1a * d1a
            const d2a = Math.pow(d2, a)
            const d22a = d2a * d2a
            if (!_first && prev) {
                const A = 2 * d22a + 3 * d2a * d1a + d12a
                const N = 3 * d2a * (d2a + d1a)
                this.setHandleIn(
                    N !== 0
                        ? new Point(
                              (d22a * p0.x + A * p1.x - d12a * p2.x) / N - p1.x,
                              (d22a * p0.y + A * p1.y - d12a * p2.y) / N - p1.y
                          )
                        : new Point()
                )
            }
            if (!_last && next) {
                const A = 2 * d12a + 3 * d1a * d2a + d22a
                const N = 3 * d1a * (d1a + d2a)
                this.setHandleOut(
                    N !== 0
                        ? new Point(
                              (d12a * p2.x + A * p1.x - d22a * p0.x) / N - p1.x,
                              (d12a * p2.y + A * p1.y - d22a * p0.y) / N - p1.y
                          )
                        : new Point()
                )
            }
        } else if (type === 'geometric') {
            if (prev && next) {
                const vector = p0.subtract(p2)
                const t = factor === undefined ? 0.4 : factor
                const k = (t * d1) / (d1 + d2)
                if (!_first) this.setHandleIn(vector.multiply(k))
                if (!_last) this.setHandleOut(vector.multiply(k - t))
            }
        } else {
            throw new Error("Smoothing method '" + type + "' not supported.")
        }
    }

    /**
     * The previous segment in the {@link Path#segments} array that the
     * segment belongs to. If the segments belongs to a closed path, the last
     * segment is returned for the first segment of the path.
     *
     * @bean
     * @type Segment
     */
    getPrevious(): Segment {
        const segments = this._path && this._path.segments

        return (
            (segments &&
                (segments[this._index - 1] ||
                    (this._path.closed && segments[segments.length - 1]))) ||
            null
        )
    }

    /**
     * Checks if the this is the first segment in the {@link Path#segments}
     * array.
     *
     * @return {Boolean} {@true if this is the first segment}
     */
    isFirst(): boolean {
        return !this._index
    }

    /**
     * Checks if the this is the last segment in the {@link Path#segments}
     * array.
     *
     * @return {Boolean} {@true if this is the last segment}
     */
    isLast(): boolean {
        const path = this._path
        return (path && this._index === path.segments.length - 1) || false
    }

    /**
     * Reverses the {@link #handleIn} and {@link #handleOut} vectors of this
     * segment, modifying the actual segment without creating a copy.
     *
     * @return {Segment} the reversed segment
     */
    reverse(): void {
        const handleIn = this._handleIn
        const handleOut = this._handleOut
        const tmp = handleIn.clone()
        handleIn.set(handleOut)
        handleOut.set(tmp)
    }

    /**
     * Returns the reversed the segment, without modifying the segment itself.
     * @return {Segment} the reversed segment
     */
    reversed(): Segment {
        return new Segment(this._point, this._handleOut, this._handleIn)
    }

    /**
     * Removes the segment from the path that it belongs to.
     * @return {Boolean} {@true if the segment was removed}
     */
    remove(): boolean {
        return this._path ? !!this._path.removeSegment(this._index) : false
    }

    /**
     * @return {Segment}
     */
    clone(): this {
        return new Segment(this._point, this._handleIn, this._handleOut) as this
    }

    equals(segment: Segment) {
        return (
            segment === this ||
            (segment &&
                this._class === segment._class &&
                this._point.equals(segment._point) &&
                this._handleIn.equals(segment._handleIn) &&
                this._handleOut.equals(segment._handleOut)) ||
            false
        )
    }

    /**
     * @return {String} a string representation of the segment
     */
    toString(): string {
        const parts = ['point: ' + this._point]
        if (!this._handleIn.isZero()) parts.push('handleIn: ' + this._handleIn)
        if (!this._handleOut.isZero())
            parts.push('handleOut: ' + this._handleOut)
        return '{ ' + parts.join(', ') + ' }'
    }

    /**
     * Transform the segment by the specified matrix.
     *
     * @param {Matrix} matrix the matrix to transform the segment by
     */
    transform(matrix: Matrix) {
        this._transformCoordinates(matrix, new Array(6), true)
        this._changed()
    }

    /**
     * Interpolates between the two specified segments and sets the point and
     * handles of this segment accordingly.
     *
     * @param {Segment} from the segment defining the geometry when `factor` is
     *     `0`
     * @param {Segment} to the segment defining the geometry when `factor` is
     *     `1`
     * @param {Number} factor the interpolation coefficient, typically between
     *     `0` and `1`, but extrapolation is possible too
     */
    interpolate(from: Segment, to: Segment, factor: number) {
        const u = 1 - factor
        const v = factor
        const point1 = from._point
        const point2 = to._point
        const handleIn1 = from._handleIn
        const handleIn2 = to._handleIn
        const handleOut2 = to._handleOut
        const handleOut1 = from._handleOut
        this._point._set(
            u * point1.x + v * point2.x,
            u * point1.y + v * point2.y,
            true
        )
        this._handleIn._set(
            u * handleIn1.x + v * handleIn2.x,
            u * handleIn1.y + v * handleIn2.y,
            true
        )
        this._handleOut._set(
            u * handleOut1.x + v * handleOut2.x,
            u * handleOut1.y + v * handleOut2.y,
            true
        )
        this._changed()
    }

    _transformCoordinates(matrix: Matrix, coords: number[], change?: boolean) {
        const point = this._point
        const handleIn =
            !change || !this._handleIn.isZero() ? this._handleIn : null
        const handleOut =
            !change || !this._handleOut.isZero() ? this._handleOut : null
        let x = point.x
        let y = point.y

        let i = 2
        coords[0] = x
        coords[1] = y

        if (handleIn) {
            coords[i++] = handleIn.x + x
            coords[i++] = handleIn.y + y
        }
        if (handleOut) {
            coords[i++] = handleOut.x + x
            coords[i++] = handleOut.y + y
        }

        if (matrix) {
            matrix.transformCoordinates(coords, coords, i / 2)

            x = coords[0]
            y = coords[1]
            if (change) {
                point.x = x
                point.y = y
                i = 2
                if (handleIn) {
                    handleIn.x = coords[i++] - x
                    handleIn.y = coords[i++] - y
                }
                if (handleOut) {
                    handleOut.x = coords[i++] - x
                    handleOut.y = coords[i++] - y
                }
            } else {
                if (!handleIn) {
                    coords[i++] = x
                    coords[i++] = y
                }
                if (!handleOut) {
                    coords[i++] = x
                    coords[i++] = y
                }
            }
        }
        return coords
    }
}
