import Point from '../basic/Point'
import Size from '../basic/Size'
import CanvasProvider from '../canvas/CanvasProvider'
import Item, { SerializFields } from './Item'

export default class Raster extends Item {
    protected _class = 'Raster'
    protected _applyMatrix = false
    protected _canApplyMatrix = false
    protected _boundsOptions = { stroke: false, handle: false }
    protected _serializeFields: SerializFields = {
        crossOrigin: null,
        source: null
    }

    protected _prioritize = ['crossOrigin']
    protected _smoothing = 'low'
    protected _size: Size
    protected _loaded: boolean
    protected _image: HTMLImageElement | HTMLCanvasElement
    protected _canvas: HTMLCanvasElement
    protected _crossOrigin: string

    /**
     * Creates a new raster item from the passed argument, and places it in the
     * active layer. `source` can either be a DOM Image, a Canvas, or a string
     * describing the URL to load the image from, or the ID of a DOM element to
     * get the image from (either a DOM Image or a Canvas).
     *
     * @name Raster#initialize
     * @param {HTMLImageElement|HTMLCanvasElement|String} [source] the source of
     *     the raster
     * @param {Point} [position] the center position at which the raster item is
     *     placed
     *
     * @example {@paperscript height=300} // Creating a raster using a url
     * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
     * var raster = new Raster(url);
     *
     * // If you create a Raster using a url, you can use the onLoad
     * // handler to do something once it is loaded:
     * raster.onLoad = function() {
     *     console.log('The image has loaded.');
     * };
     *
     * @example // Creating a raster using the id of a DOM Image:
     *
     * // Create a raster using the id of the image:
     * var raster = new Raster('art');
     *
     * @example // Creating a raster using a DOM Image:
     *
     * // Find the element using its id:
     * var imageElement = document.getElementById('art');
     *
     * // Create the raster:
     * var raster = new Raster(imageElement);
     */
    constructor(
        size: HTMLImageElement | HTMLCanvasElement | String,
        position?: Point
    )

    /**
     * Creates a new empty raster of the given size, and places it in the
     * active layer.
     *
     * @name Raster#initialize
     * @param {Size} size the size of the raster
     * @param {Point} [position] the center position at which the raster item is
     *     placed
     *
     * @example {@paperscript height=150}
     * // Creating an empty raster and fill it with random pixels:
     * var width = 100;
     * var height = 100;
     *
     * // Create an empty raster placed at view center.
     * var raster = new Raster(new Size(width, height), view.center);
     *
     * // For all of its pixels...
     * for (var i = 0; i < width; i++) {
     *     for (var j = 0; j < height; j++) {
     *         // ...set a random color.
     *         raster.setPixel(i, j, Color.random());
     *     }
     * }
     */
    constructor(size: Size, position?: Point)

    /**
     * Creates a new raster from an object description, and places it in the
     * active layer.
     *
     * @name Raster#initialize
     * @param {Object} object an object containing properties to be set on the
     *     raster
     *
     * @example {@paperscript height=300}
     * var raster = new Raster({
     *     source: 'http://assets.paperjs.org/images/marilyn.jpg',
     *     position: view.center
     * });
     *
     * raster.scale(0.5);
     * raster.rotate(10);
     */
    constructor(object?: object)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]): this {
        if (
            !this._initialize(
                args[0],
                args[1] !== undefined && Point.read(args)
            )
        ) {
            let image
            const type = typeof args[0]
            const object =
                type === 'string'
                    ? document.getElementById(args[0])
                    : type === 'object'
                    ? args[0]
                    : null
            if (object && object !== Item.NO_INSERT) {
                if (object.getContext || object.naturalHeight != null) {
                    image = object
                } else if (object) {
                    const size = Size.read(args)
                    if (!size.isZero()) {
                        image = CanvasProvider.getCanvas(size)
                    }
                }
            }
            if (image) {
                this.setImage(image)
            } else {
                this.setSource(args[0])
            }
        }
        if (!this._size) {
            this._size = new Size()
            this._loaded = false
        }

        return this
    }

    _equals(item: Raster) {
        return this.getSource() === item.getSource()
    }

    copyContent(source: Raster) {
        const image = source._image
        const canvas = source._canvas
        if (image) {
            this._setImage(image)
        } else if (canvas) {
            const copyCanvas = CanvasProvider.getCanvas(source._size)
            copyCanvas.getContext('2d').drawImage(canvas, 0, 0)
            this._setImage(copyCanvas)
        }
        // TODO: Shouldn't this be copied with attributes instead of content?
        this._crossOrigin = source._crossOrigin
    }
}
