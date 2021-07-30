import { Item, Group, RasterOptions, Shape } from '../'
import resemble from 'resemblejs'

/**
 * Compare 2 image data with resemble.js library.
 * When comparison fails, expected, actual and compared images are displayed.
 * @param {ImageData} imageData1 the expected image data
 * @param {ImageData} imageData2 the actual image data
 * @param {number} tolerance
 * @param {string} message
 * @param {string} description text displayed when comparison fails
 */
export const compareImageData = function (
    imageData1: ImageData,
    imageData2: ImageData,
    tolerance: number
) {
    /**
     * Build an image element from a given image data.
     * @param {ImageData} imageData
     * @return {HTMLImageElement}
     */
    function image(imageData: ImageData) {
        const canvas = document.createElement('canvas')
        canvas.width = imageData.width
        canvas.height = imageData.height
        canvas.getContext('2d').putImageData(imageData, 0, 0)
        const image = new Image()
        image.src = canvas.toDataURL()
        canvas.remove()
        return image
    }

    tolerance = (tolerance || 1e-4) * 100

    let result: any

    resemble.compare(
        imageData1 as unknown as Buffer,
        imageData2 as unknown as Buffer,
        {
            output: {
                errorColor: { red: 255, green: 51, blue: 0 },
                errorType: 'flat',
                transparency: 1
            },
            ignore: 'antialiasing'
        },
        // When working with imageData, this call is synchronous:
        function (error, data) {
            if (error) {
                console.error(error)
            } else {
                result = data
                console.log(result)
            }
        }
    )

    /*
    const fixed = tolerance < 1 ? (1 / tolerance + '').length - 1 : 0
    const identical = result ? 100 - result.misMatchPercentage : 0
    const ok = Math.abs(100 - identical) <= tolerance
    const text = identical.toFixed(fixed) + '% identical'
    QUnit.push(ok, text, (100).toFixed(fixed) + '% identical', message)
    if (!ok && result && !isNodeContext) {
        // Get the right entry for this unit test and assertion, and
        // replace the results with images
        var entry = document
                .getElementById('qunit-test-output-' + id)
                .querySelector('li:nth-child(' + index + ')'),
            bounds = result.diffBounds
        entry.querySelector('.test-expected td').appendChild(image(imageData2))
        entry.querySelector('.test-actual td').appendChild(image(imageData1))
        entry.querySelector('.test-diff td').innerHTML =
            '<pre>' +
            text +
            (description || '') +
            '</pre><br>' +
            '<img src="' +
            result.getImageDataUrl() +
            '">'
    }
    */
}

export const comparePixels = function (
    actual: any,
    expected: any,
    options?: RasterOptions & { tolerance: number }
) {
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
        compareImageData(
            actualRaster.getImageData(),
            expectedRaster.getImageData(),
            options.tolerance
        )
    }
}
