import { Foo } from './index'

test('test cicle', () => {
    const item = new Foo()

    expect(item.test()).toStrictEqual(true)
})
