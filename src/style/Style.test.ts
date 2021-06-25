import Color from './Color'
import Style from './Style'

test('strokeColor', function () {
    const style = new Style()
    style.strokeColor = '#F00'
    expect(style.getStrokeColor()).toMatchObject(new Color(1, 0, 0))

    style.setStrokeColor('#FFF')
    expect(style.strokeColor).toMatchObject(new Color(1, 1, 1))
})

test('strokeWidth', function () {
    const style = new Style()
    style.strokeWidth = 10
    expect(style.getStrokeWidth()).toStrictEqual(10)

    style.setStrokeWidth(20)
    expect(style.strokeWidth).toStrictEqual(20)
})

test('strokeCap', function () {
    const style = new Style()
    style.strokeCap = 'butt'
    expect(style.getStrokeCap()).toStrictEqual('butt')

    style.setStrokeCap('round')
    expect(style.strokeCap).toStrictEqual('round')
})

test('strokeJoin', function () {
    const style = new Style()
    style.strokeJoin = 'bevel'
    expect(style.getStrokeJoin()).toStrictEqual('bevel')

    style.setStrokeJoin('round')
    expect(style.strokeJoin).toStrictEqual('round')
})

test('strokeScaling', function () {
    const style = new Style()
    style.strokeScaling = false
    expect(style.getStrokeScaling()).toStrictEqual(false)

    style.setStrokeScaling(true)
    expect(style.strokeScaling).toStrictEqual(true)
})

test('dashOffset', function () {
    const style = new Style()
    style.dashOffset = 10
    expect(style.getDashOffset()).toStrictEqual(10)

    style.setDashOffset(30)
    expect(style.dashOffset).toStrictEqual(30)
})

test('dashArray', function () {
    const style = new Style()
    style.dashArray = [10, 20]
    expect(style.getDashArray()).toStrictEqual([10, 20])

    style.setDashArray([30, 10])
    expect(style.dashArray).toStrictEqual([30, 10])
})

test('miterLimit', function () {
    const style = new Style()
    style.miterLimit = 10
    expect(style.getMiterLimit()).toStrictEqual(10)

    style.setMiterLimit(20)
    expect(style.miterLimit).toStrictEqual(20)
})

test('fillColor', function () {
    const style = new Style()
    style.fillColor = '#F00'
    expect(style.getFillColor()).toMatchObject(new Color(1, 0, 0))

    style.setFillColor('#FFF')
    expect(style.fillColor).toMatchObject(new Color(1, 1, 1))
})

test('fillRule', function () {
    const style = new Style()
    style.fillRule = 'evenodd'
    expect(style.getFillRule()).toStrictEqual('evenodd')

    style.setFillRule('nonzero')
    expect(style.fillRule).toStrictEqual('nonzero')
})

test('shadowColor', function () {
    const style = new Style()
    style.shadowColor = '#F00'
    expect(style.getShadowColor()).toMatchObject(new Color(1, 0, 0))

    style.setShadowColor('#FFF')
    expect(style.shadowColor).toMatchObject(new Color(1, 1, 1))
})

test('shadowBlur', function () {
    const style = new Style()
    style.shadowBlur = 10
    expect(style.getShadowBlur()).toStrictEqual(10)

    style.setShadowBlur(20)
    expect(style.shadowBlur).toStrictEqual(20)
})

test('shadowOffset', function () {
    const style = new Style()
    style.shadowOffset = [10, 20]
    expect(style.getShadowOffset()).toMatchObject({ x: 10, y: 20 })

    style.setShadowOffset([20, 20])
    expect(style.shadowOffset).toMatchObject({ x: 20, y: 20 })
})
