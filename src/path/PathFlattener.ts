import Matrix from '../basic/Matrix'
import { Point } from '../basic/Types'
import Base from '../core/Base'
import Curve from './Curve'
import Path from './Path'
import Segment from './Segment'

type PathFlattenerParts = {
    offset: number
    curve: number[]
    index: number
    time: number
}

export default class PathFlattener extends Base {
    protected _class = 'PathFlattener'

    curves: number[][]
    parts: PathFlattenerParts[]
    length: number
    index: number

    /**
     * Creates a path flattener for the given path. The flattener converts
     * curves into a sequence of straight lines by the use of curve-subdivision
     * with an allowed maximum error to create a lookup table that maps curve-
     * time to path offsets, and can be used for efficient iteration over the
     * full length of the path, and getting points / tangents / normals and
     * curvature in path offset space.
     *
     * @param {Path} path the path to create the flattener for
     * @param {Number} [flatness=0.25] the maximum error allowed for the
     *     straight lines to deviate from the original curves
     * @param {Number} [maxRecursion=32] the maximum amount of recursion in
     *     curve subdivision when mapping offsets to curve parameters
     * @param {Boolean} [ignoreStraight=false] if only interested in the result
     *     of the sub-division (e.g. for path flattening), passing `true` will
     *     protect straight curves from being subdivided for curve-time
     *     translation
     * @param {Matrix} [matrix] the matrix by which to transform the path's
     *     coordinates without modifying the actual path.
     */
    constructor(
        path: Path,
        flatness?: number,
        maxRecursion?: number,
        ignoreStraight?: boolean,
        matrix?: Matrix
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(
        path: Path,
        flatness?: number,
        maxRecursion?: number,
        ignoreStraight?: boolean,
        matrix?: Matrix
    ): this {
        const curves: number[][] = []
        const parts: PathFlattenerParts[] = []
        let length = 0
        const minSpan = 1 / (maxRecursion || 32)
        const segments = path.segments
        let segment1 = segments[0]
        let segment2

        function addCurve(segment1: Segment, segment2: Segment) {
            const curve = Curve.getValues(segment1, segment2, matrix)
            curves.push(curve)
            computeParts(curve, segment1.index, 0, 1)
        }

        function computeParts(
            curve: number[],
            index: number,
            t1: number,
            t2: number
        ) {
            if (
                t2 - t1 > minSpan &&
                !(ignoreStraight && Curve.isStraight(curve)) &&
                !Curve.isFlatEnough(curve, flatness || 0.25)
            ) {
                const halves = Curve.subdivide(curve, 0.5)
                const tMid = (t1 + t2) / 2

                computeParts(halves[0], index, t1, tMid)
                computeParts(halves[1], index, tMid, t2)
            } else {
                const dx = curve[6] - curve[0]
                const dy = curve[7] - curve[1]
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist > 0) {
                    length += dist
                    parts.push({
                        offset: length,
                        curve: curve,
                        index: index,
                        time: t2
                    })
                }
            }
        }

        for (let i = 1, l = segments.length; i < l; i++) {
            segment2 = segments[i]
            addCurve(segment1, segment2)
            segment1 = segment2
        }
        if (path.closed) addCurve(segment2 || segment1, segments[0])
        this.curves = curves
        this.parts = parts
        this.length = length
        this.index = 0

        return this
    }

    protected _get(offset?: number) {
        const parts = this.parts
        const length = parts.length
        let i
        let j = this.index

        for (;;) {
            i = j
            if (!j || parts[--j].offset < offset) break
        }

        for (; i < length; i++) {
            const part = parts[i]
            if (part.offset >= offset) {
                this.index = i

                const prev = parts[i - 1]

                const prevTime =
                    prev && prev.index === part.index ? prev.time : 0
                const prevOffset = prev ? prev.offset : 0
                return {
                    index: part.index,
                    time:
                        prevTime +
                        ((part.time - prevTime) * (offset - prevOffset)) /
                            (part.offset - prevOffset)
                }
            }
        }
        return {
            index: parts[length - 1].index,
            time: 1
        }
    }

    drawPart(ctx: CanvasRenderingContext2D, from: number, to: number) {
        const start = this._get(from)
        const end = this._get(to)
        for (let i = start.index, l = end.index; i <= l; i++) {
            const curve = Curve.getPart(
                this.curves[i],
                i === start.index ? start.time : 0,
                i === end.index ? end.time : 1
            )
            if (i === start.index) ctx.moveTo(curve[0], curve[1])

            ctx.bezierCurveTo(
                curve[2],
                curve[3],
                curve[4],
                curve[5],
                curve[6],
                curve[7]
            )
        }
    }

    getPointAt(offset?: number): Point {
        const param = this._get(offset)
        return Curve.getPoint(this.curves[param.index], param.time)
    }

    getTangentAt(offset?: number): Point {
        const param = this._get(offset)
        return Curve.getTangent(this.curves[param.index], param.time)
    }

    getNormalAt(offset?: number): Point {
        const param = this._get(offset)
        return Curve.getNormal(this.curves[param.index], param.time)
    }

    getWeightedTangentAt(offset?: number): Point {
        const param = this._get(offset)
        return Curve.getWeightedTangent(this.curves[param.index], param.time)
    }

    getWeightedNormalAt(offset?: number): Point {
        const param = this._get(offset)
        return Curve.getWeightedNormal(this.curves[param.index], param.time)
    }

    getCurvatureAt(offset?: number): Point {
        const param = this._get(offset)
        return Curve.getCurvature(this.curves[param.index], param.time)
    }
}
