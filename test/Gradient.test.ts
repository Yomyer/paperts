import { Gradient } from '../src'

test('Gradients with applyMatrix', function () {
    expect(1).toStrictEqual(1)
})

test('exportJSON', function () {
    const gradient = new Gradient()
    expect(gradient.exportJSON()).toStrictEqual(
        `[["dictionary",{"#1":["Gradient",[[[1,1,1]],[[0,0,0]]],false]}],["Gradient","#1"]]`
    )
})

test('Gradients with applyMatrix', function () {
    /* TODO: Raster
    const topLeft = [100, 100]
    const bottomRight = [400, 400]
    const gradientColor = {
        gradient: {
            stops: ['yellow', 'red', 'blue']
        },
        origin: topLeft,
        destination: bottomRight
    }

    const path = new Path.Rectangle({
        topLeft: topLeft,
        bottomRight: bottomRight,
        fillColor: gradientColor,
        applyMatrix: true
    })

    const shape = new Shape.Rectangle({
        topLeft: topLeft,
        bottomRight: bottomRight,
        fillColor: gradientColor,
        applyMatrix: false
    })

    comparePixels(path, shape)
    */
    // path.scale(2)
    // path.rotate(45)
    // shape.scale(2)
    // shape.rotate(45)
    // comparePixels(path, shape)
})
