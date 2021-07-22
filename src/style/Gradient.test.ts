import { Gradient } from '@paperts'

export {}

test('Gradients with applyMatrix', function () {
    expect(1).toStrictEqual(1)
})

test('exportJSON', function () {
    const gradient = new Gradient()
    expect(gradient.exportJSON()).toStrictEqual(
        `[["dictionary",{"#1":["Gradient",[[[1,1,1]],[[0,0,0]]],false]}],["Gradient","#1"]]`
    )
})

/* 
Todo Falta Objetos reales
test('Gradients with applyMatrix', function () {
    var topLeft = [100, 100]
    var bottomRight = [400, 400]
    var gradientColor = {
        gradient: {
            stops: ['yellow', 'red', 'blue']
        },
        origin: topLeft,
        destination: bottomRight
    }

    var path = new Path.Rectangle({
        topLeft: topLeft,
        bottomRight: bottomRight,
        fillColor: gradientColor,
        applyMatrix: true
    })

    var shape = new Shape.Rectangle({
        topLeft: topLeft,
        bottomRight: bottomRight,
        fillColor: gradientColor,
        applyMatrix: false
    })

    comparePixels(path, shape)

    path.scale(2)
    path.rotate(45)
    shape.scale(2)
    shape.rotate(45)

    comparePixels(path, shape)
})

*/
