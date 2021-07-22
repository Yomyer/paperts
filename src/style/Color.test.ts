import { Color } from '@paperts'

test('Creating Colors', function () {
    expect(new Color()).toStrictEqual(new Color(0, 0, 0))

    expect(new Color('black')).toStrictEqual(new Color(0, 0, 0))

    // expect(new Color('red')).toStrictEqual(new Color(1, 0, 0))

    expect(new Color('transparent')).toStrictEqual(new Color(0, 0, 0, 0))

    expect(new Color('#ff0000')).toStrictEqual(new Color(1, 0, 0))

    expect(new Color('#FF3300')).toStrictEqual(new Color(1, 0.2, 0))

    expect(new Color('#f009')).toStrictEqual(new Color(1, 0, 0, 0.6))

    expect(new Color('#ff000099')).toStrictEqual(new Color(1, 0, 0, 0.6))

    expect(new Color('rgb(255, 0, 0)')).toStrictEqual(new Color(1, 0, 0))

    expect(new Color('rgba(255, 0, 0, 0.5)')).toStrictEqual(
        new Color(1, 0, 0, 0.5)
    )

    expect(new Color('rgba( 255, 0, 0, 0.5 )')).toStrictEqual(
        new Color(1, 0, 0, 0.5)
    )

    expect(new Color('rgb(100%, 50%, 0%)')).toStrictEqual(new Color(1, 0.5, 0))

    expect(new Color('hsl(180deg, 20%, 40%)')).toStrictEqual(
        new Color({ hue: 180, saturation: 0.2, lightness: 0.4 })
    )

    expect(new Color({ red: 1, green: 0, blue: 1 })).toStrictEqual(
        new Color(1, 0, 1)
    )

    expect(new Color({ gray: 0.2 })).toStrictEqual(new Color(0.2))

    expect(new Color({ hue: 0, saturation: 1, brightness: 1 })).toStrictEqual(
        new Color(1, 0, 0).convert('hsb')
    )

    expect(new Color([1, 0, 0])).toStrictEqual(new Color(1, 0, 0))

    expect(new Color([1])).toStrictEqual(new Color(1))

    expect(new Color('rgb', [1, 0, 0], 0.5)).toStrictEqual(
        new Color(1, 0, 0, 0.5)
    )
})

test('Get gray from RGB Color', function () {
    expect(new Color(1, 0.5, 0.2).gray).toStrictEqual(0.6152000000000001)

    expect(new Color(0.5, 0.2, 0.1).gray).toStrictEqual(0.27825000000000005)
})

test('Get gray from HSB Color', function () {
    const color = new Color({ hue: 0, saturation: 0, brightness: 0.2 })
    expect(color.gray).toStrictEqual(0.19998)
})

test('Get red from HSB Color', function () {
    const color = new Color({ hue: 0, saturation: 1, brightness: 1 })
    expect(color.red).toStrictEqual(1)
})

test('Get hue from RGB Color', function () {
    const color = new Color(1, 0, 0)
    expect(color.hue).toStrictEqual(0)
    expect(color.saturation).toStrictEqual(1)
})

test('Get gray after conversion', function () {
    const color = new Color(1)
    expect(color.gray).toStrictEqual(1)
    expect(color.red).toStrictEqual(1)
    expect(color.blue).toStrictEqual(1)

    color.red = 0.5
    expect(color.gray).toStrictEqual(0.8504499999999999)

    color.green = 0.2

    expect(color.red).toStrictEqual(0.5)
    expect(color.green).toStrictEqual(0.2)
    expect(color.blue).toStrictEqual(1)

    expect(color.gray).toStrictEqual(0.38085)
})

test('Converting Colors', function () {
    const rgbColor = new Color(1, 0.5, 0.2)
    expect(rgbColor.gray).toStrictEqual(0.6152000000000001)
    const grayColor = new Color(0.2)
    expect(grayColor.convert('rgb')).toStrictEqual(new Color(0.2, 0.2, 0.2))
    expect(grayColor.convert('hsb')).toStrictEqual(
        new Color({ hue: 0, saturation: 0, brightness: 0.2 })
    )
    expect(new Color(1, 0, 0).convert('hsb')).toStrictEqual(
        new Color({ hue: 0, saturation: 1, brightness: 1 })
    )
})

test('Setting Color#gray', function () {
    const color = new Color(1, 0.5, 0.2)
    color.gray = 0.1
    expect(color).toMatchObject(new Color(0.1))
})

test('Setting Color#red', function () {
    const color = new Color({ hue: 180, saturation: 0, brightness: 0 })
    color.red = 1
    expect(color).toMatchObject(new Color(1, 0, 0))
})

test('Setting Color#gray', function () {
    const color = new Color({ hue: 180, saturation: 0, brightness: 0 })
    color.gray = 0.5
    expect(color).toMatchObject(new Color(0.5))
})

test('Color.read()', function () {
    const color = Color.read([0, 0, 1])
    expect(color).toMatchObject(new Color(0, 0, 1))
})

test('Color#clone()', function () {
    const color = new Color(0, 0, 0)
    expect(color.clone() !== color).toStrictEqual(true)

    expect(new Color(color) !== color).toStrictEqual(true)
})

test('Color#convert()', function () {
    const color = new Color(0, 0, 0)
    const converted = color.convert('rgb')
    expect(converted !== color).toStrictEqual(true)
    expect(converted.equals(color)).toStrictEqual(true)
})

test('Getting saturation from black RGB Color', function () {
    expect(new Color(0, 0, 0).saturation === 0).toStrictEqual(true)
})

test('Color#add()', function () {
    const color = new Color(0, 1, 1)
    expect(color.add([1, 0, 0])).toStrictEqual(new Color([1, 1, 1]))
    expect(color.add([1, 0.5, 0])).toStrictEqual(new Color([1, 1.5, 1]))

    expect(new Color(0, 0.5, 0).add(0.5)).toStrictEqual(
        new Color([0.5, 1, 0.5])
    )
})

test('Color#subtract()', function () {
    const color = new Color(0, 1, 1)
    expect(color.subtract([0, 1, 1])).toStrictEqual(new Color([0, 0, 0]))
    expect(color.subtract([0, 0.5, 1])).toStrictEqual(new Color([0, 0.5, 0]))

    expect(new Color(1, 1, 1).subtract(0.5)).toStrictEqual(
        new Color([0.5, 0.5, 0.5])
    )
})

test('Color#multiply()', function () {
    expect(new Color(1, 0.5, 0.25).multiply([0.25, 0.5, 1])).toStrictEqual(
        new Color([0.25, 0.25, 0.25])
    )

    expect(new Color(1, 1, 1).multiply(0.5)).toStrictEqual(
        new Color([0.5, 0.5, 0.5])
    )
    expect(new Color(0.5, 0.5, 0.5).multiply(2)).toStrictEqual(
        new Color([1, 1, 1])
    )
})

test('Color#divide()', function () {
    expect(new Color(1, 1, 1).divide([1, 2, 4])).toStrictEqual(
        new Color([1, 0.5, 0.25])
    )
    expect(new Color(1, 0.5, 0.25).divide(0.25)).toStrictEqual(
        new Color([4, 2, 1])
    )
    expect(new Color(1, 1, 1).divide(4)).toStrictEqual(
        new Color([0.25, 0.25, 0.25])
    )
})

test('Color#equals()', function () {
    const red = new Color('#FF0000')
    expect(new Color(1, 0, 0).equals(red)).toStrictEqual(true)
    expect(new Color(1, 0, 0, 1).equals(red)).toStrictEqual(true)
})

/* TODO Faltan test con objectos reales
test('Modifying group.strokeColor for multiple children', function() {
    var item = new Group(new Path(), new Path());
    item.strokeColor = 'red';
    var strokeColor = item.strokeColor;
    item.strokeColor.hue = 50;
    equals(function() { return item.strokeColor !== undefined; }, true);
});
*/
