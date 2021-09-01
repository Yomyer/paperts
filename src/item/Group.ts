import {
    Base,
    Matrix,
    Point,
    ChangeFlag,
    HitResultOptions,
    Item,
    BoundsOptions,
    DrawOptions,
    ItemSerializeFields,
    Exportable,
    FontWeights,
    Justifications
} from '../'

export type GroupSerializeFields = ItemSerializeFields & {
    children?: Item[]
}

@Exportable()
export class Group extends Item {
    protected _class = 'Group'
    protected _selectBounds = false
    protected _clipItem: Item
    protected _selectChildren = true
    protected _serializeFields: GroupSerializeFields = {
        children: []
    }

    /**
     * Creates a new Group item and places it at the top of the active layer.
     *
     * @name Group#initialize
     * @param {Item[]} [children] An array of children that will be added to the
     * newly created group
     *
     * @example {@paperscript}
     * // Create a group containing two paths:
     * var path = new Path([100, 100], [100, 200]);
     * var path2 = new Path([50, 150], [150, 150]);
     *
     * // Create a group from the two paths:
     * var group = new Group([path, path2]);
     *
     * // Set the stroke color of all items in the group:
     * group.strokeColor = 'black';
     *
     * // Move the group to the center of the view:
     * group.position = view.center;
     *
     * @example {@paperscript height=320}
     * // Click in the view to add a path to the group, which in turn is rotated
     * // every frame:
     * var group = new Group();
     *
     * function onMouseDown(event) {
     *     // Create a new circle shaped path at the position
     *     // of the mouse:
     *     var path = new Path.Circle(event.point, 5);
     *     path.fillColor = 'black';
     *
     *     // Add the path to the group's children list:
     *     group.addChild(path);
     * }
     *
     * function onFrame(event) {
     *     // Rotate the group by 1 degree from
     *     // the centerpoint of the view:
     *     group.rotate(1, view.center);
     * }
     */
    constructor(children: Item[])

    /**
     * Creates a new Group item and places it at the top of the active layer.
     *
     * @name Group#initialize
     * @param {Object} object an object containing the properties to be set on
     *     the group
     *
     * @example {@paperscript}
     * var path = new Path([100, 100], [100, 200]);
     * var path2 = new Path([50, 150], [150, 150]);
     *
     * // Create a group from the two paths:
     * var group = new Group({
     *     children: [path, path2],
     *     // Set the stroke color of all items in the group:
     *     strokeColor: 'black',
     *     // Move the group to the center of the view:
     *     position: view.center
     * });
     */
    constructor(object?: object)
    constructor(...items: Item[])

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this._children = []
        this._namedChildren = {}
        if (!this._initialize(args[0]))
            this.addChildren(Array.isArray(args[0]) ? args[0] : args)

        return this
    }

    protected _changed(flags: ChangeFlag) {
        super._changed(flags)
        if (flags & (ChangeFlag.CHILDREN | ChangeFlag.CLIPPING)) {
            this._clipItem = undefined
        }
    }

    protected _getClipItem() {
        let clipItem = this._clipItem
        if (clipItem === undefined) {
            clipItem = null
            const children = this._children
            for (let i = 0, l = children.length; i < l; i++) {
                if (children[i].clipMask) {
                    clipItem = children[i]
                    break
                }
            }
            this._clipItem = clipItem
        }
        return clipItem
    }

    /**
     * Specifies whether the group item is to be clipped. When setting to
     * `true`, the first child in the group is automatically defined as the
     * clipping mask.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * var star = new Path.Star({
     *     center: view.center,
     *     points: 6,
     *     radius1: 20,
     *     radius2: 40,
     *     fillColor: 'red'
     * });
     *
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     strokeColor: 'black'
     * });
     *
     * // Create a group of the two items and clip it:
     * var group = new Group(circle, star);
     * group.clipped = true;
     *
     * // Lets animate the circle:
     * function onFrame(event) {
     *     var offset = Math.sin(event.count / 30) * 30;
     *     circle.position.x = view.center.x + offset;
     * }
     */
    isClipped() {
        return !!this._getClipItem()
    }

    setClipped(clipped: boolean) {
        const child = this.getFirstChild()
        if (child) child.setClipMask(clipped)
    }

    get clipped() {
        return !!this._getClipItem()
    }

    set clipped(clipped: boolean) {
        this.setClipped(clipped)
    }

    protected _getBounds(matrix: Matrix, options: BoundsOptions) {
        const clipItem = this._getClipItem()
        return clipItem
            ? clipItem.getCachedBounds(
                  clipItem.matrix.prepended(matrix),
                  Base.set({}, options, { stroke: false })
              )
            : super._getBounds(matrix, options)
    }

    protected _hitTestChildren(
        point: Point,
        options?: HitResultOptions,
        viewMatrix?: Matrix
    ) {
        const clipItem = this._getClipItem()
        return (
            (!clipItem || clipItem.contains(point)) &&
            super._hitTestChildren(point, options, viewMatrix, clipItem)
        )
    }

    protected _draw(ctx: CanvasRenderingContext2D, param?: DrawOptions): void {
        const clip = param.clip
        const clipItem = !clip && this._getClipItem()
        param = { ...param, clipItem: clipItem, clip: false }
        if (clip) {
            ctx.beginPath()
            param.dontStart = param.dontFinish = true
        } else if (clipItem) {
            clipItem.draw(ctx, { ...param, clip: true })
        }

        const children = this._children
        for (let i = 0, l = children.length; i < l; i++) {
            const item = children[i]
            if (item !== clipItem) item.draw(ctx, param)
        }
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

    get fontFamily(): string {
        return this.getFontFamily()
    }

    set fontFamily(font: string) {
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
