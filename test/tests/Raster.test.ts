import { Raster, Size } from '../../src'

test('Create a raster without a source and check its size', function () {
    const raster = new Raster()
    expect(raster.size.toString()).toStrictEqual(new Size(0, 0).toString())
})

test('Create a raster without a source and set its size', function () {
    const raster = new Raster()
    raster.size = [640, 480]
    expect(raster.size.toString()).toStrictEqual(new Size(640, 480).toString())
})
/*
test('Create a raster from a URL', function (done) {
    // const done = assert.async()
    
    const raster = new Raster('http://localhost:8000/test/assets/paper-js.gif')

    raster.onLoad = function () {
        expect(raster.size.toString()).toStrictEqual(
            new Size(146, 146).toString()
        )
        done()
    }

    raster.onError = function (event: any) {
        console.log(event)
        done()
    }
    
})
*/
