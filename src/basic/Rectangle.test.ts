import { Base, Point, Rectangle, Size } from '@paperts'

test('initialize one params', () => {
    const rect = new Rectangle(10, 10, 100, 100)

    expect(rect).toMatchObject({ x: 10, y: 10, width: 100, height: 100 })
})

test('initialize array', () => {
    const rect = new Rectangle([10, 23], [100])

    expect(rect).toMatchObject({ x: 10, y: 23 })
})

test('initialize object', () => {
    const rect = new Rectangle(new Point(10, 23), new Size(100))

    expect(rect).toMatchObject({ x: 10, y: 23, width: 100, height: 100 })
})

test('initialize size', () => {
    const rect = new Rectangle({ x: 10, y: 20, width: 100, height: 23 })

    expect(rect).toMatchObject({ x: 10, y: 20, width: 100, height: 23 })
})

test('set()', () => {
    const rect = new Rectangle()
    rect.set({ x: 10, y: 20, width: 100, height: 23 })

    expect(rect).toMatchObject({ x: 10, y: 20, width: 100, height: 23 })
})

test('equals()', () => {
    const rect = new Rectangle(new Point(10, 23), new Point(100, 100))
    const compare = new Rectangle()
    compare.set({
        from: [10, 23],
        to: [100, 100]
    })

    expect(rect.equals(new Point(10, 23), new Point(100, 100))).toStrictEqual(
        true
    )
})

test('clone()', () => {
    const rect = new Rectangle({
        from: [20, 20],
        to: [100, 100]
    })
    const compare = rect.clone()

    expect(rect.equals(compare)).toStrictEqual(true)
})

test('toString()', () => {
    const rect = new Rectangle({
        from: [10, 23],
        to: [100, 100]
    })

    expect(rect.toString()).toStrictEqual(
        '{ x: 10, y: 23, width: 90, height: 77 }'
    )
})

test('rect & size', () => {
    const rect = new Rectangle()
    rect.point = 10
    rect.size = 100

    expect(rect.point).toMatchObject({ x: 10, y: 10 })
    expect(rect.size).toMatchObject({ width: 100, height: 100 })
})

test('left', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.left = 20

    expect(rect).toMatchObject({ x: 20, y: 0, width: 100, height: 100 })
})

test('top', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.top = 20

    expect(rect).toMatchObject({ x: 0, y: 20, width: 100, height: 100 })
})

test('right', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.right = 20

    expect(rect).toMatchObject({ x: -80, y: 0, width: 100, height: 100 })
})

test('bottom', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.bottom = 20

    expect(rect).toMatchObject({ x: 0, y: -80, width: 100, height: 100 })
})

test('centerX', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.centerX = 10

    expect(rect).toMatchObject({ x: -40, y: 0, width: 100, height: 100 })
})

test('centerY', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.centerY = 60

    expect(rect).toMatchObject({ x: 0, y: 10, width: 100, height: 100 })
})

test('center', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.center = 60

    expect(rect).toMatchObject({ x: 10, y: 10, width: 100, height: 100 })
})

test('bounds', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.topLeft).toMatchObject({ x: 0, y: 0 })
    expect(rect.topCenter).toMatchObject({ x: 50, y: 0 })
    expect(rect.topRight).toMatchObject({ x: 100, y: 0 })
    expect(rect.leftCenter).toMatchObject({ x: 0, y: 50 })
    expect(rect.rightCenter).toMatchObject({ x: 100, y: 50 })
    expect(rect.bottomLeft).toMatchObject({ x: 0, y: 100 })
    expect(rect.bottomCenter).toMatchObject({ x: 50, y: 100 })
    expect(rect.bottomRight).toMatchObject({ x: 100, y: 100 })
    expect(rect.center).toMatchObject({ x: 50, y: 50 })
    expect(rect.centerX).toStrictEqual(50)
    expect(rect.centerY).toStrictEqual(50)
})

test('area', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.area).toStrictEqual(10000)
})

test('isEmpty', () => {
    const rect = new Rectangle([0, 0], [100, 100])
    rect.size = 0

    expect(rect.isEmpty()).toStrictEqual(true)
})

test('contains', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.contains(50, 50)).toStrictEqual(true)

    expect(rect.contains([25, 25], [50, 50])).toStrictEqual(true)
})

test('intersects', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.intersects([99, 99], [50, 50])).toStrictEqual(true)
})

test('intersect', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.intersect([75, 25], [50, 45])).toMatchObject({
        x: 75,
        y: 25,
        width: 25,
        height: 45
    })
})

test('unite', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.unite([75, 25], [120, 250])).toMatchObject({
        x: 0,
        y: 0,
        width: 195,
        height: 275
    })
})

test('include', () => {
    const rect = new Rectangle([0, 0], [100, 100])

    expect(rect.include(120, 50)).toMatchObject({
        x: 0,
        y: 0,
        width: 120,
        height: 100
    })
})

test('expand', () => {
    const rect = new Rectangle([0, 0], [100, 200])

    expect(rect.expand(10)).toMatchObject({
        x: -5,
        y: -5,
        width: 110,
        height: 210
    })

    expect(rect.expand(10, 5)).toMatchObject({
        x: -5,
        y: -2.5,
        width: 110,
        height: 205
    })
})

test('scale', () => {
    const rect = new Rectangle([0, 0], [100, 200])

    expect(rect.scale(2)).toMatchObject({
        x: -50,
        y: -100,
        width: 200,
        height: 400
    })

    expect(rect.scale(1.5, 1.5)).toMatchObject({
        x: -25,
        y: -50,
        width: 150,
        height: 300
    })
})

test('exportJSON()', () => {
    const rect = new Rectangle({
        point: 0,
        size: 100
    })
    const json = rect.exportJSON()

    expect(json).toStrictEqual('["Rectangle",0,0,100,100]')
})

test('importJSON()', () => {
    const rect = new Rectangle()
    rect.importJSON('["Rectangle",10,23,100,100]')
    expect(rect).toMatchObject({ x: 10, y: 23, width: 100, height: 100 })

    expect(Base.importJSON('["Rectangle",0,0,100,100]')).toMatchObject({
        x: 0,
        y: 0,
        width: 100,
        height: 100
    })
    expect(Rectangle.importJSON('["Rectangle",10,23,100,100]')).toMatchObject({
        x: 10,
        y: 23,
        width: 100,
        height: 100
    })
})
