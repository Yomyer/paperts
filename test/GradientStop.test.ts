import { Color, GradientStop } from '../src'

test('Gradient', function () {
    const stop1 = new GradientStop({ offset: 0.5 })
    const stop2 = new GradientStop('#FF0000', 0.75)
    const stop3 = new GradientStop(['#FFFFFF', 1])
    const stop4 = new GradientStop({ rampPoint: 0.5 }) // deprecated
    // const gradient = new Gradient([stop1, stop2, stop3], true)

    expect(stop1.color).toMatchObject(new Color(0, 0, 0))
    expect(stop2.color).toMatchObject(new Color(1, 0, 0))
    expect(stop3.color).toMatchObject(new Color(1, 1, 1))
    expect(stop4.color).toMatchObject(new Color(0, 0, 0))
    expect(stop1.offset).toStrictEqual(0.5)
    expect(stop2.offset).toStrictEqual(0.75)
    expect(stop3.offset).toStrictEqual(1)
    expect(stop4.offset).toStrictEqual(0.5)
})

/*
test('Gradients with applyMatrix', function () {
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

  
    path.scale(2)
    path.rotate(45)
    shape.scale(2)
    shape.rotate(45)

    comparePixels(path, shape)
 
})
*/

test('exportJSON', function () {
    const gradientStop = new GradientStop()
    expect(gradientStop.exportJSON()).toStrictEqual(`["GradientStop",[0,0,0]]`)

    gradientStop.color = '#314'
    expect(gradientStop.exportJSON()).toStrictEqual(
        `["GradientStop",[0.2,0.06667,0.26667]]`
    )
})
