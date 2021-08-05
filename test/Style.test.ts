import { Color, Style } from '../src'

test('equals', function () {
    const style = new Style()
    style.fillColor = new Color('#F00')

    expect(style.equals({ fillColor: '#F00' })).toStrictEqual(true)

    style.setStrokeColor('#FFF')
    expect(style.strokeColor).toMatchObject(new Color(1, 1, 1))
})

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

test('selectedColor', function () {
    const style = new Style()
    style.selectedColor = '#F00'
    expect(style.getSelectedColor()).toMatchObject(new Color(1, 0, 0))

    style.setSelectedColor('#FFF')
    expect(style.selectedColor).toMatchObject(new Color(1, 1, 1))
})

test('fontFamily', function () {
    const style = new Style()
    style.fontFamily = 'Arial'
    expect(style.getFontFamily()).toStrictEqual('Arial')

    style.setFontFamily('Verdana')
    expect(style.fontFamily).toStrictEqual('Verdana')
})

test('fontWeight', function () {
    const style = new Style()
    style.fontWeight = 'normal'
    expect(style.getFontWeight()).toStrictEqual('normal')

    style.setFontWeight(300)
    expect(style.fontWeight).toStrictEqual(300)
})

test('fontSize', function () {
    const style = new Style()
    style.fontSize = 15
    expect(style.getFontSize()).toStrictEqual(15)

    style.setFontSize(300)
    expect(style.fontSize).toStrictEqual(300)
})

test('leading', function () {
    const style = new Style()
    style.leading = 15
    expect(style.getLeading()).toStrictEqual(15)

    style.setLeading(20)
    expect(style.leading).toStrictEqual(20)
})

test('justification', function () {
    const style = new Style()
    style.justification = 'center'
    expect(style.getJustification()).toStrictEqual('center')

    style.setJustification('left')
    expect(style.justification).toStrictEqual('left')
})

test('exportJSON', function () {
    const style = new Style()

    expect(style.exportJSON()).toStrictEqual(
        `{"_class":"Style","_values":{},"_defaults":{"fillColor":null,"fillRule":"nonzero","strokeColor":null,"strokeWidth":1,"strokeCap":"butt","strokeJoin":"miter","strokeScaling":true,"miterLimit":10,"dashOffset":0,"dashArray":[],"shadowColor":null,"shadowBlur":0,"shadowOffset":["Point",0,0],"selectedColor":null,"fontFamily":"sans-serif","fontWeight":"normal","fontSize":12,"leading":null,"justification":"left"}}`
    )
})
