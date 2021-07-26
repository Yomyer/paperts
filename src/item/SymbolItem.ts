import {
    Point,
    Matrix,
    Change,
    Item,
    HitResult,
    HitResultOptions,
    BoundsOptions,
    DrawOptions,
    ItemSerializeFields,
    SymbolDefinition
} from '@paperts'

export type SymbolSerializeFields = ItemSerializeFields & {
    symbol: any
}

export class SymbolItem extends Item {
    protected _class = 'SymbolItem'
    protected _applyMatrix = false
    protected _canApplyMatrix = false
    protected _definition: SymbolDefinition
    protected _boundsOptions = { stroke: true }
    protected _serializeFields: SymbolSerializeFields = {
        symbol: null
    }

    /**
     * Creates a new symbol item.
     *
     * @name SymbolItem#initialize
     * @param {SymbolDefinition|Item} definition the definition to place or an
     *     item to place as a symbol
     * @param {Point} [point] the center point of the placed symbol
     *
     * @example {@paperscript split=true height=240}
     * // Placing 100 instances of a symbol:
     * // Create a star shaped path at {x: 0, y: 0}:
     * var path = new Path.Star({
     *     center: new Point(0, 0),
     *     points: 6,
     *     radius1: 5,
     *     radius2: 13,
     *     fillColor: 'white',
     *     strokeColor: 'black'
     * });
     *
     * // Create a symbol definition from the path:
     * var definition = new SymbolDefinition(path);
     *
     * // Place 100 instances of the symbol:
     * for (var i = 0; i < 100; i++) {
     *     // Place an instance of the symbol in the project:
     *     var instance = new SymbolItem(definition);
     *
     *     // Move the instance to a random position within the view:
     *     instance.position = Point.random() * view.size;
     *
     *     // Rotate the instance by a random amount between
     *     // 0 and 360 degrees:
     *     instance.rotate(Math.random() * 360);
     *
     *     // Scale the instance between 0.25 and 1:
     *     instance.scale(0.25 + Math.random() * 0.75);
     * }
     */
    constructor(props: Item | SymbolDefinition, point?: Point)
    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        if (
            !this._initialize(
                args[0],
                args[1] !== undefined && Point.read(args, 1)
            )
        )
            this.setDefinition(
                args[0] instanceof SymbolDefinition
                    ? args[0]
                    : new SymbolDefinition(args[0])
            )

        return this
    }

    protected _equals(item: Item) {
        return this._definition === item.definition
    }

    copyContent(source: Item) {
        this.setDefinition(source.definition)
    }

    /**
     * The symbol definition that the placed symbol refers to.
     *
     * @bean
     * @type SymbolDefinition
     */
    getDefinition() {
        return this._definition
    }

    setDefinition(definition: SymbolDefinition) {
        this._definition = definition
        this._changed(Change.GEOMETRY)
    }

    get definition() {
        return this.getDefinition()
    }

    set definition(definition: SymbolDefinition) {
        this.setDefinition(definition)
    }

    isEmpty() {
        return this._definition.item.isEmpty()
    }

    protected _getBounds(matrix: Matrix, options: BoundsOptions) {
        const item = this._definition.item
        return item.getCachedBounds(item.matrix.prepended(matrix), options)
    }

    protected _hitTestSelf(
        point: Point,
        options: HitResultOptions,
        viewMatrix?: Matrix
    ): HitResult {
        const opts: HitResultOptions = { ...options, all: null }
        const res = this._definition.item._hitTest(point, opts, viewMatrix)

        if (res) res.item = this
        return res
    }

    protected _draw(ctx: CanvasRenderingContext2D, param: DrawOptions) {
        this._definition.item.draw(ctx, param)
    }
}
