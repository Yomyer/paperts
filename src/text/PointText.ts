import {
    TextItem,
    Exportable,
    Point,
    LinkedPoint,
    DrawOptions,
    BoundsOptions,
    Matrix,
    Rectangle
} from '..'

import { Point as PointType } from '../basic/Types'

@Exportable()
export class PointText extends TextItem {
    protected _class = 'PointText'

    /**
     * Creates a point text item
     *
     * @name PointText#initialize
     * @param {Point} point the position where the text will start
     * @return {PointText} the newly created point text
     *
     * @example {@paperscript}
     * var text = new PointText(new Point(200, 50));
     * text.justification = 'center';
     * text.fillColor = 'black';
     * text.content = 'The contents of the point text';
     */
    constructor(point: PointType)

    /**
     * Creates a point text item from the properties described by an object
     * literal.
     *
     * @name PointText#initialize
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {PointText} the newly created point text
     *
     * @example {@paperscript}
     * var text = new PointText({
     *     point: [50, 50],
     *     content: 'The contents of the point text',
     *     fillColor: 'black',
     *     fontFamily: 'Courier New',
     *     fontWeight: 'bold',
     *     fontSize: 25
     * });
     */
    constructor(object: object)

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        super.initialize(...args)

        return this
    }

    /**
     * The PointText's anchor point
     *
     * @bean
     * @type Point
     */
    getPoint() {
        // Se Item#getPosition for an explanation why we create new LinkedPoint
        // objects each time.
        const point = this._matrix.getTranslation()
        return new LinkedPoint(point.x, point.y, this, 'setPoint')
    }

    setPoint(x: number, y: number): void
    setPoint(point: PointType): void
    setPoint(...args: any[]) {
        const point = Point.read(args)
        this.translate(point.subtract(this._matrix.getTranslation()))
    }

    get point() {
        return this.getPoint()
    }

    set point(point: PointType) {
        this.setPosition(point)
    }

    _draw(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        viewMatrix?: Matrix
    ) {
        if (!this._content) return
        this._setStyles(ctx, param, viewMatrix)
        const lines = this._lines
        const style = this._style
        const hasFill = style.hasFill()
        const hasStroke = style.hasStroke()
        const leading = style.getLeading()
        const shadowColor = ctx.shadowColor
        ctx.font = style.getFontStyle()
        ctx.textAlign = style.getJustification()
        for (let i = 0, l = lines.length; i < l; i++) {
            ctx.shadowColor = shadowColor
            const line = lines[i]
            if (hasFill) {
                ctx.fillText(line, 0, 0)
                ctx.shadowColor = 'rgba(0,0,0,0)'
            }
            if (hasStroke) ctx.strokeText(line, 0, 0)
            ctx.translate(0, leading)
        }
    }

    _getBounds(matrix: Matrix, _options?: BoundsOptions) {
        const style = this._style
        const lines = this._lines
        const numLines = lines.length
        const justification = style.getJustification()
        const leading = style.getLeading()
        const width = this.getView().getTextWidth(style.getFontStyle(), lines)
        let x = 0

        if (justification !== 'left')
            x -= width / (justification === 'center' ? 2 : 1)

        const rect = new Rectangle(
            x,
            numLines ? -0.75 * leading : 0,
            width,
            numLines * leading
        )
        return matrix ? matrix.transformBounds(rect, rect) : rect
    }
}
