import Point from './Point'

test('exportJSON()', () => {
    const base = new Point()
    const json = base.exportJSON()
    console.log(json)
    let imported = new Point()
    imported = imported.importJSON(json)

    expect(base).toMatchObject(imported)
})

test('equals()', () => {
    const base = new Point()

    const json = base.exportJSON()
    console.log(json)

    let imported = new Point()
    imported = imported.importJSON(json)

    expect(Point.equals(base, imported)).toStrictEqual(true)
})
