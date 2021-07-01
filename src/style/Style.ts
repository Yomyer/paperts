import Base from '../core/Base'
import { Change } from '../item'
import Group from '../item/Group'
import Item from '../item/Item'
import TextItem from '../text/TextItem'
import Color from './Color'
import { Color as ColorType } from './Types'
import { Point as PointType } from '../basic/Types'
import CompoundPath from '../path/CompundPath'
import Point from '../basic/Point'

export type StyleItem = {
    fillColor?: Color
    fillRule?: 'nonzero' | 'evenodd'
    strokeColor?: Color
    strokeWidth?: number
    strokeCap?: 'round' | 'square' | 'butt'
    strokeJoin?: 'miter' | 'round' | 'bevel'
    strokeScaling?: boolean
    miterLimit?: number
    dashOffset?: number
    dashArray?: number[]
    shadowColor?: Color
    shadowBlur?: number
    shadowOffset?: Point
    selectedColor?: Color
}

export type StyleGroup = {
    fontFamily: string
    fontWeight:
        | 'normal'
        | 'bold'
        | 'lighter'
        | 'bolder'
        | 'unset'
        | 'inherit'
        | 'uset'
        | number
    fontSize: number
    leading: string | number
    justification: 'left' | 'right' | 'center'
} & StyleItem

export type StyleText = {} & StyleGroup

export type StyleProps = keyof StyleText

const itemDefaults: StyleItem = {
    fillColor: null,
    fillRule: 'nonzero',
    strokeColor: null,
    strokeWidth: 1,
    strokeCap: 'butt',
    strokeJoin: 'miter',
    strokeScaling: true,
    miterLimit: 10,
    dashOffset: 0,
    dashArray: [],
    shadowColor: null,
    shadowBlur: 0,
    shadowOffset: new Point(),
    selectedColor: null
}

const groupDefaults: StyleGroup = {
    ...itemDefaults,
    ...{
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontSize: 12,
        leading: null,
        justification: 'left'
    }
}

const textDefaults: StyleText = {
    ...groupDefaults,
    ...{
        fillColor: new Color()
    }
}

const flags = {
    strokeWidth: Change.STROKE,
    strokeCap: Change.STROKE,
    strokeJoin: Change.STROKE,
    strokeScaling: Change.STROKE | Change.GEOMETRY,
    miterLimit: Change.STROKE,
    fontFamily: Change.GEOMETRY,
    fontWeight: Change.GEOMETRY,
    fontSize: Change.GEOMETRY,
    leading: Change.GEOMETRY,
    justification: Change.GEOMETRY
}

export default class Style extends Base {
    protected _class = 'Style'
    protected _owner: Item // Todo change to item

    private _values = {}
    private _project: any = [] // Todo change to proyect
    private _defaults: any

    initialize(style: any, _owner: Item, _project: any) {
        // We keep values in a separate object that we can iterate over.
        this._values = {}
        this._owner = _owner
        this._project = (_owner && _owner.project) || _project // || TODO: Default paper.project
        // Use different defaults based on the owner
        this._defaults =
            !_owner || _owner instanceof Group
                ? groupDefaults
                : _owner instanceof TextItem
                ? textDefaults
                : itemDefaults
        if (style) this.set(style)
    }

    constructor(...args: any[]) {
        super(...args)
    }

    set(style: any): this {
        const isStyle = style instanceof Style
        const values = isStyle ? style._values : style
        if (values) {
            for (const key in values) {
                if (key in this._defaults) {
                    const value = values[key]
                    this[key] =
                        value && isStyle && value.clone ? value.clone() : value
                }
            }
        }

        return this
    }

    private getParam(key: StyleProps, _dontMerge?: boolean) {
        const isColor = /Color$/.test(key)
        const isPoint = key === 'shadowOffset'
        const part = Base.capitalize(key)
        const get = 'get' + part
        const set = 'set' + part
        const owner = this._owner
        const children = owner && owner._children
        const applyToChildren =
            children && children.length > 0 && !(owner instanceof CompoundPath)

        let value: any = null

        if (applyToChildren && !_dontMerge) {
            for (let i = 0, l = children.length; i < l; i++) {
                const childValue = children[i]._style[get]()
                if (!i) {
                    value = childValue
                } else if (!Base.equals(value, childValue)) {
                    // If there is another child with a different
                    // style, the style is not defined:
                    return undefined
                }
            }
        } else if (key in this._defaults) {
            value = this._values[key]
            if (value === undefined) {
                value = this._defaults[key]
                // Clone defaults if available:
                if (value && value.clone) {
                    value = value.clone()
                }
            } else {
                const ctor = isColor ? Color : isPoint ? Point : null
                if (ctor && !(value && value.constructor === ctor)) {
                    // Convert to a Color / Point, and stored result of the
                    // conversion.
                    this._values[key] = value = ctor.read([value], 0, {
                        readNull: true,
                        clone: true
                    })
                }
            }
        }
        if (value && isColor) {
            value = Color._setOwner(value, owner, applyToChildren && set)
        }
        return value
    }

    private setParam(key: StyleProps, value: any) {
        const isColor = /Color$/.test(key)
        const part = Base.capitalize(key)
        const set = 'set' + part
        const flag = flags[key]
        const owner = this._owner
        const children = owner && owner._children
        const applyToChildren =
            children && children.length > 0 && !(owner instanceof CompoundPath)

        if (applyToChildren) {
            for (let i = 0, l = children.length; i < l; i++)
                children[i]._style[set](value)
        }

        if (
            (key === 'selectedColor' || !applyToChildren) &&
            key in this._defaults
        ) {
            const old = this._values[key]
            if (old !== value) {
                if (isColor) {
                    if (old) {
                        Color._setOwner(old, null)
                        old._canvasStyle = null
                    }
                    if (value && value.constructor === Color) {
                        value = Color._setOwner(
                            value,
                            owner,
                            applyToChildren && set
                        )
                    }
                }
                this._values[key] = value
                if (owner) owner._changed(flag || Change.STYLE)
            }
        }
    }

    /**
     * {@grouptitle Stroke Style}
     *
     * The color of the stroke.
     *
     * @property
     *
     * @example {@paperscript}
     * // Setting the stroke color of a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle(new Point(80, 50), 35);
     *
     * // Set its stroke color to RGB red:
     * circle.strokeColor = new Color(1, 0, 0);
     */
    get strokeColor(): Partial<Color & ColorType> {
        return this.getParam('strokeColor') as Color
    }

    set strokeColor(color: Partial<Color & ColorType>) {
        this.setParam('strokeColor', color)
    }

    getStrokeColor() {
        return this.strokeColor
    }

    setStrokeColor(color: Partial<Color & ColorType>): this {
        this.strokeColor = color
        return this
    }

    /**
     * The width of the stroke.
     *
     * @name Style#strokeWidth
     * @property
     * @type Number
     * @default 1
     *
     * @example {@paperscript}
     * // Setting an item's stroke width:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle(new Point(80, 50), 35);
     *
     * // Set its stroke color to black:
     * circle.strokeColor = 'black';
     *
     * // Set its stroke width to 10:
     * circle.strokeWidth = 10;
     */
    get strokeWidth() {
        return this.getParam('strokeWidth')
    }

    set strokeWidth(width: number) {
        this.setParam('strokeWidth', width)
    }

    getStrokeWidth() {
        return this.strokeWidth
    }

    setStrokeWidth(width: number): this {
        this.strokeWidth = width
        return this
    }

    /**
     * The shape to be used at the beginning and end of open {@link Path} items,
     * when they have a stroke.
     *
     * @name Style#strokeCap
     * @property
     * @type String
     * @values 'round', 'square', 'butt'
     * @default 'butt'
     *
     * @example {@paperscript height=200}
     * // A look at the different stroke caps:
     *
     * var line = new Path(new Point(80, 50), new Point(420, 50));
     * line.strokeColor = 'black';
     * line.strokeWidth = 20;
     *
     * // Select the path, so we can see where the stroke is formed:
     * line.selected = true;
     *
     * // Set the stroke cap of the line to be round:
     * line.strokeCap = 'round';
     *
     * // Copy the path and set its stroke cap to be square:
     * var line2 = line.clone();
     * line2.position.y += 50;
     * line2.strokeCap = 'square';
     *
     * // Make another copy and set its stroke cap to be butt:
     * var line2 = line.clone();
     * line2.position.y += 100;
     * line2.strokeCap = 'butt';
     */
    get strokeCap() {
        return this.getParam('strokeCap')
    }

    set strokeCap(cap: 'round' | 'square' | 'butt') {
        this.setParam('strokeCap', cap)
    }

    getStrokeCap() {
        return this.strokeCap
    }

    setStrokeCap(cap: 'round' | 'square' | 'butt'): this {
        this.strokeCap = cap
        return this
    }

    /**
     * The shape to be used at the segments and corners of {@link Path} items
     * when they have a stroke.
     *
     * @name Style#strokeJoin
     * @property
     * @type String
     * @values 'miter', 'round', 'bevel'
     * @default 'miter'
     *
     * @example {@paperscript height=120}
     * // A look at the different stroke joins:
     * var path = new Path();
     * path.add(new Point(80, 100));
     * path.add(new Point(120, 40));
     * path.add(new Point(160, 100));
     * path.strokeColor = 'black';
     * path.strokeWidth = 20;
     *
     * // Select the path, so we can see where the stroke is formed:
     * path.selected = true;
     *
     * var path2 = path.clone();
     * path2.position.x += path2.bounds.width * 1.5;
     * path2.strokeJoin = 'round';
     *
     * var path3 = path2.clone();
     * path3.position.x += path3.bounds.width * 1.5;
     * path3.strokeJoin = 'bevel';
     */
    get strokeJoin() {
        return this.getParam('strokeJoin')
    }

    set strokeJoin(cap: 'miter' | 'round' | 'bevel') {
        this.setParam('strokeJoin', cap)
    }

    getStrokeJoin() {
        return this.strokeJoin
    }

    setStrokeJoin(cap: 'miter' | 'round' | 'bevel'): this {
        this.strokeJoin = cap
        return this
    }

    /**
     * Specifies whether the stroke is to be drawn taking the current affine
     * transformation into account (the default behavior), or whether it should
     * appear as a non-scaling stroke.
     *
     * @name Style#strokeScaling
     * @property
     * @type Boolean
     * @default true
     */
    get strokeScaling() {
        return this.getParam('strokeScaling')
    }

    set strokeScaling(scaling: boolean) {
        this.setParam('strokeScaling', scaling)
    }

    getStrokeScaling() {
        return this.strokeScaling
    }

    setStrokeScaling(scaling: boolean): this {
        this.strokeScaling = scaling
        return this
    }

    /**
     * The dash offset of the stroke.
     *
     * @name Style#dashOffset
     * @property
     * @type Number
     * @default 0
     */
    get dashOffset() {
        return this.getParam('dashOffset')
    }

    set dashOffset(offset: number) {
        this.setParam('dashOffset', offset)
    }

    getDashOffset() {
        return this.dashOffset
    }

    setDashOffset(offset: number): this {
        this.dashOffset = offset
        return this
    }

    /**
     * Specifies an array containing the dash and gap lengths of the stroke.
     *
     * @example {@paperscript}
     * var path = new Path.Circle(new Point(80, 50), 40);
     * path.strokeWidth = 2;
     * path.strokeColor = 'black';
     *
     * // Set the dashed stroke to [10pt dash, 4pt gap]:
     * path.dashArray = [10, 4];
     *
     * @name Style#dashArray
     * @property
     * @type Number[]
     * @default []
     */
    get dashArray() {
        return this.getParam('dashArray')
    }

    set dashArray(array: number[]) {
        this.setParam('dashArray', array)
    }

    getDashArray() {
        return this.dashArray
    }

    setDashArray(array: number[]): this {
        this.dashArray = array
        return this
    }

    /**
     * The miter limit of the stroke. When two line segments meet at a sharp
     * angle and miter joins have been specified for {@link #strokeJoin}, it is
     * possible for the miter to extend far beyond the {@link #strokeWidth} of
     * the path. The miterLimit imposes a limit on the ratio of the miter length
     * to the {@link #strokeWidth}.
     *
     * @name Style#miterLimit
     * @property
     * @default 10
     * @type Number
     */
    get miterLimit() {
        return this.getParam('miterLimit')
    }

    set miterLimit(limit: number) {
        this.setParam('miterLimit', limit)
    }

    getMiterLimit() {
        return this.miterLimit
    }

    setMiterLimit(limit: number): this {
        this.miterLimit = limit
        return this
    }

    /**
     * {@grouptitle Fill Style}
     *
     * The fill color.
     *
     * @name Style#fillColor
     * @property
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the fill color of a path to red:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle(new Point(80, 50), 35);
     *
     * // Set the fill color of the circle to RGB red:
     * circle.fillColor = new Color(1, 0, 0);
     */
    get fillColor(): Partial<Color & ColorType> {
        return this.getParam('fillColor')
    }

    set fillColor(color: Partial<Color & ColorType>) {
        this.setParam('fillColor', color)
    }

    getFillColor() {
        return this.fillColor
    }

    setFillColor(color: Partial<Color & ColorType>): this {
        this.fillColor = color
        return this
    }

    /**
     * The fill-rule with which the shape gets filled. Please note that only
     * modern browsers support fill-rules other than `'nonzero'`.
     *
     * @name Style#fillRule
     * @property
     * @type String
     * @values 'nonzero', 'evenodd'
     * @default 'nonzero'
     */
    get fillRule() {
        return this.getParam('fillRule')
    }

    set fillRule(rule: 'nonzero' | 'evenodd') {
        this.setParam('fillRule', rule)
    }

    getFillRule() {
        return this.fillRule
    }

    setFillRule(rule: 'nonzero' | 'evenodd'): this {
        this.fillRule = rule
        return this
    }

    /**
     * {@grouptitle Shadow Style}
     *
     * The shadow color.
     *
     * @property
     * @name Style#shadowColor
     * @type ?Color
     *
     * @example {@paperscript}
     * // Creating a circle with a black shadow:
     *
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'white',
     *     // Set the shadow color of the circle to RGB black:
     *     shadowColor: new Color(0, 0, 0),
     *     // Set the shadow blur radius to 12:
     *     shadowBlur: 12,
     *     // Offset the shadow by { x: 5, y: 5 }
     *     shadowOffset: new Point(5, 5)
     * });
     */
    get shadowColor(): Partial<Color & ColorType> {
        return this.getParam('shadowColor')
    }

    set shadowColor(color: Partial<Color & ColorType>) {
        this.setParam('shadowColor', color)
    }

    getShadowColor() {
        return this.shadowColor
    }

    setShadowColor(color: Partial<Color & ColorType>): this {
        this.shadowColor = color
        return this
    }

    /**
     * The shadow's blur radius.
     *
     * @property
     * @name Style#shadowBlur
     * @type Number
     * @default 0
     */
    get shadowBlur() {
        return this.getParam('shadowBlur')
    }

    set shadowBlur(blur: number) {
        this.setParam('shadowBlur', blur)
    }

    getShadowBlur() {
        return this.shadowBlur
    }

    setShadowBlur(blur: number): this {
        this.shadowBlur = blur
        return this
    }

    /**
     * The shadow's offset.
     *
     * @property
     * @name Style#shadowOffset
     * @type Point
     * @default 0
     */
    get shadowOffset(): Partial<Point & PointType> {
        return this.getParam('shadowOffset')
    }

    set shadowOffset(offset: Partial<Point & PointType>) {
        this.setParam('shadowOffset', offset)
    }

    getShadowOffset() {
        return this.shadowOffset
    }

    setShadowOffset(offset: PointType): this {
        this.shadowOffset = offset
        return this
    }

    /**
     * {@grouptitle Selection Style}
     *
     * The color the item is highlighted with when selected. If the item does
     * not specify its own color, the color defined by its layer is used instead.
     *
     * @name Style#selectedColor
     * @property
     * @type ?Color
     */

    get selectedColor(): Partial<Color & ColorType> {
        return this.getParam('selectedColor')
    }

    set selectedColor(color: Partial<Color & ColorType>) {
        this.setParam('selectedColor', color)
    }

    getSelectedColor() {
        return this.selectedColor
    }

    setSelectedColor(color: Partial<Color & ColorType>): this {
        this.selectedColor = color
        return this
    }

    /**
     * {@grouptitle Character Style}
     *
     * The font-family to be used in text content.
     *
     * @name Style#fontFamily
     * @type String
     * @default 'sans-serif'
     */
    get fontFamily() {
        return this.getParam('fontFamily')
    }

    set fontFamily(family: string) {
        this.setParam('fontFamily', family)
    }

    getFontFamily() {
        return this.fontFamily
    }

    setFontFamilty(family: string): this {
        this.fontFamily = family
        return this
    }

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name Style#fontWeight
     * @type String|Number
     * @default 'normal'
     */
    get fontWeight() {
        return this.getParam('fontWeight')
    }

    set fontWeight(
        weight:
            | 'normal'
            | 'bold'
            | 'lighter'
            | 'bolder'
            | 'unset'
            | 'inherit'
            | 'uset'
            | number
    ) {
        this.setParam('fontWeight', weight)
    }

    getFontWeight() {
        return this.fontWeight
    }

    setFontWeight(
        weight:
            | 'normal'
            | 'bold'
            | 'lighter'
            | 'bolder'
            | 'unset'
            | 'inherit'
            | 'uset'
            | number
    ): this {
        this.fontWeight = weight
        return this
    }

    /**
     * The font size of text content, as a number in pixels, or as a string with
     * optional units `'px'`, `'pt'` and `'em'`.
     *
     * @name Style#fontSize
     * @type Number|String
     * @default 10
     */
    get fontSize() {
        return this.getParam('fontSize')
    }

    set fontSize(size: number) {
        this.setParam('fontSize', size)
    }

    getFontSize() {
        return this.fontSize
    }

    setFontSize(size: number): this {
        this.fontSize = size
        return this
    }

    /**
     * The text leading of text content.
     *
     * @name Style#leading
     * @type Number|String
     * @default fontSize * 1.2
     */
    get leading() {
        return this.getParam('leading')
    }

    set leading(leading: number) {
        this.setParam('leading', leading)
    }

    getLeading() {
        return this.leading
    }

    setLeading(leading: number): this {
        this.leading = leading
        return this
    }

    /**
     * {@grouptitle Paragraph Style}
     *
     * The justification of text paragraphs.
     *
     * @name Style#justification
     * @type String
     * @values 'left', 'right', 'center'
     * @default 'left'
     */
    get justification() {
        return this.getParam('justification')
    }

    set justification(justification: 'left' | 'right' | 'center') {
        this.setParam('justification', justification)
    }

    getJustification() {
        return this.justification
    }

    setJustification(justification: 'left' | 'right' | 'center'): this {
        this.justification = justification
        return this
    }
}
