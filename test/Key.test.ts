import { Key } from '../src'

test('option', () => {
    Key.modifiers.alt = true

    expect(Key.modifiers.option).toStrictEqual(true)
})

test('command', () => {
    Key.modifiers.control = true

    expect(Key.modifiers.command).toStrictEqual(true)
})
