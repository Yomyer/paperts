import { CompoundPath, Point, Path } from '../src'

test('moveTo() / lineTo()', function () {
    const path = new CompoundPath()

    const lists = [
        [
            new Point(279, 151),
            new Point(149, 151),
            new Point(149, 281),
            new Point(279, 281)
        ],
        [
            new Point(319, 321),
            new Point(109, 321),
            new Point(109, 111),
            new Point(319, 111)
        ]
    ]

    for (let i = 0; i < lists.length; i++) {
        const list = lists[i]
        for (let j = 0; j < list.length; j++) {
            path[!j ? 'moveTo' : 'lineTo'](list[j])
        }
    }

    path.fillColor = 'black'

    expect(path.children.length).toStrictEqual(2)
})

test('CompoundPath#reorient()', function () {
    const path1 = new Path.Rectangle([300, 300], [100, 100])
    const path2 = new Path.Rectangle([50, 50], [200, 200])
    const path3 = new Path.Rectangle([0, 0], [500, 500])

    expect(path1.clockwise).toStrictEqual(true)

    expect(path2.clockwise).toStrictEqual(true)
    expect(path3.clockwise).toStrictEqual(true)

    const compound = new CompoundPath({
        children: [path1, path2, path3]
    }).reorient()

    expect(compound.lastChild === path3).toStrictEqual(true)
    expect(compound.firstChild === path1).toStrictEqual(true)
    expect(path1.clockwise).toStrictEqual(false)
    expect(path2.clockwise).toStrictEqual(false)
    expect(path3.clockwise).toStrictEqual(true)
})
