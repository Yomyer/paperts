import Size from '../basic/Size'
import CanvasProvider from '../canvas/CanvasProvider'
import Base from '../core/Base'
import PaperScope from '../core/PaperScope'
import DomElement from '../dom/DomElement'
import Project from '../item/Project'
import { Exportable } from '../utils/Decorators'
import View from './View'

@Exportable()
export default class CanvasView extends View {
    protected _class = 'CanvasView'

    protected _context: CanvasRenderingContext2D

    /**
     * Creates a view object that wraps a canvas element.
     *
     * @name CanvasView#initialize
     * @param {HTMLCanvasElement} canvas the Canvas object that this view should
     *     wrap
     */
    constructor(canvas: HTMLCanvasElement)

    /**
     * Creates a view object that wraps a newly created canvas element.
     *
     * @name CanvasView#initialize
     * @param {Size} size the size of the canvas to be created
     */
    constructor(size: Size)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]): this {
        const project: Project = args[0]
        let canvas: HTMLCanvasElement = args[1]

        if (!(canvas instanceof window.HTMLCanvasElement)) {
            const size = Size.read(args, 1)
            if (size.isZero())
                throw new Error(
                    'Cannot create CanvasView with the provided argument: ' +
                        Base.slice(args, 1)
                )
            canvas = CanvasProvider.getCanvas(size)
        }
        const ctx = (this._context = canvas.getContext('2d'))

        ctx.save()
        this._pixelRatio = 1
        if (!/^off|false$/.test(PaperScope.getAttribute(canvas, 'hidpi'))) {
            const deviceRatio = window.devicePixelRatio || 1
            const backingStoreRatio =
                DomElement.getPrefixed(ctx, 'backingStorePixelRatio') || 1
            this._pixelRatio = deviceRatio / backingStoreRatio
        }

        super.initialize(project, canvas)

        this._needsUpdate = true

        return this
    }

    remove() {
        this._context.restore()
        return super.remove()
    }

    protected _setElementSize(width: number, height: number) {
        const pixelRatio = this._pixelRatio
        super._setElementSize(width * pixelRatio, height * pixelRatio)

        if (pixelRatio !== 1) {
            const element = this._element as HTMLElement
            const ctx = this._context

            if (!PaperScope.hasAttribute(element, 'resize')) {
                const style = element.style
                style.width = width + 'px'
                style.height = height + 'px'
            }

            ctx.restore()
            ctx.save()
            ctx.scale(pixelRatio, pixelRatio)
        }
    }

    getContext() {
        return this._context
    }

    /**
     * Converts the provide size in any of the units allowed in the browser to
     * pixels.
     */
    getPixelSize(size: number) {
        const paper = PaperScope.paper
        const agent = paper.agent
        let pixels

        if (agent && agent.firefox) {
            pixels = super.getPixelSize(size)
        } else {
            const ctx = this._context
            const prevFont = ctx.font
            ctx.font = size + ' serif'
            pixels = parseFloat(ctx.font)
            ctx.font = prevFont
        }
        return pixels
    }

    getTextWidth(font: string, lines: string[]): number {
        const ctx = this._context
        const prevFont = ctx.font
        let width = 0
        ctx.font = font

        for (let i = 0, l = lines.length; i < l; i++)
            width = Math.max(width, ctx.measureText(lines[i]).width)
        ctx.font = prevFont
        return width
    }

    /**
     * Updates the view if there are changes. Note that when using built-in
     * event handlers for interaction, animation and load events, this method is
     * invoked for you automatically at the end.
     *
     * @return {Boolean} {@true if the view was updated}
     */
    update(): boolean {
        if (!this._needsUpdate) return false
        const project = this._project
        const ctx = this._context
        const size = this._viewSize
        ctx.clearRect(0, 0, size.width + 1, size.height + 1)
        if (project) project.draw(ctx, this._matrix, this._pixelRatio)
        this._needsUpdate = false
        return true
    }
}
