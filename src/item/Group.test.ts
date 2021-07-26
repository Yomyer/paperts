import { Group, PaperScope, Path, Rectangle, Point } from '@paperts'

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
