import {
    Base,
    Change,
    Group,
    Project,
    Item,
    TextItem,
    Color,
    CompoundPath,
    Point
} from '@paperts'

import { Point as PointType } from '../basic/Types'
import { Color as ColorType } from './Types'

export type StrokeCaps = 'round' | 'square' | 'butt'
export type StrokeJoins = 'miter' | 'round' | 'bevel'
export type FillRules = 'nonzero' | 'evenodd'
export type Justifications = 'left' | 'right' | 'center'
export type FontWeights =
    | 'normal'
    | 'bold'
    | 'lighter'
    | 'bolder'
    | 'unset'
    | 'inherit'
    | 'uset'
    | number

export type StyleItem = {
    fillColor?: ColorType
    fillRule?: 'nonzero' | 'evenodd'
    strokeColor?: ColorType
    strokeWidth?: number
    strokeCap?: 'round' | 'square' | 'butt'
    strokeJoin?: 'miter' | 'round' | 'bevel'
    strokeScaling?: boolean
    miterLimit?: number
    dashOffset?: number
    dashArray?: number[]
    shadowColor?: ColorType
    shadowBlur?: number
    shadowOffset?: PointType
    selectedColor?: ColorType
}

export type StyleGroup = {
    fontFamily?: string
    fontWeight?:
        | 'normal'
        | 'bold'
        | 'lighter'
        | 'bolder'
        | 'unset'
        | 'inherit'
        | 'uset'
        | number
    fontSize?: string | number
    leading?: string | number
    justification?: 'left' | 'right' | 'center'
} & StyleItem

export type StyleText = {} & StyleGroup

export type StyleProps = StyleText
export type StylePropsKeys = keyof StyleText

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

export class Style extends Base {
    protected _class = 'Style'
    protected _owner: Item

    protected _values: { [key: string]: any } = {}
    protected _project: Project
    protected _defaults: any = {}

    constructor(style?: StyleProps, owner?: Item, project?: Project)
    constructor(...args: any[]) {
        super(...args)
    }

    initialize(
        style: StyleProps | Style,
        _owner: Item,
        _project: Project
    ): this {
        this._values = {}
        this._owner = _owner
        this._project = (_owner && _owner.project) || _project
        this._defaults =
            !_owner || _owner instanceof Group
                ? groupDefaults
                : _owner instanceof TextItem
                ? textDefaults
                : itemDefaults
        if (style) this.set(style)

        this.fillColor = '#f00'

        console.log(this)

        return this
    }

    set(style: StyleProps | Style): this {
        const isStyle = style instanceof Style
        const values = style instanceof Style ? style._values : style
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

    equals(style: StyleProps): boolean
    equals(style: Style): boolean {
        style = Style.read([style]) as Style

        function compare(style1: Style, style2: Style, secondary?: boolean) {
            const values1 = style1._values
            const values2 = style2._values
            const defaults2 = style2._defaults
            for (const key in values1) {
                const value1 = values1[key]
                const value2 = values2[key]
                if (
                    !(secondary && key in values2) &&
                    !Base.equals(
                        value1,
                        value2 === undefined ? defaults2[key] : value2
                    )
                )
                    return false
            }
            return true
        }

        return (
            style === this ||
            (style &&
                this._class === style._class &&
                compare(this, style) &&
                compare(style, this, true)) ||
            false
        )
    }

    _dispose() {
        let color: Color

        color = this.getFillColor()
        if (color) color.canvasStyle = null
        color = this.getStrokeColor()
        if (color) color.canvasStyle = null
        color = this.getShadowColor()
        if (color) color.canvasStyle = null
    }

    hasFill() {
        const color = this.getFillColor()
        return !!color && color.alpha > 0
    }

    hasStroke() {
        const color = this.getStrokeColor()
        return !!color && color.alpha > 0 && this.getStrokeWidth() > 0
    }

    hasShadow() {
        const color = this.getShadowColor()
        return (
            !!color &&
            color.alpha > 0 &&
            (this.getShadowBlur() > 0 || !this.getShadowOffset().isZero())
        )
    }

    /**
     * The view that this style belongs to.
     *
     * @bean
     * @type View
     */
    getView() {
        return this._project.view
    }

    getFontStyle() {
        const fontSize = this.getFontSize()

        return (
            this.getFontWeight() +
            ' ' +
            fontSize +
            (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ') +
            this.getFontFamily()
        )
    }

    private getParam(key: StylePropsKeys, _dontMerge?: boolean) {
        const isColor = /Color$/.test(key)
        const isPoint = key === 'shadowOffset'
        const part = Base.capitalize(key)
        const get = 'get' + part
        const set = 'set' + part
        const owner = this._owner
        const children = owner && owner.children
        const applyToChildren =
            children && children.length > 0 && !(owner instanceof CompoundPath)

        let value: any = null

        if (applyToChildren && !_dontMerge) {
            for (let i = 0, l = children.length; i < l; i++) {
                const childValue = children[i].style[get]()
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
                if (value && value.clone) {
                    value = value.clone()
                }
            } else {
                const ctor = isColor ? Color : isPoint ? Point : null
                if (ctor && !(value && value.constructor === ctor)) {
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

    private setParam(key: StylePropsKeys, value: any) {
        const isColor = /Color$/.test(key)
        const part = Base.capitalize(key)
        const set = 'set' + part
        const flag = flags[key]
        const owner = this._owner
        const children = owner && owner.children
        const applyToChildren =
            children && children.length > 0 && !(owner instanceof CompoundPath)

        if (applyToChildren) {
            for (let i = 0, l = children.length; i < l; i++)
                children[i].style[set](value)
        }
        console.log(isColor, this._defaults)
        if (
            (key === 'selectedColor' || !applyToChildren) &&
            key in this._defaults
        ) {
            const old = this._values[key]
            if (old !== value) {
                if (isColor) {
                    if (old) {
                        Color._setOwner(old as Color, null)
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
                if (owner) owner.changed(flag || Change.STYLE)
            }

            console.log(this._values)
        }
    }

    get defaults() {
        return this._defaults
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
    getStrokeColor(_dontMerge?: boolean): Color {
        return this.getParam('strokeColor', _dontMerge) as Color
    }

    setStrokeColor(color: Color | ColorType): this {
        this.setParam('strokeColor', color)
        return this
    }

    get strokeColor(): Color {
        return this.getStrokeColor()
    }

    set strokeColor(color: Color | ColorType) {
        this.setStrokeColor(color as Color)
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
    getStrokeWidth(_dontMerge?: boolean): number {
        return this.getParam('strokeWidth', _dontMerge)
    }

    setStrokeWidth(width: number): this {
        this.setParam('strokeWidth', width)
        return this
    }

    get strokeWidth(): number {
        return this.getStrokeWidth()
    }

    set strokeWidth(width: number) {
        this.setStrokeWidth(width)
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
    getStrokeCap(_dontMerge?: boolean): StrokeCaps {
        return this.getParam('strokeCap', _dontMerge)
    }

    setStrokeCap(cap: StrokeCaps): this {
        this.setParam('strokeCap', cap)
        return this
    }

    get strokeCap() {
        return this.getStrokeCap()
    }

    set strokeCap(cap: StrokeCaps) {
        this.setStrokeCap(cap)
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
    getStrokeJoin(_dontMerge?: boolean): StrokeJoins {
        return this.getParam('strokeJoin', _dontMerge)
    }

    setStrokeJoin(join: StrokeJoins): this {
        this.setParam('strokeJoin', join)
        return this
    }

    get strokeJoin() {
        return this.getStrokeJoin()
    }

    set strokeJoin(join: StrokeJoins) {
        this.setStrokeJoin(join)
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
    getStrokeScaling(_dontMerge?: boolean): boolean {
        return this.getParam('strokeScaling', _dontMerge)
    }

    setStrokeScaling(scaling: boolean): this {
        this.setParam('strokeScaling', scaling)
        return this
    }

    get strokeScaling(): boolean {
        return this.getStrokeScaling()
    }

    set strokeScaling(scaling: boolean) {
        this.setStrokeScaling(scaling)
    }

    /**
     * The dash offset of the stroke.
     *
     * @name Style#dashOffset
     * @property
     * @type Number
     * @default 0
     */
    getDashOffset(_dontMerge?: boolean): number {
        return this.getParam('dashOffset', _dontMerge)
    }

    setDashOffset(offset: number): this {
        this.setParam('dashOffset', offset)
        return this
    }

    get dashOffset(): number {
        return this.getDashOffset()
    }

    set dashOffset(offset: number) {
        this.setDashOffset(offset)
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
    getDashArray(_dontMerge?: boolean): number[] {
        return this.getParam('dashArray', _dontMerge)
    }

    setDashArray(array: number[]): this {
        this.setParam('dashArray', array)
        return this
    }

    get dashArray(): number[] {
        return this.getDashArray()
    }

    set dashArray(array: number[]) {
        this.setDashArray(array)
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
    getMiterLimit(_dontMerge?: boolean): number {
        return this.getParam('miterLimit', _dontMerge)
    }

    setMiterLimit(limit: number): this {
        this.setParam('miterLimit', limit)
        return this
    }

    get miterLimit(): number {
        return this.getMiterLimit()
    }

    set miterLimit(limit: number) {
        this.setMiterLimit(limit)
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
    getFillColor(_dontMerge?: boolean): Color {
        return this.getParam('fillColor', _dontMerge)
    }

    setFillColor(color: Color | ColorType): this {
        this.setParam('fillColor', color)
        return this
    }

    get fillColor(): Color {
        return this.getFillColor()
    }

    set fillColor(color: Color | ColorType) {
        console.log(this)
        this.setFillColor(color)

        console.log(this._values)
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
    getFillRule(_dontMerge?: boolean): FillRules {
        return this.getParam('fillRule', _dontMerge)
    }

    setFillRule(rule: FillRules): this {
        this.setParam('fillRule', rule)
        return this
    }

    get fillRule() {
        return this.getFillRule()
    }

    set fillRule(rule: FillRules) {
        this.setFillRule(rule)
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
    getShadowColor(_dontMerge?: boolean): Color {
        return this.getParam('shadowColor', _dontMerge)
    }

    setShadowColor(color: Color | ColorType): this {
        this.setParam('shadowColor', color)
        return this
    }

    get shadowColor(): Color {
        return this.getShadowColor()
    }

    set shadowColor(color: Color | ColorType) {
        this.setShadowColor(color)
    }

    /**
     * The shadow's blur radius.
     *
     * @property
     * @name Style#shadowBlur
     * @type Number
     * @default 0
     */
    getShadowBlur(_dontMerge?: boolean): number {
        return this.getParam('shadowBlur', _dontMerge)
    }

    setShadowBlur(blur: number): this {
        this.setParam('shadowBlur', blur)
        return this
    }

    get shadowBlur(): number {
        return this.getShadowBlur()
    }

    set shadowBlur(blur: number) {
        this.setShadowBlur(blur)
    }

    /**
     * The shadow's offset.
     *
     * @property
     * @name Style#shadowOffset
     * @type Point
     * @default 0
     */
    getShadowOffset(_dontMerge?: boolean): Point {
        return this.getParam('shadowOffset', _dontMerge)
    }

    setShadowOffset(offset: Point | PointType): this {
        this.setParam('shadowOffset', offset)
        return this
    }

    get shadowOffset(): Point {
        return this.getShadowOffset()
    }

    set shadowOffset(offset: Point | PointType) {
        this.setShadowOffset(offset)
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
    getSelectedColor(_dontMerge?: boolean): Color {
        return this.getParam('selectedColor', _dontMerge)
    }

    setSelectedColor(color: Color | ColorType): this {
        this.setParam('selectedColor', color)
        return this
    }

    get selectedColor(): Color {
        return this.getSelectedColor()
    }

    set selectedColor(color: Color | ColorType) {
        this.setSelectedColor(color)
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
    getFontFamily(_dontMerge?: boolean): string {
        return this.getParam('fontFamily', _dontMerge)
    }

    setFontFamilty(family: string): this {
        this.setParam('fontFamily', family)
        return this
    }

    get fontFamily() {
        return this.getFontFamily()
    }

    set fontFamily(family: string) {
        this.setFontFamilty(family)
    }

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name Style#fontWeight
     * @type String|Number
     * @default 'normal'
     */
    getFontWeight(_dontMerge?: boolean): FontWeights {
        return this.getParam('fontWeight', _dontMerge)
    }

    setFontWeight(weight: FontWeights): this {
        this.setParam('fontWeight', weight)
        return this
    }

    get fontWeight() {
        return this.getFontWeight()
    }

    set fontWeight(weight: FontWeights) {
        this.setFontWeight(weight)
    }

    /**
     * The font size of text content, as a number in pixels, or as a string with
     * optional units `'px'`, `'pt'` and `'em'`.
     *
     * @name Style#fontSize
     * @type Number|String
     * @default 10
     */
    getFontSize(_dontMerge?: boolean): number {
        return this.getParam('fontSize', _dontMerge)
    }

    setFontSize(size: number | string): this {
        this.setParam('fontSize', size)
        return this
    }

    get fontSize() {
        return this.getFontSize()
    }

    set fontSize(size: number | string) {
        this.setFontSize(size)
    }

    /**
     * The text leading of text content.
     *
     * @name Style#leading
     * @type Number|String
     * @default fontSize * 1.2
     */
    getLeading(_dontMerge?: boolean) {
        const leading = this.getParam('leading', _dontMerge)
        let fontSize = this.getFontSize()
        if (/pt|em|%|px/.test(fontSize.toString()))
            fontSize = this.getView().getPixelSize(fontSize)
        return leading != null ? leading : fontSize * 1.2
    }

    setLeading(leading: number): this {
        this.setParam('leading', leading)
        return this
    }

    get leading() {
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
     * @name Style#justification
     * @type String
     * @values 'left', 'right', 'center'
     * @default 'left'
     */
    getJustification(_dontMerge?: boolean): Justifications {
        return this.getParam('justification', _dontMerge)
    }

    setJustification(justification: Justifications): this {
        this.setParam('justification', justification)
        return this
    }

    get justification() {
        return this.getJustification()
    }

    set justification(justification: Justifications) {
        this.setJustification(justification)
    }
}
