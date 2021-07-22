import {
    Base,
    PaperScope,
    Point,
    Size,
    Matrix,
    Rectangle,
    Color,
    CanvasProvider,
    Item,
    DrawOptions,
    ItemSerializeFields,
    LinkedSize,
    DomEvent,
    Change,
    HitResult,
    Numerical,
    DomElement,
    Path,
    PathItem
} from '@paperts'

import {
    Point as PointType,
    Size as SizeType,
    Rectangle as RectangleType
} from '../basic/Types'

import { Color as ColorType } from '../style/Types'

export type RasterSerializeFields = ItemSerializeFields & {
    crossOrigin?: string
    source?: string
}

export class Raster extends Item {
    protected _class = 'Raster'
    protected _applyMatrix = false
    protected _canApplyMatrix = false
    protected _boundsOptions = { stroke: false, handle: false }
    protected _serializeFields: RasterSerializeFields = {
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
    protected _context: CanvasRenderingContext2D

    protected static _sampleContext: CanvasRenderingContext2D

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

    /**
     * The size of the raster in pixels.
     *
     * @bean
     * @type Size
     */
    getSize() {
        const size = this._size
        return new LinkedSize(
            size ? size.width : 0,
            size ? size.height : 0,
            this,
            'setSize'
        )
    }

    setSize(width: number, height: number, clear?: boolean): void
    setSize(size: SizeType, clear?: boolean): void
    setSize(...args: []): void {
        const size = Size.read(args)
        const clear = Base.read(args)
        if (!size.equals(this._size)) {
            if (size.width > 0 && size.height > 0) {
                const element = !clear && this.getElement()
                this._setImage(CanvasProvider.getCanvas(size))
                if (element) {
                    this.getContext(true).drawImage(
                        element,
                        0,
                        0,
                        size.width,
                        size.height
                    )
                }
            } else {
                if (this._canvas) CanvasProvider.release(this._canvas)
                this._size = size.clone()
            }
        } else if (clear) {
            this.clear()
        }
    }

    get size() {
        return this.getSize()
    }

    set size(size: SizeType) {
        this.setSize(size)
    }

    /**
     * The width of the raster in pixels.
     *
     * @bean
     * @type Number
     */
    getWidth() {
        return this._size ? this._size.width : 0
    }

    setWidth(width: number) {
        this.setSize(width, this.getHeight())
    }

    get width() {
        return this.getWidth()
    }

    set width(width: number) {
        this.setWidth(width)
    }

    /**
     * The height of the raster in pixels.
     *
     * @bean
     * @type Number
     */
    getHeight() {
        return this._size ? this._size.height : 0
    }

    setHeight(height: number) {
        this.setSize(this.getWidth(), height)
    }

    get height() {
        return this.getHeight()
    }

    set height(height: number) {
        this.setHeight(height)
    }

    /**
     * The loading state of the raster image.
     *
     * @bean
     * @type Boolean
     */
    getLoaded() {
        return this._loaded
    }

    get loaded() {
        return this.getLoaded()
    }

    isEmpty() {
        const size = this._size
        return !size || (size.width === 0 && size.height === 0)
    }

    /**
     * The resolution of the raster at its current size, in PPI (pixels per
     * inch).
     *
     * @bean
     * @type Size
     */
    getResolution() {
        const matrix = this._matrix
        const orig = new Point(0, 0).transform(matrix)
        const u = new Point(1, 0).transform(matrix).subtract(orig)
        const v = new Point(0, 1).transform(matrix).subtract(orig)
        return new Size(72 / u.getLength(), 72 / v.getLength())
    }

    get resolution() {
        return this.getResolution()
    }

    /**
     * The HTMLImageElement or Canvas element of the raster, if one is
     * associated.
     * Note that for consistency, a {@link #onLoad} event will be triggered on
     * the raster even if the image has already finished loading before, or if
     * we are setting the raster to a canvas.
     *
     * @bean
     * @type HTMLImageElement|HTMLCanvasElement
     */
    getImage() {
        return this._image
    }

    setImage(image: HTMLImageElement | HTMLCanvasElement) {
        const emit = (event: Event) => {
            const view = this.getView()
            const type = (event && event.type) || 'load'
            if (view && this.responds(type)) {
                PaperScope.setGlobalPaper(view.scope)
                this.emit(type, new Event(event as unknown as string))
            }
        }

        this._setImage(image)

        if (this._loaded) {
            setTimeout(emit, 0)
        } else if (image) {
            DomEvent.add(image, {
                load: (event) => {
                    this._setImage(image)
                    emit(event)
                },
                error: emit
            })
        }
    }

    get image() {
        return this.getImage()
    }

    set image(image: HTMLImageElement | HTMLCanvasElement) {
        this.setImage(image)
    }

    /**
     * Internal version of {@link #setImage(image)} that does not trigger
     * events. This is used by #setImage(), but also in other places where
     * underlying canvases are replaced, resized, etc.
     */
    _setImage(image: HTMLImageElement | HTMLCanvasElement) {
        if (this._canvas) CanvasProvider.release(this._canvas)
        if (image instanceof HTMLCanvasElement && image.getContext) {
            this._image = null
            this._canvas = image as HTMLCanvasElement
            this._loaded = true
        } else if (image instanceof HTMLImageElement) {
            this._image = image
            this._canvas = null
            this._loaded = !!(image && image.src && image.complete)
        }

        this._size = new Size(
            image instanceof HTMLImageElement
                ? image.naturalWidth || image.width
                : 0,
            image instanceof HTMLImageElement
                ? image.naturalHeight || image.height
                : 0
        )
        this._context = null
        this._changed(Change.GEOMETRY | Change.PIXELS)
    }

    /**
     * The Canvas object of the raster. If the raster was created from an image,
     * accessing its canvas causes the raster to try and create one and draw the
     * image into it. Depending on security policies, this might fail, in which
     * case `null` is returned instead.
     *
     * @bean
     * @type HTMLCanvasElement
     */
    getCanvas() {
        if (!this._canvas) {
            const ctx = CanvasProvider.getContext(this._size)
            try {
                if (this._image) ctx.drawImage(this._image, 0, 0)
                this._canvas = ctx.canvas
            } catch (e) {
                CanvasProvider.release(ctx)
            }
        }
        return this._canvas
    }

    setCanvas(canvas: HTMLCanvasElement) {
        this.setImage(canvas)
    }

    get canvas() {
        return this.getCanvas()
    }

    set canvas(canvas: HTMLCanvasElement) {
        this.setCanvas(canvas)
    }

    /**
     * The Canvas 2D drawing context of the raster.
     *
     * @bean
     * @type CanvasRenderingContext2D
     */
    getContext(_change?: boolean) {
        if (!this._context) this._context = this.getCanvas().getContext('2d')

        if (_change) {
            this._image = null
            this._changed(Change.PIXELS)
        }
        return this._context
    }

    setContext(context: CanvasRenderingContext2D) {
        this._context = context
    }

    get context() {
        return this.getContext()
    }

    set context(context: CanvasRenderingContext2D) {
        this.setContext(context)
    }

    /**
     * The source of the raster, which can be set using a DOM Image, a Canvas,
     * a data url, a string describing the URL to load the image from, or the
     * ID of a DOM element to get the image from (either a DOM Image or a
     * Canvas). Reading this property will return the url of the source image or
     * a data-url.
     * Note that for consistency, a {@link #onLoad} event will be triggered on
     * the raster even if the image has already finished loading before.
     *
     * @bean
     * @type HTMLImageElement|HTMLCanvasElement|String
     *
     * @example {@paperscript}
     * var raster = new Raster();
     * raster.source = 'http://paperjs.org/about/paper-js.gif';
     * raster.position = view.center;
     *
     * @example {@paperscript}
     * var raster = new Raster({
     *     source: 'http://paperjs.org/about/paper-js.gif',
     *     position: view.center
     * });
     */
    getSource() {
        const image = this._image
        return (
            (image instanceof HTMLImageElement && image.src) || this.toDataURL()
        )
    }

    setSource(src: string) {
        const image = new self.Image()
        const crossOrigin = this._crossOrigin
        if (crossOrigin) image.crossOrigin = crossOrigin

        if (src) image.src = src
        this.setImage(image)
    }

    get source() {
        return this.getSource()
    }

    set source(src: string) {
        this.setSource(src)
    }

    /**
     * The crossOrigin value to be used when loading the image resource, in
     * order to support CORS. Note that this needs to be set before setting the
     * {@link #source} property in order to always work (e.g. when the image is
     * cached in the browser).
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * var raster = new Raster({
     *     crossOrigin: 'anonymous',
     *     source: 'http://assets.paperjs.org/images/marilyn.jpg',
     *     position: view.center
     * });
     *
     * console.log(view.element.toDataURL('image/png').substring(0, 32));
     */
    getCrossOrigin() {
        const image = this._image
        return (
            (image instanceof HTMLImageElement && image.crossOrigin) ||
            this._crossOrigin ||
            ''
        )
    }

    setCrossOrigin(crossOrigin: string) {
        this._crossOrigin = crossOrigin
        const image = this._image
        if (image instanceof HTMLImageElement) image.crossOrigin = crossOrigin
    }

    get crossOrigin() {
        return this.getCrossOrigin()
    }

    set crossOrigin(crossOrigin: string) {
        this.setCrossOrigin(crossOrigin)
    }

    /**
     * Determines if the raster is drawn with pixel smoothing when scaled up or
     * down, and if so, at which quality its pixels are to be smoothed. The
     * settings of this property control both the `imageSmoothingEnabled` and
     * `imageSmoothingQuality` properties of the `CanvasRenderingContext2D`
     * interface.
     *
     * By default, smoothing is enabled at `'low'` quality. It can be set to of
     * `'off'` to scale the raster's pixels by repeating the nearest neighboring
     * pixels, or to `'low'`, `'medium'` or `'high'` to control the various
     * degrees of available image smoothing quality.
     *
     * For backward compatibility, it can can also be set to `false` (= `'off'`)
     * or `true` (= `'low'`).
     *
     * @bean
     * @type String
     * @default 'low'
     * @values 'low', 'medium', 'high', 'off'
     *
     * @example {@paperscript} var raster = new Raster({source:
     * 'http://assets.paperjs.org/images/marilyn.jpg', smoothing: 'off'
     * });
     * raster.scale(5);
     */
    getSmoothing() {
        return this._smoothing
    }

    setSmoothing(smoothing: string) {
        this._smoothing =
            typeof smoothing === 'string'
                ? smoothing
                : smoothing
                ? 'low'
                : 'off'
        this._changed(Change.ATTRIBUTE)
    }

    getElement() {
        return this._canvas || (this._loaded && this._image)
    }

    /**
     * Extracts a part of the Raster's content as a sub image, and returns it as
     * a Canvas object.
     *
     * @param {Rectangle} rect the boundaries of the sub image in pixel
     * coordinates
     *
     * @return {HTMLCanvasElement} the sub image as a Canvas object
     */
    getSubCanvas(point: PointType, size: SizeType): HTMLCanvasElement
    getSubCanvas(rectangle: RectangleType): HTMLCanvasElement
    getSubCanvas(
        x: number,
        y: number,
        width: number,
        height: number
    ): HTMLCanvasElement

    getSubCanvas(from: PointType, to: PointType): HTMLCanvasElement
    getSubCanvas(...args: any[]): HTMLCanvasElement {
        const rect = Rectangle.read(args)
        const ctx = CanvasProvider.getContext(rect.getSize())
        ctx.drawImage(
            this.getCanvas(),
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            0,
            0,
            rect.width,
            rect.height
        )
        return ctx.canvas
    }

    /**
     * Extracts a part of the raster item's content as a new raster item, placed
     * in exactly the same place as the original content.
     *
     * @param {Rectangle} rect the boundaries of the sub raster in pixel
     * coordinates
     *
     * @return {Raster} the sub raster as a newly created raster item
     */
    getSubRaster(point: PointType, size: SizeType): Raster
    getSubRaster(rectangle: RectangleType): Raster
    getSubRaster(x: number, y: number, width: number, height: number): Raster

    getSubRaster(from: PointType, to: PointType): Raster
    getSubRaster(...args: any[]): Raster {
        const rect = Rectangle.read(args)
        const raster = new Raster(Item.NO_INSERT)
        raster._setImage(this.getSubCanvas(rect))
        raster.translate(rect.getCenter().subtract(this.getSize().divide(2)))
        raster._matrix.prepend(this._matrix)
        raster.insertAbove(this)
        return raster
    }

    /**
     * Returns a Base 64 encoded `data:` URL representation of the raster.
     *
     * @return {String}
     */
    toDataURL(type?: string, quality?: any): string
    toDataURL(...args: any[]): string {
        const image = this._image
        const src = image instanceof HTMLImageElement && image.src
        if (/^data:/.test(src)) return src
        const canvas = this.getCanvas()
        return canvas ? canvas.toDataURL(...args) : null
    }

    /**
     * Draws an image on the raster.
     *
     * @param {CanvasImageSource} image
     * @param {Point} point the offset of the image as a point in pixel
     * coordinates
     */
    drawImage(image: CanvasImageSource, x: number, y: number): void
    drawImage(image: CanvasImageSource, point: PointType): void
    drawImage(image: CanvasImageSource, ...args: any[]): void {
        const point = Point.read(args)
        this.getContext(true).drawImage(image, point.x, point.y)
    }

    /**
     * Calculates the average color of the image within the given path,
     * rectangle or point. This can be used for creating raster image
     * effects.
     *
     * @param {Path|Rectangle|Point} object
     * @return {Color} the average color contained in the area covered by the
     * specified path, rectangle or point
     */
    getAverageColor(object: Path | Rectangle | Point): Color {
        let bounds, path
        if (!object) {
            bounds = this.getBounds()
        } else if (object instanceof PathItem) {
            path = object
            bounds = object.getBounds()
        } else if (typeof object === 'object') {
            if ('width' in object) {
                bounds = new Rectangle(object)
            } else if ('x' in object) {
                bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1)
            }
        }
        if (!bounds) return null

        const sampleSize = 32
        const width = Math.min(bounds.width, sampleSize)
        const height = Math.min(bounds.height, sampleSize)

        let ctx = Raster._sampleContext
        if (!ctx) {
            ctx = Raster._sampleContext = CanvasProvider.getContext(
                new Size(sampleSize)
            )
        } else {
            ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1)
        }
        ctx.save()
        const matrix = new Matrix()
            .scale(width / bounds.width, height / bounds.height)
            .translate(-bounds.x, -bounds.y)
        matrix.applyToContext(ctx)

        if (path) path.draw(ctx, { clip: true, matrices: [matrix] })

        this._matrix.applyToContext(ctx)
        const element = this.getElement()
        const size = this._size
        if (element) ctx.drawImage(element, -size.width / 2, -size.height / 2)
        ctx.restore()

        const pixels = ctx.getImageData(
            0.5,
            0.5,
            Math.ceil(width),
            Math.ceil(height)
        ).data
        const channels = [0, 0, 0]
        let total = 0

        for (let i = 0, l = pixels.length; i < l; i += 4) {
            let alpha = pixels[i + 3]
            total += alpha
            alpha /= 255
            channels[0] += pixels[i] * alpha
            channels[1] += pixels[i + 1] * alpha
            channels[2] += pixels[i + 2] * alpha
        }
        for (let i = 0; i < 3; i++) channels[i] /= total
        return total ? Color.read(channels) : null
    }

    /**
     * {@grouptitle Pixels}
     * Gets the color of a pixel in the raster.
     *
     * @name Raster#getPixel
     * @function
     * @param {Number} x the x offset of the pixel in pixel coordinates
     * @param {Number} y the y offset of the pixel in pixel coordinates
     * @return {Color} the color of the pixel
     */
    getPixel(x: number, y: number): Color

    /**
     * Gets the color of a pixel in the raster.
     *
     * @name Raster#getPixel
     * @function
     * @param {Point} point the offset of the pixel as a point in pixel
     *     coordinates
     * @return {Color} the color of the pixel
     */
    getPixel(point: PointType): Color
    getPixel(...args: any[]): Color {
        const point = Point.read(args)
        const data = this.getContext().getImageData(point.x, point.y, 1, 1).data

        return new Color(
            'rgb',
            [data[0] / 255, data[1] / 255, data[2] / 255],
            data[3] / 255
        )
    }

    /**
     * Sets the color of the specified pixel to the specified color.
     *
     * @name Raster#setPixel
     * @function
     * @param {Number} x the x offset of the pixel in pixel coordinates
     * @param {Number} y the y offset of the pixel in pixel coordinates
     * @param {Color} color the color that the pixel will be set to
     */
    setPixel(x: number, y: number, color: ColorType): void

    /**
     * Sets the color of the specified pixel to the specified color.
     *
     * @name Raster#setPixel
     * @function
     * @param {Point} point the offset of the pixel as a point in pixel
     *     coordinates
     * @param {Color} color the color that the pixel will be set to
     */
    setPixel(point: PointType, color: ColorType): void

    setPixel(...args: any[]): void {
        const point = Point.read(args)
        const color = Color.read(args)
        const components = color.convert('rgb')
        const alpha = color.alpha
        const ctx = this.getContext(true)
        const imageData = ctx.createImageData(1, 1)
        const data = imageData.data
        data[0] = components[0] * 255
        data[1] = components[1] * 255
        data[2] = components[2] * 255
        data[3] = alpha != null ? alpha * 255 : 255
        ctx.putImageData(imageData, point.x, point.y)
    }

    /**
     * Clears the image, if it is backed by a canvas.
     */
    clear() {
        const size = this._size
        this.getContext(true).clearRect(0, 0, size.width + 1, size.height + 1)
    }

    // DOCS: document Raster#createImageData
    /**
     * {@grouptitle Image Data}
     * @param {Size} size
     * @return {ImageData}
     */
    createImageData(width: number, height: number): ImageData
    createImageData(size: SizeType): ImageData
    createImageData(...args: any[]): ImageData {
        const size = Size.read(args)
        return this.getContext().createImageData(size.width, size.height)
    }

    // DOCS: document Raster#getImageData
    /**
     * @param {Rectangle} rect
     * @return {ImageData}
     */
    getImageData(point: PointType, size: SizeType): ImageData
    getImageData(rectangle: RectangleType): ImageData
    getImageData(x: number, y: number, width: number, height: number): ImageData
    getImageData(from: PointType, to: PointType): ImageData
    getImageData(...args: any[]): ImageData {
        let rect = Rectangle.read(args)
        if (rect.isEmpty()) rect = new Rectangle(this._size)
        return this.getContext().getImageData(
            rect.x,
            rect.y,
            rect.width,
            rect.height
        )
    }

    // DOCS: document Raster#putImageData
    /**
     * @param {ImageData} data
     * @param {Point} point
     */
    putImageData(data: ImageData, x: number, y: number): void
    putImageData(data: ImageData, point: PointType): void
    putImageData(data: ImageData, ...args: any): void {
        const point = Point.read(args)
        this.getContext(true).putImageData(data, point.x, point.y)
    }

    // DOCS: document Raster#setImageData
    /**
     * @param {ImageData} data
     */
    setImageData(data: ImageData) {
        this.setSize(data)
        this.getContext(true).putImageData(data, 0, 0)
    }

    /**
     * {@grouptitle Event Handlers}
     *
     * The event handler function to be called when the underlying image has
     * finished loading and is ready to be used. This is also triggered when
     * the image is already loaded, or when a canvas is used instead of an
     * image.
     *
     * @name Raster#onLoad
     * @property
     * @type ?Function
     *
     * @example
     * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
     * var raster = new Raster(url);
     *
     * // If you create a Raster using a url, you can use the onLoad
     * // handler to do something once it is loaded:
     * raster.onLoad = function() {
     *     console.log('The image has finished loading.');
     * };
     *
     * // As with all events in paper.js, you can also use this notation instead
     * // to install multiple handlers:
     * raster.on('load', function() {
     *     console.log('Now the image is definitely ready.');
     * });
     */
    onLoad: (event?: Event, type?: string) => void

    /**
     *
     * The event handler function to be called when there is an error loading
     * the underlying image.
     *
     * @name Raster#onError
     * @property
     * @type ?Function
     */
    onError: (event?: Event, type?: string) => void

    protected _getBounds(matrix: Matrix) {
        const rect = new Rectangle(this._size).setCenter(0, 0)
        return matrix ? matrix.transformBounds(rect) : rect
    }

    protected _hitTestSelf(point: Point): HitResult {
        if (this._contains(point)) {
            const that = this
            const offset = point.add(that._size.divide(2)).round()
            return new HitResult('pixel', that, {
                offset,
                color: that.getPixel(offset)
            })
        }

        return null
    }

    protected _draw(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        viewMatrix?: Matrix
    ) {
        const element = this.getElement()
        if (element && element.width > 0 && element.height > 0) {
            ctx.globalAlpha = Numerical.clamp(this._opacity, 0, 1)

            this._setStyles(ctx, param, viewMatrix)

            const smoothing = this._smoothing
            const disabled = smoothing === 'off'
            DomElement.setPrefixed(
                ctx,
                disabled ? 'imageSmoothingEnabled' : 'imageSmoothingQuality',
                disabled ? false : smoothing
            )

            ctx.drawImage(
                element,
                -this._size.width / 2,
                -this._size.height / 2
            )
        }
    }

    protected _canComposite() {
        return true
    }
}
