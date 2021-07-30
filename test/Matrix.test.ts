import { Base, Matrix, Point } from '../src'

test('Decomposition: rotate()', function () {
    function testAngle(a: any, ea?: any) {
        const m = new Matrix()

        const r = m.rotate(a)

        expect(Math.round(r.getRotation())).toStrictEqual(Base.pick(ea, a))
        expect(r.getScaling()).toStrictEqual(new Point(1, 1))
    }

    testAngle(0)
    testAngle(1)
    testAngle(45)
    testAngle(90)
    testAngle(135)
    testAngle(180)
    testAngle(270, -90)
    testAngle(-1)
    testAngle(-45)
    testAngle(-90)
    testAngle(-135)
    testAngle(-180)
    testAngle(-270, 90)
})

test('Decomposition: scale()', function () {
    function testScale(
        sx: number,
        sy: number,
        ex?: number,
        ey?: number,
        ea?: number
    ) {
        const m = new Matrix().scale(sx, sy)

        expect(m.getRotation()).toStrictEqual(ea || 0)
        expect(m.getScaling()).toStrictEqual(
            new Point(Base.pick(ex, sx), Base.pick(ey, sy))
        )
    }

    testScale(1, 1)
    testScale(1, -1)
    testScale(-1, 1, 1, -1, -180) // Decomposing results in correct flipping
    testScale(-1, -1, 1, 1, -180) // Decomposing results in correct flipping
    testScale(2, 4)
    testScale(2, -4)
    testScale(4, 2)
    testScale(-4, 2, 4, -2, -180) // Decomposing results in correct flipping
    testScale(-4, -4, 4, 4, -180) // Decomposing results in correct flipping
})

test('Decomposition: scale() & rotate()', function () {
    function testAngleAndScale(
        sx: number,
        sy: number,
        a: number,
        ex?: number,
        ey?: number,
        ea?: number
    ) {
        const m = new Matrix().rotate(a).scale(sx, sy)

        expect(m.getRotation()).toStrictEqual(ea || a)
        expect(m.getScaling()).toStrictEqual(
            new Point(Base.pick(ex, sx), Base.pick(ey, sy))
        )
    }

    testAngleAndScale(2, 4, 45)
    testAngleAndScale(2, -4, 45)
    testAngleAndScale(-2, 4, 45, 2, -4, -135)
    testAngleAndScale(-2, -4, 45, 2, 4, -135)
})

test('exportJSON()', () => {
    const matrix = new Matrix().rotate(45)
    const json = matrix.exportJSON()

    expect(json).toStrictEqual(
        '["Matrix",0.70711,0.70711,-0.70711,0.70711,0,0]'
    )
})

test('importJSON()', () => {
    const matrix = new Matrix()
    matrix.importJSON('["Matrix",0.70711,0.70711,-0.70711,0.70711,0,0]')
    expect(matrix.getRotation()).toStrictEqual(45)

    expect(
        (<Matrix>(
            Base.importJSON('["Matrix",0.70711,0.70711,-0.70711,0.70711,0,0]')
        )).getRotation()
    ).toStrictEqual(45)

    expect(
        Matrix.importJSON(
            '["Matrix",0.70711,0.70711,-0.70711,0.70711,0,0]'
        ).getRotation()
    ).toStrictEqual(45)
})
