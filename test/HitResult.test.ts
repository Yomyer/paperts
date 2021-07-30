import {
    HitResult,
    HitResultOptions,
    PaperScope,
    Path,
    Point,
    Segment,
    Size,
    Group,
    SymbolDefinition,
    CompoundPath,
    Shape,
    Color
} from '../src'

test('Hit-testing options', function () {
    const paper = PaperScope.clearGlobalPaper()

    const defaultOptions: HitResultOptions = {
        type: null,
        tolerance: paper.settings.hitTolerance,
        fill: true,
        stroke: true,
        segments: true,
        handles: false,
        ends: false,
        position: false,
        center: false,
        bounds: false,
        guides: false,
        selected: false
    }
    expect(HitResult.getOptions()).toStrictEqual(defaultOptions)
})

function testHitResult(hitResult: HitResult, expeced: any) {
    expect(!!hitResult).toStrictEqual(!!expeced)
    if (hitResult && expeced) {
        if (expeced.type) {
            expect(hitResult.type).toStrictEqual(expeced.type)
        }
        if (expeced.item) {
            expect(hitResult.item === expeced.item).toStrictEqual(true)
        }
        if (expeced.name) {
            expect(hitResult.name).toStrictEqual(expeced.name)
        }
        if (expeced.point) {
            expect(hitResult.point.toString()).toStrictEqual(
                expeced.point.toString()
            )
        }
        if (expeced.segment) {
            expect(hitResult.segment === expeced.segment).toStrictEqual(true)
        }
    }
}

test('hitting a filled shape', function () {
    const path = new Path.Circle([50, 50], 50)

    path.hitTest([75, 75])
    testHitResult(path.hitTest([75, 75]), null)

    path.fillColor = 'red'
    testHitResult(path.hitTest([75, 75]), {
        type: 'fill',
        item: path
    })
})

test('the item on top should be returned', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle([50, 50], 50)
    path.fillColor = 'red'

    const copy = path.clone()

    testHitResult(paper.project.hitTest([75, 75]), {
        type: 'fill',
        item: copy
    })
})

test('hitting a stroked path', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path([0, 0], [50, 0])

    testHitResult(paper.project.hitTest([25, 5]), null)

    path.strokeColor = 'black'
    path.strokeWidth = 10

    testHitResult(path.hitTest([25, 5]), {
        type: 'stroke',
        item: path
    })
})

test('hitting a selected path', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle([50, 50], 50)
    path.fillColor = 'red'

    testHitResult(paper.project.hitTest([75, 75], { selected: true }), null)

    path.selected = true

    testHitResult(paper.project.hitTest([75, 75]), {
        type: 'fill',
        item: path
    })
})

test('hitting path segments', function () {
    const path = new Path([0, 0], [10, 10], [20, 0])

    testHitResult(PaperScope.paper.project.hitTest([10, 10]), {
        type: 'segment',
        item: path
    })
})

test('hitting the center and position of a path', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path([0, 0], [100, 100], [200, 0])

    path.closed = true
    const center = path.bounds.center
    const position = path.position

    const positionResult = {
        type: 'position',
        item: path,
        point: position
    }
    const centerResult = {
        type: 'center',
        item: path,
        point: center
    }

    testHitResult(
        paper.project.hitTest(position, {
            center: true
        }),
        centerResult
    )

    const offset = new Point(1, 1)
    testHitResult(
        paper.project.hitTest(position.add(offset), {
            tolerance: offset.length,
            center: true
        }),
        centerResult
    )

    testHitResult(
        paper.project.hitTest(position, {
            position: true
        }),
        positionResult
    )

    testHitResult(
        paper.project.hitTest(center, {
            position: true
        }),
        positionResult
    )

    path.pivot = [100, 100]

    testHitResult(
        paper.project.hitTest(center, {
            position: true
        }),
        null
    )

    testHitResult(
        paper.project.hitTest(path.position, {
            position: true
        }),
        {
            type: 'position',
            item: path,
            point: path.position
        }
    )
})

test('hitting path handles (1)', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle(new Point(), 10)
    path.firstSegment.handleIn = [-50, 0]
    path.firstSegment.handleOut = [50, 0]
    const firstPoint = path.firstSegment.point

    testHitResult(
        paper.project.hitTest(firstPoint.add(50, 0), {
            handles: true
        }),
        {
            type: 'handle-out',
            item: path
        }
    )

    testHitResult(
        paper.project.hitTest(firstPoint.add(-50, 0), {
            handles: true
        }),
        {
            type: 'handle-in',
            item: path
        }
    )
})

test('hitting path handles (2)', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path(
        new Segment({
            point: [0, 0],
            handleIn: [-50, -50],
            handleOut: [50, 50]
        })
    )

    testHitResult(
        paper.project.hitTest([50, 50], {
            handles: true
        }),
        {
            type: 'handle-out',
            item: path
        }
    )

    testHitResult(
        paper.project.hitTest([-50, -50], {
            handles: true
        }),
        {
            type: 'handle-in',
            item: path
        }
    )
})

test('hit-testing stroke on segment point of a path', function () {
    const path = new Path([0, 0], [50, 50], [100, 0])
    const paper = PaperScope.clearGlobalPaper()
    path.strokeColor = 'black'
    path.closed = true

    let error = null
    try {
        paper.project.hitTest(path.firstSegment.point, {
            stroke: true
        })
    } catch (e) {
        error = e
    }

    expect(error == null).toStrictEqual(true)
})

test('hit-testing a point that is extremely close to a curve', function () {
    const path = new Path.Rectangle([0, 0], [100, 100])
    const point = new Point(2.842 / Math.pow(10, 14), 0)
    let error
    try {
        path.hitTest(point, {
            stroke: true
        })
    } catch (e) {
        error = e
    }

    expect(error == null).toStrictEqual(true)
})

test('hitting path ends', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path([0, 0], [50, 50], [100, 0])
    path.closed = true

    expect(
        !paper.project.hitTest(path.firstSegment.point, {
            ends: true
        })
    ).toStrictEqual(true)

    path.closed = false

    testHitResult(
        paper.project.hitTest(path.lastSegment.point, {
            ends: true
        }),
        {
            type: 'segment',
            item: path,
            segment: path.lastSegment
        }
    )

    expect(
        !paper.project.hitTest(path.segments[1].point, {
            ends: true
        })
    ).toStrictEqual(true)
})

test('When a path is closed, the end of a path cannot be hit.', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path([0, 0], [50, 50], [100, 0])
    path.closed = true

    const hitResult = paper.project.hitTest([0, 0], {
        ends: true
    })
    expect(!hitResult).toStrictEqual(true)
})

test('hitting path bounding box', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    })

    testHitResult(
        paper.project.hitTest(path.bounds.topLeft, {
            bounds: true
        }),
        {
            type: 'bounds',
            item: path,
            name: 'top-left',
            point: path.bounds.topLeft
        }
    )
})

test('hitting raster bounding box', function () {
    /* TODO: Raster
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    })
    const raster = path.rasterize(72)
    path.remove()

    testHitResult(
        paper.project.hitTest(raster.bounds.topLeft, {
            bounds: true
        }),
        {
            type: 'bounds',
            item: raster,
            name: 'top-left',
            point: path.bounds.topLeft
        }
    )
    */
})

test('hitting guides', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    })
    const copy = path.clone()

    let result = paper.project.hitTest(path.position)

    expect(result && result.item).toStrictEqual(copy)

    path.guide = true

    result = paper.project.hitTest(path.position, {
        guides: true,
        fill: true
    })

    expect(result && result.item).toStrictEqual(path)
})

test('hitting raster items', function () {
    /* Todo: Raster
    const paper = PaperScope.clearGlobalPaper()

    const path = new Path.Rectangle(new Point(), new Size(320, 240))
    path.fillColor = 'red'
    const raster = path.rasterize(72)

    let hitResult = paper.project.hitTest(new Point(160, 120))

    expect(hitResult && hitResult.item === raster).toStrictEqual(true)

    raster.translate(100, 100)

    hitResult = paper.project.hitTest(new Point(160, 120))

    expect(hitResult && hitResult.item === raster).toStrictEqual(true)
    */
})

test('hitting guides', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
    })
    const copy = path.clone()

    let result = paper.project.hitTest(path.position)

    expect(result && result.item).toStrictEqual(copy)

    path.guide = true

    result = paper.project.hitTest(path.position, {
        guides: true,
        fill: true
    })

    expect(result && result.item).toStrictEqual(path)
})

test('hitting raster items', function () {
    /* Todo: Raster
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Rectangle(new Point(), new Size(320, 240))
    path.fillColor = 'red'
    const raster = path.rasterize(72)

    let hitResult = paper.project.hitTest(new Point(160, 120))

    expect(hitResult && hitResult.item === raster).toStrictEqual(true)

    raster.translate(100, 100)

    hitResult = paper.project.hitTest(new Point(160, 120))

    expect(hitResult && hitResult.item === raster).toStrictEqual(true)
    */
})

test('hitting path with a text item in the project', function () {
    /* TODO: PoinText
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Rectangle(new Point(50, 50), new Point(100, 100))
    path.fillColor = 'blue'

    let hitResult = paper.project.hitTest(new Point(75, 75))

    expect(hitResult && hitResult.item === path).toStrictEqual(true)

    const text1 = new PointText(30, 30)
    text1.content = 'Text 1'

    hitResult = paper.project.hitTest(new Point(75, 75))

    expect(!!hitResult).toStrictEqual(true)

    expect(!!hitResult && hitResult.item === path).toStrictEqual(true)
    */
})

test('hit-testing of items that come after a transformed group.', function () {
    const paper = PaperScope.clearGlobalPaper()
    paper.project.currentStyle.fillColor = 'black'
    const point1 = new Point(100, 100)
    const point2 = new Point(140, 100)
    const delta = new Point(250, 0)

    const path1 = new Path.Circle(point1, 20)
    path1.name = 'path1'
    const path2 = new Path.Circle(point2, 20)
    path2.name = 'path2'

    const group = new Group(path2)
    group.name = 'group'

    let hitResult = paper.project.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    hitResult = paper.project.hitTest(point2)
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    hitResult = paper.project.hitTest(point2)
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    group.translate(delta)

    hitResult = paper.project.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    hitResult = paper.project.hitTest(point2.add(delta))
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    hitResult = path1.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    group.insertBelow(path1)

    hitResult = paper.project.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    hitResult = paper.project.hitTest(point2.add(delta))
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    hitResult = path1.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)
})

test('hitting path with a text item in the project', function () {
    /* TODO: PointText
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Rectangle(new Point(50, 50), new Point(100, 100))
    path.fillColor = 'blue'

    let hitResult = paper.project.hitTest(new Point(75, 75))

    expect(hitResult && hitResult.item === path).toStrictEqual(true)

    const text1 = new PointText(30, 30)
    text1.content = 'Text 1'

    hitResult = paper.project.hitTest(new Point(75, 75))

    expect(!!hitResult).toStrictEqual(true)

    expect(!!hitResult && hitResult.item === path).toStrictEqual(true)
    */
})

test('hit-testing of items that come after a transformed group.', function () {
    const paper = PaperScope.clearGlobalPaper()
    paper.project.currentStyle.fillColor = 'black'
    const point1 = new Point(100, 100)
    const point2 = new Point(140, 100)
    const delta = new Point(250, 0)

    const path1 = new Path.Circle(point1, 20)
    path1.name = 'path1'
    const path2 = new Path.Circle(point2, 20)
    path2.name = 'path2'

    const group = new Group(path2)
    group.name = 'group'

    let hitResult = paper.project.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    hitResult = paper.project.hitTest(point2)
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    hitResult = paper.project.hitTest(point2)
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    group.translate(delta)

    hitResult = paper.project.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    hitResult = paper.project.hitTest(point2.add(delta))
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    hitResult = path1.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    group.insertBelow(path1)

    hitResult = paper.project.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)

    hitResult = paper.project.hitTest(point2.add(delta))
    expect(hitResult && hitResult.item).toStrictEqual(path2)

    hitResult = path1.hitTest(point1)
    expect(hitResult && hitResult.item).toStrictEqual(path1)
})

test('hit-testing of placed symbols.', function () {
    PaperScope.clearGlobalPaper()
    const point = new Point(100, 100)

    const path = new Path.Circle([0, 0], 20)
    path.fillColor = 'black'
    const definition = new SymbolDefinition(path)
    const placedItem = definition.place(point)
    const hitResult = placedItem.hitTest(point)
    expect(hitResult && hitResult.item === placedItem).toStrictEqual(true)
})

test('hit-testing the corner of a rectangle with miter stroke.', function () {
    PaperScope.clearGlobalPaper()
    const rect = new Path.Rectangle({
        rectangle: [100, 100, 300, 200],
        fillColor: '#f00',
        strokeColor: 'blue',
        strokeJoin: 'miter',
        strokeWidth: 20
    })
    expect(rect.hitTest(rect.strokeBounds.topRight) != null).toStrictEqual(true)
})

test('hit-testing invisible items.', function () {
    const paper = PaperScope.clearGlobalPaper()
    const point = new Point(0, 0)
    const circle1 = new Path.Circle({
        center: point.subtract([25, 0]),
        radius: 50,
        fillColor: 'red'
    })
    const circle2 = new Path.Circle({
        center: point.add([25, 0]),
        radius: 50,
        fillColor: 'blue'
    })

    expect(paper.project.hitTest(point).item === circle2).toStrictEqual(true)

    circle2.visible = false

    expect(paper.project.hitTest(point).item === circle1).toStrictEqual(true)
})

test('hit-testing guides.', function () {
    const paper = PaperScope.clearGlobalPaper()
    const point = new Point(0, 0)
    const circle1 = new Path.Circle({
        center: point.subtract([25, 0]),
        radius: 50,
        fillColor: 'red'
    })
    const circle2 = new Path.Circle({
        center: point.add([25, 0]),
        radius: 50,
        fillColor: 'blue'
    })

    const strokePoint = circle2.bounds.leftCenter

    expect(paper.project.hitTest(strokePoint).item === circle2).toStrictEqual(
        true
    )

    circle2.guide = true

    expect(paper.project.hitTest(strokePoint).item === circle1).toStrictEqual(
        true
    )

    const result = paper.project.hitTest(strokePoint, {
        guides: true,
        fill: true
    })

    expect(result && result.item === circle2).toStrictEqual(true)
})

test('hit-testing fills with tolerance', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path.Rectangle({
        from: [50, 50],
        to: [200, 200],
        fillColor: 'red'
    })

    const tolerance = 10
    let point = path.bounds.bottomRight.add(tolerance / Math.SQRT2)

    const result = paper.project.hitTest(point, {
        tolerance: tolerance,
        fill: true
    })
    expect(result && result.item === path).toStrictEqual(true)

    point = new Point(20, 20)
    const size = new Size(40, 40)
    const hitPoint = new Point(20, 20)
    const options = {
        fill: true,
        tolerance: 20
    }

    const shapeRect = new Shape.Rectangle(point, size)
    shapeRect.fillColor = 'black'

    const pathRect = new Path.Rectangle(point, size)
    pathRect.fillColor = 'black'

    let hit = shapeRect.hitTest(hitPoint, options)

    expect(hit && hit.type === 'fill').toStrictEqual(true)

    hit = pathRect.hitTest(hitPoint, options)
    expect(hit && hit.type === 'fill').toStrictEqual(true)
})

test('hit-testing compound-paths', function () {
    const paper = PaperScope.clearGlobalPaper()
    const center = new Point(100, 100)
    const path1 = new Path.Circle({
        center: center,
        radius: 100
    })
    const path2 = new Path.Circle({
        center: center,
        radius: 50
    })
    const compoundPath = new CompoundPath({
        children: [path1, path2],
        fillColor: 'blue',
        fillRule: 'evenodd'
    })

    let result = paper.project.hitTest(center.add([75, 0]), {
        fill: true
    })

    expect(result && result.item === compoundPath).toStrictEqual(true)

    result = paper.project.hitTest(center, {
        fill: true
    })
    expect(result === null).toStrictEqual(true)
    result = paper.project.hitTest(center, {
        class: Path,
        fill: true
    })

    expect(result && result.item === path2).toStrictEqual(true)
})

test('hit-testing clipped items', function () {
    const paper = PaperScope.clearGlobalPaper()
    const rect = new Path.Rectangle({
        point: [50, 150],
        size: [100, 50],
        fillColor: 'red'
    })
    const circle = new Path.Circle({
        center: [100, 200],
        radius: 20,
        fillColor: 'green'
    })
    const group = new Group({
        children: [rect, circle]
    })
    group.clipped = true

    const point1 = new Point(100, 190)
    const point2 = new Point(100, 210)

    let result = paper.project.hitTest(point1)
    expect(result && result.item === circle).toStrictEqual(true)

    result = paper.project.hitTest(point2)
    expect(result === null).toStrictEqual(true)
})

test('hit-testing with a match function', function () {
    const paper = PaperScope.clearGlobalPaper()
    const point = new Point(100, 100)
    const red = new Color('#f00')
    const green = new Color('0F0')
    const blue = new Color('00F')
    const c1 = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: red
    })
    const c2 = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: green
    })
    const c3 = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: blue
    })

    let result = paper.project.hitTest(point, {
        fill: true,
        match: function (res: HitResult) {
            return res.item.fillColor === red
        }
    })
    expect(result && result.item === c1).toStrictEqual(true)

    result = paper.project.hitTest(point, {
        fill: true,
        match: function (res: HitResult) {
            return res.item.fillColor === green
        }
    })

    expect(result && result.item === c2).toStrictEqual(true)

    result = paper.project.hitTest(point, {
        fill: true,
        match: function (res: HitResult) {
            return res.item.fillColor === blue
        }
    })

    expect(result && result.item === c3).toStrictEqual(true)
})

test('hit-testing for all items', function () {
    const paper = PaperScope.clearGlobalPaper()
    const c1 = new Path.Circle({
        center: [100, 100],
        radius: 40,
        fillColor: 'red'
    })
    const c2 = new Path.Circle({
        center: [120, 120],
        radius: 40,
        fillColor: 'green'
    })
    const c3 = new Path.Circle({
        center: [140, 140],
        radius: 40,
        fillColor: 'blue'
    })

    let result = paper.project.hitTestAll([60, 60])
    expect(result.length === 0).toStrictEqual(true)

    result = paper.project.hitTestAll([80, 80])

    expect(result.length === 1 && result[0].item === c1).toStrictEqual(true)

    result = paper.project.hitTestAll([100, 100])
    expect(
        result.length === 2 && result[0].item === c2 && result[1].item === c1
    ).toStrictEqual(true)

    result = paper.project.hitTestAll([120, 120])
    expect(
        result.length === 3 &&
            result[0].item === c3 &&
            result[1].item === c2 &&
            result[2].item === c1
    ).toStrictEqual(true)

    result = paper.project.hitTestAll([140, 140])
    expect(
        result.length === 2 && result[0].item === c3 && result[1].item === c2
    ).toStrictEqual(true)

    result = paper.project.hitTestAll([160, 160])
    expect(result.length === 1 && result[0].item === c3).toStrictEqual(true)

    result = paper.project.hitTestAll([180, 180])
    expect(result.length === 0).toStrictEqual(true)
})

test('hit-testing shapes with strokes and rounded corners (#1207)', function () {
    const paper = PaperScope.clearGlobalPaper()
    const project = paper.project
    const rect = new Shape.Rectangle({
        size: [300, 180],
        strokeWidth: 30,
        strokeColor: 'black',
        fillColor: 'blue',
        radius: 90
    })

    const path = rect.toPath()
    path.visible = false

    testHitResult(project.hitTest([90, -10]), {
        type: 'stroke'
    })
    testHitResult(project.hitTest([90, 190]), {
        type: 'stroke'
    })
    testHitResult(project.hitTest([-10, 90]), {
        type: 'stroke'
    })

    for (let pos = 0; pos < path.length; pos += 10) {
        const loc = path.getLocationAt(pos)
        const step = loc.normal.multiply(5)
        testHitResult(project.hitTest(loc.point.add(step)), {
            type: 'stroke'
        })
        testHitResult(project.hitTest(loc.point.subtract(step)), {
            type: 'stroke'
        })
    }
})

test('hit-testing scaled items with different settings of view.zoom and item.strokeScaling (#1195)', function () {
    function testItem(
        ctor: typeof Path | typeof Shape,
        zoom: number,
        strokeScaling: boolean
    ) {
        const paper = PaperScope.clearGlobalPaper()
        const project = paper.project
        const view = project.view
        const item = new ctor.Rectangle({
            point: [100, 100],
            size: [100, 100],
            fillColor: 'red',
            strokeColor: 'black',
            strokeWidth: 10,
            strokeScaling: strokeScaling,
            applyMatrix: true
        })
        item.scale(2)
        view.zoom = zoom

        const tolerance = 10
        const options = { tolerance: tolerance, fill: true, stroke: true }
        const bounds = item.strokeBounds
        const point = bounds.leftCenter

        testHitResult(
            project.hitTest(point.subtract(tolerance + 1, 0), options),
            null
        )
        testHitResult(project.hitTest(point.subtract(tolerance, 0), options), {
            type: 'stroke'
        })
        testHitResult(project.hitTest(point, options), { type: 'stroke' })
        item.remove()
    }

    testItem(Shape, 1, false)
    testItem(Shape, 1, true)
    testItem(Shape, 2, false)
    testItem(Shape, 2, true)

    testItem(Path, 1, false)
    testItem(Path, 1, true)
    testItem(Path, 2, false)
    testItem(Path, 2, true)
})

test('hit-testing items scaled to 0', function () {
    const paper = PaperScope.clearGlobalPaper()
    const project = paper.project
    const item = new Shape.Rectangle({
        point: [0, 0],
        size: [100, 100],
        fillColor: 'red',
        selected: true
    })

    item.scale(0)

    testHitResult(project.hitTest(item.position), null)
})
