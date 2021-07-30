import { Group, PaperScope, Path, Rectangle, Point } from '../src'

test('new Group()', function () {
    const paper = PaperScope.clearGlobalPaper()
    const group = new Group()

    expect(paper.project.activeLayer.children[0] === group).toStrictEqual(true)
})

test('new Group([])', function () {
    const paper = PaperScope.clearGlobalPaper()
    const group = new Group([])

    expect(paper.project.activeLayer.children[0] === group).toStrictEqual(true)
    expect(group.children.length).toStrictEqual(0)
})

test('new Group([item])', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path()
    const group = new Group([path])

    expect(paper.project.activeLayer.children.length).toStrictEqual(1)
    expect(group.children[0] === path).toStrictEqual(true)
})

test('new Group({children:[item]})', function () {
    const paper = PaperScope.clearGlobalPaper()
    const path = new Path()
    const group = new Group({
        children: [path]
    })

    expect(paper.project.activeLayer.children.length).toStrictEqual(1)
    expect(path.parent === group).toStrictEqual(true)
    expect(group.children[0] === path).toStrictEqual(true)
})

test('Group bounds', function () {
    const paper = PaperScope.clearGlobalPaper()
    paper.project.currentStyle = {
        strokeWidth: 5,
        strokeColor: 'black'
    }

    const path = new Path.Circle([150, 150], 60)
    const secondPath = new Path.Circle([175, 175], 85)
    const group = new Group([path, secondPath])

    expect(group.bounds).toMatchObject(new Rectangle(90, 90, 170, 170))
    expect(group.strokeBounds).toMatchObject(
        new Rectangle(87.5, 87.5, 175, 175)
    )

    group.rotate(20)

    expect(group.bounds.toString()).toStrictEqual(
        new Rectangle(89.97687, 82.94085, 170.04627, 177.08228).toString()
    )

    expect(group.strokeBounds.toString()).toStrictEqual(
        new Rectangle(87.47687, 80.44085, 175.04627, 182.08228).toString()
    )

    group.rotate(20, new Point(50, 50))

    expect(group.bounds.toString()).toStrictEqual(
        new Rectangle(39.70708, 114.9919, 170.00396, 180.22418).toString()
    )
    expect(group.strokeBounds.toString()).toStrictEqual(
        new Rectangle(37.20708, 112.4919, 175.00396, 185.22418).toString()
    )
})

test('group.addChildren(otherGroup.children)', function () {
    const group = new Group()
    group.addChild(new Path())
    group.addChild(new Path())
    expect(group.children.length).toStrictEqual(2)

    const secondGroup = new Group()
    secondGroup.addChildren(group.children)
    expect(secondGroup.children.length).toStrictEqual(2)
    expect(group.children.length).toStrictEqual(0)
})

test('group.insertChildren(0, otherGroup.children)', function () {
    const group = new Group()
    group.addChild(new Path())
    group.addChild(new Path())
    expect(group.children.length).toStrictEqual(2)

    const secondGroup = new Group()
    secondGroup.insertChildren(0, group.children)
    expect(secondGroup.children.length).toStrictEqual(2)
    expect(group.children.length).toStrictEqual(0)
})

test('group.addChildren()', function () {
    const group = new Group()
    const path1 = new Path()
    const path2 = new Path()
    let children = [path1, path2]
    group.addChildren(children)
    expect(group.children.length).toStrictEqual(2)
    group.removeChildren()
    expect(group.children.length).toStrictEqual(0)
    children.splice(1, 0, null)
    expect(children.length).toStrictEqual(3)
    group.addChildren(children)
    expect(group.children.length).toStrictEqual(2)
    children = [path1, path1, path2]
    group.addChildren(children)
    expect(group.children.length).toStrictEqual(2)
})

test('group.setSelectedColor() with selected bound and position', function () {
    /* TODO: Raster
    const group1 = new Group()
    group1.fillColor = '#f00'
    group1.bounds.selected = true
    group1.position.selected = true
    group1.selectedColor = 'black'
    group1.addChild(new Path.Circle([50, 50], 40))

    const group2 = new Group()
    group2.bounds.selected = true
    group2.position.selected = true
    group2.addChild(new Path.Circle([50, 50], 40))
    group2.selectedColor = 'black'
    comparePixels(group1, group2)
    */
})

test('Group#isEmpty(recursively)', function () {
    let group = new Group()
    expect(true).toStrictEqual(group.isEmpty())
    expect(true).toStrictEqual(group.isEmpty(true))
    group = new Group(new Group())
    expect(false).toStrictEqual(group.isEmpty())
    expect(true).toStrictEqual(group.isEmpty(true))
    group = new Group(new Path())
    expect(false).toStrictEqual(group.isEmpty())
    expect(true).toStrictEqual(group.isEmpty(true))

    /* TODO: PointText
    const group = new Group(new PointText())
    expect(false, group.isEmpty())
    expect(true, group.isEmpty(true))
    */
})

test('group.internalBounds with clip item without clip.applyMatrix = false', function () {
    const point = new Point(100, 100)
    const translation = new Point(100, 100)
    const item = new Path.Circle({
        center: point,
        radius: 50,
        fillColor: 'orange'
    })
    const clip = new Path.Rectangle({
        from: point.subtract(translation),
        to: point.add(translation)
    })
    clip.applyMatrix = false
    clip.translate(translation)
    const group = new Group(clip, item)
    group.clipped = true
    const expected = new Rectangle(point, point.add(translation.multiply(2)))
    expect(group.internalBounds).toStrictEqual(expected)
})

test('group.matrix with parent matrix applied (#1711)', function () {
    const child = new Group({ applyMatrix: false })
    const parent = new Group({ applyMatrix: true, children: [child] })
    const scale = 1.1
    const initial = child.scaling.x
    parent.scale(scale)
    expect(child.scaling.x).toStrictEqual(initial * scale)
})

test('Nested group.matrix.apply(true, true) with matrices not applied', function () {
    const path = new Path({ applyMatrix: false })
    const group = new Group({ applyMatrix: false, children: [path] })
    const parent = new Group({ applyMatrix: false, children: [group] })
    const grandParent = new Group({ applyMatrix: false, children: [parent] })
    expect(grandParent.applyMatrix).toStrictEqual(false)
    expect(group.applyMatrix).toStrictEqual(false)
    expect(path.applyMatrix).toStrictEqual(false)
    grandParent.matrix.apply(true, true)
    expect(grandParent.applyMatrix).toStrictEqual(true)
    expect(group.applyMatrix).toStrictEqual(true)
    expect(path.applyMatrix).toStrictEqual(true)
})
