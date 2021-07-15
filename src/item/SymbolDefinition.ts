import Base, { Dictionary, ExportJsonOptions } from '../core/Base'
import Item, { BoundsCacheProps } from './Item'
import UID from '../utils/UID'
import Project from './Project'
import PaperScope from '../core/PaperScope'
import { Change, ChangeFlag } from './ChangeFlag'
import Rectangle from '../basic/Rectangle'
import Point from '../basic/Point'
import SymbolItem from './SymbolItem'

export default class SymbolDefinition extends Base {
    protected _class = 'SymbolDefinition'

    protected _item: Item
    bounds: Rectangle
    position: Point
    boundsCache: BoundsCacheProps

    project: Project

    /**
     * Creates a Symbol definition.
     *
     * @param {Item} item the source item which is removed from the scene graph
     *     and becomes the symbol's definition.
     * @param {Boolean} [dontCenter=false]
     *
     * @example {@paperscript split=true height=240}
     * // Placing 100 instances of a symbol:
     * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
     * path.style = {
     *     fillColor: 'white',
     *     strokeColor: 'black'
     * };
     *
     * // Create a symbol definition from the path:
     * var definition = new SymbolDefinition(path);
     *
     * // Place 100 instances of the symbol definition:
     * for (var i = 0; i < 100; i++) {
     *     // Place an instance of the symbol definition in the project:
     *     var instance = definition.place();
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
    constructor(item: Item, dontCenter?: boolean)
    constructor(...args: any[]) {
        super(...args)
    }

    initialize(item: Item, dontCenter?: boolean) {
        this._id = UID.get()
        this.project = PaperScope.paper.project
        if (item) this.setItem(item, dontCenter)
    }

    protected _serialize(
        options?: ExportJsonOptions,
        dictionary?: Dictionary
    ): string {
        return dictionary.add(this, () => {
            return Base.serialize(
                [this._class, this._item],
                options,
                false,
                dictionary
            )
        })
    }

    /**
     * Private notifier that is called whenever a change occurs in this symbol's
     * definition.
     *
     * @param {ChangeFlag} flags describes what exactly has changed
     */
    protected _changed(flags: ChangeFlag | Change) {
        if (flags & ChangeFlag.GEOMETRY) Item._clearBoundsCache(this)
        if (flags & ChangeFlag.APPEARANCE) this.project.changed(flags)
    }

    getItem() {
        return this._item
    }

    setItem(item: Item, _dontCenter?: boolean) {
        if (item.symbol) item = item.clone()
        if (this._item) this._item.symbol = null
        this._item = item
        item.remove()
        item.setSelected(false)
        if (!_dontCenter) item.setPosition(new Point())
        item.symbol = this
        this._changed(Change.GEOMETRY)
    }

    get item() {
        return this.getItem()
    }

    set item(item: Item) {
        this.setItem(item)
    }

    /**
     * Places in instance of the symbol in the project.
     *
     * @param {Point} [position] the position of the placed symbol
     * @return {SymbolItem}
     */
    place(position: Point): SymbolItem {
        return new SymbolItem(this, position)
    }

    /**
     * Returns a copy of the symbol.
     *
     * @return {SymbolDefinition}
     */
    clone(): this {
        return new SymbolDefinition(this._item.clone(false)) as this
    }

    /**
     * Checks whether the symbol's definition is equal to the supplied symbol.
     *
     * @param {SymbolDefinition} symbol
     * @return {Boolean} {@true if they are equal}
     */
    equals(symbol: SymbolDefinition): boolean {
        return (
            symbol === this ||
            (symbol && this._item.equals(symbol._item)) ||
            false
        )
    }
}