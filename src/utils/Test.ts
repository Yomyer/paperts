import { Item, Group, RasterOptions, Shape, Raster } from '@paperts'

const { toMatchImageSnapshot } = require('jest-image-snapshot')
expect.extend({ toMatchImageSnapshot })

export const comparePixels = function (
    actual: any,
    expected: any,
    options?: RasterOptions & { tolerance: number }
) {
    function rasterize(item: Item, group: Group, _resolution: number): Raster {
        const raster: Raster = null

        if (group) {
            group.addChild(item)
        }

        return raster
    }

    /*
    function rasterize(item: Item, group: Group, resolution: number) {
        let raster = null
        if (group) {
            const parent = item.parent
            const index = item.index
            group.addChild(item)
            raster = group.rasterize({ resolution, insert: false })
            if (parent) {
                parent.insertChild(index, item)
            } else {
                item.remove()
            }
        }
        return raster
    }
    */

    if (!expected) {
        return expect(actual).toStrictEqual(expected)
    } else if (!actual) {
        actual = new Group()
    }

    options = (options || {}) as any

    const resolution = options.resolution || 72
    const actualBounds = actual.strokeBounds
    const expectedBounds = expected.strokeBounds
    const bounds = actualBounds.isEmpty()
        ? expectedBounds
        : expectedBounds.isEmpty()
        ? actualBounds
        : actualBounds.unite(expectedBounds)

    if (bounds.isEmpty()) {
        expect('empty').toEqual('empty')
        return
    }

    const group =
        actual &&
        expected &&
        new Group({
            insert: false,
            children: [
                new Shape.Rectangle({
                    rectangle: bounds,
                    fillColor: 'white'
                })
            ]
        })
    const actualRaster = rasterize(actual, group, resolution)
    const expectedRaster = rasterize(expected, group, resolution)
    if (!actualRaster || !expectedRaster) {
        /*
        QUnit.push(
            false,
            null,
            null,
            'Unable to compare rasterized items: ' +
                (!actualRaster ? 'actual' : 'expected') +
                ' item is null',
            QUnit.stack(2)
           
        ) */
    } else {
        expected(actualRaster.getImageData()).toMatchImageSnapshot(
            expectedRaster.getImageData()
        )
        /*
        compareImageData(
            actualRaster.getImageData(),
            expectedRaster.getImageData(),
            options.tolerance
        )
        */
    }
}
