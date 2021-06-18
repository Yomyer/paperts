import Base from '../core/Base'
import Size from './Size'

test('initialize one params', () => {
    const size = new Size(10)

    expect(size).toMatchObject({ width: 10, height: 10 })
})

test('initialize params', () => {
    const size = new Size(10, 23)

    expect(size).toMatchObject({ width: 10, height: 23 })
})

test('initialize array', () => {
    const size = new Size([10, 23])

    expect(size).toMatchObject({ width: 10, height: 23 })
})

test('initialize object', () => {
    const size = new Size(new Size(10, 23))

    expect(size).toMatchObject({ width: 10, height: 23 })
})

test('initialize size', () => {
    const size = new Size({ width: 10, height: 23 })

    expect(size).toMatchObject({ width: 10, height: 23 })
})

test('set()', () => {
    const size = new Size()
    size.set({ width: 10, height: 23 })

    expect(size).toMatchObject({ width: 10, height: 23 })
})

test('equals()', () => {
    const size = new Size(100)
    const compare = new Size()
    compare.set(100)

    expect(size.equals(compare)).toStrictEqual(true)
})

test('clone()', () => {
    const size = new Size(100)
    const compare = size.clone()

    expect(size.equals(compare)).toStrictEqual(true)
})

test('toString()', () => {
    const size = new Size(100)

    expect(size.toString()).toStrictEqual('{ width: 100, height: 100 }')
})

test('add()', () => {
    const size = new Size(100)

    expect(size.add(20, 30)).toMatchObject({
        width: 120,
        height: 130
    })

    expect(size.add(new Size(20, 30))).toMatchObject({
        width: 120,
        height: 130
    })
})

test('subtract()', () => {
    const size = new Size(100)

    expect(size.subtract(20, 30)).toMatchObject({
        width: 80,
        height: 70
    })

    expect(size.subtract(20)).toMatchObject({
        width: 80,
        height: 80
    })
})

test('multiply()', () => {
    const size = new Size(100)

    expect(size.multiply(2)).toMatchObject({
        width: 200,
        height: 200
    })
})

test('divide()', () => {
    const size = new Size(100)

    expect(size.divide(2)).toMatchObject({
        width: 50,
        height: 50
    })
})

test('modulo()', () => {
    const size = new Size(12, 6)

    expect(size.modulo(5)).toMatchObject({
        width: 2,
        height: 1
    })

    expect(size.modulo(5, 2)).toMatchObject({
        width: 2,
        height: 0
    })
})

test('negate()', () => {
    const size = new Size(12, 6)

    expect(size.negate()).toMatchObject({
        width: -12,
        height: -6
    })
})

test('isZero()', () => {
    expect(new Size(0, 0).isZero()).toStrictEqual(true)
    expect(new Size(1, 0).isZero()).toStrictEqual(false)
})

test('isNaN()', () => {
    expect(new Size(NaN, 0).isNaN()).toStrictEqual(true)
    expect(new Size(1, 0).isNaN()).toStrictEqual(false)
})

test('round()', () => {
    const size = new Size(20.5)
    expect(size.round()).toMatchObject({
        width: 21,
        height: 21
    })
})

test('ceil()', () => {
    const size = new Size(20.5)
    expect(size.ceil()).toMatchObject({
        width: 21,
        height: 21
    })
})

test('floor()', () => {
    const size = new Size(20.5)
    expect(size.floor()).toMatchObject({
        width: 20,
        height: 20
    })
})

test('abs()', () => {
    const size = new Size(-20.5)
    expect(size.abs()).toMatchObject({
        width: 20.5,
        height: 20.5
    })
})

test('exportJSON()', () => {
    const size = new Size(10, 23)
    const json = size.exportJSON()

    expect(json).toStrictEqual('["Size",10,23]')
})

test('importJSON()', () => {
    const size = new Size()
    size.importJSON('["Size",10,25]')
    expect(size).toMatchObject({ width: 10, height: 25 })

    expect(Base.importJSON('["Size",10,23]')).toMatchObject({
        width: 10,
        height: 23
    })
    expect(Size.importJSON('["Size",10,23]')).toMatchObject({
        width: 10,
        height: 23
    })
})
