import { FontWeights, Justifications } from 'style/Style'
import { Item, Exportable, ItemSerializeFields, Base, Point, Change } from '../'

export type TextItemSerializeFields = {
    content: string
} & ItemSerializeFields

@Exportable()
export class TextItem extends Item {
    protected _class = 'TextItem'
    protected _applyMatrix = false
    protected _canApplyMatrix = false
    protected _serializeFields: TextItemSerializeFields = {
        content: null
    }

    protected _boundsOptions = { stroke: false, handle: false }

    protected _content = ''
    protected _lines: string[] = []

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        const hasProps =
            args[0] &&
            Base.isPlainObject(args[0]) &&
            args[0].x === undefined &&
            args[0].y === undefined

        this._initialize(hasProps && args[0], !hasProps && Point.read(args))

        return this
    }

    protected _equals(item: TextItem) {
        return this._content === item._content
    }

    copyContent(source: TextItem) {
        this.setContent(source._content)
    }

    /**
     * The text contents of the text item.
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * // Setting the content of a PointText item:
     *
     * // Create a point-text item at {x: 30, y: 30}:
     * var text = new PointText(new Point(30, 30));
     * text.fillColor = 'black';
     *
     * // Set the content of the text item:
     * text.content = 'Hello world';
     *
     * @example {@paperscript}
     * // Interactive example, move your mouse over the view below:
     *
     * // Create a point-text item at {x: 30, y: 30}:
     * var text = new PointText(new Point(30, 30));
     * text.fillColor = 'black';
     *
     * text.content = 'Move your mouse over the view, to see its position';
     *
     * function onMouseMove(event) {
     *     // Each time the mouse is moved, set the content of
     *     // the point text to describe the position of the mouse:
     *     text.content = 'Your position is: ' + event.point.toString();
     * }
     */
    getContent() {
        return this._content
    }

    setContent(content: string) {
        this._content = '' + content
        this._lines = this._content.split(/\r\n|\n|\r/gm)
        this._changed(Change.CONTENT)
    }

    get content() {
        return this.getContent()
    }

    set content(content: string) {
        this.setContent(content)
    }

    isEmpty() {
        return !this._content
    }

    /**
     * {@grouptitle Character Style}
     *
     * The font-family to be used in text content.
     *
     * @name TextItem#fontFamily
     * @type String
     * @default 'sans-serif'
     */
    getFontFamily(_dontMerge?: boolean): string {
        return this._style.getFontFamily(_dontMerge)
    }

    setFontFamily(font: string): this {
        this._style.setFontFamily(font)
        return this
    }

    get fontFamilty(): string {
        return this.getFontFamily()
    }

    set fontFamilty(font: string) {
        this.setFontFamily(font)
    }

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name TextItem#fontWeight
     * @type String|Number
     * @default 'normal'
     */
    getFontWeight(_dontMerge?: boolean): FontWeights {
        return this._style.getFontWeight(_dontMerge)
    }

    setFontWeight(weight: FontWeights): this {
        this._style.setFontWeight(weight)
        return this
    }

    get fontWeight(): FontWeights {
        return this.getFontWeight()
    }

    set fontWeight(weight: FontWeights) {
        this.setFontWeight(weight)
    }

    /**
     * The font size of text content, as a number in pixels, or as a string with
     * optional units `'px'`, `'pt'` and `'em'`.
     *
     * @name TextItem#fontSize
     * @type Number|String
     * @default 10
     */
    getFontSize(_dontMerge?: boolean): number {
        return this._style.getFontSize(_dontMerge)
    }

    setFontSize(size: number | string): this {
        this._style.setFontSize(size)
        return this
    }

    get fontSize(): number {
        return this.getFontSize()
    }

    set fontSize(size: number | string) {
        this.setFontSize(size)
    }

    /**
     * The text leading of text content.
     *
     * @name TextItem#leading
     * @type Number|String
     * @default fontSize * 1.2
     */
    getLeading(_dontMerge?: boolean): number {
        return this._style.getLeading(_dontMerge)
    }

    setLeading(leading: number): this {
        this._style.setLeading(leading)
        return this
    }

    get leading(): number {
        return this.getLeading()
    }

    set leading(leading: number) {
        this.setLeading(leading)
    }

    /**
     * {@grouptitle Paragraph Style}
     *
     * The justification of text paragraphs.
     *
     * @name TextItem#justification
     * @type String
     * @values 'left', 'right', 'center'
     * @default 'left'
     */
    getJustification(_dontMerge?: boolean): Justifications {
        return this._style.getJustification()
    }

    setJustification(justification: Justifications): this {
        this._style.setJustification(justification)
        return this
    }

    get justification() {
        return this.getJustification()
    }

    set justification(justification: Justifications) {
        this.setJustification(justification)
    }
}
