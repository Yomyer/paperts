import Point from '../basic/Point'
import Base from '../core/Base'
import { Numerical } from '../utils'
import Curve from './Curve'
import Segment from './Segment'
import Formatter from '../utils/Formatter'
import Path from './Path'

export default class CurveLocation extends Base {
    protected _class = 'CurveLocation'
    protected _time: number
    protected _point: Point
    protected _overlap: boolean
    protected _distance: number
    protected _intersection: CurveLocation
    protected _next: any
    protected _previous: any
    protected _path: Path
    protected _version: number
    protected _segment: Segment
    protected _segment1: Segment
    protected _segment2: Segment
    protected _curve: Curve
    protected _offset: number
    protected _curveOffset: number

    beans = true

    constructor(
        curve: Curve,
        time: number,
        point?: Point,
        _overlap?: boolean,
        _distance?: number
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(
        curve: Curve,
        time: number,
        point?: Point,
        _overlap?: boolean,
        _distance?: number
    ) {
        if (time >= 1 - Numerical.CURVETIME_EPSILON) {
            const next = curve.getNext()
            if (next) {
                time = 0
                curve = next
            }
        }
        this._setCurve(curve)
        this._time = time
        this._point = point || curve.getPointAtTime(time)
        this._overlap = _overlap
        this._distance = _distance
        this._intersection = this._next = this._previous = null
    }

    _setPath(path: Path) {
        this._path = path
        this._version = path ? path.version : 0
    }

    _setCurve(curve: Curve) {
        this._setPath(curve.path)
        this._curve = curve
        this._segment = null
        this._segment1 = curve.segment1
        this._segment2 = curve.segment2
    }

    _setSegment(segment: Segment) {
        const curve = segment.getCurve()
        if (curve) {
            this._setCurve(curve)
        } else {
            this._setPath(segment.path)
            this._segment1 = segment
            this._segment2 = null
        }
        this._segment = segment
        this._time = segment === this._segment1 ? 0 : 1
        this._point = segment.point.clone()
    }

    /**
     * The segment of the curve which is closer to the described location.
     *
     * @bean
     * @type Segment
     */
    getSegment(): Segment {
        let segment = this._segment
        if (!segment) {
            const curve = this.getCurve()
            const time = this.getTime()
            if (time === 0) {
                segment = curve.segment1
            } else if (time === 1) {
                segment = curve.segment2
            } else if (time != null) {
                segment =
                    curve.getPartLength(0, time) < curve.getPartLength(time, 1)
                        ? curve.segment1
                        : curve.segment2
            }
            this._segment = segment
        }
        return segment
    }

    get segment() {
        return this.getSegment()
    }

    /**
     * The curve that this location belongs to.
     *
     * @bean
     * @type Curve
     */
    getCurve(): Curve {
        const path = this._path
        const that = this
        if (path && path.version !== this._version) {
            this._time = this._offset = this._curveOffset = this._curve = null
        }

        function trySegment(segment: Segment) {
            const curve = segment && segment.getCurve()
            if (curve && (that._time = curve.getTimeOf(that._point)) != null) {
                that._setCurve(curve)
                return curve
            }

            return null
        }

        return (
            this._curve ||
            trySegment(this._segment) ||
            trySegment(this._segment1) ||
            trySegment(this._segment2.getPrevious())
        )
    }

    get curve() {
        return this.getCurve()
    }

    /**
     * The path that this locations is situated on.
     *
     * @bean
     * @type Path
     */
    getPath(): Path {
        const curve = this.getCurve()
        return curve && curve.path
    }

    get path() {
        return this.getPath()
    }

    get previous() {
        return this._previous
    }

    get next() {
        return this._next
    }

    /**
     * The index of the {@link #curve} within the {@link Path#curves} list, if
     * it is part of a {@link Path} item.
     *
     * @bean
     * @type Number
     */
    getIndex(): number {
        const curve = this.getCurve()
        return curve && curve.getIndex()
    }

    get index() {
        return this.getIndex()
    }

    /**
     * The curve-time parameter, as used by various bezier curve calculations.
     * It is value between `0` (beginning of the curve) and `1` (end of the
     * curve).
     *
     * @bean
     * @type Number
     */
    getTime(): number {
        const curve = this.getCurve()
        const time = this._time
        return curve && time == null
            ? (this._time = curve.getTimeOf(this._point))
            : time
    }

    get time() {
        return this.getTime()
    }

    set time(time: number) {
        this._time = time
    }

    /**
     * The point which is defined by the {@link #curve} and
     * {@link #time}.
     *
     * @bean
     * @type Point
     */
    getPoint(): Point {
        return this._point
    }

    get point() {
        return this.getPoint()
    }

    /**
     * The length of the path from its beginning up to the location described
     * by this object. If the curve is not part of a path, then the length
     * within the curve is returned instead.
     *
     * @bean
     * @type Number
     */
    getOffset(): number {
        let offset = this._offset
        if (offset == null) {
            offset = 0
            const path = this.getPath()
            const index = this.getIndex()
            if (path && index != null) {
                const curves = path.getCurves()
                for (let i = 0; i < index; i++) offset += curves[i].getLength()
            }
            this._offset = offset += this.getCurveOffset()
        }
        return offset
    }

    get offset() {
        return this.getOffset()
    }

    /**
     * The length of the curve from its beginning up to the location described
     * by this object.
     *
     * @bean
     * @type Number
     */
    getCurveOffset(): number {
        let offset = this._curveOffset
        if (offset == null) {
            const curve = this.getCurve()
            const time = this.getTime()
            this._curveOffset = offset =
                time != null && curve && curve.getPartLength(0, time)
        }
        return offset
    }

    get curveOffset() {
        return this.getCurveOffset()
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

    /// 'getPoint', 'getTangent', 'getNormal', 'getWeightedTangent',  'getWeightedNormal', 'getCurvature'

    /**
     * The tangential vector to the {@link #curve} at the given location.
     *
     * @name CurveLocation#getTangent
     * @bean
     * @type Point
     */
    getTangent() {
        const curve = this.getCurve()
        const time = this.getTime()
        return time != null && curve && curve.getTangentAt(time, true)
    }

    /**
     * The normal vector to the {@link #curve} at the given location.
     *
     * @name CurveLocation#getNormal
     * @bean
     * @type Point
     */
    getNormal() {
        const curve = this.getCurve()
        const time = this.getTime()
        return time != null && curve && curve.getNormalAt(time, true)
    }

    /**
     * The curvature of the {@link #curve} at the given location.
     *
     * @name CurveLocation#getCurvature
     * @bean
     * @type Number
     */
    getCurvature() {
        const curve = this.getCurve()
        const time = this.getTime()
        return time != null && curve && curve.getCurvatureAt(time, true)
    }

    getWeightedTangent() {
        const curve = this.getCurve()
        const time = this.getTime()
        return time != null && curve && curve.getWeightedTangentAt(time, true)
    }

    getWeightedNormal() {
        const curve = this.getCurve()
        const time = this.getTime()
        return time != null && curve && curve.getWeightedNormalAt(time, true)
    }

    getDistance(): number {
        return this._distance
    }

    get distance() {
        return this.getDistance()
    }

    divide() {
        const curve = this.getCurve()
        const res = curve && curve.divideAtTime(this.getTime())

        if (res) {
            this._setSegment(res.segment1)
        }
        return res
    }

    split() {
        const curve = this.getCurve()
        const path = curve.path
        const res = curve && curve.splitAtTime(this.getTime())
        if (res) {
            // Set the segment to the end-segment of the path after splitting.
            this._setSegment(path.getLastSegment())
        }
        return res
    }

    /**
     * Checks whether tow CurveLocation objects are describing the same location
     * on a path, by applying the same tolerances as elsewhere when dealing with
     * curve-time parameters.
     *
     * @param {CurveLocation} location
     * @return {Boolean} {@true if the locations are equal}
     */
    equals(loc: CurveLocation, _ignoreOther?: boolean): boolean {
        let res = this === loc
        if (!res && loc instanceof CurveLocation) {
            const c1 = this.getCurve()
            const c2 = loc.getCurve()
            const p1 = c1.path
            const p2 = c2.path
            if (p1 === p2) {
                const abs = Math.abs
                const epsilon = Numerical.GEOMETRIC_EPSILON
                const diff = abs(this.getOffset() - loc.getOffset())
                const i1 = !_ignoreOther && this._intersection
                const i2 = !_ignoreOther && loc._intersection
                res =
                    (diff < epsilon ||
                        (p1 && abs(p1.getLength() - diff) < epsilon)) &&
                    ((!i1 && !i2) || (i1 && i2 && i1.equals(i2, true)))
            }
        }
        return res
    }
    /**
     * @return {String} a string representation of the curve location
     */

    toString(): string {
        const parts = []
        const point = this.getPoint()

        if (point) parts.push('point: ' + point)
        const index = this.getIndex()
        if (index != null) parts.push('index: ' + index)
        const time = this.getTime()
        if (time != null) parts.push('time: ' + Formatter.number(time))
        if (this._distance != null)
            parts.push('distance: ' + Formatter.number(this._distance))
        return '{ ' + parts.join(', ') + ' }'
    }

    /**
     * {@grouptitle Tests}
     * Checks if the location is an intersection with another curve and is
     * merely touching the other curve, as opposed to crossing it.
     *
     * @return {Boolean} {@true if the location is an intersection that is
     * merely touching another curve}
     * @see #isCrossing()
     */
    isTouching(): boolean {
        const inter = this._intersection
        if (inter && this.getTangent().isCollinear(inter.getTangent())) {
            const curve1 = this.getCurve()
            const curve2 = inter.getCurve()
            return !(
                curve1.isStraight() &&
                curve2.isStraight() &&
                curve1.getLine().intersect(curve2.getLine())
            )
        }
        return false
    }

    /**
     * Checks if the location is an intersection with another curve and is
     * crossing the other curve, as opposed to just touching it.
     *
     * @return {Boolean} {@true if the location is an intersection that is
     * crossing another curve}
     * @see #isTouching()
     */
    isCrossing(): boolean {
        const inter = this._intersection
        if (!inter) return false
        const t1 = this.getTime()
        const t2 = inter.getTime()
        const tMin = Numerical.CURVETIME_EPSILON
        const tMax = 1 - tMin
        const t1Inside = t1 >= tMin && t1 <= tMax
        const t2Inside = t2 >= tMin && t2 <= tMax

        if (t1Inside && t2Inside) return !this.isTouching()

        let c2 = this.getCurve()
        const c1 = c2 && t1 < tMin ? c2.getPrevious() : c2
        let c4 = inter.getCurve()
        const c3 = c4 && t2 < tMin ? c4.getPrevious() : c4
        // If t1 / t2 are at the end, then step to the next curve.
        if (t1 > tMax) c2 = c2.getNext()
        if (t2 > tMax) c4 = c4.getNext()
        if (!c1 || !c2 || !c3 || !c4) return false

        const offsets: number[] = []

        function addOffsets(curve: Curve, end: boolean) {
            // Find the largest offset of unambiguous direction on the curve,
            // taking their loops, cusps, inflections, and "peaks" into account.
            const v = curve.getValues()
            const roots = Curve.classify(v).roots || Curve.getPeaks(v)
            const count = roots.length
            const offset = Curve.getLength(
                v,
                end && count ? roots[count - 1] : 0,
                !end && count ? roots[0] : 1
            )

            offsets.push(count ? offset : offset / 32)
        }

        function isInRange(angle: number, min: number, max: number) {
            return min < max
                ? angle > min && angle < max
                : angle > min || angle < max
        }

        if (!t1Inside) {
            addOffsets(c1, true)
            addOffsets(c2, false)
        }
        if (!t2Inside) {
            addOffsets(c3, true)
            addOffsets(c4, false)
        }
        const pt = this.getPoint()
        // Determined the shared unambiguous offset by the taking the
        // shortest offsets on all involved curves that are unambiguous.
        const offset = Math.min(...offsets)
        const v2 = t1Inside
            ? c2.getTangentAtTime(t1)
            : c2.getPointAt(offset).subtract(pt)
        const v1 = t1Inside ? v2.negate() : c1.getPointAt(-offset).subtract(pt)
        const v4 = t2Inside
            ? c4.getTangentAtTime(t2)
            : c4.getPointAt(offset).subtract(pt)
        const v3 = t2Inside ? v4.negate() : c3.getPointAt(-offset).subtract(pt)
        const a1 = v1.getAngle()
        const a2 = v2.getAngle()
        const a3 = v3.getAngle()
        const a4 = v4.getAngle()

        return !!(t1Inside
            ? +isInRange(a1, a3, a4) ^ +isInRange(a2, a3, a4) &&
              +isInRange(a1, a4, a3) ^ +isInRange(a2, a4, a3)
            : +isInRange(a3, a1, a2) ^ +isInRange(a4, a1, a2) &&
              +isInRange(a3, a2, a1) ^ +isInRange(a4, a2, a1))
    }

    /**
     * Checks if the location is an intersection with another curve and is
     * part of an overlap between the two involved paths.
     *
     * @return {Boolean} {@true if the location is an intersection that is
     * part of an overlap between the two involved paths}
     * @see #isCrossing()
     * @see #isTouching()
     */
    hasOverlap(): boolean {
        return !!this._overlap
    }

    get overlap() {
        return this._overlap
    }

    set overlap(overlap: boolean) {
        this._overlap = overlap
    }

    static insert(
        locations: CurveLocation[],
        loc: CurveLocation,
        merge?: boolean
    ): CurveLocation {
        const length = locations.length
        let l = 0
        let r = length - 1

        function search(index: number, dir: number) {
            for (let i = index + dir; i >= -1 && i <= length; i += dir) {
                const loc2 = locations[((i % length) + length) % length]

                if (
                    !loc
                        .getPoint()
                        .isClose(loc2.getPoint(), Numerical.GEOMETRIC_EPSILON)
                )
                    break
                if (loc.equals(loc2)) return loc2
            }
            return null
        }

        while (l <= r) {
            const m = (l + r) >>> 1
            const loc2 = locations[m]
            let found

            if (
                merge &&
                (found = loc.equals(loc2)
                    ? loc2
                    : search(m, -1) || search(m, 1))
            ) {
                if (loc._overlap) {
                    found._overlap = found._intersection._overlap = true
                }
                return found
            }
            const path1 = loc.getPath()
            const path2 = loc2.getPath()
            const diff =
                path1 !== path2
                    ? +path1.id - +path2.id
                    : loc.getIndex() +
                      loc.getTime() -
                      (loc2.getIndex() + loc2.getTime())
            if (diff < 0) {
                r = m - 1
            } else {
                l = m + 1
            }
        }

        locations.splice(l, 0, loc)
        return loc
    }

    static expand(locations: CurveLocation[]) {
        const expanded = locations.slice()
        for (let i = locations.length - 1; i >= 0; i--) {
            CurveLocation.insert(expanded, locations[i]._intersection, false)
        }
        return expanded
    }
}
