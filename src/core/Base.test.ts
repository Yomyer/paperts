import { Base } from '@paperts'

test('toString() with _id, _class, _name', () => {
    const base: any = new Base()
    base._id = '453172467323dfsd234fe'
    base._class = 'Rectangle'
    base._name = 'Name'

    expect(base.toString()).toStrictEqual(`Rectangle 'Name'`)
})

test('toString() without _id, _class, _name', () => {
    const base: any = new Base()
    base.number = 2313
    base.string = 'test'

    expect(base.toString()).toStrictEqual(`{ number: 2313, string: 'test' }`)
})

test('getClassName()', () => {
    const base: any = new Base()
    base._class = 'Rectangle'

    expect(base.getClassName()).toStrictEqual(`Rectangle`)
})

test('static push()', () => {
    const foo = [1, 2, 3]
    const bar = [4, 5, 6]

    const res = Base.push(foo, bar)

    expect(res).toStrictEqual([1, 2, 3, 4, 5, 6])
})

test('static splice()', () => {
    const base1 = new Base()
    const base2 = new Base()
    const base3 = new Base()
    const base4 = new Base()
    const base5 = new Base()

    const foo = [base1, base2, base3]
    const bar = [base4, base5]

    Base.splice(foo, bar, 2)

    expect(foo).toStrictEqual([base1, base2, base4, base5, base3])
})

test('static capitalize()', () => {
    const foo = Base.capitalize('hello world')

    expect(foo).toStrictEqual('Hello World')
})

test('static camelize()', () => {
    const foo = Base.camelize('caps-lock')

    expect(foo).toStrictEqual('capsLock')
})

test('static hyphenate()', () => {
    const foo = Base.hyphenate('CapsLock')

    expect(foo).toStrictEqual('caps-lock')
})

/*
test('contruct()', () => {
    const point = Base.construct('Point', 10, 10)
    console.log(point)
})
*/
