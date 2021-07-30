import { Line, Point } from '../src'

test('getPoint()', () => {
    const line = new Line(new Point([10, 10]), new Point([30, 30]))

    expect(line.getPoint()).toMatchObject({ x: 10, y: 10 })
})

test('getVector()', () => {
    const line = new Line(new Point([10, 10]), new Point([30, 30]))

    expect(line.getVector()).toMatchObject({ x: 20, y: 20 })
})

test('getLength()', () => {
    const line = new Line(10, 10, 30, 30)

    expect(line.getLength()).toStrictEqual(28.284271247461902)
})

test('intersect()', () => {
    const line = new Line(0, 0, 0, 30)

    expect(line.intersect(new Line(-15, 15, 15, 15))).toMatchObject({
        x: 0,
        y: 15
    })
})

test('getSide()', () => {
    const line = new Line(0, 0, 30, 0)

    expect(line.getSide(new Point(15, -15))).toStrictEqual(1)
})

test('getDistance()', () => {
    const line = new Line(5, 0, 0, 30)

    expect(line.getDistance(new Point(-20, 25))).toStrictEqual(
        20.549873413169664
    )
})

test('getSignedDistance()', () => {
    const line = new Line(5, 0, 0, 30)

    expect(line.getSignedDistance(new Point(-20, 25))).toStrictEqual(
        -20.549873413169664
    )
})

test('isCollinear()', () => {
    const line = new Line(0, 0, 0, 30)

    expect(line.isCollinear(new Line(20, 30, 20, 50))).toStrictEqual(true)
})

test('isOrthogonal()', () => {
    const line = new Line(0, 0, 30, 0)

    expect(line.isOrthogonal(new Line(0, 10, 30, 10))).toStrictEqual(false)
})
