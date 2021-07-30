import {
    Base,
    PaperScope,
    Size,
    LinkedSize,
    Matrix,
    MatrixDecompose,
    Emitter,
    EmitterType,
    EventList,
    FrameEvent,
    ResizeEvent,
    DomElement,
    Project,
    DomEvent,
    Change,
    Item,
    Rectangle,
    Point,
    LinkedPoint,
    Exportable,
    Runtime,
    MouseEvent as PaperMouseEvent,
    MouseEventTypes,
    KeyEvent as PaperKeyEvent,
    KeyEventTypes,
    ToolEventTypes,
    EventTypeHooks,
    EventTypes
} from '../'

import Stats from '../utils/Stats'
import { Size as SizeType, Point as PointType } from '../basic/Types'

type ViewFrameEventFunction = (_: FrameEvent) => void
type ViewMouseEventFunction = (_: PaperMouseEvent) => void
type ViewResizeEventFunction = (_: ResizeEvent) => void

@Exportable()
@Runtime((proto: typeof View) => {
    View.registerEvents(proto)
})
export class View extends Emitter {
    protected _class = 'View'
    protected _windowEvents: EventList
    protected _stats: Stats
    protected _project: Project
    protected _scope: PaperScope
    protected _element: HTMLElement | Size
    protected _pixelRatio: number
    protected _viewSize: Size
    protected _frameItems: any
    protected _frameItemCount: number
    protected _itemEvents: { native: {}; virtual: {} }
    protected _autoUpdate: boolean
    protected _needsUpdate: boolean
    protected _matrix: Matrix
    protected _animate = false
    protected _time = 0
    protected _count = 0
    protected _requested: boolean
    protected _last: number
    protected _bounds: Rectangle
    protected _decomposed: MatrixDecompose

    declare _viewEvents: EventList

    declare _handleMouseEvent: (
        type: MouseEventTypes,
        event: MouseEvent,
        point?: Point
    ) => void

    declare _handleKeyEvent: (
        type: KeyEventTypes,
        event: KeyboardEvent,
        key: string,
        character: string
    ) => void

    declare _countItemEvent: (type: string, sign: number) => void

    static updateFocus: () => void
    static _resetState: () => void

    static _id: number = 0
    static _focused: View
    static _views: View[] = []
    static _viewsById: { [key: string]: View } = {}

    protected _events = Item.itemHandlers.reduce(
        (event: EventTypeHooks, name: EventTypes) => {
            event[name] = {}

            return event
        },
        {
            onFrame: {
                install: () => {
                    this.play()
                },

                uninstall: () => {
                    this.pause()
                }
            }
        }
    )

    constructor(project: Project, canvas: HTMLCanvasElement)
    constructor(project: Project, size: SizeType)
    constructor(project?: Project)
    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(project?: Project, element?: HTMLElement | Size): this {
        this._injectEvents(this._events)

        function getSize(name: string) {
            return (
                element[name] ||
                parseInt((element as HTMLElement).getAttribute(name), 10)
            )
        }

        function getCanvasSize() {
            const size = DomElement.getSize(element as HTMLElement)
            return size.isNaN() || size.isZero()
                ? new Size(getSize('width'), getSize('height'))
                : size
        }

        let size

        if (window && element && element instanceof HTMLElement) {
            this._id = element.getAttribute('id')
            if (this._id == null)
                element.setAttribute(
                    'id',
                    (this._id = 'paper-view-' + View._id++)
                )
            DomEvent.add(element, this._viewEvents)
            const none = 'none'
            DomElement.setPrefixed(element.style, {
                userDrag: none,
                userSelect: none,
                touchCallout: none,
                contentZooming: none,
                tapHighlightColor: 'rgba(0,0,0,0)'
            })

            if (PaperScope.hasAttribute(element, 'resize')) {
                DomEvent.add(
                    window,
                    (this._windowEvents = {
                        resize: () => {
                            this.setViewSize(getCanvasSize())
                        }
                    })
                )
            }

            size = getCanvasSize()

            if (
                PaperScope.hasAttribute(element, 'stats') &&
                typeof Stats !== 'undefined'
            ) {
                this._stats = new Stats()
                // Align top-left to the element
                const stats = this._stats.dom
                const style = stats.style
                const offset = DomElement.getOffset(element)
                style.position = 'absolute'
                style.left = offset.x + 'px'
                style.top = offset.y + 'px'
                document.body.appendChild(stats)
            }
        } else {
            size = new Size(element as Size)
            element = null
        }

        this._project = project
        this._scope = project.scope
        this._element = element as HTMLElement

        if (!this._pixelRatio)
            this._pixelRatio = (window && window.devicePixelRatio) || 1

        this._setElementSize(size.width, size.height)
        this._viewSize = size
        View._views.push(this)
        View._viewsById[this._id] = this
        this._matrix = new Matrix()
        this._matrix.owner = this
        if (!View._focused) View._focused = this
        this._frameItems = {}
        this._frameItemCount = 0
        this._itemEvents = { native: {}, virtual: {} }
        this._autoUpdate = !PaperScope.paper.agent.node
        this._needsUpdate = false

        return this
    }

    remove() {
        if (!this._project) return false

        if (View._focused === this) View._focused = null

        View._views.splice(View._views.indexOf(this), 1)
        delete View._viewsById[this._id]

        const project = this._project
        if (project.view === this) project.view = null

        DomEvent.remove(this._element as HTMLElement, this._viewEvents)
        DomEvent.remove(window, this._windowEvents)
        this._element = this._project = null

        this.off('frame')
        this._animate = false
        this._frameItems = {}
        return true
    }

    get viewEvents() {
        return this._viewEvents
    }

    set viewEvents(events: EventList) {
        this._viewEvents = events
    }

    get project() {
        return this._project
    }

    get needsUpdate() {
        return this._needsUpdate
    }

    set needsUpdate(update: boolean) {
        this._needsUpdate = update
    }

    get requested() {
        return this._requested
    }

    get scope() {
        return this._scope
    }

    /**
     * Controls whether the view is automatically updated in the next animation
     * frame on changes, or whether you prefer to manually call
     * {@link #update()} or {@link #requestUpdate()} after changes.
     * Note that this is `true` by default, except for Node.js, where manual
     * updates make more sense.
     *
     * @bean
     * @type Boolean
     */
    getAutoUpdate() {
        return this._autoUpdate
    }

    setAutoUpdate(autoUpdate: boolean) {
        this._autoUpdate = autoUpdate
        if (autoUpdate) this.requestUpdate()
    }

    get autoUpdate() {
        return this.getAutoUpdate()
    }

    set autoUpdate(autoUpdate: boolean) {
        this.setAutoUpdate(autoUpdate)
    }

    /**
     * Updates the view if there are changes. Note that when using built-in
     * event hanlders for interaction, animation and load events, this method is
     * invoked for you automatically at the end.
     *
     * @return {Boolean} {@true if the view was updated}
     */
    update(): boolean {
        return false
    }

    /**
     * Updates the view if there are changes.
     *
     * @deprecated use {@link #update()} instead.
     */
    draw() {
        this.update()
    }

    /**
     * Requests an update of the view if there are changes through the browser's
     * requestAnimationFrame() mechanism for smooth animation. Note that when
     * using built-in event handlers for interaction, animation and load events,
     * updates are automatically invoked for you automatically at the end.
     */
    requestUpdate() {
        if (!this._requested) {
            DomEvent.requestAnimationFrame(() => {
                this._requested = false

                if (this._animate) {
                    this.requestUpdate()
                    const element = this._element as HTMLElement

                    if (
                        (!DomElement.getPrefixed(document, 'hidden') ||
                            PaperScope.getAttribute(element, 'keepalive') ===
                                'true') &&
                        DomElement.isInView(element)
                    ) {
                        this._handleFrame()
                    }
                }
                if (this._autoUpdate) this.update()
            })
            this._requested = true
        }
    }

    /**
     * Makes all animation play by adding the view to the request animation
     * loop.
     */
    play() {
        this._animate = true
        // Request a frame handler straight away to initialize the
        // sequence of onFrame calls.
        this.requestUpdate()
    }

    /**
     * Makes all animation pause by removing the view from the request animation
     * loop.
     */
    pause() {
        this._animate = false
    }

    protected _handleFrame() {
        PaperScope.setGlobalPaper(this._scope)
        const now = Date.now() / 1000
        const delta = this._last ? now - this._last : 0
        this._last = now

        this.emit(
            'frame',
            new Base({
                delta: delta,
                time: (this._time += delta),
                count: this._count++
            }) as FrameEvent & Base
        )
        if (this._stats) this._stats.update()
    }

    protected _animateItem(item: Item, animate: boolean) {
        const items = this._frameItems
        if (animate) {
            items[item.id] = {
                item: item,
                // Additional information for the event callback
                time: 0,
                count: 0
            }
            if (++this._frameItemCount === 1)
                this.on('frame', this._handleFrameItems)
        } else {
            delete items[item.id]
            if (--this._frameItemCount === 0) {
                // If this is the last one, just stop animating straight away.
                this.off('frame', this._handleFrameItems)
            }
        }
    }

    animateItem(item: Item, animate: boolean) {
        this._animateItem(item, animate)
    }

    protected _handleFrameItems(event: FrameEvent) {
        for (const i in this._frameItems) {
            const entry = this._frameItems[i]
            entry.item.emit(
                'frame',
                new Base(event, {
                    time: (entry.time += event.delta),
                    count: entry.count++
                })
            )
        }
    }

    protected _changed() {
        this._project.changed(Change.VIEW)

        this._bounds = this._decomposed = undefined
    }

    /**
     * The underlying native element.
     *
     * @bean
     * @type HTMLCanvasElement
     */
    getElement() {
        return this._element
    }

    get element() {
        return this.getElement()
    }

    /**
     * The ratio between physical pixels and device-independent pixels (DIPs)
     * of the underlying canvas / device.
     * It is `1` for normal displays, and `2` or more for
     * high-resolution displays.
     *
     * @bean
     * @type Number
     */
    getPixelRatio() {
        return this._pixelRatio
    }

    get pixelRatio() {
        return this.getPixelRatio()
    }

    /**
     * The resoltuion of the underlying canvas / device in pixel per inch (DPI).
     * It is `72` for normal displays, and `144` for high-resolution
     * displays with a pixel-ratio of `2`.
     *
     * @bean
     * @type Number
     */
    getResolution() {
        return this._pixelRatio * 72
    }

    get resolution() {
        return this.getResolution()
    }

    /**
     * The size of the view. Changing the view's size will resize it's
     * underlying element.
     *
     * @bean
     * @type Size
     */
    getViewSize() {
        const size = this._viewSize
        return new LinkedSize(size.width, size.height, this, 'setViewSize')
    }

    setViewSize(size: SizeType): void
    setViewSize(...args: any[]): void {
        const size = Size.read(args)
        const delta = size.subtract(this._viewSize)
        if (delta.isZero()) return
        this._setElementSize(size.width, size.height)
        this._viewSize.set(size)
        this.changed()

        this.emit('resize', { size: size, delta: delta })
        if (this._autoUpdate) {
            this.update()
        }
    }

    get viewSize() {
        return this.getViewSize()
    }

    set viewSize(size: SizeType) {
        this.setViewSize(size)
    }

    /**
     * Private method, overridden in CanvasView for HiDPI support.
     */
    protected _setElementSize(width: number, height: number) {
        const element = this._element as Size
        if (element) {
            if (element.width !== width) element.width = width
            if (element.height !== height) element.height = height
        }
    }

    /**
     * The bounds of the currently visible area in project coordinates.
     *
     * @bean
     * @type Rectangle
     */
    getBounds() {
        if (!this._bounds)
            this._bounds = this._matrix
                .inverted()
                .transformBounds(new Rectangle(new Point(), this._viewSize))
        return this._bounds
    }

    get bounds() {
        return this.getBounds()
    }

    /**
     * The size of the visible area in project coordinates.
     *
     * @bean
     * @type Size
     */
    getSize() {
        return this.getBounds().getSize()
    }

    get size() {
        return this.getSize()
    }

    /**
     * Checks whether the view is currently visible within the current browser
     * viewport.
     *
     * @return {Boolean} {@true if the view is visible}
     */
    isVisible(): boolean {
        return DomElement.isInView(this._element as HTMLElement)
    }

    /**
     * Checks whether the view is inserted into the browser DOM.
     *
     * @return {Boolean}  {@true if the view is inserted}
     */
    isInserted(): boolean {
        return DomElement.isInserted(this._element as HTMLElement)
    }

    // Empty stubs of #getPixelSize() and #getTextWidth(), around so that
    // web-workers don't fail. Overridden with proper functionality in
    // CanvasView.
    getPixelSize(size: number) {
        const element = this._element as HTMLElement
        let pixels
        if (element) {
            // this code is part of the Firefox workaround in CanvasView, but
            // also provides a way to determine pixel-size that does not involve
            // a Canvas. It still does not work in a web-worker though.
            const parent = element.parentNode
            const temp = document.createElement('div')
            temp.style.fontSize = size.toString()
            parent.appendChild(temp)
            pixels = parseFloat(DomElement.getStyles(temp).fontSize)
            parent.removeChild(temp)
        } else {
            pixels = parseFloat(pixels)
        }
        return pixels
    }

    getTextWidth(_font: string, _lines: string[]) {
        return 0
    }

    private setTransform(key: string, ...args: any[]): Matrix {
        const rotate = key === 'rotate'
        const value = (rotate ? Base : Point).read(args)
        const center = Point.read(args, 0, { readNull: true })
        return this.transform(
            new Matrix()[key](value, center || this.getCenter(true))
        )
    }

    /**
     * Concatenates this matrix with a rotation transformation around an
     * anchor point.
     *
     * @name View#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Point} center the anchor point to rotate around
     * @return {Matrix} this affine transform
     */
    rotate(angle: number, number?: number): Matrix
    rotate(angle: number, array?: number[]): Matrix
    rotate(angle: number, point?: PointType): Matrix
    rotate(angle: number, size?: SizeType): Matrix
    rotate(angle: number, center?: Point): Matrix

    /**
     * Concatenates this matrix with a rotation transformation around an
     * anchor point.
     *
     * @name View#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Number} x the x coordinate of the anchor point
     * @param {Number} y the y coordinate of the anchor point
     * @return {Matrix} this affine transform
     */
    rotate(angle: number, x?: number, y?: number): Matrix
    rotate(...args: any[]): Matrix {
        return this.setTransform('rotate', ...args)
    }

    /**
     * Concatenates this matrix with a scaling transformation.
     *
     * @name View#scale
     * @function
     * @param {Number} scale the scaling factor
     * @param {Point} [center] the center for the scaling transformation
     * @return {Matrix} this affine transform
     */
    scale(scale: number, center?: Point): Matrix

    /**
     * Concatenates this matrix with a scaling transformation.
     *
     * @name View#scale
     * @function
     * @param {Number} hor the horizontal scaling factor
     * @param {Number} ver the vertical scaling factor
     * @param {Point} [center] the center for the scaling transformation
     * @return {Matrix} this affine transform
     */
    scale(hor: number, ver: number, center?: Point): Matrix

    scale(...args: any[]): Matrix {
        return this.setTransform('scale', ...args)
    }

    /**
     * Concatenates this matrix with a shear transformation.
     *
     * @name View#shear
     * @function
     * @param {Point} shear the shear factor in x and y direction
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    shear(shear: Point, center?: Point): Matrix
    /**
     * Concatenates this matrix with a shear transformation.
     *
     * @name View#shear
     * @function
     * @param {Number} hor the horizontal shear factor
     * @param {Number} ver the vertical shear factor
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    shear(hor: number, ver: number, center?: Point): Matrix
    shear(...args: any[]): Matrix {
        return this.setTransform('shear', ...args)
    }

    /**
     * Concatenates this matrix with a skew transformation.
     *
     * @name View#skew
     * @function
     * @param {Point} skew the skew angles in x and y direction in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew(skew: Point, center?: Point): Matrix
    /**
     * Concatenates this matrix with a skew transformation.
     *
     * @name View#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical skew angle in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew(hor: number, ver: number, center?: Point): Matrix
    skew(...args: any[]): Matrix {
        return this.setTransform('skew', ...args)
    }

    _decompose() {
        return this._decomposed || (this._decomposed = this._matrix.decompose())
    }

    /**
     * {@grouptitle Transform Functions}
     *
     * Translates (scrolls) the view by the given offset vector.
     *
     * @param {Point} delta the offset to translate the view by
     */
    translate(point: PointType): Matrix
    translate(x: number, y?: number): Matrix
    translate(...args: any[]): Matrix {
        const mx = new Matrix()
        return this.transform(mx.translate(...args))
    }

    /**
     * The center of the visible area in project coordinates.
     *
     * @bean
     * @type Point
     */
    getCenter(_dontLink?: boolean) {
        // Todo: revisar si realmente acepta el argumento
        return this.getBounds().getCenter(_dontLink)
    }

    setCenter(point: PointType): void
    setCenter(x: number, y?: number): void
    setCenter(...args: any[]): void {
        const center = Point.read(args)
        this.translate(this.getCenter().subtract(center))
    }

    get center() {
        return this.getCenter()
    }

    set center(point: PointType) {
        this.setCenter(point)
    }

    /**
     * The view's zoom factor by which the project coordinates are magnified.
     *
     * @bean
     * @type Number
     * @see #scaling
     */
    getZoom() {
        const scaling = this._decompose().scaling
        return (scaling.x + scaling.y) / 2
    }

    setZoom(zoom: number) {
        this.transform(
            new Matrix().scale(zoom / this.getZoom(), this.getCenter())
        )
    }

    get zoom() {
        return this.getZoom()
    }

    set zoom(zoom: number) {
        this.setZoom(zoom)
    }

    /**
     * The current rotation angle of the view, as described by its
     * {@link #matrix}.
     *
     * @bean
     * @type Number
     */
    getRotation() {
        return this._decompose().rotation
    }

    setRotation(rotation: number) {
        const current = this.getRotation()
        if (current != null && rotation != null) {
            this.rotate(rotation - current)
        }
    }

    get rotation() {
        return this.getRotation()
    }

    set rotation(rotation: number) {
        this.setRotation(rotation)
    }

    /**
     * The current scale factor of the view, as described by its
     * {@link #matrix}.
     *
     * @bean
     * @type Point
     * @see #zoom
     */
    getScaling() {
        const scaling = this._decompose().scaling
        return new LinkedPoint(scaling.x, scaling.y, this, 'setScaling')
    }

    setScaling(point: PointType): void
    setScaling(x: number, y?: number): void
    setScaling(...args: any[]): void {
        const current = this.getScaling()
        const scaling = Point.read(args, 0, {
            clone: true,
            readNull: true
        })

        if (current && scaling) {
            this.scale(scaling.x / current.x, scaling.y / current.y)
        }
    }

    get scaling() {
        return this.getScaling()
    }

    set scaling(point: PointType) {
        this.setScaling(point)
    }

    /**
     * The view's transformation matrix, defining the view onto the project's
     * contents (position, zoom level, rotation, etc).
     *
     * @bean
     * @type Matrix
     */
    getMatrix() {
        return this._matrix
    }

    setMatrix(
        a: number,
        b: number,
        c: number,
        d: number,
        tx: number,
        ty: number
    ): void

    setMatrix(values: number[]): void
    setMatrix(matrix: Matrix): void
    setMatrix(...args: any[]): void {
        const matrix = this._matrix
        matrix.set(...args)
    }

    get matrix() {
        return this.getMatrix()
    }

    set matrix(matrix: Matrix) {
        this.setMatrix(matrix)
    }

    /**
     * Transform the view.
     *
     * @param {Matrix} matrix the matrix by which the view shall be transformed
     */
    transform(matrix: Matrix): Matrix {
        return this._matrix.append(matrix)
    }

    /**
     * Scrolls the view by the given vector.
     *
     * @param {Point} point
     * @deprecated use {@link #translate(delta)} instead (using opposite
     *     direction).
     */
    scrollBy(point: PointType): void
    scrollBy(x: number, y?: number): void
    scrollBy(...args: any[]): void {
        this.translate(Point.read(args).negate())
    }

    /**
     * Converts the passed point from project coordinate space to view
     * coordinate space, which is measured in browser pixels in relation to the
     * position of the view element.
     *
     * @param {Point} point the point in project coordinates to be converted
     * @return {Point} the point converted into view coordinates
     */
    projectToView(point: PointType): Point
    projectToView(x: number, y?: number): Point
    projectToView(...args: any[]): Point {
        return this._matrix.transformPoint(Point.read(args))
    }

    /**
     * Converts the passed point from view coordinate space to project
     * coordinate space.
     *
     * @param {Point} point the point in view coordinates to be converted
     * @return {Point} the point converted into project coordinates
     */
    viewToProject(point: PointType): Point
    viewToProject(x: number, y?: number): Point
    viewToProject(...args: any[]): Point {
        return this._matrix.inverseTransform(Point.read(args))
    }

    /**
     * Determines and returns the event location in project coordinate space.
     *
     * @param {Event} event the native event object for which to determine the
     *     location.
     * @return {Point} the event point in project coordinates.
     */
    getEventPoint(event: MouseEvent): Point {
        return this.viewToProject(
            DomEvent.getOffset(event, this._element as HTMLElement)
        )
    }

    /**
     * {@grouptitle Event Handlers}
     * Handler function to be called on each frame of an animation.
     * The function receives an event object which contains information about
     * the frame event:
     *
     * @option event.count {Number} the number of times the frame event was
     * fired
     * @option event.time {Number} the total amount of time passed since the
     * first frame event in seconds
     * @option event.delta {Number} the time passed in seconds since the last
     * frame event
     *
     * @name View#onFrame
     * @property
     * @type ?Function
     * @see Item#onFrame
     *
     * @example {@paperscript}
     * // Creating an animation:
     *
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * view.onFrame = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * }
     */
    get onFrame() {
        return this.getEvent('onFrame')
    }

    set onFrame(func: ViewFrameEventFunction) {
        this.setEvent('onFrame', func)
    }

    /**
     * Handler function that is called whenever a view is resized.
     *
     * @name View#onResize
     * @property
     * @type ?Function
     *
     * @example
     * // Repositioning items when a view is resized:
     *
     * // Create a circle shaped path in the center of the view:
     * var path = new Path.Circle(view.bounds.center, 30);
     * path.fillColor = 'red';
     *
     * view.onResize = function(event) {
     *     // Whenever the view is resized, move the path to its center:
     *     path.position = view.center;
     * }
     */
    get onResize() {
        return this.getEvent('onResize')
    }

    set onResize(func: ViewResizeEventFunction) {
        this.setEvent('onResize', func)
    }

    /**
     * The function to be called when the mouse button is pushed down on the
     * view. The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseDown
     * @property
     * @type ?Function
     * @see Item#onMouseDown
     */
    get onMouseDown() {
        return this.getEvent('onMouseDown')
    }

    set onMouseDown(func: ViewMouseEventFunction) {
        this.setEvent('onMouseDown', func)
    }

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged over the view. The function receives a {@link
     * MouseEvent} object which contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseDrag
     * @property
     * @type ?Function
     * @see Item#onMouseDrag
     */
    get onMouseDrag() {
        return this.getEvent('onMouseDrag')
    }

    set onMouseDrag(func: ViewMouseEventFunction) {
        this.setEvent('onMouseDrag', func)
    }

    /**
     * The function to be called when the mouse button is released over the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     *
     * @name View#onMouseUp
     * @property
     * @type ?Function
     * @see Item#onMouseUp
     */
    get onMouseUp() {
        return this.getEvent('onMouseUp')
    }

    set onMouseUp(func: ViewMouseEventFunction) {
        this.setEvent('onMouseUp', func)
    }

    /**
     * The function to be called when the mouse clicks on the view. The function
     * receives a {@link MouseEvent} object which contains information about the
     * mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onClick
     * @property
     * @type ?Function
     * @see Item#onClick
     */
    get onClick() {
        return this.getEvent('onClick')
    }

    set onClick(func: ViewMouseEventFunction) {
        this.setEvent('onClick', func)
    }

    /**
     * The function to be called when the mouse double clicks on the view. The
     * function receives a {@link MouseEvent} object which contains information
     * about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onDoubleClick
     * @property
     * @type ?Function
     * @see Item#onDoubleClick
     */
    get onDoubleClick() {
        return this.getEvent('onDoubleClick')
    }

    set onDoubleClick(func: ViewMouseEventFunction) {
        this.setEvent('onDoubleClick', func)
    }

    /**
     * The function to be called repeatedly while the mouse moves over the
     * view. The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseMove
     * @property
     * @type ?Function
     * @see Item#onMouseMove
     */
    get onMouseMove() {
        return this.getEvent('onMouseMove')
    }

    set onMouseMove(func: ViewMouseEventFunction) {
        this.setEvent('onMouseMove', func)
    }

    /**
     * The function to be called when the mouse moves over the view. This
     * function will only be called again, once the mouse moved outside of the
     * view first. The function receives a {@link MouseEvent} object which
     * contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseEnter
     * @property
     * @type ?Function
     * @see Item#onMouseEnter
     */
    get onMouseEnter() {
        return this.getEvent('onMouseEnter')
    }

    set onMouseEnter(func: ViewMouseEventFunction) {
        this.setEvent('onMouseEnter', func)
    }

    /**
     * The function to be called when the mouse moves out of the view.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseLeave
     * @property
     * @type ?Function
     * @see View#onMouseLeave
     */
    get onMouseLeave() {
        return this.getEvent('onMouseLeave')
    }

    set onMouseLeave(func: ViewMouseEventFunction) {
        this.setEvent('onMouseLeave', func)
    }

    /**
     * {@grouptitle Event Handling}
     *
     * Attach an event handler to the view.
     *
     * @name View#on
     * @function
     * @param {String} type the type of event: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
     *     sole argument
     * @return {View} this view itself, so calls can be chained
     *
     * @example {@paperscript}
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * var frameHandler = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * };
     *
     * view.on('frame', frameHandler);
     */
    on(type: string, func: (event?: any, ...args: any) => void): this

    /**
     * Attach one or more event handlers to the view.
     *
     * @name View#on
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values frame, resize}
     * @return {View} this view itself, so calls can be chained
     *
     * @example {@paperscript}
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * var frameHandler = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * };
     *
     * view.on({
     *     frame: frameHandler
     * });
     */
    on(type: EventList): this
    on(type: EmitterType, func?: (event?: any, ...args: any) => void): this {
        return super.on(type, func)
    }

    /**
     * Detach an event handler from the view.
     *
     * @name View#off
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be detached
     * @return {View} this view itself, so calls can be chained
     *
     * @example {@paperscript}
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * var frameHandler = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * };
     *
     * view.on({
     *     frame: frameHandler
     * });
     *
     * // When the user presses the mouse,
     * // detach the frame handler from the view:
     * function onMouseDown(event) {
     *     view.off('frame');
     * }
     */
    off(type: string, func?: (event?: any, ...args: any) => void): this

    /**
     * Detach one or more event handlers from the tool.
     *
     * @name Tool#off
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */
    off(type: EventList): this
    off(type: EmitterType, func?: (event?: any, ...args: any) => void): this {
        return super.off(type, func)
    }

    /**
     * Emit an event on the view.
     *
     * @name View#emit
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */
    emit(type: string, event?: any, ...args: any[]): boolean {
        return super.emit(type, event, args)
    }

    /**
     * Check if the view has one or more event handlers of the specified type.
     *
     * @name View#responds
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @return {Boolean} {@true if the view has one or more event handlers of
     * the specified type}
     */
    responds(type: string): boolean {
        return super.responds(type)
    }

    static create(project: Project, element: HTMLCanvasElement | SizeType) {
        if (document && typeof element === 'string')
            element = document.getElementById(element) as HTMLCanvasElement

        const Ctor = Base.exports[window ? 'CanvasView' : 'View'] as typeof View
        return new Ctor(project, element)
    }

    static registerEvents(view: typeof View): void {
        if (!window) {
            return null
        }

        let prevFocus: View
        let tempFocus: View
        let dragging = false
        let mouseDown = false

        function getView(event: MouseEvent) {
            const target = DomEvent.getTarget(event)
            return (
                target.getAttribute &&
                View._viewsById[target.getAttribute('id')]
            )
        }

        function updateFocus() {
            let view = View._focused
            if (!view || !view.isVisible()) {
                for (let i = 0, l = View._views.length; i < l; i++) {
                    if ((view = View._views[i]).isVisible()) {
                        View._focused = tempFocus = view
                        break
                    }
                }
            }
        }

        function handleMouseMove(view: View, event: MouseEvent, point?: Point) {
            view._handleMouseEvent('mousemove', event, point)
        }

        const navigator = window.navigator
        let mousedown
        let mousemove
        let mouseup
        if (navigator.pointerEnabled || navigator.msPointerEnabled) {
            // HTML5 / MS pointer events
            mousedown = 'pointerdown MSPointerDown'
            mousemove = 'pointermove MSPointerMove'
            mouseup = 'pointerup pointercancel MSPointerUp MSPointerCancel'
        } else {
            mousedown = 'touchstart'
            mousemove = 'touchmove'
            mouseup = 'touchend touchcancel'
            // Do not add mouse events on mobile and tablet devices
            if (
                !(
                    'ontouchstart' in window &&
                    navigator.userAgent.match(
                        /mobile|tablet|ip(ad|hone|od)|android|silk/i
                    )
                )
            ) {
                mousedown += ' mousedown'
                mousemove += ' mousemove'
                mouseup += ' mouseup'
            }
        }

        const viewEvents = {}
        const docEvents = {
            mouseout: function (event: MouseEvent) {
                const view = View._focused
                const target = DomEvent.getRelatedTarget(event)
                if (view && (!target || target.nodeName === 'HTML')) {
                    const offset = DomEvent.getOffset(
                        event,
                        view._element as HTMLElement
                    )
                    const x = offset.x
                    const abs = Math.abs
                    const ax = abs(x)
                    const max = 1 << 25
                    const diff = ax - max
                    offset.x = abs(diff) < ax ? diff * (x < 0 ? -1 : 1) : x
                    handleMouseMove(view, event, view.viewToProject(offset))
                }
            },

            scroll: updateFocus
        }

        viewEvents[mousedown] = function (event: MouseEvent) {
            const view = (View._focused = getView(event))
            if (!dragging) {
                dragging = true
                view._handleMouseEvent('mousedown', event)
            }
        }

        docEvents[mousemove] = function (event: MouseEvent) {
            let view = View._focused
            if (!mouseDown) {
                const target = getView(event)
                if (target) {
                    if (view !== target) {
                        if (view) handleMouseMove(view, event)
                        if (!prevFocus) prevFocus = view
                        view = View._focused = tempFocus = target
                    }
                } else if (tempFocus && tempFocus === view) {
                    if (prevFocus && !prevFocus.isInserted()) prevFocus = null
                    view = View._focused = prevFocus
                    prevFocus = null
                    updateFocus()
                }
            }
            if (view) handleMouseMove(view, event)
        }

        docEvents[mousedown] = function () {
            mouseDown = true
        }

        docEvents[mouseup] = function (event: MouseEvent) {
            const view = View._focused
            if (view && dragging) view._handleMouseEvent('mouseup', event)
            mouseDown = dragging = false
        }

        DomEvent.add(document, docEvents)

        DomEvent.add(window, {
            load: updateFocus
        })

        /** */

        let called = false
        let prevented = false
        const fallbacks = {
            doubleclick: 'click',
            mousedrag: 'mousemove'
        }
        let wasInView = false
        // let overView: View
        let downPoint: Point
        let lastPoint: Point
        let downItem: Item
        let overItem: Item
        let dragItem: Item
        let clickItem: Item
        let clickTime: number
        let dblClick: boolean

        function emitMouseEvent(
            obj: Item | View,
            target: Emitter,
            type: MouseEventTypes,
            event: UIEvent,
            point: Point,
            prevPoint?: Point,
            stopItem?: Item | View
        ) {
            let stopped = false
            let mouseEvent: PaperMouseEvent

            function emit(obj: Emitter, type: MouseEventTypes): boolean {
                if (obj.responds(type)) {
                    if (!mouseEvent) {
                        mouseEvent = new PaperMouseEvent(
                            type,
                            event,
                            point,
                            target || obj,
                            prevPoint ? point.subtract(prevPoint) : null
                        )
                    }
                    if (obj.emit(type, mouseEvent)) {
                        called = true
                        if (mouseEvent.prevented) prevented = true
                        if (mouseEvent.stopped) return (stopped = true)
                    }
                } else {
                    const fallback = fallbacks[type]
                    if (fallback) return emit(obj, fallback)
                }

                return false
            }

            while (obj && obj !== stopItem) {
                if (emit(obj, type)) break
                obj = (obj instanceof Item && obj.parent) || null
            }
            return stopped
        }

        function emitMouseEvents(
            view: View,
            hitItem: Item,
            type: MouseEventTypes,
            event: UIEvent,
            point: Point,
            prevPoint: Point
        ) {
            view.project.removeOn(type)
            prevented = called = false
            return (
                (dragItem &&
                    emitMouseEvent(
                        dragItem,
                        null,
                        type,
                        event,
                        point,
                        prevPoint
                    )) ||
                (hitItem &&
                    hitItem !== dragItem &&
                    !hitItem.isDescendant(dragItem) &&
                    emitMouseEvent(
                        hitItem,
                        null,
                        type === 'mousedrag' ? 'mousemove' : type,
                        event,
                        point,
                        prevPoint,
                        dragItem
                    )) ||
                emitMouseEvent(
                    view,
                    dragItem || hitItem || view,
                    type,
                    event,
                    point,
                    prevPoint
                )
            )
        }

        const itemEventsMap = {
            mousedown: {
                mousedown: 1,
                mousedrag: 1,
                click: 1,
                doubleclick: 1
            },
            mouseup: {
                mouseup: 1,
                mousedrag: 1,
                click: 1,
                doubleclick: 1
            },
            mousemove: {
                mousedrag: 1,
                mousemove: 1,
                mouseenter: 1,
                mouseleave: 1
            }
        }

        view.prototype._viewEvents = viewEvents
        view.prototype._handleMouseEvent = function (
            type: MouseEventTypes,
            event: MouseEvent,
            point: Point
        ) {
            const itemEvents = this._itemEvents
            const hitItems = itemEvents.native[type]
            const nativeMove = type === 'mousemove'
            const tool = this._scope.tool
            const view = this

            function responds(type: MouseEventTypes) {
                return (
                    itemEvents.virtual[type] ||
                    view.responds(type) ||
                    (tool && tool.responds(type))
                )
            }

            if (nativeMove && dragging && responds('mousedrag'))
                type = 'mousedrag'
            if (!point) point = this.getEventPoint(event)

            const inView = this.getBounds().contains(point)
            const hit =
                hitItems &&
                inView &&
                view._project.hitTest(point, {
                    tolerance: 0,
                    fill: true,
                    stroke: true
                })

            const hitItem = (hit && hit.item) || null
            let handle = false
            const mouse = { drag: false, down: false, up: false, move: false }
            mouse[type.substr(5)] = true

            if (hitItems && hitItem !== overItem) {
                if (overItem) {
                    emitMouseEvent(overItem, null, 'mouseleave', event, point)
                }
                if (hitItem) {
                    emitMouseEvent(hitItem, null, 'mouseenter', event, point)
                }
                overItem = hitItem
            }

            if (wasInView !== inView) {
                emitMouseEvent(
                    this,
                    null,
                    inView ? 'mouseenter' : 'mouseleave',
                    event,
                    point
                )
                // overView = inView ? this : null
                handle = true // To include the leaving move.
            }

            if ((inView || mouse.drag) && !point.equals(lastPoint)) {
                emitMouseEvents(
                    this,
                    hitItem,
                    nativeMove ? type : 'mousemove',
                    event,
                    point,
                    lastPoint
                )
                handle = true
            }
            wasInView = inView

            if ((mouse.down && inView) || (mouse.up && downPoint)) {
                emitMouseEvents(this, hitItem, type, event, point, downPoint)
                if (mouse.down) {
                    dblClick =
                        hitItem === clickItem && Date.now() - clickTime < 300
                    downItem = clickItem = hitItem

                    if (!prevented && hitItem) {
                        let item = hitItem
                        while (item && !item.responds('mousedrag'))
                            item = item.parent
                        if (item) dragItem = hitItem
                    }
                    downPoint = point
                } else if (mouse.up) {
                    if (!prevented && hitItem === downItem) {
                        clickTime = Date.now()

                        emitMouseEvents(
                            this,
                            hitItem,
                            dblClick ? 'doubleclick' : 'click',
                            event,
                            point,
                            downPoint
                        )
                        dblClick = false
                    }
                    downItem = dragItem = null
                }
                wasInView = false
                handle = true
            }
            lastPoint = point

            if (handle && tool) {
                called =
                    tool._handleMouseEvent(
                        type as unknown as ToolEventTypes,
                        event,
                        point,
                        mouse
                    ) || called
            }

            if (
                event.cancelable !== false &&
                ((called && !mouse.move) || (mouse.down && responds('mouseup')))
            ) {
                event.preventDefault()
            }
        }

        view.prototype._handleKeyEvent = function (
            type: KeyEventTypes,
            event: KeyboardEvent,
            key: string,
            character: string
        ) {
            const scope = this._scope
            const tool = scope.tool
            let keyEvent: PaperKeyEvent

            function emit(obj: Emitter) {
                if (obj.responds(type)) {
                    PaperScope.setGlobalPaper(scope)
                    obj.emit(
                        type,
                        (keyEvent =
                            keyEvent ||
                            new PaperKeyEvent(type, event, key, character))
                    )
                }
            }

            if (this.isVisible()) {
                emit(this)
                if (tool && tool.responds(type)) emit(tool)
            }
        }

        view.prototype._countItemEvent = function (type: string, sign: number) {
            console.log('count', type)
            const itemEvents = this._itemEvents
            const native = itemEvents.native
            const virtual = itemEvents.virtual
            for (const key in itemEventsMap) {
                native[key] =
                    (native[key] || 0) + (itemEventsMap[key][type] || 0) * sign
            }
            virtual[type] = (virtual[type] || 0) + sign
        }

        view.updateFocus = updateFocus
        view._resetState = function () {
            dragging = mouseDown = called = wasInView = false
            prevFocus =
                tempFocus =
                // overView =
                downPoint =
                lastPoint =
                downItem =
                overItem =
                dragItem =
                clickItem =
                clickTime =
                dblClick =
                    null
        }
    }
}
