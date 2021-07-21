import Point from '../basic/Point'
import Base from '../core/Base'
import { Numerical } from '../utils'
import Path from './Path'
import Segment from './Segment'

export default class PathFitter extends Base {
    closed: boolean
    points: Point[]

    constructor(path: Path)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(path: Path): this {
        const points: Point[] = (this.points = [])
        const segments = path.segments
        const closed = path.closed

        for (let i = 0, prev, l = segments.length; i < l; i++) {
            const point = segments[i].point
            if (!prev || !prev.equals(point)) {
                points.push((prev = point.clone()))
            }
        }

        if (closed) {
            points.unshift(points[points.length - 1])
            points.push(points[1])
        }
        this.closed = closed

        return this
    }

    fit(error?: number) {
        const points = this.points
        const length = points.length
        let segments = null
        if (length > 0) {
            segments = [new Segment(points[0])]
            if (length > 1) {
                this.fitCubic(
                    segments,
                    error,
                    0,
                    length - 1,
                    points[1].subtract(points[0]),
                    points[length - 2].subtract(points[length - 1])
                )
                if (this.closed) {
                    segments.shift()
                    segments.pop()
                }
            }
        }
        return segments
    }

    fitCubic(
        segments: Segment[],
        error: number,
        first: number,
        last: number,
        tan1: Point,
        tan2: Point
    ) {
        const points = this.points
        if (last - first === 1) {
            const pt1 = points[first]
            const pt2 = points[last]
            const dist = pt1.getDistance(pt2) / 3

            this.addCurve(segments, [
                pt1,
                pt1.add(tan1.normalize(dist)),
                pt2.add(tan2.normalize(dist)),
                pt2
            ])
            return
        }

        const uPrime = this.chordLengthParameterize(first, last)
        let maxError = Math.max(error, error * error)
        let split
        let parametersInOrder = true

        for (let i = 0; i <= 4; i++) {
            const curve = this.generateBezier(first, last, uPrime, tan1, tan2)
            const max = this.findMaxError(first, last, curve, uPrime)
            if (max.error < error && parametersInOrder) {
                this.addCurve(segments, curve)
                return
            }

            split = max.index

            if (max.error >= maxError) break
            parametersInOrder = this.reparameterize(first, last, uPrime, curve)
            maxError = max.error
        }

        const tanCenter = points[split - 1].subtract(points[split + 1])
        this.fitCubic(segments, error, first, split, tan1, tanCenter)
        this.fitCubic(segments, error, split, last, tanCenter.negate(), tan2)
    }

    addCurve(segments: Segment[], curve: Point[]) {
        const prev = segments[segments.length - 1]
        prev.setHandleOut(curve[1].subtract(curve[0]))
        segments.push(new Segment(curve[3], curve[2].subtract(curve[3])))
    }

    generateBezier(
        first: number,
        last: number,
        uPrime: number[],
        tan1: Point,
        tan2: Point
    ) {
        const epsilon = Numerical.EPSILON
        const abs = Math.abs
        const points = this.points
        const pt1 = points[first]
        const pt2 = points[last]
        const C = [
            [0, 0],
            [0, 0]
        ]
        const X = [0, 0]

        for (let i = 0, l = last - first + 1; i < l; i++) {
            const u = uPrime[i]
            const t = 1 - u
            const b = 3 * u * t
            const b0 = t * t * t
            const b1 = b * t
            const b2 = b * u
            const b3 = u * u * u
            const a1 = tan1.normalize(b1)
            const a2 = tan2.normalize(b2)
            const tmp = points[first + i]
                .subtract(pt1.multiply(b0 + b1))
                .subtract(pt2.multiply(b2 + b3))
            C[0][0] += a1.dot(a1)
            C[0][1] += a1.dot(a2)
            C[1][0] = C[0][1]
            C[1][1] += a2.dot(a2)
            X[0] += a1.dot(tmp)
            X[1] += a2.dot(tmp)
        }

        const detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1]
        let alpha1
        let alpha2

        if (abs(detC0C1) > epsilon) {
            const detC0X = C[0][0] * X[1] - C[1][0] * X[0]
            const detXC1 = X[0] * C[1][1] - X[1] * C[0][1]

            alpha1 = detXC1 / detC0C1
            alpha2 = detC0X / detC0C1
        } else {
            const c0 = C[0][0] + C[0][1]
            const c1 = C[1][0] + C[1][1]
            alpha1 = alpha2 =
                abs(c0) > epsilon
                    ? X[0] / c0
                    : abs(c1) > epsilon
                    ? X[1] / c1
                    : 0
        }

        const segLength = pt2.getDistance(pt1)
        const eps = epsilon * segLength
        let handle1
        let handle2
        if (alpha1 < eps || alpha2 < eps) {
            alpha1 = alpha2 = segLength / 3
        } else {
            const line = pt2.subtract(pt1)

            handle1 = tan1.normalize(alpha1)
            handle2 = tan2.normalize(alpha2)
            if (handle1.dot(line) - handle2.dot(line) > segLength * segLength) {
                alpha1 = alpha2 = segLength / 3
                handle1 = handle2 = null
            }
        }

        return [
            pt1,
            pt1.add(handle1 || tan1.normalize(alpha1)),
            pt2.add(handle2 || tan2.normalize(alpha2)),
            pt2
        ]
    }

    reparameterize(first: number, last: number, u: number[], curve: Point[]) {
        for (let i = first; i <= last; i++) {
            u[i - first] = this.findRoot(curve, this.points[i], u[i - first])
        }

        for (let i = 1, l = u.length; i < l; i++) {
            if (u[i] <= u[i - 1]) return false
        }
        return true
    }

    findRoot(curve: Point[], point: Point, u: number) {
        const curve1 = []
        const curve2 = []

        for (let i = 0; i <= 2; i++) {
            curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3)
        }

        for (let i = 0; i <= 1; i++) {
            curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2)
        }

        const pt = this.evaluate(3, curve, u)
        const pt1 = this.evaluate(2, curve1, u)
        const pt2 = this.evaluate(1, curve2, u)
        const diff = pt.subtract(point)
        const df = pt1.dot(pt1) + diff.dot(pt2)

        return Numerical.isMachineZero(df) ? u : u - diff.dot(pt1) / df
    }

    evaluate(degree: number, curve: Point[], t: number) {
        const tmp = curve.slice()
        for (let i = 1; i <= degree; i++) {
            for (let j = 0; j <= degree - i; j++) {
                tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t))
            }
        }
        return tmp[0]
    }

    chordLengthParameterize(first: number, last: number) {
        const u = [0]
        for (let i = first + 1; i <= last; i++) {
            u[i - first] =
                u[i - first - 1] +
                this.points[i].getDistance(this.points[i - 1])
        }
        for (let i = 1, m = last - first; i <= m; i++) {
            u[i] /= u[m]
        }
        return u
    }

    findMaxError(first: number, last: number, curve: Point[], u: number[]) {
        let index = Math.floor((last - first + 1) / 2)
        let maxDist = 0
        for (let i = first + 1; i < last; i++) {
            const P = this.evaluate(3, curve, u[i - first])
            const v = P.subtract(this.points[i])
            const dist = v.x * v.x + v.y * v.y
            if (dist >= maxDist) {
                maxDist = dist
                index = i
            }
        }
        return {
            error: maxDist,
            index: index
        }
    }
}
