import Base from '../core/Base'
import Point from './Point'
import Numerical from '../utils/Numerical'
import { Point as PointType } from './Types'
import { Exportable } from '../utils/Decorators'

@Exportable()
export default class Line extends Base {
    _class = 'Line'

    _px: number
    _py: number
    _vx: number
    _vy: number

    /**
     * Creates a Line object.
     *
     * @param {Point} point1
     * @param {Point} point2
     * @param {Boolean} [asVector=false]
     */
    constructor(point1: PointType, point2: PointType, asVector?: boolean)
    constructor(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        asVector?: boolean
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        let asVector = false
        if (args.length >= 4) {
            this._px = args[0]
            this._py = args[1]
            this._vx = args[2]
            this._vy = args[3]
            asVector = args[4]
        } else {
            this._px = args[0].x
            this._py = args[0].y
            this._vx = args[1].x
            this._vy = args[1].y
            asVector = args[2]
        }
        if (!asVector) {
            this._vx -= this._px
            this._vy -= this._py
        }
    }

    /**
     * The starting point of the line.
     *
     * @bean
     * @type Point
     */
    getPoint(): Point {
        return new Point(this._px, this._py)
    }

    /**
     * The direction of the line as a vector.
     *
     * @bean
     * @type Point
     */
    getVector(): Point {
        return new Point(this._vx, this._vy)
    }

    /**
     * The length of the line.
     *
     * @bean
     * @type Number
     */
    getLength() {
        return this.getVector().getLength()
    }

    /**
     * @param {Line} line
     * @param {Boolean} [isInfinite=false]
     * @return {Point} the intersection point of the lines, `undefined` if the
     *     two lines are collinear, or `null` if they don't intersect.
     */
    intersect(line: Line, isInfinite?: boolean): Point | null {
        return Line.intersect(
            this._px,
            this._py,
            this._vx,
            this._vy,
            line._px,
            line._py,
            line._vx,
            line._vy,
            true,
            isInfinite
        )
    }

    /**
     * @param {Point} point
     * @param {Boolean} [isInfinite=false]
     * @return {Number}
     */
    getSide(point: Point, isInfinite?: boolean): number {
        return Line.getSide(
            this._px,
            this._py,
            this._vx,
            this._vy,
            point.x,
            point.y,
            true,
            isInfinite
        )
    }

    /**
     * @param {Point} point
     * @return {Number}
     */
    getDistance(point: Point): number {
        return Math.abs(this.getSignedDistance(point))
    }

    /**
     * @param {Point} point
     * @return {Number}
     */
    getSignedDistance(point: Point): number {
        return Line.getSignedDistance(
            this._px,
            this._py,
            this._vx,
            this._vy,
            point.x,
            point.y,
            true
        )
    }

    isCollinear(line: Line): boolean {
        return Point.isCollinear(this._vx, this._vy, line._vx, line._vy)
    }

    isOrthogonal(line: Line): boolean {
        return Point.isOrthogonal(this._vx, this._vy, line._vx, line._vy)
    }

    static intersect(
        p1x: number,
        p1y: number,
        v1x: number,
        v1y: number,
        p2x: number,
        p2y: number,
        v2x: number,
        v2y: number,
        asVector?: boolean,
        isInfinite?: boolean
    ): Point | null {
        // Convert 2nd points to vectors if they are not specified as such.
        if (!asVector) {
            v1x -= p1x
            v1y -= p1y
            v2x -= p2x
            v2y -= p2y
        }
        const cross = v1x * v2y - v1y * v2x
        // Avoid divisions by 0, and errors when getting too close to 0
        if (!Numerical.isMachineZero(cross)) {
            const dx = p1x - p2x
            const dy = p1y - p2y
            let u1 = (v2x * dy - v2y * dx) / cross
            const u2 = (v1x * dy - v1y * dx) / cross

            const epsilon = Numerical.EPSILON
            const uMin = -epsilon
            const uMax = 1 + epsilon
            if (
                isInfinite ||
                (uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax)
            ) {
                if (!isInfinite) {
                    u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1
                }
                return new Point(p1x + u1 * v1x, p1y + u1 * v1y)
            }
        }

        return null
    }

    static getSide(
        px: number,
        py: number,
        vx: number,
        vy: number,
        x: number,
        y: number,
        asVector: boolean,
        isInfinite: boolean
    ): number {
        if (!asVector) {
            vx -= px
            vy -= py
        }
        const v2x = x - px
        const v2y = y - py
        let ccw = v2x * vy - v2y * vx
        if (!isInfinite && Numerical.isMachineZero(ccw)) {
            ccw = (v2x * vx + v2x * vx) / (vx * vx + vy * vy)
            if (ccw >= 0 && ccw <= 1) ccw = 0
        }
        return ccw < 0 ? -1 : ccw > 0 ? 1 : 0
    }

    static getSignedDistance(
        px: number,
        py: number,
        vx: number,
        vy: number,
        x: number,
        y: number,
        asVector?: boolean
    ) {
        if (!asVector) {
            vx -= px
            vy -= py
        }
        return vx === 0
            ? vy > 0
                ? x - px
                : px - x
            : vy === 0
            ? vx < 0
                ? y - py
                : py - y
            : ((x - px) * vy - (y - py) * vx) /
              (vy > vx
                  ? vy * Math.sqrt(1 + (vx * vx) / (vy * vy))
                  : vx * Math.sqrt(1 + (vy * vy) / (vx * vx)))
    }

    static getDistance(
        px: number,
        py: number,
        vx: number,
        vy: number,
        x: number,
        y: number,
        asVector: boolean
    ) {
        return Math.abs(Line.getSignedDistance(px, py, vx, vy, x, y, asVector))
    }
}
