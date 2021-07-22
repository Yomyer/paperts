import {
    Base,
    Dictionary,
    PaperScope,
    UID,
    ExportJsonOptions,
    Point,
    LinkedPoint,
    Matrix,
    Size,
    MatrixDecompose,
    Style,
    FillRules,
    StrokeCaps,
    StrokeJoins,
    StyleProps,
    Emitter,
    EmitterType,
    EventList,
    FrameEvent,
    Project,
    Group,
    Rectangle,
    LinkedRectangle,
    ItemSelection,
    BlendMode,
    BlendModesKeys,
    Change,
    ChangeFlag,
    Numerical,
    Layer,
    HitResult,
    HitResultOptions,
    HitResultTypes,
    SymbolDefinition,
    Color,
    MouseEvent as PaperMouseEvent,
    CanvasProvider,
    CompoundPath,
    Tween,
    TweenOptions,
    Raster,
    Path
} from '@paperts'

import {
    Point as PointType,
    Size as SizeType,
    Rectangle as RectangleType
} from '../basic/Types'

import { Color as ColorType } from '../style/Types'

export type ItemSerializeFields = {
    name?: string
    applyMatrix?: boolean
    matrix?: Matrix
    pivot?: Point
    visible?: boolean
    blendMode?: string
    opacity?: number
    locked?: boolean
    guide?: boolean
    clipMask?: boolean
    selected?: boolean
    data?: {}
}

type ItemEventTypes =
    | 'onMouseDown'
    | 'onMouseUp'
    | 'onMouseDrag'
    | 'onClick'
    | 'onDoubleClick'
    | 'onMouseMove'
    | 'onMouseEnter'
    | 'onMouseLeave'

export type ItemProps = {
    internal?: boolean
    project?: Project
    insert?: boolean
    parent?: Item
}

export type BoundsOptions = {
    internal?: boolean
    stroke?: boolean
    handle?: boolean
    cacheItem?: Item
}

export type BoundsCacheProps = {
    ids: { [key: string]: Item }
    list: Array<Item | SymbolDefinition>
}

export type CloneOptions = {
    insert: boolean
    deep: boolean
}

type RasterOptions = {
    resolution?: number
    raster?: Raster
    insert?: boolean
}

export type MatchOptions =
    | {
          recursive?: boolean
          match?: (hit: Item) => boolean
          class?: typeof Base
          inside?: Rectangle
          overlapping?: Rectangle
      }
    | Function

type MatchParamOptions = {
    items: Item[]
    recursive: boolean
    inside: boolean
    overlapping: boolean
    rect: Rectangle
    path: Path
}

export type ItemFrameEventFunction = (frameEvent: FrameEvent) => void
export type ItemMouseEventFunction = (mouseEvent: PaperMouseEvent) => void

export type DrawOptions = {
    pixelRatio?: number
    updateMatrix?: boolean
    dontStart?: boolean
    clip?: boolean
    offset?: Point
    clipItem?: Item
    matrices?: Matrix[]
    viewMatrix?: Matrix
    dontFinish?: boolean
}

type RemoveOnOptions = {
    move?: boolean
    drag?: boolean
    down?: boolean
    up?: boolean
}

export class Item extends Emitter {
    static NO_INSERT: { insert: false }

    protected _class = 'Item'
    protected _name: string = null
    protected _applyMatrix = true
    protected _canApplyMatrix = true
    protected _canScaleStroke = false
    protected _pivot: Point = null
    protected _visible = true
    protected _blendMode: BlendModesKeys = 'normal'
    protected _opacity = 1
    protected _locked = false
    protected _guide = false
    protected _clipMask = false
    protected _selection = false
    protected _selectBounds = true
    protected _selectChildren = false
    protected _matrix: Matrix
    protected _style: Style
    protected _bounds: Rectangle
    protected _position: Point
    protected _decomposed: MatrixDecompose
    protected _globalMatrix: Matrix
    protected _symbol: SymbolDefinition
    protected _definition: SymbolDefinition
    protected _data: {}
    protected _boundsOptions: BoundsOptions = {}
    protected _boundsCache: BoundsCacheProps
    protected _namedChildren: { [key: string]: Item[] }
    protected _updateVersion: number

    protected _serializeFields: ItemSerializeFields = {
        name: null,
        applyMatrix: null,
        matrix: new Matrix(),
        pivot: null,
        visible: true,
        blendMode: 'normal',
        opacity: 1,
        locked: false,
        guide: false,
        clipMask: false,
        selected: false,
        data: {}
    }

    protected _prioritize = ['applyMatrix']
    protected _children: Item[]
    protected _parent: Item
    protected _project: Project

    static itemHandlers = [
        'onMouseDown',
        'onMouseUp',
        'onMouseDrag',
        'onClick',
        'onDoubleClick',
        'onMouseMove',
        'onMouseEnter',
        'onMouseLeave'
    ]

    handlers = Item.itemHandlers

    protected _events = Base.each(
        Item.itemHandlers.concat(['onResize', 'onKeyDown', 'onKeyUp']),
        function (this: Item, name) {
            this[name] = {
                install: (type: ItemEventTypes) => {
                    this.getView()._countItemEvent(type, 1)
                },

                uninstall: (type: ItemEventTypes) => {
                    this.getView()._countItemEvent(type, -1)
                }
            }
        },
        {
            onFrame: {
                install: () => {
                    this.getView().animateItem(this, true)
                },

                uninstall: () => {
                    this.getView().animateItem(this, false)
                }
            },

            // Only for external sources, e.g. Raster
            onLoad: {},
            onError: {}
        }
    )

    constructor(props: ItemProps, point: Point)
    constructor(props?: ItemProps)
    constructor(...args: any[]) {
        super(...args)
    }

    initialize(..._args: any[]): this {
        // Do nothing, but declare it for named constructors.

        return this
    }

    /**
     * Private helper for #initialize() that tries setting properties from the
     * passed props object, and apply the point translation to the internal
     * matrix.
     *
     * @param {Object} props the properties to be applied to the item
     * @param {Point} point the point by which to transform the internal matrix
     * @return {Boolean} {@true if the properties were successfully be applied,
     * or if none were provided}
     */
    protected _initialize(props?: ItemProps, point?: Point): boolean {
        const paper = PaperScope.paper
        const hasProps = props && Base.isPlainObject(props)
        const internal = hasProps && props.internal === true
        const matrix = (this._matrix = new Matrix())
        const project = (hasProps && props.project) || paper.project
        const settings = paper.settings
        this._id = internal ? null : UID.get()
        this._parent = this._index = null
        this._applyMatrix = this._canApplyMatrix && settings.applyMatrix
        if (point) matrix.translate(point)
        matrix.owner = this
        this._style = new Style(project.getCurrentStyle(), this, project)

        if (
            internal ||
            (hasProps && props.insert === false) ||
            (!settings.insertItems && !(hasProps && props.insert === true))
        ) {
            this._setProject(project)
        } else {
            ;((hasProps && props.parent) || project).insertItem(
                undefined,
                this,
                true
            )
        }

        if (hasProps && props !== Item.NO_INSERT) {
            this.set(props, {
                internal: true,
                insert: true,
                project: true,
                parent: true
            })
        }

        return hasProps
    }

    protected _serialize(options: ExportJsonOptions, dictionary: Dictionary) {
        const props = {}
        const that = this

        function serialize(fields: StyleProps | ItemSerializeFields) {
            for (const key in fields) {
                const value = that[key]
                if (
                    !Base.equals(
                        value,
                        key === 'leading'
                            ? +(fields as StyleProps).fontSize * 1.2
                            : fields[key]
                    )
                ) {
                    props[key] = Base.serialize(
                        value,
                        options,
                        // Do not use compact mode for data
                        key !== 'data',
                        dictionary
                    )
                }
            }
        }

        serialize(this._serializeFields as ItemSerializeFields)
        if (!(this instanceof Group)) serialize(this._style.defaults)

        return [this._class, props]
    }

    /**
     * Private notifier that is called whenever a change occurs in this item or
     * its sub-elements, such as Segments, Curves, Styles, etc.
     *
     * @param {ChangeFlag} flags describes what exactly has changed
     */
    protected _changed(flags: ChangeFlag | Change, _?: Item) {
        const symbol = this._symbol
        const cacheParent = this._parent || symbol
        const project = this._project
        if (flags & ChangeFlag.GEOMETRY) {
            this._bounds = this._position = this._decomposed = undefined
        }
        if (flags & ChangeFlag.MATRIX) {
            this._globalMatrix = undefined
        }
        if (cacheParent && flags & (ChangeFlag.GEOMETRY | ChangeFlag.STROKE)) {
            Item._clearBoundsCache(cacheParent)
        }
        if (flags & ChangeFlag.CHILDREN) {
            Item._clearBoundsCache(this)
        }
        if (project) project.changed(flags, this)
        if (symbol) symbol.changed(flags)
    }

    /**
     * Sets the properties of the passed object literal on this item to the
     * values defined in the object literal, if the item has property of the
     * given name (or a setter defined for it).
     *
     * @name Item#set
     * @function
     * @param {Object} props
     * @return {Item} the item itself
     * @chainable
     *
     * @example {@paperscript}
     * // Setting properties through an object literal
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * circle.set({
     *     strokeColor: 'red',
     *     strokeWidth: 10,
     *     fillColor: 'black',
     *     selected: true
     * });
     */
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    get className() {
        return this._class
    }

    /**
     * The name of the item. If the item has a name, it can be accessed by name
     * through its parent's children list.
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * // Set the name of the path:
     * path.name = 'example';
     *
     * // Create a group and add path to it as a child:
     * var group = new Group();
     * group.addChild(path);
     *
     * // The path can be accessed by name:
     * group.children['example'].fillColor = 'red';
     */
    getName() {
        return this._name
    }

    setName(name: string) {
        if (this._name) this._removeNamed()
        if (name === +name + '')
            throw new Error(
                'Names consisting only of numbers are not supported.'
            )
        const owner = this._getOwner()
        if (name && owner) {
            const children = owner.children
            const namedChildren = owner.namedChildren
            ;(namedChildren[name] = namedChildren[name] || []).push(this)
            if (!(name in children)) children[name] = this
        }
        this._name = name || undefined
        this._changed(ChangeFlag.ATTRIBUTE)
    }

    get name() {
        return this._name
    }

    set name(name: string) {
        this.setName(name)
    }

    get namedChildren() {
        return this._namedChildren
    }

    /**
     * The path style of the item.
     *
     * @bean
     * @name Item#getStyle
     * @type Style
     *
     * @example {@paperscript}
     * // Applying several styles to an item in one go, by passing an object
     * // to its style property:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30
     * });
     * circle.style = {
     *     fillColor: 'blue',
     *     strokeColor: 'red',
     *     strokeWidth: 5
     * };
     *
     * @example {@paperscript split=true height=100}
     * // Copying the style of another item:
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * var path2 = new Path.Circle({
     *     center: new Point(180, 50),
     *     radius: 20
     * });
     *
     * // Copy the path style of path:
     * path2.style = path.style;
     *
     * @example {@paperscript}
     * // Applying the same style object to multiple items:
     * var myStyle = {
     *     fillColor: 'red',
     *     strokeColor: 'blue',
     *     strokeWidth: 4
     * };
     *
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 30
     * });
     * path.style = myStyle;
     *
     * var path2 = new Path.Circle({
     *     center: new Point(150, 50),
     *     radius: 20
     * });
     * path2.style = myStyle;
     */
    getStyle(): Style {
        return this._style
    }

    setStyle(style: Style) {
        this.getStyle().set(style)
    }

    get style(): Style {
        return this.getStyle()
    }

    set style(style: Style) {
        this.setStyle(style)
    }

    /**
     * Specifies whether the item is locked. When set to `true`, item
     * interactions with the mouse are disabled.
     *
     * @name Item#locked
     * @type Boolean
     * @default false
     *
     * @example {@paperscript}
     * var unlockedItem = new Path.Circle({
     *     center: view.center - [35, 0],
     *     radius: 30,
     *     fillColor: 'springgreen',
     *     onMouseDown: function() {
     *         this.fillColor = Color.random();
     *     }
     * });
     *
     * var lockedItem = new Path.Circle({
     *     center: view.center + [35, 0],
     *     radius: 30,
     *     fillColor: 'crimson',
     *     locked: true,
     *     // This event won't be triggered because the item is locked.
     *     onMouseDown: function() {
     *         this.fillColor = Color.random();
     *     }
     * });
     *
     * new PointText({
     *     content: 'Click on both circles to see which one is locked.',
     *     point: view.center - [0, 35],
     *     justification: 'center'
     * });
     */
    getLocked() {
        return this._locked
    }

    setLocked(locked: boolean) {
        if (locked !== this._locked) {
            this._locked = locked
            this._changed(ChangeFlag.ATTRIBUTE || Change.ATTRIBUTE)
        }
    }

    get locked() {
        return this.getLocked()
    }

    set locked(locked: boolean) {
        this.setLocked(locked)
    }

    /**
     * Specifies whether the item is visible. When set to `false`, the item
     * won't be drawn.
     *
     * @name Item#visible
     * @type Boolean
     * @default true
     *
     * @example {@paperscript}
     * // Hiding an item:
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     *
     * // Hide the path:
     * path.visible = false;
     */
    getVisible() {
        return this._visible
    }

    setVisible(visible: boolean) {
        if (visible !== this._visible) {
            this._visible = visible
            this._changed(
                Change.ATTRIBUTE | Change.GEOMETRY || Change.ATTRIBUTE
            )
        }
    }

    get visible() {
        return this.getVisible()
    }

    set visible(visible: boolean) {
        this.setVisible(visible)
    }

    /**
     * The blend mode with which the item is composited onto the canvas. Both
     * the standard canvas compositing modes, as well as the new CSS blend modes
     * are supported. If blend-modes cannot be rendered natively, they are
     * emulated. Be aware that emulation can have an impact on performance.
     *
     * @name Item#blendMode
     * @type String
     * @values 'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-
     *     light', 'color-dodge', 'color-burn', 'darken', 'lighten',
     *     'difference', 'exclusion', 'hue', 'saturation', 'luminosity',
     *     'color', 'add', 'subtract', 'average', 'pin-light', 'negation',
     *     'source-over', 'source-in', 'source-out', 'source-atop',
     *     'destination-over', 'destination-in', 'destination-out',
     *     'destination-atop', 'lighter', 'darker', 'copy', 'xor'
     * @default 'normal'
     *
     * @example {@paperscript}
     * // Setting an item's blend mode:
     *
     * // Create a white rectangle in the background
     * // with the same dimensions as the view:
     * var background = new Path.Rectangle(view.bounds);
     * background.fillColor = 'white';
     *
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'red'
     * });
     *
     * var circle2 = new Path.Circle({
     *     center: new Point(120, 50),
     *     radius: 35,
     *     fillColor: 'blue'
     * });
     *
     * // Set the blend mode of circle2:
     * circle2.blendMode = 'multiply';
     */
    getBlendMode() {
        return this._blendMode
    }

    setBlendMode(blendMode: BlendModesKeys) {
        if (blendMode !== this._blendMode) {
            this._blendMode = blendMode
            this._changed(Change.ATTRIBUTE)
        }
    }

    get blendMode() {
        return this.getBlendMode()
    }

    set blendMode(blendMode: BlendModesKeys) {
        this.setBlendMode(blendMode)
    }

    /**
     * The opacity of the item as a value between `0` and `1`.
     *
     * @name Item#opacity
     * @type Number
     * @default 1
     *
     * @example {@paperscript}
     * // Making an item 50% transparent:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     fillColor: 'red'
     * });
     *
     * var circle2 = new Path.Circle({
     *     center: new Point(120, 50),
     *     radius: 35,
     *     fillColor: 'blue',
     *     strokeColor: 'green',
     *     strokeWidth: 10
     * });
     *
     * // Make circle2 50% transparent:
     * circle2.opacity = 0.5;
     */
    getOpacity() {
        return this._opacity
    }

    setOpacity(opacity: number) {
        if (opacity !== this._opacity) {
            this._opacity = opacity
            this._changed(Change.ATTRIBUTE)
        }
    }

    get opacity() {
        return this.getOpacity()
    }

    set opacity(opacity: number) {
        this.setOpacity(opacity)
    }

    /**
     * Specifies whether the item functions as a guide. When set to `true`, the
     * item will be drawn at the end as a guide.
     *
     * @name Item#guide
     * @type Boolean
     * @default true
     * @ignore
     */
    getGuide() {
        return this._guide
    }

    setGuide(guide: boolean) {
        if (guide !== this._guide) {
            this._guide = guide
            this._changed(Change.ATTRIBUTE)
        }
    }

    get guide() {
        return this.getGuide()
    }

    set guide(guide: boolean) {
        this.setGuide(guide)
    }

    getSelection() {
        return this._selection
    }

    setSelection(selection: boolean) {
        if (selection !== this._selection) {
            this._selection = selection
            const project = this._project
            if (project) {
                project.updateSelection(this)
                this._changed(Change.ATTRIBUTE)
            }
        }
    }

    get selection() {
        return this.getSelection()
    }

    set selection(selection: boolean) {
        this.setSelection(selection)
    }

    protected _changeSelection(flag: ChangeFlag | Change, selected: boolean) {
        const selection = +this._selection
        this.setSelection(!!(selected ? selection | flag : selection & ~flag))
    }

    /**
     * Specifies whether the item is selected. This will also return `true` for
     * {@link Group} items if they are partially selected, e.g. groups
     * containing selected or partially selected paths.
     *
     * Paper.js draws the visual outlines of selected items on top of your
     * project. This can be useful for debugging, as it allows you to see the
     * construction of paths, position of path curves, individual segment points
     * and bounding boxes of symbol and raster items.
     *
     * @bean
     * @type Boolean
     * @default false
     * @see Project#selectedItems
     * @see Segment#selected
     * @see Curve#selected
     * @see Point#selected
     *
     * @example {@paperscript}
     * // Selecting an item:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * path.selected = true; // Select the path
     */
    isSelected() {
        if (this._selectChildren) {
            const children = this._children
            for (let i = 0, l = children.length; i < l; i++)
                if (children[i].isSelected()) return true
        }
        return !!(+this._selection & ItemSelection.ITEM)
    }

    setSelected(selected: boolean) {
        if (this._selectChildren) {
            const children = this._children
            for (let i = 0, l = children.length; i < l; i++)
                children[i].setSelected(selected)
        }
        this._changeSelection(ItemSelection.ITEM, selected)
    }

    isFullySelected() {
        const children = this._children
        const selected = !!(+this._selection & ItemSelection.ITEM)
        if (children && selected) {
            for (let i = 0, l = children.length; i < l; i++)
                if (!children[i].isFullySelected()) return false
            return true
        }
        return selected
    }

    setFullySelected(selected: boolean) {
        const children = this._children
        if (children) {
            for (let i = 0, l = children.length; i < l; i++)
                children[i].setFullySelected(selected)
        }
        this._changeSelection(ItemSelection.ITEM, selected)
    }

    /**
     * Specifies whether the item defines a clip mask. This can only be set on
     * paths and compound paths, and only if the item is already contained
     * within a clipping group.
     *
     * @bean
     * @type Boolean
     * @default false
     */
    isClipMask() {
        return this._clipMask
    }

    getClipMask() {
        return this._clipMask
    }

    setClipMask(clipMask: boolean) {
        if (this._clipMask !== (clipMask = !!clipMask)) {
            this._clipMask = clipMask
            if (clipMask) {
                this.setFillColor(null)
                this.setStrokeColor(null)
            }
            this._changed(Change.ATTRIBUTE)
            if (this._parent) this._parent._changed(ChangeFlag.CLIPPING)
        }
    }

    get clipMask() {
        return this.getClipMask()
    }

    set clipMask(clipMask: boolean) {
        this.setClipMask(clipMask)
    }

    /**
     * A plain javascript object which can be used to store
     * arbitrary data on the item.
     *
     * @bean
     * @type Object
     *
     * @example
     * var path = new Path();
     * path.data.remember = 'milk';
     *
     * @example
     * var path = new Path();
     * path.data.malcolm = new Point(20, 30);
     * console.log(path.data.malcolm.x); // 20
     *
     * @example
     * var path = new Path();
     * path.data = {
     *     home: 'Omicron Theta',
     *     found: 2338,
     *     pets: ['Spot']
     * };
     * console.log(path.data.pets.length); // 1
     *
     * @example
     * var path = new Path({
     *     data: {
     *         home: 'Omicron Theta',
     *         found: 2338,
     *         pets: ['Spot']
     *     }
     * });
     * console.log(path.data.pets.length); // 1
     */
    getData() {
        if (!this._data) this._data = {}
        return this._data
    }

    setData(data: {}) {
        this._data = data
    }

    get data() {
        return this._data
    }

    set data(data: {}) {
        this.setData(data)
    }

    /**
     * {@grouptitle Position and Bounding Boxes}
     *
     * The item's position within the parent item's coordinate system. By
     * default, this is the {@link Rectangle#center} of the item's
     * {@link #bounds} rectangle.
     *
     * @bean
     * @type Point
     *
     * @example {@paperscript}
     * // Changing the position of a path:
     *
     * // Create a circle at position { x: 10, y: 10 }
     * var circle = new Path.Circle({
     *     center: new Point(10, 10),
     *     radius: 10,
     *     fillColor: 'red'
     * });
     *
     * // Move the circle to { x: 20, y: 20 }
     * circle.position = new Point(20, 20);
     *
     * // Move the circle 100 points to the right and 50 points down
     * circle.position += new Point(100, 50);
     *
     * @example {@paperscript split=true height=100}
     * // Changing the x coordinate of an item's position:
     *
     * // Create a circle at position { x: 20, y: 20 }
     * var circle = new Path.Circle({
     *     center: new Point(20, 20),
     *     radius: 10,
     *     fillColor: 'red'
     * });
     *
     * // Move the circle 100 points to the right
     * circle.position.x += 100;
     */
    getPosition(_dontLink?: boolean) {
        const Ctor = _dontLink ? Point : LinkedPoint
        const position =
            this._position || (this._position = this._getPositionFromBounds())
        return new Ctor(position.x, position.y, this, 'setPosition')
    }

    setPosition(x: number, y: number): void
    setPosition(point: PointType): void
    setPosition(...args: any[]): void {
        this.translate(Point.read(args).subtract(this.getPosition(true)))
    }

    get position() {
        return this.getPosition()
    }

    set position(point: PointType) {
        this.setPosition(point)
    }

    /**
     * Internal method used to calculate position either from pivot point or
     * bounds.
     * @param {Rectangle} bounds if provided, these bounds are used instead of
     *     calling getBounds()
     * @return {Point} the transformed pivot point or the center of the bounds
     * @private
     */
    protected _getPositionFromBounds(bounds?: Rectangle): Point {
        // If an pivot point is provided, use it to determine position
        // based on the matrix. Otherwise use the center of the bounds.
        return this._pivot
            ? this._matrix.transformPoint(this._pivot)
            : (bounds || this.getBounds()).getCenter(true)
    }

    /**
     * The item's pivot point specified in the item coordinate system, defining
     * the point around which all transformations are hinging. This is also the
     * reference point for {@link #position}. By default, it is set to `null`,
     * meaning the {@link Rectangle#center} of the item's {@link #bounds}
     * rectangle is used as pivot.
     *
     * @bean
     * @type Point
     * @default null
     */
    getPivot() {
        const pivot = this._pivot
        return pivot
            ? new LinkedPoint(pivot.x, pivot.y, this, 'setPivot')
            : null
    }

    setPivot(x: number, y: number): void
    setPivot(point: PointType): void
    setPivot(...args: any[]): void {
        this._pivot = Point.read(args, 0, { clone: true, readNull: true })
        this._position = undefined
    }

    get pivot() {
        return this.getPivot()
    }

    set pivot(point: PointType) {
        this.setPivot(point)
    }

    getStrokeBounds(matrix?: Matrix) {
        return this.getBounds(matrix, { stroke: true })
    }

    get strokeBounds() {
        return this.getStrokeBounds()
    }

    getHandleBounds(matrix?: Matrix) {
        return this.getBounds(matrix, { handle: true })
    }

    get handleBounds() {
        return this.getHandleBounds()
    }

    getInternalBounds(matrix?: Matrix) {
        return this.getBounds(matrix, { internal: true })
    }

    getBounds(
        matrix?: Matrix | BoundsOptions,
        options?: BoundsOptions
    ): Rectangle {
        const hasMatrix = options || matrix instanceof Matrix
        const opts = Base.set(
            {},
            hasMatrix ? options : matrix,
            this._boundsOptions
        ) as BoundsOptions

        if (!opts.stroke || this.getStrokeScaling()) {
            opts.cacheItem = this
        }

        const rect = this._getCachedBounds(
            hasMatrix && (matrix as Matrix),
            opts
        ).rect

        return !arguments.length
            ? new LinkedRectangle(
                  rect.x,
                  rect.y,
                  rect.width,
                  rect.height,
                  this,
                  'setBounds'
              )
            : rect
    }

    setBounds(point: PointType, size: SizeType, epsilon?: number): void
    setBounds(rectangle: RectangleType, epsilon?: number): void
    setBounds(
        x: number,
        y: number,
        width: number,
        height: number,
        epsilon?: number
    ): void

    setBounds(from: PointType, to: PointType, epsilon?: number): void
    setBounds(rect: Rectangle, epsilon?: number): void
    setBounds(...args: any[]): void {
        const rect = Rectangle.read(args)
        let bounds = this.getBounds()
        const _matrix = this._matrix
        const matrix = new Matrix()
        let center = rect.getCenter()

        matrix.translate(center)

        if (rect.width !== bounds.width || rect.height !== bounds.height) {
            if (!_matrix.isInvertible()) {
                _matrix.set(
                    _matrix.backup ||
                        new Matrix().translate(_matrix.getTranslation())
                )
                bounds = this.getBounds()
            }
            matrix.scale(
                bounds.width !== 0 ? rect.width / bounds.width : 0,
                bounds.height !== 0 ? rect.height / bounds.height : 0
            )
        }
        center = bounds.getCenter()
        matrix.translate(-center.x, -center.y)

        this.transform(matrix)
    }

    get bounds() {
        return this.getBounds()
    }

    set bounds(rect: RectangleType) {
        this.setBounds(rect)
    }

    /**
     * Protected method used in all the bounds getters. It loops through all the
     * children, gets their bounds and finds the bounds around all of them.
     * Subclasses override it to define calculations for the various required
     * bounding types.
     */
    protected _getBounds(matrix: Matrix, options?: BoundsOptions) {
        const children = this._children
        if (!children || !children.length) return new Rectangle()
        Item._updateBoundsCache(this, options.cacheItem)
        return Item._getBounds(children, matrix, options)
    }

    protected _getBoundsCacheKey(options: BoundsOptions, internal?: boolean) {
        return [
            options.stroke ? 1 : 0,
            options.handle ? 1 : 0,
            internal ? 1 : 0
        ].join('')
    }

    /**
     * Private method that deals with the calling of _getBounds, recursive
     * matrix concatenation and handles all the complicated caching mechanisms.
     */
    protected _getCachedBounds(
        matrix: Matrix,
        options: BoundsOptions,
        noInternal?: boolean
    ) {
        matrix = matrix && matrix._orNullIfIdentity()

        const internal = options.internal && !noInternal
        const cacheItem = options.cacheItem
        const _matrix = internal ? null : this._matrix._orNullIfIdentity()

        const cacheKey =
            cacheItem &&
            (!matrix || matrix.equals(_matrix)) &&
            this._getBoundsCacheKey(options, internal)
        let bounds = this._bounds

        Item._updateBoundsCache(this._parent || this._symbol, cacheItem)
        if (cacheKey && bounds && cacheKey in bounds) {
            const cached = bounds[cacheKey]
            return {
                rect: cached.rect.clone(),
                nonscaling: cached.nonscaling
            }
        }
        const res = this._getBounds(matrix || _matrix, options) as Rectangle & {
            rect: Rectangle
            nonscaling: boolean
        }

        const rect = res.rect || res
        const style = this._style
        const nonscaling =
            res.nonscaling || (style.hasStroke() && !style.getStrokeScaling())

        if (cacheKey) {
            if (!bounds) {
                this._bounds = bounds = new Rectangle()
            }
            // const cached =
            bounds[cacheKey] = {
                nonscaling: nonscaling,
                internal: internal
            }
        }
        return {
            rect: rect,
            nonscaling: nonscaling
        }
    }

    getCachedBounds(
        matrix: Matrix,
        options: BoundsOptions,
        noInternal?: boolean
    ) {
        return this._getCachedBounds(matrix, options, noInternal)
    }

    /**
     * Returns to correct matrix to use to transform stroke related geometries
     * when calculating bounds: the item's matrix if {@link #strokeScaling} is
     * `true`, otherwise the parent's inverted view matrix. The returned matrix
     * is always shiftless, meaning its translation vector is reset to zero.
     */
    protected _getStrokeMatrix(matrix: Matrix, options: BoundsOptions): Matrix {
        const parent = this.getStrokeScaling()
            ? null
            : options && options.internal
            ? this
            : this._parent || (this._symbol && this._symbol.item)
        const mx = parent ? parent.getViewMatrix().invert() : matrix
        return mx && mx.shiftless()
    }

    /**
     * Set up a boundsCache structure that keeps track of items that keep
     * cached bounds that depend on this item. We store this in the parent,
     * for multiple reasons:
     * The parent receives CHILDREN change notifications for when its
     * children are added or removed and can thus clear the cache, and we
     * save a lot of memory, e.g. when grouping 100 items and asking the
     * group for its bounds. If stored on the children, we would have 100
     * times the same structure.
     */
    static _updateBoundsCache(parent: Item | SymbolDefinition, item: Item) {
        if (parent && item) {
            const id = item._id
            const ref = (parent.boundsCache = parent.boundsCache || {
                ids: {},
                list: []
            })

            if (!ref.ids[id]) {
                ref.list.push(item)
                ref.ids[id] = item
            }
        }
    }

    /**
     * Clears cached bounds of all items that the children of this item are
     * contributing to. See _updateBoundsCache() for an explanation why this
     * information is stored on parents, not the children themselves.
     */
    static _clearBoundsCache(item: Item | SymbolDefinition) {
        const cache = item.boundsCache
        if (cache) {
            item.bounds = item.position = item.boundsCache = undefined
            for (let i = 0, list = cache.list, l = list.length; i < l; i++) {
                const other = list[i]
                if (other !== item) {
                    other.bounds = other.position = undefined
                    if (other.boundsCache) Item._clearBoundsCache(other)
                }
            }
        }
    }

    get boundsCache() {
        return this._boundsCache
    }

    set boundsCache(cache: BoundsCacheProps) {
        this._boundsCache = cache
    }

    get symbol() {
        return this._symbol
    }

    set symbol(symbol: SymbolDefinition) {
        this._symbol = symbol
    }

    get definition() {
        return this._definition
    }

    set definition(definition: SymbolDefinition) {
        this._definition = definition
    }

    /**
     * Gets the combined bounds of all specified items.
     */
    static _getBounds(items: Item[], matrix: Matrix, options: BoundsOptions) {
        let x1 = Infinity
        let x2 = -x1
        let y1 = x1
        let y2 = x2
        let nonscaling = false

        options = options || {}
        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i]

            if (item._visible && !item.isEmpty(true)) {
                const bounds = item._getCachedBounds(
                    matrix && matrix.appended(item._matrix),
                    options,
                    true
                )
                const rect = bounds.rect
                x1 = Math.min(rect.x, x1)
                y1 = Math.min(rect.y, y1)
                x2 = Math.max(rect.x + rect.width, x2)
                y2 = Math.max(rect.y + rect.height, y2)
                if (bounds.nonscaling) nonscaling = true
            }
        }
        return {
            rect: isFinite(x1)
                ? new Rectangle(x1, y1, x2 - x1, y2 - y1)
                : new Rectangle(),
            nonscaling: nonscaling
        }
    }

    _decompose() {
        return this._applyMatrix
            ? null
            : this._decomposed || (this._decomposed = this._matrix.decompose())
    }

    /**
     * The current rotation angle of the item, as described by its
     * {@link #matrix}.
     * Please note that this only returns meaningful values for items with
     * {@link #applyMatrix} set to `false`, meaning they do not directly bake
     * transformations into their content.
     *
     * @bean
     * @type Number
     */
    getRotation() {
        const decomposed = this._decompose()
        return decomposed ? decomposed.rotation : 0
    }

    setRotation(rotation: number) {
        const current = this.getRotation()
        if (current != null && rotation != null) {
            // Preserve the cached _decomposed values over rotation, and only
            // update the rotation property on it.
            const decomposed = this._decomposed
            this.rotate(rotation - current)
            if (decomposed) {
                decomposed.rotation = rotation
                this._decomposed = decomposed
            }
        }
    }

    get rotation() {
        return this.getRotation()
    }

    set rotation(rotation: number) {
        this.setRotation(rotation)
    }

    /**
     * The current scale factor of the item, as described by its
     * {@link #matrix}.
     * Please note that this only returns meaningful values for items with
     * {@link #applyMatrix} set to `false`, meaning they do not directly bake
     * transformations into their content.
     *
     * @bean
     * @type Point
     */
    getScaling() {
        const decomposed = this._decompose()
        const s = decomposed && decomposed.scaling
        return new LinkedPoint(s ? s.x : 1, s ? s.y : 1, this, 'setScaling')
    }

    setScaling(point: PointType): void
    setScaling(x: number, y?: number): void
    setScaling(...args: any[]): void {
        const current = this.getScaling()
        const scaling = Point.read(args, 0, {
            clone: true,
            readNull: true
        })
        if (current && scaling && !current.equals(scaling)) {
            const rotation = this.getRotation()
            const decomposed = this._decomposed
            const matrix = new Matrix()
            const isZero = Numerical.isZero

            if (isZero(current.x) || isZero(current.y)) {
                matrix.translate(decomposed.translation)
                if (rotation) {
                    matrix.rotate(rotation)
                }
                matrix.scale(scaling.x, scaling.y)
                this._matrix.set(matrix)
            } else {
                const center = this.getPosition(true)
                matrix.translate(center)
                if (rotation) matrix.rotate(rotation)
                matrix.scale(scaling.x / current.x, scaling.y / current.y)
                if (rotation) matrix.rotate(-rotation)
                matrix.translate(center.negate())
                this.transform(matrix)
            }
            if (decomposed) {
                decomposed.scaling = scaling
                this._decomposed = decomposed
            }
        }
    }

    get scaling() {
        return this.getScaling()
    }

    set scaling(point: PointType) {
        this.setScaling(point)
    }

    /**
     * The item's transformation matrix, defining position and dimensions in
     * relation to its parent item in which it is contained.
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
     * The item's global transformation matrix in relation to the global project
     * coordinate space. Note that the view's transformations resulting from
     * zooming and panning are not factored in.
     *
     * @bean
     * @type Matrix
     */
    getGlobalMatrix(_dontClone?: boolean) {
        let matrix = this._globalMatrix
        if (matrix) {
            let parent = this._parent
            const parents = []
            while (parent) {
                if (!parent._globalMatrix) {
                    matrix = null
                    // Also clear global matrix of item's parents.
                    for (let i = 0, l = parents.length; i < l; i++) {
                        parents[i]._globalMatrix = null
                    }
                    break
                }
                parents.push(parent)
                parent = parent._parent
            }
        }
        if (!matrix) {
            matrix = this._globalMatrix = this._matrix.clone()
            const parent = this._parent
            if (parent) matrix.prepend(parent.getGlobalMatrix(true))
        }
        return _dontClone ? matrix : matrix.clone()
    }

    get globalMatrix() {
        return this.getGlobalMatrix()
    }

    /**
     * The item's global matrix in relation to the view coordinate space. This
     * means that the view's transformations resulting from zooming and panning
     * are factored in.
     *
     * @bean
     * @type Matrix
     */
    getViewMatrix() {
        return this.getGlobalMatrix().prepend(this.getView().matrix)
    }

    get viewMatrix() {
        return this.getViewMatrix()
    }

    /**
     * Controls whether the transformations applied to the item (e.g. through
     * {@link #transform(matrix)}, {@link #rotate(angle)},
     * {@link #scale(scale)}, etc.) are stored in its {@link #matrix} property,
     * or whether they are directly applied to its contents or children (passed
     * on to the segments in {@link Path} items, the children of {@link Group}
     * items, etc.).
     *
     * @bean
     * @type Boolean
     * @default true
     */
    getApplyMatrix() {
        return this._applyMatrix
    }

    setApplyMatrix(apply: boolean) {
        if ((this._applyMatrix = this._canApplyMatrix && !!apply))
            this.transform(null, true)
    }

    get applyMatrix() {
        return this.getApplyMatrix()
    }

    set applyMatrix(apply: boolean) {
        this.setApplyMatrix(apply)
    }

    protected _setProject(project: Project, installEvents?: boolean) {
        if (this._project !== project) {
            if (this._project) this._installEvents(false)
            this._project = project
            const children = this._children
            for (let i = 0, l = children && children.length; i < l; i++)
                children[i]._setProject(project)

            installEvents = true
        }
        if (installEvents) this._installEvents(true)
    }

    getProject() {
        return this._project
    }

    setProject(project: Project, installEvents?: boolean) {
        this._setProject(project, installEvents)
    }

    get project() {
        return this.getProject()
    }

    set project(project: Project) {
        this.setProject(project)
    }

    /**
     * The view that this item belongs to.
     * @type View
     * @bean
     */
    getView() {
        return this._project.view
    }

    get view() {
        return this.getView()
    }

    /**
     * Overrides Emitter#_installEvents to also call _installEvents on all
     * children.
     */
    _installEvents(install: boolean) {
        super._installEvents(install)
        const children = this._children
        for (let i = 0, l = children && children.length; i < l; i++)
            children[i]._installEvents(install)
    }

    /**
     * The layer that this item is contained within.
     *
     * @type Layer
     * @bean
     */
    getLayer(): Layer {
        let parent: Item = this
        while ((parent = parent._parent)) {
            if (parent instanceof Layer) return parent
        }
        return null
    }

    /**
     * The item that this item is contained within.
     *
     * @type Item
     * @bean
     *
     * @example
     * var path = new Path();
     *
     * // New items are placed in the active layer:
     * console.log(path.parent == project.activeLayer); // true
     *
     * var group = new Group();
     * group.addChild(path);
     *
     * // Now the parent of the path has become the group:
     * console.log(path.parent == group); // true
     *
     * @example // Setting the parent of the item to another item
     * var path = new Path();
     *
     * // New items are placed in the active layer:
     * console.log(path.parent == project.activeLayer); // true
     *
     * var group = new Group();
     * path.parent = group;
     *
     * // Now the parent of the path has become the group:
     * console.log(path.parent == group); // true
     *
     * // The path is now contained in the children list of group:
     * console.log(group.children[0] == path); // true
     *
     * @example // Setting the parent of an item in the constructor
     * var group = new Group();
     *
     * var path = new Path({
     *     parent: group
     * });
     *
     * // The parent of the path is the group:
     * console.log(path.parent == group); // true
     *
     * // The path is contained in the children list of group:
     * console.log(group.children[0] == path); // true
     */
    getParent() {
        return this._parent
    }

    setParent(item: Item) {
        return item.addChild(this)
    }

    get parent() {
        return this._parent
    }

    set parent(parent: Item) {
        this._parent = parent
    }

    protected _getOwner(): Item | Project {
        return this.getParent()
    }

    /**
     * The children items contained within this item. Items that define a
     * {@link #name} can also be accessed by name.
     *
     * <b>Please note:</b> The children array should not be modified directly
     * using array functions. To remove single items from the children list, use
     * {@link Item#remove()}, to remove all items from the children list, use
     * {@link Item#removeChildren()}. To add items to the children list, use
     * {@link Item#addChild(item)} or {@link Item#insertChild(index,item)}.
     *
     * @type Item[]
     * @bean
     *
     * @example {@paperscript}
     * // Accessing items in the children array:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Create a group and move the path into it:
     * var group = new Group();
     * group.addChild(path);
     *
     * // Access the path through the group's children array:
     * group.children[0].fillColor = 'red';
     *
     * @example {@paperscript}
     * // Accessing children by name:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * // Set the name of the path:
     * path.name = 'example';
     *
     * // Create a group and move the path into it:
     * var group = new Group();
     * group.addChild(path);
     *
     * // The path can be accessed by name:
     * group.children['example'].fillColor = 'orange';
     *
     * @example {@paperscript}
     * // Passing an array of items to item.children:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * var group = new Group();
     * group.children = [path];
     *
     * // The path is the first child of the group:
     * group.firstChild.fillColor = 'green';
     */
    getChildren() {
        return this._children
    }

    setChildren(items: Item[]) {
        this.removeChildren()
        this.addChildren(items)
    }

    get children() {
        return this.getChildren()
    }

    set children(items: Item[]) {
        this.setChildren(items)
    }

    /**
     * The first item contained within this item. This is a shortcut for
     * accessing `item.children[0]`.
     *
     * @type Item
     * @bean
     */
    getFirstChild(): Item {
        return (this._children && this._children[0]) || null
    }

    get firstChild() {
        return this.getFirstChild()
    }

    /**
     * The last item contained within this item.This is a shortcut for
     * accessing `item.children[item.children.length - 1]`.
     *
     * @type Item
     * @bean
     */
    getLastChild(): Item {
        return (
            (this._children && this._children[this._children.length - 1]) ||
            null
        )
    }

    get lastChild() {
        return this.getLastChild()
    }

    /**
     * The next item on the same level as this item.
     *
     * @type Item
     * @bean
     */
    getNextSibling(): Item {
        const owner = this._getOwner()
        return (owner && owner.children[this._index + 1]) || null
    }

    get nextSibling() {
        return this.getNextSibling()
    }

    /**
     * The previous item on the same level as this item.
     *
     * @type Item
     * @bean
     */
    getPreviousSibling(): Item {
        const owner = this._getOwner()
        return (owner && owner.children[this._index - 1]) || null
    }

    get previousSibling() {
        return this.getPreviousSibling()
    }

    /**
     * The index of this item within the list of its parent's children.
     *
     * @type Number
     * @bean
     */
    getIndex(): number {
        return this._index
    }

    get index() {
        return this.getIndex()
    }

    equals(item: Item) {
        // NOTE: We do not compare name and selected state.
        // TODO: Consider not comparing locked and visible also?
        return (
            item === this ||
            (item &&
                this._class === item._class &&
                this._style.equals(item._style) &&
                this._matrix.equals(item._matrix) &&
                this._locked === item._locked &&
                this._visible === item._visible &&
                this._blendMode === item._blendMode &&
                this._opacity === item._opacity &&
                this._clipMask === item._clipMask &&
                this._guide === item._guide &&
                this._equals(item)) ||
            false
        )
    }

    /**
     * A private helper for #equals(), to be overridden in sub-classes. When it
     * is called, item is always defined, of the same class as `this` and has
     * equal general state attributes such as matrix, style, opacity, etc.
     */
    protected _equals(item: Item) {
        return Base.equals(this._children, item._children)
    }

    /**
     * Clones the item within the same project and places the copy above the
     * item.
     *
     * @option [insert=true] specifies whether the copy should be
     *     inserted into the scene graph. When set to `true`, it is inserted
     *     above the original
     * @option [deep=true] specifies whether the item's children should also be
     *     cloned
     *
     * @param {Object} [options={ insert: true, deep: true }]
     *
     * @return {Item} the newly cloned item
     * @chainable
     *
     * @example {@paperscript}
     * // Cloning items:
     * var circle = new Path.Circle({
     *     center: [50, 50],
     *     radius: 10,
     *     fillColor: 'red'
     * });
     *
     * // Make 20 copies of the circle:
     * for (var i = 0; i < 20; i++) {
     *     var copy = circle.clone();
     *
     *     // Distribute the copies horizontally, so we can see them:
     *     copy.position.x += i * copy.bounds.width;
     * }
     */
    clone(options?: CloneOptions | boolean): this {
        const copy = new Base.exports[this._class](
            Item.NO_INSERT
        ) as unknown as this

        const children = this._children
        const insert = Base.pick(
            options ? (options as CloneOptions).insert : undefined,
            options === undefined || options === true
        )
        const deep = Base.pick(
            options ? (options as CloneOptions).deep : undefined,
            true
        )

        if (children) copy.copyAttributes(this)

        if (!children || deep) copy.copyContent(this)
        if (!children) copy.copyAttributes(this)
        if (insert) copy.insertAbove(this)

        let name = this._name
        const parent = this._parent
        if (name && parent) {
            const children = parent._children
            const orig = name
            let i = 1
            while (children[name]) name = orig + ' ' + i++
            if (name !== orig) copy.setName(name)
        }
        return copy as this
    }

    /**
     * Copies the content of the specified item over to this item.
     *
     * @param {Item} source the item to copy the content from
     */
    copyContent(source: Item) {
        const children = source._children
        for (let i = 0, l = children && children.length; i < l; i++) {
            this.addChild(children[i].clone(false))
        }
    }

    /**
     * Copies all attributes of the specified item over to this item. This
     * includes its style, visibility, matrix, pivot, blend-mode, opacity,
     * selection state, data, name, etc.
     *
     * @param {Item} source the item to copy the attributes from
     * @param {Boolean} excludeMatrix whether to exclude the transformation
     * matrix when copying all attributes
     */
    copyAttributes(source: Item, excludeMatrix?: boolean) {
        this.setStyle(source._style)

        const keys = [
            '_locked',
            '_visible',
            '_blendMode',
            '_opacity',
            '_clipMask',
            '_guide'
        ]
        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i]
            if (source.hasOwnProperty(key)) this[key] = source[key]
        }
        if (!excludeMatrix) this._matrix.set(source._matrix, true)

        this.setApplyMatrix(source._applyMatrix)
        this.setPivot(source._pivot)
        this.setSelection(source._selection)
        const data = source._data
        const name = source._name
        this._data = data ? Base.clone(data) : null
        if (name) this.setName(name)
    }

    /**
     * @name Item#rasterize
     * @function
     * @param {Number} [resolution=view.resolution]
     * @param {Boolean} [insert=true]
     * @deprecated use {@link #rasterize(options)} instead.
     */
    /**
     * Rasterizes the item into a newly created Raster object. The item itself
     * is not removed after rasterization.
     *
     * @option [resolution=view.resolution] {Number} the desired resolution to
     *     be used when rasterizing, in pixels per inch (DPI). If not specified,
     *     the value of `view.resolution` is used by default.
     * @option [raster=null] {Raster} specifies a raster to be reused when
     *     rasterizing. If the raster has the desired size already, then the
     *     underlying canvas is reused and no new memory needs to be allocated.
     *     If no raster is provided, a new raster item is created and returned
     *     instead.
     * @option [insert=true] {Boolean} specifies whether the raster should be
     *     inserted into the scene graph. When set to `true`, it is inserted
     *     above the rasterized item.
     *
     * @name Item#rasterize
     * @function
     * @param {Object} [options={}] the rasterization options
     * @return {Raster} the reused raster or the newly created raster item
     *
     * @example {@paperscript}
     * // Rasterizing an item:
     * var circle = new Path.Circle({
     *     center: [50, 50],
     *     radius: 5,
     *     fillColor: 'red'
     * });
     *
     * // Create a rasterized version of the path:
     * var raster = circle.rasterize();
     *
     * // Move it 100pt to the right:
     * raster.position.x += 100;
     *
     * // Scale the path and the raster by 300%, so we can compare them:
     * circle.scale(5);
     * raster.scale(5);
     */
    rasterize(resolution: number, inser?: boolean): Raster
    rasterize(options: RasterOptions): Raster
    rasterize(...args: any[]): Raster {
        let resolution, insert, raster

        if (Base.isPlainObject(args[0])) {
            resolution = args[0].resolution
            insert = args[0].insert
            raster = args[0].raster
        } else {
            resolution = args[0]
            insert = args[1]
        }
        if (!raster) {
            raster = new Raster(Item.NO_INSERT)
        }
        const bounds = this.getStrokeBounds()
        const scale = (resolution || this.getView().getResolution()) / 72

        const topLeft = bounds.getTopLeft().floor()
        const bottomRight = bounds.getBottomRight().ceil()
        const boundsSize = new Size(bottomRight.subtract(topLeft))
        const rasterSize = boundsSize.multiply(scale)
        raster.setSize(rasterSize, true)

        if (!rasterSize.isZero()) {
            const ctx = raster.getContext(true)
            const matrix = new Matrix().scale(scale).translate(topLeft.negate())
            ctx.save()
            matrix.applyToContext(ctx)
            this.draw(ctx, { matrices: [matrix] })
            ctx.restore()
        }
        raster._matrix.set(
            new Matrix()
                .translate(topLeft.add(boundsSize.divide(2)))
                // Take resolution into account and scale back to original size.
                .scale(1 / scale)
        )
        if (insert === undefined || insert) {
            raster.insertAbove(this)
        }
        return raster
    }

    /**
     * {@grouptitle Geometric Tests}
     *
     * Checks whether the item's geometry contains the given point.
     *
     * @example {@paperscript} // Click within and outside the star below
     * // Create a star shaped path:
     * var path = new Path.Star({
     *     center: [50, 50],
     *     points: 12,
     *     radius1: 20,
     *     radius2: 40,
     *     fillColor: 'black'
     * });
     *
     * // Whenever the user presses the mouse:
     * function onMouseDown(event) {
     *     // If the position of the mouse is within the path,
     *     // set its fill color to red, otherwise set it to
     *     // black:
     *     if (path.contains(event.point)) {
     *         path.fillColor = 'red';
     *     } else {
     *         path.fillColor = 'black';
     *     }
     * }
     *
     * @param {Point} point the point to check for
     * @return {Boolean}
     */
    contains(x: number, y: number): boolean
    contains(point: PointType): boolean
    contains(...args: any[]): boolean {
        // See CompoundPath#_contains() for the reason for !!
        const matrix = this._matrix
        return (
            matrix.isInvertible() &&
            !!this._contains(matrix.inverseTransform(Point.read(args)))
        )
    }

    protected _contains(point: Point) {
        const children = this._children
        if (children) {
            for (let i = children.length - 1; i >= 0; i--) {
                if (children[i].contains(point)) return true
            }
            return false
        }
        // We only implement it here for items with rectangular content,
        // for anything else we need to override #contains()
        return point.isInside(this.getInternalBounds())
    }

    // DOCS:
    // TEST:
    /**
     * @param {Rectangle} rect the rectangle to check against
     * @return {Boolean}
     */
    isInside(point: PointType, size: SizeType): boolean
    isInside(rectangle: RectangleType): boolean
    isInside(x: number, y: number, width: number, height: number): boolean
    isInside(from: PointType, to: PointType): boolean
    isInside(...args: any[]): boolean {
        return Rectangle.read(args).contains(this.getBounds())
    }

    // Internal helper function, used at the moment for intersects check only.
    // TODO: Move #getIntersections() to Item, make it handle all type of items
    // through _asPathItem(), and support Group items as well, taking nested
    // matrices into account properly!
    protected _asPathItem(): any {
        return new Path.Rectangle({
            rectangle: this.getInternalBounds(),
            matrix: this._matrix,
            insert: false
        })
    }

    // DOCS:
    // TEST:
    /**
     * @param {Item} item the item to check against
     * @return {Boolean}
     */
    intersects(item: Item, _matrix?: Matrix): boolean {
        if (!(item instanceof Item)) return false
        return (
            this._asPathItem().getIntersections(
                item._asPathItem(),
                null,
                _matrix,
                true
            ).length > 0
        )
    }

    hitTest(x: number, y: number, options?: HitResultOptions): HitResult
    hitTest(point: PointType, options?: HitResultOptions): HitResult
    hitTest(...args: any[]): HitResult {
        return this._hitTest(Point.read(args), HitResult.getOptions(args))
    }

    hitTestAll(x: number, y: number, options?: HitResultOptions): HitResult[]
    hitTestAll(point: PointType, options?: HitResultOptions): HitResult[]
    hitTestAll(...args: any[]): HitResult[] {
        const point = Point.read(args)
        const options = HitResult.getOptions(args)
        const all: HitResult[] = []
        this._hitTest(point, { ...options, all: all } as HitResultOptions)
        return all
    }

    protected _hitTestChildren(
        point: Point,
        options?: HitResultOptions,
        viewMatrix?: Matrix,
        _exclude?: Item
    ) {
        const children = this._children
        if (children) {
            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i]
                const res =
                    child !== _exclude &&
                    child._hitTest(point, options, viewMatrix)

                if (res && !options.all) return res
            }
        }
        return null
    }

    /**
     * {@grouptitle Hit-testing, Fetching and Matching Items}
     *
     * Performs a hit-test on the item and its children (if it is a {@link
     * Group} or {@link Layer}) at the location of the specified point,
     * returning the first found hit.
     *
     * The options object allows you to control the specifics of the hit-
     * test and may contain a combination of the following values:
     *
     * @name Item#hitTest
     * @function
     *
     * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
     *     {Number} the tolerance of the hit-test
     * @option options.class {Function} only hit-test against a specific item
     *     class, or any of its sub-classes, by providing the constructor
     *     function against which an `instanceof` check is performed:
     *     {@values  Group, Layer, Path, CompoundPath, Shape, Raster,
     *     SymbolItem, PointText, ...}
     * @option options.match {Function} a match function to be called for each
     *     found hit result: Return `true` to return the result, `false` to keep
     *     searching
     * @option [options.fill=true] {Boolean} hit-test the fill of items
     * @option [options.stroke=true] {Boolean} hit-test the stroke of path
     *     items, taking into account the setting of stroke color and width
     * @option [options.segments=true] {Boolean} hit-test for {@link
     *     Segment#point} of {@link Path} items
     * @option options.curves {Boolean} hit-test the curves of path items,
     *     without taking the stroke color or width into account
     * @option options.handles {Boolean} hit-test for the handles ({@link
     *     Segment#handleIn} / {@link Segment#handleOut}) of path segments.
     * @option options.ends {Boolean} only hit-test for the first or last
     *     segment points of open path items
     * @option options.position {Boolean} hit-test the {@link Item#position} of
     *     of items, which depends on the setting of {@link Item#pivot}
     * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.bounds {Boolean} hit-test the corners and side-centers of
     *     the bounding rectangle of items ({@link Item#bounds})
     * @option options.guides {Boolean} hit-test items that have {@link
     *     Item#guide} set to `true`
     * @option options.selected {Boolean} only hit selected items
     *
     * @param {Point} point the point where the hit-test should be performed
     *     (in global coordinates system).
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult} a hit result object describing what exactly was hit
     *     or `null` if nothing was hit
     */

    /**
     * Performs a hit-test on the item and its children (if it is a {@link
     * Group} or {@link Layer}) at the location of the specified point,
     * returning all found hits.
     *
     * The options object allows you to control the specifics of the hit-
     * test. See {@link #hitTest(point[, options])} for a list of all options.
     *
     * @name Item#hitTestAll
     * @function
     * @param {Point} point the point where the hit-test should be performed
     *     (in global coordinates system).
     * @param {Object} [options={ fill: true, stroke: true, segments: true,
     *     tolerance: settings.hitTolerance }]
     * @return {HitResult[]} hit result objects for all hits, describing what
     *     exactly was hit or `null` if nothing was hit
     * @see #hitTest(point[, options]);
     */

    _hitTest(
        point: Point,
        options?: HitResultOptions,
        parentViewMatrix?: Matrix
    ): HitResult {
        if (
            this._locked ||
            !this._visible ||
            (this._guide && !options.guides) ||
            this.isEmpty()
        ) {
            return null
        }

        const matrix = this._matrix
        const viewMatrix = parentViewMatrix
            ? parentViewMatrix.appended(matrix)
            : // If this is the first one in the recursion, factor in the
              // zoom of the view and the globalMatrix of the item.
              this.getGlobalMatrix().prepend(this.getView().matrix)

        const tolerance = Math.max(options.tolerance, Numerical.EPSILON)

        const tolerancePadding = (options._tolerancePadding = new Size(
            Path._getStrokePadding(tolerance, matrix.shiftless().invert())
        ))
        // Transform point to local coordinates.
        point = matrix.inverseTransform(point)
        // If the matrix is non-reversible, point will now be `null`:
        if (
            !point ||
            (!this._children &&
                !this.getBounds({ internal: true, stroke: true, handle: true })
                    .expand(tolerancePadding.multiply(2))
                    .containsPoint(point))
        ) {
            return null
        }

        const checkSelf = !(
            (options.guides && !this._guide) ||
            (options.selected && !this.isSelected()) ||
            (options.type && options.type !== Base.hyphenate(this._class)) ||
            (options.class && !(this instanceof options.class))
        )
        const match = options.match
        const that = this
        let bounds: Rectangle
        let res: HitResult

        function filter(hit: HitResult): HitResult {
            if (hit && match && !match(hit)) hit = null
            if (hit && options.all) options.all.push(hit)
            return hit
        }

        function checkPoint(type: HitResultTypes, part?: string) {
            const pt = part ? bounds['get' + part]() : that.getPosition()

            if (point.subtract(pt).divide(tolerancePadding).length <= 1) {
                return new HitResult(type, that, {
                    name: part ? Base.hyphenate(part) : type,
                    point: pt
                })
            }

            return null
        }

        const checkPosition = options.position
        const checkCenter = options.center
        const checkBounds = options.bounds
        if (
            checkSelf &&
            this._parent &&
            (checkPosition || checkCenter || checkBounds)
        ) {
            if (checkCenter || checkBounds) {
                // Get the internal, untransformed bounds, as we check against
                // transformed points.
                bounds = this.getInternalBounds()
            }
            res =
                (checkPosition && checkPoint('position')) ||
                (checkCenter && checkPoint('center', 'Center'))
            if (!res && checkBounds) {
                const points = [
                    'TopLeft',
                    'TopRight',
                    'BottomLeft',
                    'BottomRight',
                    'LeftCenter',
                    'TopCenter',
                    'RightCenter',
                    'BottomCenter'
                ]
                for (let i = 0; i < 8 && !res; i++) {
                    res = checkPoint('bounds', points[i])
                }
            }
            res = filter(res)
        }

        if (!res) {
            res =
                this._hitTestChildren(point, options, viewMatrix) ||
                // NOTE: We don't call match on _hitTestChildren() because
                // it is already called internally.
                (checkSelf &&
                    filter(
                        this._hitTestSelf(
                            point,
                            options,
                            viewMatrix,
                            this.getStrokeScaling()
                                ? null
                                : viewMatrix.shiftless().invert()
                        )
                    )) ||
                null
        }

        if (res && res.point) {
            res.point = matrix.transform(res.point)
        }
        return res
    }

    protected _hitTestSelf(
        point: Point,
        options: HitResultOptions,
        _viewMatrix: Matrix,
        _strokeMatrix: Matrix
    ): HitResult {
        if (options.fill && this.hasFill() && this._contains(point))
            return new HitResult('fill', this)

        return null
    }

    /**
     * Checks whether the item matches the criteria described by the given
     * object, by iterating over all of its properties and matching against
     * their values through {@link #matches(name, compare)}.
     *
     * See {@link Project#getItems(options)} for a selection of illustrated
     * examples.
     *
     * @name Item#matches
     * @function
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Boolean} {@true if the item matches all the criteria}
     * @see #getItems(options)
     */
    /**
     * Checks whether the item matches the given criteria. Extended matching is
     * possible by providing a compare function or a regular expression.
     * Matching points, colors only work as a comparison of the full object, not
     * partial matching (e.g. only providing the x-coordinate to match all
     * points with that x-value). Partial matching does work for
     * {@link Item#data}.
     *
     * See {@link Project#getItems(options)} for a selection of illustrated
     * examples.
     *
     * @name Item#matches
     * @function
     *
     * @param {String} name the name of the state to match against
     * @param {Object} compare the value, function or regular expression to
     * compare against
     * @return {Boolean} {@true if the item matches the state}
     * @see #getItems(options)
     */
    matches(name: object | ((item: Item) => boolean)): boolean
    matches(name: string, compare?: object): boolean
    matches(name: any, compare?: any): boolean {
        function matchObject(obj1: object, obj2: object) {
            for (const i in obj1) {
                if (obj1.hasOwnProperty(i)) {
                    const val1 = obj1[i]
                    const val2 = obj2[i]
                    if (Base.isPlainObject(val1) && Base.isPlainObject(val2)) {
                        if (!matchObject(val1, val2)) return false
                    } else if (!Base.equals(val1, val2)) {
                        return false
                    }
                }
            }
            return true
        }
        const type = typeof name
        if (type === 'object') {
            for (const key in name) {
                if (name.hasOwnProperty(key) && !this.matches(key, name[key]))
                    return false
            }
            return true
        } else if (type === 'function') {
            return name(this)
        } else if (name === 'match') {
            return compare(this)
        } else {
            let value = /^(empty|editable)$/.test(name)
                ? this['is' + Base.capitalize(name)]()
                : name === 'type'
                ? Base.hyphenate(this._class)
                : this[name]
            if (name === 'class') {
                if (typeof compare === 'function')
                    return this instanceof compare
                value = this._class
            }
            if (typeof compare === 'function') {
                return !!compare(value)
            } else if (compare) {
                if (compare.test) {
                    return compare.test(value)
                } else if (Base.isPlainObject(compare)) {
                    return matchObject(compare, value)
                }
            }
            return Base.equals(value, compare)
        }
    }

    /**
     * Fetch the descendants (children or children of children) of this item
     * that match the properties in the specified object. Extended matching is
     * possible by providing a compare function or regular expression. Matching
     * points, colors only work as a comparison of the full object, not partial
     * matching (e.g. only providing the x- coordinate to match all points with
     * that x-value). Partial matching does work for {@link Item#data}.
     *
     * Matching items against a rectangular area is also possible, by setting
     * either `options.inside` or `options.overlapping` to a rectangle
     * describing the area in which the items either have to be fully or partly
     * contained.
     *
     * See {@link Project#getItems(options)} for a selection of illustrated
     * examples.
     *
     * @option [options.recursive=true] {Boolean} whether to loop recursively
     *     through all children, or stop at the current level
     * @option options.match {Function} a match function to be called for each
     *     item, allowing the definition of more flexible item checks that are
     *     not bound to properties. If no other match properties are defined,
     *     this function can also be passed instead of the `options` object
     * @option options.class {Function} the constructor function of the item
     *     type to match against
     * @option options.inside {Rectangle} the rectangle in which the items need
     *     to be fully contained
     * @option options.overlapping {Rectangle} the rectangle with which the
     *     items need to at least partly overlap
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Item[]} the list of matching descendant items
     * @see #matches(options)
     */
    getItems(options: MatchOptions): Item[] {
        return Item._getItems(this, options, this._matrix)
    }

    /**
     * Fetch the first descendant (child or child of child) of this item
     * that matches the properties in the specified object.
     * Extended matching is possible by providing a compare function or
     * regular expression. Matching points, colors only work as a comparison
     * of the full object, not partial matching (e.g. only providing the x-
     * coordinate to match all points with that x-value). Partial matching
     * does work for {@link Item#data}.
     * See {@link Project#getItems(match)} for a selection of illustrated
     * examples.
     *
     * @param {Object|Function} options the criteria to match against
     * @return {Item} the first descendant item matching the given criteria
     * @see #getItems(options)
     */
    getItem(options: MatchOptions): Item {
        return (
            Item._getItems(this, options, this._matrix, null, true)[0] || null
        )
    }

    static _getItems(
        item: Item | Project,
        options?: MatchOptions,
        matrix?: Matrix,
        param?: MatchParamOptions,
        firstOnly?: boolean
    ): Item[] {
        if (!param) {
            const obj = typeof options === 'object' && options
            const overlapping = obj && obj.overlapping
            const inside = obj && obj.inside

            const bounds = overlapping || inside
            const rect = bounds && Rectangle.read([bounds])
            param = {
                items: [],
                recursive: obj && obj.recursive !== false,
                inside: !!inside,
                overlapping: !!overlapping,
                rect: rect,
                path:
                    overlapping &&
                    new Path.Rectangle({
                        rectangle: rect,
                        insert: false
                    })
            }
            if (obj) {
                options = Base.filter({}, options, {
                    recursive: true,
                    inside: true,
                    overlapping: true
                })
            }
        }
        const children = item.children
        const items = param.items
        const rect = param.rect
        matrix = rect && (matrix || new Matrix())
        for (let i = 0, l = children && children.length; i < l; i++) {
            const child = children[i]
            const childMatrix = matrix && matrix.appended(child._matrix)
            let add = true
            if (rect) {
                const bounds = child.getBounds(childMatrix)
                if (!rect.intersects(bounds)) continue
                if (
                    !(
                        rect.contains(bounds) ||
                        (param.overlapping &&
                            (bounds.contains(rect) ||
                                param.path.intersects(child, childMatrix)))
                    )
                )
                    add = false
            }
            if (add && child.matches(options)) {
                items.push(child)
                if (firstOnly) break
            }
            if (param.recursive !== false) {
                Item._getItems(child, options, childMatrix, param, firstOnly)
            }
            if (firstOnly && items.length > 0) break
        }
        return items
    }

    /**
     * {@grouptitle Importing / Exporting JSON and SVG}
     *
     * Exports (serializes) the item with its content and child items to a JSON
     * data string.
     *
     * @name Item#exportJSON
     * @function
     *
     * @option [options.asString=true] {Boolean} whether the JSON is returned as
     *     a `Object` or a `String`
     * @option [options.precision=5] {Number} the amount of fractional digits in
     *     numbers used in JSON data
     *
     * @param {Object} [options] the serialization options
     * @return {String} the exported JSON data
     */
    exportJSON(options?: ExportJsonOptions): string {
        return super.exportJSON(options)
    }

    /**
     * Imports (deserializes) the stored JSON data into this item. If the data
     * describes an item of the same class or a parent class of the item, the
     * data is imported into the item itself. If not, the imported item is added
     * to this item's {@link Item#children} list. Note that not all type of
     * items can have children.
     *
     * @param {String} json the JSON data to import from
     * @return {Item}
     */
    importJSON(json: string): this {
        const res = Base.importJSON(json, this) as Item
        return (res !== this ? this.addChild(res) : res) as this
    }

    /**
     * Exports the item with its content and child items as an SVG DOM.
     *
     * @name Item#exportSVG
     * @function
     *
     * @option [options.bounds='view'] {String|Rectangle} the bounds of the area
     *     to export, either as a string ({@values 'view', content'}), or a
     *     {@link Rectangle} object: `'view'` uses the view bounds,
     *     `'content'` uses the stroke bounds of all content
     * @option [options.matrix=paper.view.matrix] {Matrix} the matrix with which
     *     to transform the exported content: If `options.bounds` is set to
     *     `'view'`, `paper.view.matrix` is used, for all other settings of
     *     `options.bounds` the identity matrix is used.
     * @option [options.asString=false] {Boolean} whether a SVG node or a
     *     `String` is to be returned
     * @option [options.precision=5] {Number} the amount of fractional digits in
     *     numbers used in SVG data
     * @option [options.matchShapes=false] {Boolean} whether path items should
     *     tried to be converted to SVG shape items (rect, circle, ellipse,
     *     line, polyline, polygon), if their geometries match
     * @option [options.embedImages=true] {Boolean} whether raster images should
     *     be embedded as base64 data inlined in the xlink:href attribute, or
     *     kept as a link to their external URL.
     *
     * @param {Object} [options] the export options
     * @return {SVGElement|String} the item converted to an SVG node or a
     * `String` depending on `option.asString` value
     */
    exportSVG(_: any): void {}

    /**
     * Converts the provided SVG content into Paper.js items and adds them to
     * the this item's children list. Note that the item is not cleared first.
     * You can call {@link Item#removeChildren()} to do so.
     *
     * @name Item#importSVG
     * @function
     *
     * @option [options.expandShapes=false] {Boolean} whether imported shape
     *     items should be expanded to path items
     * @option options.onLoad {Function} the callback function to call once the
     *     SVG content is loaded from the given URL receiving two arguments: the
     *     converted `item` and the original `svg` data as a string. Only
     *     required when loading from external resources.
     * @option options.onError {Function} the callback function to call if an
     *     error occurs during loading. Only required when loading from external
     *     resources.
     * @option [options.insert=true] {Boolean} whether the imported items should
     *     be added to the item that `importSVG()` is called on
     * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
     *     {Boolean} whether the imported items should have their transformation
     *     matrices applied to their contents or not
     *
     * @param {SVGElement|String} svg the SVG content to import, either as a SVG
     *     DOM node, a string containing SVG content, or a string describing the
     *     URL of the SVG file to fetch.
     * @param {Object} [options] the import options
     * @return {Item} the newly created Paper.js item containing the converted
     *     SVG content
     */
    importSVG(node: SVGElement | string, options?: any): Item

    /**
     * Imports the provided external SVG file, converts it into Paper.js items
     * and adds them to the this item's children list. Note that the item is not
     * cleared first. You can call {@link Item#removeChildren()} to do so.
     *
     * @name Item#importSVG
     * @function
     *
     * @param {SVGElement|String} svg the URL of the SVG file to fetch.
     * @param {Function} onLoad the callback function to call once the SVG
     *     content is loaded from the given URL receiving two arguments: the
     *     converted `item` and the original `svg` data as a string. Only
     *     required when loading from external files.
     * @return {Item} the newly created Paper.js item containing the converted
     *     SVG content
     */
    importSVG(node: SVGElement | string, onLoad?: Function): Item
    importSVG(_node: SVGElement | string, _options?: Function | any): Item {
        return null
        /*
        return SvgImport.importSVG(
            node as unknown as HTMLElement,
            options,
            this
        )
        */
    }

    /**
     * {@grouptitle Hierarchy Operations}
     *
     * Adds the specified item as a child of this item at the end of the its
     * {@link #children}  list. You can use this function for groups, compound
     * paths and layers.
     *
     * @param {Item} item the item to be added as a child
     * @return {Item} the added item, or `null` if adding was not possible
     */
    addChild(item: Item): Item {
        return this.insertChild(undefined, item)
    }

    /**
     * Inserts the specified item as a child of this item at the specified index
     * in its {@link #children} list. You can use this function for groups,
     * compound paths and layers.
     *
     * @param {Number} index the index at which to insert the item
     * @param {Item} item the item to be inserted as a child
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    insertChild(index: number, item: Item): Item {
        const res = item ? this.insertChildren(index, [item]) : null
        return res && res[0]
    }

    /**
     * Adds the specified items as children of this item at the end of the its
     * children list. You can use this function for groups, compound paths and
     * layers.
     *
     * @param {Item[]} items the items to be added as children
     * @return {Item[]} the added items, or `null` if adding was not possible
     */
    addChildren(items: Item[]): Item[] {
        return this.insertChildren(this._children.length, items) as this[]
    }

    /**
     * Inserts the specified items as children of this item at the specified
     * index in its {@link #children} list. You can use this function for
     * groups, compound paths and layers.
     *
     * @param {Number} index
     * @param {Item[]} items the items to be appended as children
     * @return {Item[]} the inserted items, or `null` if inserted was not
     *     possible
     */
    insertChildren(index: number, items: Item[]): Item[] {
        const children = this._children
        if (children && items && items.length > 0) {
            items = Base.slice(items)

            const inserted = {}
            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i]
                const id = item && item._id

                if (!item || inserted[id]) {
                    items.splice(i, 1)
                } else {
                    item._remove(false, true)
                    inserted[id] = true
                }
            }
            Base.splice(children, items, index, 0)
            const project = this._project
            const notifySelf = project.changes

            for (let i = 0, l = items.length; i < l; i++) {
                const item = items[i]
                const name = item._name
                item._parent = this
                item._setProject(project, true)

                if (name) item.setName(name)
                if (notifySelf) item._changed(Change.INSERTION)
            }
            this._changed(Change.CHILDREN)
        } else {
            items = null
        }
        return items
    }

    protected _insertItem(index: number, item: Item): Item {
        return this.insertChild(index, item)
    }

    insertItem(index: number, item: Item, _?: boolean): Item {
        return this.insertItem(index, item)
    }

    /**
     * Private helper method used by {@link #insertAbove(item)} and
     * {@link #insertBelow(item)}, to insert this item in relation to a
     * specified other item.
     *
     * @param {Item} item the item in relation to which which it should be
     *     inserted
     * @param {Number} offset the offset at which the item should be inserted
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    protected _insertAt(item: Item, offset: number): Item {
        const owner = item && item._getOwner()
        const res = item !== this && owner ? this : null
        if (res) {
            res._remove(false, true)
            owner.insertItem(item._index + offset, res)
        }
        return res
    }

    /**
     * Inserts this item above the specified item.
     *
     * @param {Item} item the item above which it should be inserted
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    insertAbove(item: Item): Item {
        return this._insertAt(item, 1)
    }

    /**
     * Inserts this item below the specified item.
     *
     * @param {Item} item the item below which it should be inserted
     * @return {Item} the inserted item, or `null` if inserting was not possible
     */
    insertBelow(item: Item): Item {
        return this._insertAt(item, 0)
    }

    /**
     * Sends this item to the back of all other items within the same parent.
     */
    sendToBack(): Item {
        const owner = this._getOwner()
        return owner ? owner.insertItem(0, this) : null
    }

    /**
     * Brings this item to the front of all other items within the same parent.
     */
    bringToFront(): Item {
        const owner = this._getOwner()
        return owner ? owner.insertItem(undefined, this) : null
    }

    /**
     * Adds it to the specified owner, which can be either a {@link Item} or a
     * {@link Project}.
     *
     * @param {Project|Layer|Group|CompoundPath} owner the item or project to
     * add the item to
     * @return {Item} the item itself, if it was successfully added
     * @chainable
     */
    addTo(owner: Item): Item {
        return owner._insertItem(undefined, this)
    }

    /**
     * Clones the item and adds it to the specified owner, which can be either
     * a {@link Item} or a {@link Project}.
     *
     * @param {Project|Layer|Group|CompoundPath} owner the item or project to
     * copy the item to
     * @return {Item} the new copy of the item, if it was successfully added
     * @chainable
     */
    copyTo(owner: Item): Item {
        return this.clone(false).addTo(owner)
    }

    /**
     * If this is a group, layer or compound-path with only one child-item,
     * the child-item is moved outside and the parent is erased. Otherwise, the
     * item itself is returned unmodified.
     *
     * @return {Item} the reduced item
     */
    reduce(options?: any): this {
        const children = this._children
        if (children && children.length === 1) {
            const child = children[0].reduce(options)

            if (this._parent) {
                child.insertAbove(this)
                this.remove()
            } else {
                child.remove()
            }
            return child as this
        }
        return this
    }

    /**
     * Removes the item from its parent's named children list.
     */
    protected _removeNamed() {
        const owner = this._getOwner()
        if (owner) {
            const children = owner.children
            const namedChildren = owner.namedChildren
            const name = this._name
            const namedArray = namedChildren[name]
            const index = namedArray ? namedArray.indexOf(this) : -1
            if (index !== -1) {
                if (children[name] === this) delete children[name]

                namedArray.splice(index, 1)
                if (namedArray.length) {
                    children[name] = namedArray[0]
                } else {
                    delete namedChildren[name]
                }
            }
        }
    }

    /**
     * Removes the item from its parent's children list.
     */
    protected _remove(notifySelf?: boolean, notifyParent?: boolean): boolean {
        const owner = this._getOwner()
        const project = this._project
        const index = this._index
        if (this._style) this._style._dispose()
        if (owner) {
            if (this._name) this._removeNamed()
            if (index != null) {
                if (this instanceof Layer && project.activeLayer === this)
                    project.activeLayer = (this.getNextSibling() ||
                        this.getPreviousSibling()) as Layer
                Base.splice(owner.children, null, index, 1)
            }
            this._installEvents(false)
            if (notifySelf && project.changes) this._changed(Change.INSERTION)
            if (notifyParent) owner.changed(Change.CHILDREN, this)
            this._parent = null
            return true
        }
        return false
    }

    /**
     * Removes the item and all its children from the project. The item is not
     * destroyed and can be inserted again after removal.
     *
     * @return {Boolean} {@true if the item was removed}
     */
    remove(notifySelf = true, notifyParent = true): boolean {
        return this._remove(notifySelf, notifyParent)
    }

    /**
     * Replaces this item with the provided new item which will takes its place
     * in the project hierarchy instead.
     *
     * @param {Item} item the item that will replace this item
     * @return {Boolean} {@true if the item was replaced}
     */
    replaceWith(item: Item): boolean {
        const ok = !!(item && item.insertBelow(this))
        if (ok) this.remove()
        return ok
    }

    /**
     * Removes all of the item's {@link #children} (if any).
     *
     * @name Item#removeChildren
     * @alias Item#clear
     * @function
     * @return {Item[]} an array containing the removed items
     */
    /**
     * Removes the children from the specified `start` index to and excluding
     * the `end` index from the parent's {@link #children} array.
     *
     * @name Item#removeChildren
     * @function
     * @param {Number} start the beginning index, inclusive
     * @param {Number} [end=children.length] the ending index, exclusive
     * @return {Item[]} an array containing the removed items
     */
    removeChildren(start?: number, end?: number): Item[] {
        if (!this._children) return null
        start = start || 0
        end = Base.pick(end, this._children.length)

        const removed = Base.splice(this._children, null, start, end - start)
        for (let i = removed.length - 1; i >= 0; i--) {
            removed[i]._remove(true, false)
        }
        if (removed.length > 0) this._changed(Change.CHILDREN)
        return removed
    }

    clear(): Item[] | void {
        return this.removeChildren()
    }

    /**
     * Reverses the order of the item's children
     */
    reverseChildren() {
        if (this._children) {
            this._children.reverse()
            for (let i = 0, l = this._children.length; i < l; i++)
                this._children[i]._index = i
            this._changed(Change.CHILDREN)
        }
    }

    /**
     * {@grouptitle Tests}
     * Specifies whether the item has any content or not. The meaning of what
     * content is differs from type to type. For example, a {@link Group} with
     * no children, a {@link TextItem} with no text content and a {@link Path}
     * with no segments all are considered empty.
     *
     * @param {Boolean} [recursively=false] whether an item with children should be
     * considered empty if all its descendants are empty
     * @return {Boolean}
     */
    isEmpty(recursively?: boolean): boolean {
        const children = this._children
        const numChildren = children ? children.length : 0
        if (recursively) {
            for (let i = 0; i < numChildren; i++) {
                if (!children[i].isEmpty(recursively)) {
                    return false
                }
            }
            return true
        }
        return !numChildren
    }

    /**
     * Checks whether the item is editable.
     *
     * @return {Boolean} {@true when neither the item, nor its parents are
     * locked or hidden}
     * @ignore
     */
    // TODO: Item#isEditable is currently ignored in the documentation, as
    // locking an item currently has no effect
    isEditable(): boolean {
        let item: Item = this
        while (item) {
            if (!item._visible || item._locked) return false
            item = item._parent
        }
        return true
    }

    /**
     * {@grouptitle Style Tests}
     *
     * Checks whether the item has a fill.
     *
     * @return {Boolean} {@true if the item has a fill}
     */
    hasFill(): boolean {
        return this.getStyle().hasFill()
    }

    /**
     * Checks whether the item has a stroke.
     *
     * @return {Boolean} {@true if the item has a stroke}
     */
    hasStroke(): boolean {
        return this.getStyle().hasStroke()
    }

    /**
     * Checks whether the item has a shadow.
     *
     * @return {Boolean} {@true if the item has a shadow}
     */
    hasShadow(): boolean {
        return this.getStyle().hasShadow()
    }

    /**
     * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
     * defined in such a way, e.g. if one is a descendant of the other.
     */
    protected _getOrder(item: Item) {
        function getList(item: Item) {
            const list = []
            do {
                list.unshift(item)
            } while ((item = item._parent))
            return list
        }
        const list1 = getList(this)
        const list2 = getList(item)
        for (let i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
            if (list1[i] !== list2[i]) {
                return list1[i]._index < list2[i]._index ? 1 : -1
            }
        }
        return 0
    }

    /**
     * {@grouptitle Hierarchy Tests}
     *
     * Checks if the item contains any children items.
     *
     * @return {Boolean} {@true it has one or more children}
     */
    hasChildren(): boolean {
        return this._children && this._children.length > 0
    }

    /**
     * Checks whether the item and all its parents are inserted into scene graph
     * or not.
     *
     * @return {Boolean} {@true if the item is inserted into the scene graph}
     */
    isInserted(): boolean {
        return this._parent ? this._parent.isInserted() : false
    }

    /**
     * Checks if this item is above the specified item in the stacking order
     * of the project.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is above the specified item}
     */
    isAbove(item: Item): boolean {
        return this._getOrder(item) === -1
    }

    /**
     * Checks if the item is below the specified item in the stacking order of
     * the project.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is below the specified item}
     */
    isBelow(item: Item): boolean {
        return this._getOrder(item) === 1
    }

    /**
     * Checks whether the specified item is the parent of the item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is the parent of the item}
     */
    isParent(item: Item): boolean {
        return this._parent === item
    }

    /**
     * Checks whether the specified item is a child of the item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true it is a child of the item}
     */
    isChild(item: Item): boolean {
        return item && item._parent === this
    }

    /**
     * Checks if the item is contained within the specified item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if it is inside the specified item}
     */
    isDescendant(item: Item): boolean {
        let parent: Item = this
        while ((parent = parent._parent)) {
            if (parent === item) return true
        }
        return false
    }

    /**
     * Checks if the item is an ancestor of the specified item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if the item is an ancestor of the specified
     * item}
     */
    isAncestor(item: Item): boolean {
        return item ? item.isDescendant(this) : false
    }

    /**
     * Checks if the item is an a sibling of the specified item.
     *
     * @param {Item} item the item to check against
     * @return {Boolean} {@true if the item is aa sibling of the specified item}
     */
    isSibling(item: Item): boolean {
        return this._parent === item._parent
    }

    /**
     * Checks whether the item is grouped with the specified item.
     *
     * @param {Item} item
     * @return {Boolean} {@true if the items are grouped together}
     */
    isGroupedWith(item: Item): boolean {
        let parent = this._parent
        while (parent) {
            if (
                parent._parent &&
                /^(Group|Layer|CompoundPath)$/.test(parent._class) &&
                item.isDescendant(parent)
            )
                return true
            parent = parent._parent
        }
        return false
    }

    /**
     * {@grouptitle Stroke Style}
     *
     * The color of the stroke.
     *
     * @name Item#strokeColor
     * @property
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the stroke color of a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Set its stroke color to RGB red:
     * circle.strokeColor = new Color(1, 0, 0);
     */
    getStrokeColor(_dontMerge?: boolean): Color {
        return this._style.getStrokeColor(_dontMerge)
    }

    setStrokeColor(color: Partial<Color & ColorType>): this {
        this._style.setStrokeColor(color)
        return this
    }

    get strokeColor(): Color {
        return this.getStrokeColor()
    }

    set strokeColor(color: Partial<Color & ColorType>) {
        this.setStrokeColor(color)
    }

    /**
     * The width of the stroke.
     *
     * @name Item#strokeWidth
     * @property
     * @type Number
     *
     * @example {@paperscript}
     * // Setting an item's stroke width:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35,
     *     strokeColor: 'red'
     * });
     *
     * // Set its stroke width to 10:
     * circle.strokeWidth = 10;
     */
    getStrokeWidth(_dontMerge?: boolean): number {
        return this._style.getStrokeWidth(_dontMerge)
    }

    setStrokeWidth(width: number): this {
        this._style.setStrokeWidth(width)
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
     * @name Item#strokeCap
     * @property
     * @type String
     * @values 'round', 'square', 'butt'
     * @default 'butt'
     *
     * @example {@paperscript height=200}
     * // A look at the different stroke caps:
     *
     * var line = new Path({
     *     segments: [[80, 50], [420, 50]],
     *     strokeColor: 'black',
     *     strokeWidth: 20,
     *     selected: true
     * });
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
        return this._style.getStrokeCap(_dontMerge)
    }

    setStrokeCap(cap: StrokeCaps): this {
        this._style.setStrokeCap(cap)
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
     * @name Item#strokeJoin
     * @property
     * @type String
     * @values 'miter', 'round', 'bevel'
     * @default 'miter'
     *
     * @example {@paperscript height=120}
     * // A look at the different stroke joins:
     * var path = new Path({
     *     segments: [[80, 100], [120, 40], [160, 100]],
     *     strokeColor: 'black',
     *     strokeWidth: 20,
     *     // Select the path, in order to see where the stroke is formed:
     *     selected: true
     * });
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
        return this._style.getStrokeJoin(_dontMerge)
    }

    setStrokeJoin(join: StrokeJoins): this {
        this._style.setStrokeJoin(join)
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
     * @name Item#strokeScaling
     * @property
     * @type Boolean
     * @default true
     */
    getStrokeScaling(_dontMerge?: boolean): boolean {
        return this._style.getStrokeScaling(_dontMerge)
    }

    setStrokeScaling(scaling: boolean): this {
        this._style.getStrokeScaling(scaling)
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
     * @name Item#dashOffset
     * @property
     * @type Number
     * @default 0
     */
    getDashOffset(_dontMerge?: boolean): number {
        return this._style.getDashOffset(_dontMerge)
    }

    setDashOffset(offset: number): this {
        this._style.setDashOffset(offset)
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
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40,
     *     strokeWidth: 2,
     *     strokeColor: 'black'
     * });
     *
     * // Set the dashed stroke to [10pt dash, 4pt gap]:
     * path.dashArray = [10, 4];
     *
     * @name Item#dashArray
     * @property
     * @type Number[]
     * @default []
     */
    getDashArray(_dontMerge?: boolean): number[] {
        return this._style.getDashArray(_dontMerge)
    }

    setDashArray(array: number[]): this {
        this._style.setDashArray(array)
        return this
    }

    get dashArray(): number[] {
        return this.getDashArray()
    }

    set dashArray(array: number[]) {
        this.setDashArray(array)
    }

    /**
     * The miter limit of the stroke.
     * When two line segments meet at a sharp angle and miter joins have been
     * specified for {@link Item#strokeJoin}, it is possible for the miter to
     * extend far beyond the {@link Item#strokeWidth} of the path. The
     * miterLimit imposes a limit on the ratio of the miter length to the
     * {@link Item#strokeWidth}.
     *
     * @name Item#miterLimit
     * @property
     * @type Number
     * @default 10
     */
    getMiterLimit(_dontMerge?: boolean): number {
        return this._style.getMiterLimit(_dontMerge)
    }

    setMiterLimit(limit: number): this {
        this._style.setMiterLimit(limit)
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
     * The fill color of the item.
     *
     * @name Item#fillColor
     * @property
     * @type ?Color
     *
     * @example {@paperscript}
     * // Setting the fill color of a path to red:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Set the fill color of the circle to RGB red:
     * circle.fillColor = new Color(1, 0, 0);
     */
    getFillColor(_dontMerge?: boolean): Color {
        return this._style.getFillColor(_dontMerge)
    }

    setFillColor(color: Partial<Color & ColorType>): this {
        this._style.setFillColor(color)
        return this
    }

    get fillColor(): Color {
        return this.getFillColor()
    }

    set fillColor(color: Partial<Color & ColorType>) {
        this.setFillColor(color)
    }

    /**
     * The fill-rule with which the shape gets filled. Please note that only
     * modern browsers support fill-rules other than `'nonzero'`.
     *
     * @name Item#fillRule
     * @property
     * @type String
     * @values 'nonzero', 'evenodd'
     * @default 'nonzero'
     */
    getFillRule(_dontMerge?: boolean): FillRules {
        return this._style.getFillRule(_dontMerge)
    }

    setFillRule(rule: FillRules): this {
        this._style.setFillRule(rule)
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
     * @name Item#shadowColor
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
        return this._style.getShadowColor(_dontMerge)
    }

    setShadowColor(color: Partial<Color & ColorType>): this {
        this._style.setShadowColor(color)
        return this
    }

    get shadowColor(): Color {
        return this.getShadowColor()
    }

    set shadowColor(color: Partial<Color & ColorType>) {
        this.setShadowColor(color)
    }

    /**
     * The shadow's blur radius.
     *
     * @property
     * @name Item#shadowBlur
     * @type Number
     * @default 0
     */
    getShadowBlur(_dontMerge?: boolean): number {
        return this._style.getShadowBlur(_dontMerge)
    }

    setShadowBlur(blur: number): this {
        this._style.setShadowBlur(blur)
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
     * @name Item#shadowOffset
     * @type Point
     * @default 0
     */
    getShadowOffset(_dontMerge?: boolean): Point {
        return this._style.getShadowOffset(_dontMerge)
    }

    setShadowOffset(offset: Partial<Point & PointType>): this {
        this._style.setShadowOffset(offset)
        return this
    }

    get shadowOffset(): Point {
        return this.getShadowOffset()
    }

    set shadowOffset(offset: Partial<Point & PointType>) {
        this.setShadowOffset(offset)
    }

    // TODO: Find a better name than selectedColor. It should also be used for
    // guides, etc.
    /**
     * {@grouptitle Selection Style}
     *
     * The color the item is highlighted with when selected. If the item does
     * not specify its own color, the color defined by its layer is used instead.
     *
     * @name Item#selectedColor
     * @property
     * @type ?Color
     */
    getSelectedColor(_dontMerge?: boolean): Color {
        return this._style.getSelectedColor(_dontMerge)
    }

    setSelectedColor(color: Partial<Color & ColorType>): this {
        this._style.setSelectedColor(color)
        return this
    }

    get selectedColor(): Color {
        return this.getSelectedColor()
    }

    set selectedColor(color: Partial<Color & ColorType>) {
        this.setSelectedColor(color)
    }

    private setTransform(key: string, ...args: any[]): this {
        const rotate = key === 'rotate'
        const value = (rotate ? Base : Point).read(args)
        const center = Point.read(args, 0, { readNull: true })

        return this.transform(
            new Matrix()[key](value, center || this.getPosition(true))
        )
    }

    /**
     * {@grouptitle Transform Functions}
     *
     * Translates (moves) the item by the given offset views.
     *
     * @param {Point} delta the offset to translate the item by
     */
    translate(point: PointType): this
    translate(x: number, y?: number): this
    translate(...args: any[]): this {
        const mx = new Matrix()
        return this.transform(mx.translate(...args))
    }

    /**
     * Rotates the item by a given angle around the given center point.
     *
     * Angles are oriented clockwise and measured in degrees.
     *
     * @name Item#rotate
     * @function
     * @param {Number} angle the rotation angle
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#rotate(angle[, center])
     *
     * @example {@paperscript}
     * // Rotating an item:
     *
     * // Create a rectangle shaped path with its top left
     * // point at {x: 80, y: 25} and a size of {width: 50, height: 50}:
     * var path = new Path.Rectangle(new Point(80, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * // Rotate the path by 30 degrees:
     * path.rotate(30);
     *
     * @example {@paperscript height=200}
     * // Rotating an item around a specific point:
     *
     * // Create a rectangle shaped path with its top left
     * // point at {x: 175, y: 50} and a size of {width: 100, height: 100}:
     * var topLeft = new Point(175, 50);
     * var size = new Size(100, 100);
     * var path = new Path.Rectangle(topLeft, size);
     * path.fillColor = 'black';
     *
     * // Draw a circle shaped path in the center of the view,
     * // to show the rotation point:
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 5,
     *     fillColor: 'white'
     * });
     *
     * // Each frame rotate the path 3 degrees around the center point
     * // of the view:
     * function onFrame(event) {
     *     path.rotate(3, view.center);
     * }
     */
    rotate(angle: number, number?: number): this
    rotate(angle: number, array?: number[]): this
    rotate(angle: number, point?: PointType): this
    rotate(angle: number, size?: SizeType): this
    rotate(angle: number, center?: Point): this
    rotate(angle: number, x?: number, y?: number): this
    rotate(...args: any[]): this {
        return this.setTransform('rotate', ...args)
    }

    /**
     * Scales the item by the given value from its center point, or optionally
     * from a supplied point.
     *
     * @name Item#scale
     * @function
     * @param {Number} scale the scale factor
     * @param {Point} [center={@link Item#position}]
     *
     * @example {@paperscript}
     * // Scaling an item from its center point:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 20:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     *
     * // Scale the path by 150% from its center point
     * circle.scale(1.5);
     *
     * @example {@paperscript}
     * // Scaling an item from a specific point:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 20:
     * var circle = new Path.Circle({
     *     center: [80, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     *
     * // Scale the path 150% from its bottom left corner
     * circle.scale(1.5, circle.bounds.bottomLeft);
     */
    scale(scale: number, center?: Point): this
    /**
     * Scales the item by the given values from its center point, or optionally
     * from a supplied point.
     *
     * @name Item#scale
     * @function
     * @param {Number} hor the horizontal scale factor
     * @param {Number} ver the vertical scale factor
     * @param {Point} [center={@link Item#position}]
     *
     * @example {@paperscript}
     * // Scaling an item horizontally by 300%:
     *
     * // Create a circle shaped path at { x: 100, y: 50 }
     * // with a radius of 20:
     * var circle = new Path.Circle({
     *     center: [100, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     *
     * // Scale the path horizontally by 300%
     * circle.scale(3, 1);
     */
    scale(hor: number, ver: number, center?: Point): this

    scale(...args: any[]): this {
        return this.setTransform('scale', ...args)
    }

    // TODO: Add test for item shearing, as it might be behaving oddly.
    /**
     * Shears the item by the given value from its center point, or optionally
     * by a supplied point.
     *
     * @name Item#shear
     * @function
     * @param {Point} shear the horizontal and vertical shear factors as a point
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#shear(shear[, center])
     */
    shear(shear: Point, center?: Point): this

    /**
     * Shears the item by the given values from its center point, or optionally
     * by a supplied point.
     *
     * @name Item#shear
     * @function
     * @param {Number} hor the horizontal shear factor
     * @param {Number} ver the vertical shear factor
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#shear(hor, ver[, center])
     */
    shear(hor: number, ver: number, center?: Point): this
    shear(...args: any[]): this {
        return this.setTransform('shear', ...args)
    }

    /**
     * Skews the item by the given angles from its center point, or optionally
     * by a supplied point.
     *
     * @name Item#skew
     * @function
     * @param {Point} skew the horizontal and vertical skew angles in degrees
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#shear(skew[, center])
     */
    skew(skew: Point, center?: Point): this

    /**
     * Skews the item by the given angles from its center point, or optionally
     * by a supplied point.
     *
     * @name Item#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical sskew angle in degrees
     * @param {Point} [center={@link Item#position}]
     * @see Matrix#shear(hor, ver[, center])
     */
    skew(hor: number, ver: number, center?: Point): this
    skew(...args: any[]): this {
        return this.setTransform('skew', ...args)
    }

    /**
     * Transform the item.
     *
     * @param {Matrix} matrix the matrix by which the item shall be transformed
     */
    // TODO: Implement flags:
    // @param {String[]} flags array of any of the following: 'objects',
    //        'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
    //        'lines'. Default: ['objects', 'children']
    transform(
        matrix: Matrix,
        _applyRecursively?: boolean,
        _setApplyMatrix?: boolean
    ): this {
        const _matrix = this._matrix
        const transformMatrix = matrix && !matrix.isIdentity()
        let applyMatrix =
            (_setApplyMatrix && this._canApplyMatrix) ||
            (this._applyMatrix &&
                (transformMatrix ||
                    !_matrix.isIdentity() ||
                    (_applyRecursively && this._children)))

        if (!transformMatrix && !applyMatrix) return this

        if (transformMatrix) {
            if (!matrix.isInvertible() && _matrix.isInvertible())
                _matrix.backup = _matrix.getValues()

            _matrix.prepend(matrix, true)

            const style = this._style
            const fillColor = style.getFillColor(true)
            const strokeColor = style.getStrokeColor(true)

            if (fillColor) fillColor.transform(matrix)
            if (strokeColor) strokeColor.transform(matrix)
        }

        if (
            applyMatrix &&
            (applyMatrix = this._transformContent(
                _matrix,
                _applyRecursively,
                _setApplyMatrix
            ))
        ) {
            const pivot = this._pivot
            if (pivot) _matrix.transformPoint(pivot, pivot, true)

            _matrix.reset(true)

            if (_setApplyMatrix && this._canApplyMatrix)
                this._applyMatrix = true
        }

        const bounds = this._bounds
        const position = this._position
        if (transformMatrix || applyMatrix) {
            this._changed(Change.MATRIX)
        }

        const decomp = transformMatrix && bounds && matrix.decompose()
        if (decomp && decomp.skewing.isZero() && decomp.rotation % 90 === 0) {
            // Transform the old bound by looping through all the cached
            // bounds in _bounds and transform each.
            for (const key in bounds) {
                const cache = bounds[key]

                if (cache.nonscaling) {
                    delete bounds[key]
                } else if (applyMatrix || !cache.internal) {
                    const rect = cache.rect
                    matrix.transformBounds(rect, rect)
                }
            }
            this._bounds = bounds

            const cached =
                bounds[this._getBoundsCacheKey(this._boundsOptions || {})]
            if (cached) {
                this._position = this._getPositionFromBounds(cached.rect)
            }
        } else if (transformMatrix && position && this._pivot) {
            this._position = matrix.transformPoint(position, position)
        }

        return this
    }

    protected _transformContent(
        matrix: Matrix,
        applyRecursively?: boolean,
        setApplyMatrix?: boolean
    ) {
        const children = this._children
        if (children) {
            for (let i = 0, l = children.length; i < l; i++) {
                children[i].transform(matrix, applyRecursively, setApplyMatrix)
            }
            return true
        }

        return false
    }

    /**
     * Converts the specified point from global project coordinate space to the
     * item's own local coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    globalToLocal(x: number, y: number): Point
    globalToLocal(point: PointType): Point
    globalToLocal(...args: any[]): Point {
        return this.getGlobalMatrix(true).inverseTransform(Point.read(args))
    }

    /**
     * Converts the specified point from the item's own local coordinate space
     * to the global project coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    localToGlobal(x: number, y: number): Point
    localToGlobal(point: PointType): Point
    localToGlobal(...args: any[]): Point {
        return this.getGlobalMatrix(true).transformPoint(Point.read(args))
    }

    /**
     * Converts the specified point from the parent's coordinate space to
     * item's own local coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    parentToLocal(point: PointType): Point
    parentToLocal(x: number, y?: number): Point
    parentToLocal(...args: any[]): Point {
        return this._matrix.inverseTransform(Point.read(args))
    }

    /**
     * Converts the specified point from the item's own local coordinate space
     * to the parent's coordinate space.
     *
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point as a new instance
     */
    localToParent(point: PointType): Point
    localToParent(x: number, y?: number): Point
    localToParent(...args: any[]): Point {
        return this._matrix.transformPoint(Point.read(args))
    }

    /**
     * Transform the item so that its {@link #bounds} fit within the specified
     * rectangle, without changing its aspect ratio.
     *
     * @param {Rectangle} rectangle
     * @param {Boolean} [fill=false]
     *
     * @example {@paperscript height=100}
     * // Fitting an item to the bounding rectangle of another item's bounding
     * // rectangle:
     *
     * // Create a rectangle shaped path with its top left corner
     * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
     * var path = new Path.Rectangle({
     *     point: [80, 25],
     *     size: [75, 50],
     *     fillColor: 'black'
     * });
     *
     * // Create a circle shaped path with its center at {x: 80, y: 50}
     * // and a radius of 30.
     * var circlePath = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * // Fit the circlePath to the bounding rectangle of
     * // the rectangular path:
     * circlePath.fitBounds(path.bounds);
     *
     * @example {@paperscript height=100}
     * // Fitting an item to the bounding rectangle of another item's bounding
     * // rectangle with the fill parameter set to true:
     *
     * // Create a rectangle shaped path with its top left corner
     * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
     * var path = new Path.Rectangle({
     *     point: [80, 25],
     *     size: [75, 50],
     *     fillColor: 'black'
     * });
     *
     * // Create a circle shaped path with its center at {x: 80, y: 50}
     * // and a radius of 30.
     * var circlePath = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * // Fit the circlePath to the bounding rectangle of
     * // the rectangular path:
     * circlePath.fitBounds(path.bounds, true);
     *
     * @example {@paperscript height=200}
     * // Fitting an item to the bounding rectangle of the view
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * // Fit the path to the bounding rectangle of the view:
     * path.fitBounds(view.bounds);
     */
    fitBounds(point: PointType, size: SizeType, fill: Boolean): void
    fitBounds(rectangle: RectangleType, fill: Boolean): void
    fitBounds(
        x: number,
        y: number,
        width: number,
        height: number,
        fill: Boolean
    ): void

    fitBounds(from: PointType, to: PointType, fill: Boolean): void
    fitBounds(...args: any[]) {
        const rectangle = Rectangle.read(args)
        const fill = Base.read(args)
        const bounds = this.getBounds()
        const itemRatio = bounds.height / bounds.width
        const rectRatio = rectangle.height / rectangle.width
        const scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
            ? rectangle.width / bounds.width
            : rectangle.height / bounds.height
        const newBounds = new Rectangle(
            new Point(),
            new Size(bounds.width * scale, bounds.height * scale)
        )
        newBounds.setCenter(rectangle.getCenter())
        this.setBounds(newBounds)
    }

    /**
     * {@grouptitle Event Handlers}
     *
     * Item level handler function to be called on each frame of an animation.
     * The function receives an event object which contains information about
     * the frame event:
     *
     * @option event.count {Number} the number of times the frame event was
     *     fired
     * @option event.time {Number} the total amount of time passed since the
     *     first frame event in seconds
     * @option event.delta {Number} the time passed in seconds since the last
     *     frame event
     *
     * @name Item#onFrame
     * @property
     * @type ?Function
     * @see View#onFrame
     *
     * @example {@paperscript}
     * // Creating an animation:
     *
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * path.onFrame = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     this.rotate(3);
     * }
     */
    onFrame: ItemFrameEventFunction

    /**
     * The function to be called when the mouse button is pushed down on the
     * item. The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseDown
     * @property
     * @type ?Function
     * @see View#onMouseDown
     *
     * @example {@paperscript}
     * // Press the mouse button down on the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is pressed on the item,
     * // set its fill color to red:
     * path.onMouseDown = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * @example {@paperscript}
     * // Press the mouse on the circle shaped paths to remove them:
     *
     * // Loop 30 times:
     * for (var i = 0; i < 30; i++) {
     *     // Create a circle shaped path at a random position
     *     // in the view:
     *     var path = new Path.Circle({
     *         center: Point.random() * view.size,
     *         radius: 25,
     *         fillColor: 'black',
     *         strokeColor: 'white'
     *     });
     *
     *     // When the mouse is pressed on the item, remove it:
     *     path.onMouseDown = function(event) {
     *         this.remove();
     *     }
     * }
     */
    onMouseDown: ItemMouseEventFunction

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged over the item. The function receives a {@link
     * MouseEvent} object which contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseDrag
     * @property
     * @type ?Function
     * @see View#onMouseDrag
     *
     * @example {@paperscript height=240}
     * // Press and drag the mouse on the blue circle to move it:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 50,
     *     fillColor: 'blue'
     * });
     *
     * // Install a drag event handler that moves the path along.
     * path.onMouseDrag = function(event) {
     *     path.position += event.delta;
     * }
     */
    onMouseDrag: ItemMouseEventFunction

    /**
     * The function to be called when the mouse button is released over the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseUp
     * @property
     * @type ?Function
     * @see View#onMouseUp
     *
     * @example {@paperscript}
     * // Release the mouse button over the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is released over the item,
     * // set its fill color to red:
     * path.onMouseUp = function(event) {
     *     this.fillColor = 'red';
     * }
     */
    onMouseUp: ItemMouseEventFunction

    /**
     * The function to be called when the mouse clicks on the item. The function
     * receives a {@link MouseEvent} object which contains information about the
     * mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onClick
     * @property
     * @type ?Function
     * @see View#onClick
     *
     * @example {@paperscript}
     * // Click on the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is clicked on the item,
     * // set its fill color to red:
     * path.onClick = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * @example {@paperscript}
     * // Click on the circle shaped paths to remove them:
     *
     * // Loop 30 times:
     * for (var i = 0; i < 30; i++) {
     *     // Create a circle shaped path at a random position
     *     // in the view:
     *     var path = new Path.Circle({
     *         center: Point.random() * view.size,
     *         radius: 25,
     *         fillColor: 'black',
     *         strokeColor: 'white'
     *     });
     *
     *     // When the mouse clicks on the item, remove it:
     *     path.onClick = function(event) {
     *         this.remove();
     *     }
     * }
     */
    onClick: ItemMouseEventFunction

    /**
     * The function to be called when the mouse double clicks on the item. The
     * function receives a {@link MouseEvent} object which contains information
     * about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onDoubleClick
     * @property
     * @type ?Function
     * @see View#onDoubleClick
     *
     * @example {@paperscript}
     * // Double click on the circle shaped path, to make it red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse is double clicked on the item,
     * // set its fill color to red:
     * path.onDoubleClick = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * @example {@paperscript}
     * // Double click on the circle shaped paths to remove them:
     *
     * // Loop 30 times:
     * for (var i = 0; i < 30; i++) {
     *     // Create a circle shaped path at a random position
     *     // in the view:
     *     var path = new Path.Circle({
     *         center: Point.random() * view.size,
     *         radius: 25,
     *         fillColor: 'black',
     *         strokeColor: 'white'
     *     });
     *
     *     // When the mouse is double clicked on the item, remove it:
     *     path.onDoubleClick = function(event) {
     *         this.remove();
     *     }
     * }
     */
    onDoubleClick: ItemMouseEventFunction

    /**
     * The function to be called repeatedly while the mouse moves over the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseMove
     * @property
     * @type ?Function
     * @see View#onMouseMove
     *
     * @example {@paperscript}
     * // Move over the circle shaped path, to change its opacity:
     *
     * // Create a circle shaped path at the center of the view:
     *     var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     *     });
     *
     * // When the mouse moves on top of the item, set its opacity
     * // to a random value between 0 and 1:
     * path.onMouseMove = function(event) {
     *     this.opacity = Math.random();
     * }
     */
    onMouseMove: ItemMouseEventFunction

    /**
     * The function to be called when the mouse moves over the item. This
     * function will only be called again, once the mouse moved outside of the
     * item first. The function receives a {@link MouseEvent} object which
     * contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseEnter
     * @property
     * @type ?Function
     * @see View#onMouseEnter
     *
     * @example {@paperscript}
     * // When you move the mouse over the item, its fill color is set to red.
     * // When you move the mouse outside again, its fill color is set back
     * // to black.
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse enters the item, set its fill color to red:
     * path.onMouseEnter = function(event) {
     *     this.fillColor = 'red';
     * }
     *
     * // When the mouse leaves the item, set its fill color to black:
     * path.onMouseLeave = function(event) {
     *     this.fillColor = 'black';
     * }
     * @example {@paperscript}
     * // When you click the mouse, you create new circle shaped items. When you
     * // move the mouse over the item, its fill color is set to red. When you
     * // move the mouse outside again, its fill color is set back
     * // to black.
     *
     * function enter(event) {
     *     this.fillColor = 'red';
     * }
     *
     * function leave(event) {
     *     this.fillColor = 'black';
     * }
     *
     * // When the mouse is pressed:
     * function onMouseDown(event) {
     *     // Create a circle shaped path at the position of the mouse:
     *     var path = new Path.Circle(event.point, 25);
     *     path.fillColor = 'black';
     *
     *     // When the mouse enters the item, set its fill color to red:
     *     path.onMouseEnter = enter;
     *
     *     // When the mouse leaves the item, set its fill color to black:
     *     path.onMouseLeave = leave;
     * }
     */
    onMouseEnter: ItemMouseEventFunction

    /**
     * The function to be called when the mouse moves out of the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy and will
     * reach the view, unless they are stopped with {@link
     * Event#stopPropagation()} or by returning `false` from the handler.
     *
     * @name Item#onMouseLeave
     * @property
     * @type ?Function
     * @see View#onMouseLeave
     *
     * @example {@paperscript}
     * // Move the mouse over the circle shaped path and then move it out
     * // of it again to set its fill color to red:
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse leaves the item, set its fill color to red:
     * path.onMouseLeave = function(event) {
     *     this.fillColor = 'red';
     * }
     */
    onMouseLeave: ItemMouseEventFunction

    /**
     * {@grouptitle Event Handling}
     *
     * Attaches an event handler to the item.
     *
     * @name Item#on
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
     *     sole argument
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     *
     * @example {@paperscript}
     * // Change the fill color of the path to red when the mouse enters its
     * // shape and back to black again, when it leaves its shape.
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25,
     *     fillColor: 'black'
     * });
     *
     * // When the mouse enters the item, set its fill color to red:
     * path.on('mouseenter', function() {
     *     this.fillColor = 'red';
     * });
     *
     * // When the mouse leaves the item, set its fill color to black:
     * path.on('mouseleave', function() {
     *     this.fillColor = 'black';
     * });
     */
    on(type: string, func: (event?: any, ...args: any) => void): this

    /**
     * Attaches one or more event handlers to the item.
     *
     * @name Item#on
     * @function
     * @param {Object} object an object containing one or more of the following
     *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
     *     doubleclick, mousemove, mouseenter, mouseleave}
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     *
     * @example {@paperscript}
     * // Change the fill color of the path to red when the mouse enters its
     * // shape and back to black again, when it leaves its shape.
     *
     * // Create a circle shaped path at the center of the view:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 25
     * });
     * path.fillColor = 'black';
     *
     * // When the mouse enters the item, set its fill color to red:
     * path.on({
     *     mouseenter: function(event) {
     *         this.fillColor = 'red';
     *     },
     *     mouseleave: function(event) {
     *         this.fillColor = 'black';
     *     }
     * });
     * @example {@paperscript}
     * // When you click the mouse, you create new circle shaped items. When you
     * // move the mouse over the item, its fill color is set to red. When you
     * // move the mouse outside again, its fill color is set black.
     *
     * var pathHandlers = {
     *     mouseenter: function(event) {
     *         this.fillColor = 'red';
     *     },
     *     mouseleave: function(event) {
     *         this.fillColor = 'black';
     *     }
     * }
     *
     * // When the mouse is pressed:
     * function onMouseDown(event) {
     *     // Create a circle shaped path at the position of the mouse:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 25,
     *         fillColor: 'black'
     *     });
     *
     *     // Attach the handers inside the object literal to the path:
     *     path.on(pathHandlers);
     * }
     */
    on(type: EventList): this
    on(type: EmitterType, func?: (event?: any, ...args: any) => void): this {
        return super.on(type, func)
    }

    /**
     * Detach an event handler from the item.
     *
     * @name Item#off
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be detached
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     */
    off(type: string, func?: (event?: any, ...args: any) => void): this

    /**
     * Detach one or more event handlers to the item.
     *
     * @name Item#off
     * @function
     * @param {Object} object an object containing one or more of the following
     *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
     *     doubleclick, mousemove, mouseenter, mouseleave}
     * @return {Item} this item itself, so calls can be chained
     * @chainable
     */
    off(type: EventList): this
    off(type: EmitterType, func?: (event?: any, ...args: any) => void): this {
        return super.off(type, func)
    }

    /**
     * Emit an event on the item.
     *
     * @name Item#emit
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */
    emit(type: string, event?: any, ...args: any[]): boolean {
        return super.emit(type, event, args)
    }

    /**
     * Check if the item has one or more event handlers of the specified type.
     *
     * @name Item#responds
     * @function
     * @param {String} type the type of event: {@values 'frame', mousedown',
     *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
     *     'mouseenter', 'mouseleave'}
     * @return {Boolean} {@true if the item has one or more event handlers of
     * the specified type}
     */
    responds(type: string): boolean {
        return super.responds(type)
    }

    /**
     * Private method that sets Path related styles on the canvas context.
     * Not defined in Path as it is required by other classes too,
     * e.g. PointText.
     */
    _setStyles(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        viewMatrix?: Matrix
    ) {
        const paper = PaperScope.paper
        const style = this._style
        const matrix = this._matrix
        if (style.hasFill()) {
            ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx, matrix)
        }
        if (style.hasStroke()) {
            ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx, matrix)
            ctx.lineWidth = style.getStrokeWidth()
            const strokeJoin = style.getStrokeJoin()
            const strokeCap = style.getStrokeCap()

            const miterLimit = style.getMiterLimit()
            if (strokeJoin) ctx.lineJoin = strokeJoin
            if (strokeCap) ctx.lineCap = strokeCap
            if (miterLimit) ctx.miterLimit = miterLimit
            if (paper.support.nativeDash) {
                const dashArray = style.getDashArray()
                const dashOffset = style.getDashOffset()
                if (dashArray && dashArray.length) {
                    if ('setLineDash' in ctx) {
                        ctx.setLineDash(dashArray)
                        ctx.lineDashOffset = dashOffset
                    }
                    /* TODO: Removed?
                    else {
                        ctx.mozDash = dashArray
                        ctx.mozDashOffset = dashOffset
                    }
                    */
                }
            }
        }
        if (style.hasShadow()) {
            const pixelRatio = param.pixelRatio || 1
            const mx = viewMatrix
                .shiftless()
                .prepend(new Matrix().scale(pixelRatio, pixelRatio))
            const blur = mx.transform(new Point(style.getShadowBlur(), 0))
            const offset = mx.transform(this.getShadowOffset())
            ctx.shadowColor = style.getShadowColor().toCanvasStyle(ctx)
            ctx.shadowBlur = blur.getLength()
            ctx.shadowOffsetX = offset.x
            ctx.shadowOffsetY = offset.y
        }
    }

    draw(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        parentStrokeMatrix?: Matrix
    ) {
        this._updateVersion = this._project.updateVersion

        if (!this._visible || this._opacity === 0) return

        const matrices = param.matrices
        let viewMatrix = param.viewMatrix
        const matrix = this._matrix
        const globalMatrix = matrices[matrices.length - 1].appended(matrix)

        if (!globalMatrix.isInvertible()) return

        viewMatrix = viewMatrix
            ? viewMatrix.appended(globalMatrix)
            : globalMatrix

        matrices.push(globalMatrix)
        if (param.updateMatrix) {
            this._globalMatrix = globalMatrix
        }

        const blendMode = this._blendMode
        const opacity = Numerical.clamp(this._opacity, 0, 1)
        const normalBlend = blendMode === 'normal'
        const nativeBlend = BlendMode.nativeModes[blendMode]

        const direct =
            (normalBlend && opacity === 1) ||
            param.dontStart || // e.g. CompoundPath
            param.clip ||
            ((nativeBlend || (normalBlend && opacity < 1)) &&
                this._canComposite())
        const pixelRatio = param.pixelRatio || 1
        let mainCtx
        let itemOffset
        let prevOffset

        if (!direct) {
            const bounds = this.getStrokeBounds(viewMatrix)
            if (!bounds.width || !bounds.height) {
                matrices.pop()
                return
            }
            prevOffset = param.offset
            itemOffset = param.offset = bounds.getTopLeft().floor()

            mainCtx = ctx
            ctx = CanvasProvider.getContext(
                bounds.getSize().ceil().add(1).multiply(pixelRatio)
            )
            if (pixelRatio !== 1) ctx.scale(pixelRatio, pixelRatio)
        }
        ctx.save()

        const strokeMatrix = parentStrokeMatrix
            ? parentStrokeMatrix.appended(matrix)
            : this._canScaleStroke && !this.getStrokeScaling(true) && viewMatrix

        const clip = !direct && param.clipItem
        const transform = !strokeMatrix || clip

        if (direct) {
            ctx.globalAlpha = opacity
            if (nativeBlend) ctx.globalCompositeOperation = blendMode
        } else if (transform) {
            ctx.translate(-itemOffset.x, -itemOffset.y)
        }

        if (transform) {
            ;(direct ? matrix : viewMatrix).applyToContext(ctx)
        }

        if (clip) {
            param.clipItem.draw(ctx, { ...param, clip: true })
        }

        if (strokeMatrix) {
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

            const offset = param.offset
            if (offset) ctx.translate(-offset.x, -offset.y)
        }
        this._draw(ctx, param, viewMatrix, strokeMatrix)
        ctx.restore()
        matrices.pop()
        if (param.clip && !param.dontFinish) {
            ctx.clip(this.getFillRule())
        }
        if (!direct) {
            BlendMode.process(
                blendMode,
                ctx,
                mainCtx,
                opacity,
                itemOffset.subtract(prevOffset).multiply(pixelRatio)
            )
            CanvasProvider.release(ctx)
            param.offset = prevOffset
        }
    }

    /**
     * Checks the _updateVersion of the item to see if it got drawn in the draw
     * loop. If the version is out of sync, the item is either not in the scene
     * graph anymore or is invisible.
     */
    protected _isUpdated(updateVersion: number): boolean {
        const parent = this._parent

        if (parent instanceof CompoundPath)
            return parent._isUpdated(updateVersion)

        let updated = this._updateVersion === updateVersion
        if (
            !updated &&
            parent &&
            parent._visible &&
            parent._isUpdated(updateVersion)
        ) {
            this._updateVersion = updateVersion
            updated = true
        }
        return updated
    }

    _drawSelection(
        ctx: CanvasRenderingContext2D,
        matrix: Matrix,
        size: number,
        selectionItems: Record<string, Item>,
        updateVersion: number
    ) {
        const selection = this._selection
        let itemSelected = !!(+selection & ItemSelection.ITEM)
        const boundsSelected = !!(
            +selection & ItemSelection.BOUNDS ||
            (itemSelected && this._selectBounds)
        )
        const positionSelected = !!(+selection & ItemSelection.POSITION)

        if (!this._drawSelected) itemSelected = false
        if (
            (itemSelected || boundsSelected || positionSelected) &&
            this._isUpdated(updateVersion)
        ) {
            let layer
            const color =
                this.getSelectedColor(true) ||
                ((layer = this.getLayer()) && layer.getSelectedColor(true))
            const mx = matrix.appended(this.getGlobalMatrix(true))
            const half = size / 2
            ctx.strokeStyle = ctx.fillStyle = color
                ? color.toCanvasStyle(ctx)
                : '#009dec'
            if (itemSelected) this._drawSelected(ctx, mx, selectionItems)
            if (positionSelected) {
                const pos = this.getPosition(true)
                const parent = this._parent
                const point = parent ? parent.localToGlobal(pos) : pos
                const x = point.x
                const y = point.y

                ctx.beginPath()
                ctx.arc(x, y, half, 0, Math.PI * 2, true)
                ctx.stroke()
                const deltas = [
                    [0, -1],
                    [1, 0],
                    [0, 1],
                    [-1, 0]
                ]
                const start = half
                const end = size + 1
                for (let i = 0; i < 4; i++) {
                    const delta = deltas[i]
                    const dx = delta[0]
                    const dy = delta[1]
                    ctx.moveTo(x + dx * start, y + dy * start)
                    ctx.lineTo(x + dx * end, y + dy * end)
                    ctx.stroke()
                }
            }
            if (boundsSelected) {
                const coords = mx.transformCorners(this.getInternalBounds())

                ctx.beginPath()
                for (let i = 0; i < 8; i++) {
                    ctx[!i ? 'moveTo' : 'lineTo'](coords[i], coords[++i])
                }
                ctx.closePath()
                ctx.stroke()
                for (let i = 0; i < 8; i++) {
                    ctx.fillRect(
                        coords[i] - half,
                        coords[++i] - half,
                        size,
                        size
                    )
                }
            }
        }
    }

    protected _canComposite(): boolean {
        return false
    }

    protected _draw(
        _ctx: CanvasRenderingContext2D,
        _param?: DrawOptions,
        _viewMatrix?: Matrix,
        _strokeMatrix?: Matrix
    ) {}

    protected _drawSelected(
        _ctx: CanvasRenderingContext2D,
        _matrix?: Matrix,
        _selectionItems?: Record<string, Item>
    ) {}

    /**
     * Removes the item when the next {@link Tool#onMouseMove} event is fired.
     *
     * @name Item#removeOnMove
     * @function
     *
     * @example {@paperscript height=200}
     * // Move your mouse below:
     * function onMouseMove(event) {
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // On the next move event, automatically remove the path:
     *     path.removeOnMove();
     * }
     */
    removeOnMove() {
        return this.removeOn({ move: true })
    }

    /**
     * Removes the item when the next {@link Tool#onMouseDown} event is fired.
     *
     * @name Item#removeOnDown
     * @function
     *
     * @example {@paperscript height=200}
     * // Click a few times below:
     * function onMouseDown(event) {
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // Remove the path, next time the mouse is pressed:
     *     path.removeOnDown();
     * }
     */
    removeOnDown() {
        return this.removeOn({ down: true })
    }

    /**
     * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
     *
     * @name Item#removeOnDrag
     * @function
     *
     * @example {@paperscript height=200}
     * // Click and drag below:
     * function onMouseDrag(event) {
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // On the next drag event, automatically remove the path:
     *     path.removeOnDrag();
     * }
     */
    removeOnDrag() {
        return this.removeOn({ drag: true })
    }

    /**
     * Removes the item when the next {@link Tool#onMouseUp} event is fired.
     *
     * @name Item#removeOnUp
     * @function
     *
     * @example {@paperscript height=200}
     * // Click a few times below:
     * function onMouseDown(event) {
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // Remove the path, when the mouse is released:
     *     path.removeOnUp();
     * }
     */
    removeOnUp() {
        return this.removeOn({ up: true })
    }

    /**
     * {@grouptitle Remove On Event}
     *
     * Removes the item when the events specified in the passed options object
     * occur.
     *
     * @option options.move {Boolean) remove the item when the next {@link
     *     Tool#onMouseMove} event is fired.
     *
     * @option options.drag {Boolena) remove the item when the next {@link
     *     Tool#onMouseDrag} event is fired.
     *
     * @option options.down {Boolean) remove the item when the next {@link
     *     Tool#onMouseDown} event is fired.
     *
     * @option options.up {Boolean) remove the item when the next {@link
     *     Tool#onMouseUp} event is fired.
     *
     * @name Item#removeOn
     * @function
     * @param {Object} options
     *
     * @example {@paperscript height=200}
     * // Click and drag below:
     * function onMouseDrag(event) {
     *     // Create a circle shaped path at the mouse position,
     *     // with a radius of 10:
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     *
     *     // Remove the path on the next onMouseDrag or onMouseDown event:
     *     path.removeOn({
     *         drag: true,
     *         down: true
     *     });
     * }
     */
    removeOn(obj?: RemoveOnOptions) {
        for (const name in obj) {
            if (obj[name]) {
                const key = 'mouse' + name
                const project = this._project
                const sets = (project.removeSets = project.removeSets || {})

                sets[key] = sets[key] || {}
                sets[key][this._id] = this
            }
        }
        return this
    }

    /**
     * {@grouptitle Tweening Functions}
     *
     * Tween item between two states.
     *
     * @name Item#tween
     *
     * @option options.duration {Number} the duration of the tweening
     * @option [options.easing='linear'] {Function|String} an easing function or the type
     * of the easing: {@values 'linear' 'easeInQuad' 'easeOutQuad'
     * 'easeInOutQuad' 'easeInCubic' 'easeOutCubic' 'easeInOutCubic'
     * 'easeInQuart' 'easeOutQuart' 'easeInOutQuart' 'easeInQuint'
     * 'easeOutQuint' 'easeInOutQuint'}
     * @option [options.start=true] {Boolean} whether to start tweening automatically
     *
     * @function
     * @param {Object} from the state at the start of the tweening
     * @param {Object} to the state at the end of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @example {@paperscript height=100}
     * // Tween fillColor:
     * var path = new Path.Circle({
     *     radius: view.bounds.height * 0.4,
     *     center: view.center
     * });
     * path.tween(
     *     { fillColor: 'blue' },
     *     { fillColor: 'red' },
     *     3000
     * );
     * @example {@paperscript height=100}
     * // Tween rotation:
     * var path = new Shape.Rectangle({
     *     fillColor: 'red',
     *     center: [50, view.center.y],
     *     size: [60, 60]
     * });
     * path.tween({
     *     rotation: 180,
     *     'position.x': view.bounds.width - 50,
     *     'fillColor.hue': '+= 90'
     * }, {
     *     easing: 'easeInOutCubic',
     *     duration: 2000
     * });
     */
    tween(from: object, to: object, options: TweenOptions | number): Tween

    /**
     * Tween item to a state.
     *
     * @name Item#tween
     *
     * @function
     * @param  {Object} to the state at the end of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @example {@paperscript height=200}
     * // Tween a nested property with relative values
     * var path = new Path.Rectangle({
     *     size: [100, 100],
     *     position: view.center,
     *     fillColor: 'red',
     * });
     *
     * var delta = { x: path.bounds.width / 2, y: 0 };
     *
     * path.tween({
     *     'segments[1].point': ['+=', delta],
     *     'segments[2].point.x': '-= 50'
     * }, 3000);
     *
     * @see Item#tween(from, to, options)
     */
    tween(to: object, options: TweenOptions | number): Tween

    /**
     * Tween item.
     *
     * @name Item#tween
     *
     * @function
     * @param  {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @see Item#tween(from, to, options)
     *
     * @example {@paperscript height=100}
     * // Start an empty tween and just use the update callback:
     * var path = new Path.Circle({
     *     fillColor: 'blue',
     *     radius: view.bounds.height * 0.4,
     *     center: view.center,
     * });
     * var pathFrom = path.clone({ insert: false })
     * var pathTo = new Path.Rectangle({
     *     position: view.center,
     *     rectangle: path.bounds,
     *     insert: false
     * });
     * path.tween(2000).onUpdate = function(event) {
     *     path.interpolate(pathFrom, pathTo, event.factor)
     * };
     */
    tween(options: TweenOptions | number): Tween
    tween(
        from: object | TweenOptions | number,
        to?: object | TweenOptions | number,
        options?: TweenOptions
    ): Tween {
        if (!options) {
            options = to as TweenOptions
            to = from
            from = null
            if (!options) {
                options = to as TweenOptions
                to = null
            }
        }
        const easing = options && options.easing
        const start = options && options.start
        const duration =
            options != null &&
            (typeof options === 'number' ? options : options.duration)
        const tween = new Tween(
            this,
            from as object,
            to as object,
            duration,
            easing,
            start
        )

        function onFrame(this: Item, event: FrameEvent) {
            tween.handleFrame(event.time * 1000)
            if (!tween.running) {
                this.off('frame', onFrame)
            }
        }
        if (duration) {
            this.on('frame', onFrame)
        }
        return tween
    }

    /**
     *
     * Tween item to a state.
     *
     * @function
     * @param {Object} to the state at the end of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @see Item#tween(to, options)
     */
    tweenTo(to: object, options: TweenOptions): Tween {
        return this.tween(null, to, options)
    }

    /**
     *
     * Tween item from a state to its state before the tweening.
     *
     * @function
     * @param {Object} from the state at the start of the tweening
     * @param {Object|Number} options the options or the duration
     * @return {Tween}
     *
     * @see Item#tween(from, to, options)
     *
     * @example {@paperscript height=100}
     * // Tween fillColor from red to the path's initial fillColor:
     * var path = new Path.Circle({
     *     fillColor: 'blue',
     *     radius: view.bounds.height * 0.4,
     *     center: view.center
     * });
     * path.tweenFrom({ fillColor: 'red' }, { duration: 1000 });
     */
    tweenFrom(from: object, options: TweenOptions): Tween {
        return this.tween(from, null, options)
    }
}
