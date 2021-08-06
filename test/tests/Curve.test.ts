import { Curve, Path, Point } from '../../src'

function testClassify(
    curve: Curve,
    expeced: { type: string; roots: number[] }
) {
    const info = curve.classify()
    if (expeced.type) {
        expect(info.type).toStrictEqual(expeced.type)
    }
    if (expeced.roots !== undefined) {
        expect(info.roots).toStrictEqual(expeced.roots)
    }
}

test('classify()', () => {
    const point = new Curve([100, 100], null, null, [100, 100])
    const line = new Curve([100, 100], null, null, [200, 200])
    const cusp = new Curve([100, 200], [100, -100], [-100, -100], [200, 200])
    const loop = new Curve([100, 200], [150, -100], [-150, -100], [200, 200])
    const single = new Curve([100, 100], [50, 0], [-27, -46], [200, 200])
    const double = new Curve([100, 200], [100, -100], [-40, -80], [200, 200])
    const arch = new Curve([100, 100], [50, 0], [0, -50], [200, 200])

    testClassify(point, { type: 'line', roots: null })
    testClassify(line, { type: 'line', roots: null })
    testClassify(cusp, { type: 'cusp', roots: [0.5] })
    testClassify(loop, {
        type: 'loop',
        roots: [0.17267316464601132, 0.8273268353539888]
    })
    testClassify(single, { type: 'serpentine', roots: [0.870967741935484] })
    testClassify(double, {
        type: 'serpentine',
        roots: [0.15047207654837885, 0.7384168123405099]
    })
    testClassify(arch, { type: 'arch', roots: null })
})

test('Curve#getPointAtTime()', () => {
    let curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve

    const points: [number, Point][] = [
        [0, new Point(0, 100)],
        [0.25, new Point(7.858495705504465, 61.07548711651339)],
        [0.5, new Point(29.28932188134524, 29.289321881345245)],
        [0.75, new Point(61.0754871165134, 7.858495705504467)],
        [1, new Point(100, 0)]
    ]

    for (let i = 0; i < points.length; i++) {
        const entry = points[i]
        expect(curve.getPointAtTime(entry[0])).toStrictEqual(entry[1])

        expect(curve.getPointAt(entry[0], true)).toStrictEqual(entry[1])
    }

    expect(curve.getPointAt(curve.length + 1)).toStrictEqual(null)

    curve = new Curve({
        segment1: [178.58559999999994, 333.41440000000006],
        segment2: [178.58559999999994, 178.58560000000008]
    })

    expect(curve.getPointAtTime(0).y).toStrictEqual(curve.point1.y)

    expect(curve.getPointAtTime(1).y).toStrictEqual(curve.point2.y)
})

test('Curve#getTangentAtTime()', function () {
    const curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve

    const tangents: [number, Point][] = [
        [0, new Point(0, -165.68542494923807)],
        [0.25, new Point(60.7233, -143.56602)],
        [0.5, new Point(108.57864, -108.57864)],
        [0.75, new Point(143.56602, -60.7233)],
        [1, new Point(165.68542, 0)]
    ]

    for (let i = 0; i < tangents.length; i++) {
        const entry = tangents[i]

        expect(curve.getTangentAtTime(entry[0]).toString()).toStrictEqual(
            entry[1].normalize().toString()
        )

        expect(
            curve.getWeightedTangentAtTime(entry[0]).toString()
        ).toStrictEqual(entry[1].toString())

        expect(curve.getTangentAt(entry[0], true).toString()).toStrictEqual(
            entry[1].normalize().toString()
        )

        expect(
            curve.getWeightedTangentAt(entry[0], true).toString()
        ).toStrictEqual(entry[1].toString())
    }
})

test('Curve#getNormalAtTime()', function () {
    const curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve

    const normals: [number, Point][] = [
        [0, new Point(-165.68542, 0)],
        [0.25, new Point(-143.56602, -60.7233)],
        [0.5, new Point(-108.57864, -108.57864)],
        [0.75, new Point(-60.7233, -143.56602)],
        [1, new Point(0, -165.68542)]
    ]

    for (let i = 0; i < normals.length; i++) {
        const entry = normals[i]

        expect(curve.getNormalAtTime(entry[0]).toString()).toStrictEqual(
            entry[1].normalize().toString()
        )

        expect(
            curve.getWeightedNormalAtTime(entry[0]).toString()
        ).toStrictEqual(entry[1].toString())

        expect(curve.getNormalAt(entry[0], true).toString()).toStrictEqual(
            entry[1].normalize().toString()
        )

        expect(
            curve.getWeightedNormalAt(entry[0], true).toString()
        ).toStrictEqual(entry[1].toString())
    }
})

test('Curve#getCurvatureAtTime()', function () {
    const curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve

    const curvatures = [
        [0, 0.009785533905932729],
        [0.25, 0.010062133221584524],
        [0.5, 0.009937576453041297],
        [0.75, 0.010062133221584524],
        [1, 0.009785533905932729]
    ]

    for (let i = 0; i < curvatures.length; i++) {
        const entry = curvatures[i]

        expect(curve.getCurvatureAtTime(entry[0])).toStrictEqual(entry[1])

        expect(curve.getCurvatureAt(entry[0], true)).toStrictEqual(entry[1])
    }
})

test('Curve#getCurvatureAtTime()', function () {
    const curve = new Path.Line({
        from: [100, 100],
        to: [200, 200]
    }).firstCurve

    const curvatures = [
        [0, 0],
        [0.25, 0],
        [0.5, 0],
        [0.75, 0],
        [1, 0]
    ]

    for (let i = 0; i < curvatures.length; i++) {
        const entry = curvatures[i]

        expect(curve.getCurvatureAtTime(entry[0])).toStrictEqual(entry[1])
        expect(curve.getCurvatureAt(entry[0], true)).toStrictEqual(entry[1])
    }
})

test('Curve#getTimeAt()', function () {
    const curve = new Path([
        [
            [0, 0],
            [0, 0],
            [100, 0]
        ],
        [[200, 200]]
    ]).firstCurve

    for (let f = 0; f <= 1; f += 0.1) {
        const o1 = curve.length * f
        const o2 = -curve.length * (1 - f)
        const t1 = curve.getTimeAt(o1)
        const t2 = curve.getTimeAt(o2)

        expect(t1).toBeCloseTo(t2) //  message, Numerical.CURVETIME_EPSILON)

        expect(curve.getOffsetAtTime(t1)).toBeCloseTo(o1)

        expect(curve.getOffsetAtTime(t2)).toBeCloseTo(curve.length + o2)

        expect(curve.getTimeAt(o1)).toBeCloseTo(curve.getTimeAt(o2))

        expect(curve.getTangentAt(o1).toString()).toStrictEqual(
            curve.getTangentAt(o2).toString()
        )
    }

    expect(curve.getTimeAt(curve.length + 1)).toStrictEqual(null)
})

test('Curve#getTimeAt() with straight curve', function () {
    const path = new Path()
    path.moveTo(100, 100)
    path.lineTo(500, 500)
    const curve = path.firstCurve
    const length = curve.length
    const t = curve.getTimeAt(length / 3)

    expect(t).toBeCloseTo(0.3869631475722452)
})

test('Curve#getTimeAt() with straight curve', function () {
    const curve = new Curve([
        1584.4999999999998, 1053.2499999999995, 1584.4999999999998,
        1053.2499999999995, 1520.5, 1053.2499999999995, 1520.5,
        1053.2499999999995
    ])
    const offset = 63.999999999999716

    expect(offset < curve.length).toStrictEqual(true)
    expect(curve.getTimeAt(offset)).toStrictEqual(1)
})

test('Curve#getTimeAt() with offset at end of curve', function () {
    // #1149:
    const curve = [
        -7500, 0, -7500, 4142.135623730952, -4142.135623730952, 7500, 0, 7500
    ]
    expect(Curve.getTimeAt(curve, 11782.625235553916)).toStrictEqual(1)
})

test('Curve#getLocationAt()', function () {
    const curve = new Path([
        [
            [0, 0],
            [0, 0],
            [100, 0]
        ],
        [[200, 200]]
    ]).firstCurve

    expect(curve.getLocationAt(curve.length + 1)).toStrictEqual(null)
})

test('Curve#isStraight()', function () {
    expect(
        new Curve([100, 100], null, null, [200, 200]).isStraight()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], [-50, -50], null, [200, 200]).isStraight()
    ).toStrictEqual(false)
    expect(
        new Curve([100, 100], [50, 50], null, [200, 200]).isStraight()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], [50, 50], [-50, -50], [200, 200]).isStraight()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], [50, 50], [50, 50], [200, 200]).isStraight()
    ).toStrictEqual(false)
    expect(
        new Curve([100, 100], null, [-50, -50], [200, 200]).isStraight()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], null, [50, 50], [200, 200]).isStraight()
    ).toStrictEqual(false)
    expect(
        new Curve([100, 100], null, null, [100, 100]).isStraight()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], [50, 50], null, [100, 100]).isStraight()
    ).toStrictEqual(false)
    expect(
        new Curve([100, 100], null, [-50, -50], [100, 100]).isStraight()
    ).toStrictEqual(false)
    expect(
        new Curve([100, 300], [20, -20], [-10, 10], [200, 200]).isStraight()
    ).toStrictEqual(true)
})

test('Curve#isLinear()', function () {
    expect(
        new Curve(
            [100, 100],
            [100 / 3, 100 / 3],
            [-100 / 3, -100 / 3],
            [200, 200]
        ).isLinear()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], null, null, [100, 100]).isLinear()
    ).toStrictEqual(true)
    expect(
        new Curve([100, 100], null, null, [200, 200]).isLinear()
    ).toStrictEqual(false)
})

test('Curve#getTimeOf()', function () {
    const path = new Path.Rectangle({
        center: new Point(300, 100),
        size: new Point(100, 100),
        strokeColor: 'black'
    })

    for (let pos = 0; pos < path.length; pos += 10) {
        const point1 = path.getPointAt(pos)
        let point2: Point = null
        for (let i = 0; i < path.curves.length; i++) {
            const curve = path.curves[i]
            const time = curve.getTimeOf(point1)
            if (time) {
                point2 = curve.getLocationAtTime(time).point
                break
            }
        }

        expect(point1.toString()).toStrictEqual(point2.toString())
    }
})

test('Curve#getPartLength() with straight curve', function () {
    const curve = new Curve([0, 0, 0, 0, 64, 0, 64, 0])

    expect(curve.getPartLength(0.0, 0.25)).toStrictEqual(10)
    expect(curve.getPartLength(0.25, 0.5)).toStrictEqual(22)
    expect(curve.getPartLength(0.25, 0.75)).toStrictEqual(44)
    expect(curve.getPartLength(0.5, 0.75)).toStrictEqual(22)
    expect(curve.getPartLength(0.75, 1)).toStrictEqual(10)
})

test('Curve#divideAt(offset)', function () {
    const point1 = new Point(0, 0)
    const point2 = new Point(100, 0)
    const middle = point1.add(point2).divide(2)

    expect(
        new Curve(point1, point2).divideAt(50).point1.toString()
    ).toStrictEqual(middle.toString())

    expect(
        new Curve(point1, point2).divideAtTime(0.5).point1.toString()
    ).toStrictEqual(middle.toString())
})

test('Curve#getTimesWithTangent()', function () {
    const curve = new Curve([0, 0], [100, 0], [0, -100], [200, 200])
    expect(curve.getTimesWithTangent()).toStrictEqual([])
    expect(curve.getTimesWithTangent([1, 0])).toStrictEqual([-0])
    expect(curve.getTimesWithTangent([-1, 0])).toStrictEqual([-0])
    expect(curve.getTimesWithTangent([0, 1])).toStrictEqual([1])
    expect(curve.getTimesWithTangent([1, 1])).toStrictEqual([0.5])
    expect(curve.getTimesWithTangent([1, -1])).toStrictEqual([])

    expect(
        new Curve(
            [0, 0],
            [100, 0],
            [500, -500],
            [-500, -500]
        ).getTimesWithTangent([1, 0]).length
    ).toStrictEqual(2)

    expect(
        new Curve([0, 0], [100, 0], [0, -100], [0, -100]).getTimesWithTangent([
            1, 0
        ]).length
    ).toStrictEqual(2)
})
