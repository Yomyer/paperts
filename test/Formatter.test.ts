import { Formatter } from '../src'

test('number()', () => {
    const formatter = new Formatter(2)

    expect(formatter.number(22.325)).toStrictEqual(22.33)
})

test('static number()', () => {
    expect(Formatter.number(22.3223135)).toStrictEqual(22.32231)
})
