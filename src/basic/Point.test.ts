import { Base, Size, Point, Matrix } from '@paperts'

test('initialize one params', () => {
    const point = new Point(10)

    expect(point).toMatchObject({ x: 10, y: 10 })
})

test('initialize params', () => {
    const point = new Point(10, 23)

    expect(point).toMatchObject({ x: 10, y: 23 })
})

test('initialize array', () => {
    const point = new Point([10, 23])

    expect(point).toMatchObject({ x: 10, y: 23 })
})

test('initialize object', () => {
    expect(new Point({ x: 10, y: 23 })).toMatchObject({ x: 10, y: 23 })
    expect(
        new Point({
            angle: 90,
            length: 10
        })
    ).toMatchObject({ x: 6.123233995736766e-16, y: 10 })
})

test('initialize size', () => {
    const point = new Point({ width: 10, height: 23 })

    expect(point).toMatchObject({ x: 10, y: 23 })
})

test('set()', () => {
    const point = new Point()
    point.set({ x: 10, y: 23 })

    expect(point).toMatchObject({ x: 10, y: 23 })
})

test('equals()', () => {
    const point = new Point(100)
    const compare = new Point()
    compare.set(100)

    expect(point.equals(compare)).toStrictEqual(true)

    expect(point.equals(100, 100)).toStrictEqual(true)
})

test('clone()', () => {
    const point = new Point(100)
    const compare = point.clone()

    expect(point.equals(compare)).toStrictEqual(true)
})

test('toString()', () => {
    const point = new Point(100)

    expect(point.toString()).toStrictEqual('{ x: 100, y: 100 }')
})

test('getLength()', () => {
    const point = new Point(100)

    expect(point.getLength()).toStrictEqual(141.4213562373095)
})

test('setLength()', () => {
    const point = new Point(100)
    point.setLength(10)

    expect(point).toMatchObject({
        x: 7.0710678118654755,
        y: 7.0710678118654755
    })
})

test('getAngle()', () => {
    const point = new Point(100)

    expect(point.getAngle()).toStrictEqual(45)
    expect(point.getAngleInDegrees()).toStrictEqual(45)
    expect(point.getAngle(new Point(100, 120))).toStrictEqual(5.1944289077348)
})

test('setAngle()', () => {
    const point = new Point(100)
    point.setAngle(30)

    expect(point).toMatchObject({ x: 122.47448713915892, y: 70.71067811865474 })
})

test('getAngleInRadians()', () => {
    const point = new Point(100)

    point.getAngleInRadians()
    expect(point.getAngleInRadians()).toStrictEqual(0.7853981633974483)
    expect(point.getAngleInRadians([100, 120])).toStrictEqual(0.090659887200745)
})

test('setAngleInRadians()', () => {
    const point = new Point(100)
    point.setAngleInRadians(0.01)

    expect(point).toMatchObject({ x: 141.414285228423, y: 1.4141899922649064 })
})

test('getQuadrant()', () => {
    const point = new Point(100)

    expect(point.getQuadrant()).toStrictEqual(1)

    point.setAngle(100)
    expect(point.getQuadrant()).toStrictEqual(2)

    point.setAngle(190)
    expect(point.getQuadrant()).toStrictEqual(3)

    point.setAngle(280)
    expect(point.getQuadrant()).toStrictEqual(4)
})

test('getDirectedAngle()', () => {
    const point = new Point(100)

    expect(point.getDirectedAngle(100, 120)).toStrictEqual(5.194428907734806)
})

test('getDistance()', () => {
    const point = new Point(100)

    expect(point.getDistance(120, 100)).toStrictEqual(20)
})

test('normalize()', () => {
    const point = new Point(100)

    expect(point.normalize()).toMatchObject({
        x: 0.7071067811865476,
        y: 0.7071067811865476
    })
})

test('rotate()', () => {
    const point = new Point(100)

    expect(point.rotate(20)).toMatchObject({
        x: 59.767247746023976,
        y: 128.17127641115772
    })

    expect(point.rotate(20, [20, 300])).toMatchObject({
        x: 163.5794383280064,
        y: 139.4230873088718
    })
})

test('transform()', () => {
    const point = new Point(100)

    expect(point.transform(new Matrix().rotate(20))).toMatchObject({
        x: 59.767247746023976,
        y: 128.17127641115772
    })

    expect(point.transform(new Matrix().rotate(20, [20, 300]))).toMatchObject({
        x: 163.5794383280064,
        y: 139.42308730887183
    })
})

test('add()', () => {
    const point = new Point(100)

    expect(point.add(20, 30)).toMatchObject({
        x: 120,
        y: 130
    })

    expect(point.add(new Size(20, 30))).toMatchObject({
        x: 120,
        y: 130
    })
})

test('subtract()', () => {
    const point = new Point(100)

    expect(point.subtract(20, 30)).toMatchObject({
        x: 80,
        y: 70
    })

    expect(point.subtract(20)).toMatchObject({
        x: 80,
        y: 80
    })
})

test('multiply()', () => {
    const point = new Point(100)

    expect(point.multiply(2)).toMatchObject({
        x: 200,
        y: 200
    })
})

test('divide()', () => {
    const point = new Point(100)

    expect(point.divide(2)).toMatchObject({
        x: 50,
        y: 50
    })
})

test('modulo()', () => {
    const point = new Point(12, 6)

    expect(point.modulo(5)).toMatchObject({
        x: 2,
        y: 1
    })

    expect(point.modulo(5, 2)).toMatchObject({
        x: 2,
        y: 0
    })
})

test('negate()', () => {
    const point = new Point(12, 6)

    expect(point.negate()).toMatchObject({
        x: -12,
        y: -6
    })
})

test('isInside()', () => {
    const point = new Point(150)

    expect(point.isInside([100, 100], [100, 100])).toStrictEqual(true)
    expect(point.isInside([100, 100], new Point(120))).toStrictEqual(false)
})

test('isClose()', () => {
    const point = new Point(200, 0)

    expect(point.isClose(220, 0, 25)).toStrictEqual(true)
})

test('isCollinear()', () => {
    const point = new Point(200)

    expect(point.isCollinear(210)).toStrictEqual(true)
    expect(point.isCollinear(12, 120)).toStrictEqual(false)
})

test('isOrthogonal()', () => {
    const point = new Point(0, 0)

    expect(point.isOrthogonal(100, 100)).toStrictEqual(true)
})

test('isZero()', () => {
    expect(new Point(0, 0).isZero()).toStrictEqual(true)
    expect(new Point(1, 0).isZero()).toStrictEqual(false)
})

test('isNaN()', () => {
    expect(new Point(NaN, 0).isNaN()).toStrictEqual(true)
    expect(new Point(1, 0).isNaN()).toStrictEqual(false)
})

test('dot()', () => {
    const point = new Point(20, 40)
    expect(point.dot(10)).toStrictEqual(600)
})

test('cross()', () => {
    const point = new Point(20, 40)
    expect(point.cross(10)).toStrictEqual(-200)
})

test('project()', () => {
    const point = new Point(20, 0)
    expect(point.project(30, 10)).toMatchObject({
        x: 18,
        y: 6
    })
})

test('round()', () => {
    const point = new Point(20.5)
    expect(point.round()).toMatchObject({
        x: 21,
        y: 21
    })
})

test('ceil()', () => {
    const point = new Point(20.5)
    expect(point.ceil()).toMatchObject({
        x: 21,
        y: 21
    })
})

test('floor()', () => {
    const point = new Point(20.5)
    expect(point.floor()).toMatchObject({
        x: 20,
        y: 20
    })
})

test('abs()', () => {
    const point = new Point(-20.5)
    expect(point.abs()).toMatchObject({
        x: 20.5,
        y: 20.5
    })
})

test('min()', () => {
    const point1 = new Point(60, 100)
    const point2 = new Point(200, 5)
    const point3 = new Point(250, 35)
    expect([point1, point2, point3].reduce(Point.min)).toMatchObject({
        x: 60,
        y: 5
    })

    expect(Point.min(250, 20, 100, 100)).toMatchObject({
        x: 100,
        y: 20
    })
})

test('random()', () => {
    const point1 = Point.random()
    expect(point1.x).toBeLessThanOrEqual(1)
    expect(point1.y).toBeLessThanOrEqual(1)
})

test('max()', () => {
    const point1 = new Point(60, 100)
    const point2 = new Point(200, 5)
    const point3 = new Point(250, 35)
    expect([point1, point2, point3].reduce(Point.max)).toMatchObject({
        x: 250,
        y: 100
    })

    expect(Point.max(250, 20, 100, 100)).toMatchObject({
        x: 250,
        y: 100
    })
})

test('exportJSON()', () => {
    const point = new Point(10, 23)
    const json = point.exportJSON()

    expect(json).toStrictEqual('["Point",10,23]')
})

test('importJSON()', () => {
    const point = new Point()
    point.importJSON('["Point",10,25]')

    expect(point).toMatchObject({ x: 10, y: 25 })

    expect(Base.importJSON('["Point",10,23]')).toMatchObject({ x: 10, y: 23 })
    expect(Point.importJSON('["Point",10,23]')).toMatchObject({ x: 10, y: 23 })
})
