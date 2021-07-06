import Size from '../basic/Size'
import Base from '../core/Base'
import Matrix from '../basic/Matrix'
import Emitter, { EventList } from '../core/Emitter'
import DomElement from '../dom/DomElement'
import Project from '../item/Project'
import PaperScope from '../core/PaperScope'
import DomEvent from '../dom/DomEvent'
import Stats from '../utils/Stats'

export default class View extends Emitter {
    protected _class: 'View'
    protected _viewEvents: EventList
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

    static _id: number
    static _focused: View
    static _views: View[]
    static _viewsById: { [key: string]: View }

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(project: Project, element: HTMLElement | Size) {
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
        this._scope = project._scope
        this._element = element

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
    }

    remove() {
        if (!this._project) return false

        if (View._focused === this) View._focused = null

        View._views.splice(View._views.indexOf(this), 1)
        delete View._viewsById[this._id]

        const project = this._project
        if (project._view === this) project._view = null

        DomEvent.remove(this._element, this._viewEvents)
        DomEvent.remove(window, this._windowEvents)
        this._element = this._project = null

        this.off('frame')
        this._animate = false
        this._frameItems = {}
        return true
    }

    onResize() {}
    onKeyDown() {}
    onKeyUp() {}
    onFrame = {
        install: () => this.play(),
        uninstall: () => this.uninstall()
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

    private _handleFrame() {
        // Set the global paper object to the current scope
        paper = this._scope
        const now = Date.now() / 1000
        const delta = this._last ? now - this._last : 0
        this._last = now
        // Use new Base() to convert into a Base object, for #toString()
        this.emit(
            'frame',
            new Base({
                delta: delta,
                time: (this._time += delta),
                count: this._count++
            })
        )
        if (this._stats) this._stats.update()
    }

    private _animateItem(item, animate) {
        const items = this._frameItems
        if (animate) {
            items[item._id] = {
                item: item,
                // Additional information for the event callback
                time: 0,
                count: 0
            }
            if (++this._frameItemCount === 1)
                this.on('frame', this._handleFrameItems)
        } else {
            delete items[item._id]
            if (--this._frameItemCount === 0) {
                // If this is the last one, just stop animating straight away.
                this.off('frame', this._handleFrameItems)
            }
        }
    }
}
