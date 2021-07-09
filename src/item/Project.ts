import CanvasProvider from '../canvas/CanvasProvider'
import Base, { Dictionary, ExportJsonOptions } from '../core/Base'
import PaperScopeItem from '../core/PaperScopeItem'
import { Style } from '../style'
import View from '../view/View'
import Item from './Item'
import { ChangeFlag } from './ChangeFlag'
import Layer from './Layer'
import HitResult, { HitResultOptions } from './HitResult'
import { Point as PointType } from '../basic/Types'
import { Matrix, Point } from '../basic'

export default class Project extends PaperScopeItem {
    protected _class = 'Project'
    protected _list = 'projects'
    protected _reference = 'project'
    protected _compactSerialize: true
    protected _children: Item[] = []
    protected _namedChildren: any = {}
    protected _activeLayer: any = null
    protected _currentStyle: Style
    protected _view: View
    protected _selectionItems: any = {}
    protected _selectionCount = 0
    protected _updateVersion = 0

    constructor(element?: HTMLCanvasElement)
    constructor(...args: any[]) {
        super(...args)
    }

    initialize(element?: HTMLCanvasElement): this {
        super.initialize(true)

        this._currentStyle = new Style(null, null, this)
        this._view = View.create(
            this,
            element || CanvasProvider.getCanvas(1, 1)
        )

        return this
    }

    protected _serialize(options: ExportJsonOptions, dictionary: Dictionary) {
        return Base.serialize(this._children, options, true, dictionary)
    }

    /**
     * Private notifier that is called whenever a change occurs in the project.
     *
     * @param {ChangeFlag} flags describes what exactly has changed
     * @param {Item} item the item that has caused the change
     */
    protected _changed(flags: ChangeFlag, item?: Item) {
        if (flags & ChangeFlag.APPEARANCE) {
            const view = this._view
            if (view) {
                // Never draw changes right away. Simply mark view as "dirty"
                // and request an update through view.requestUpdate().
                view.needsUpdate = true
                if (!view.requested && view.autoUpdate) view.requestUpdate()
            }
        }

        const changes = this._changes
        if (changes && item) {
            const changesById = this._changesById
            const id = item.id
            const entry = changesById[id]
            if (entry) {
                entry.flags |= flags
            } else {
                changes.push((changesById[id] = { item: item, flags: flags }))
            }
        }
    }

    /**
     * Activates this project, so all newly created items will be placed
     * in it.
     *
     * @name Project#activate
     * @function
     */
    activate() {
        return super.activate()
    }

    /**
     * Clears the project by removing all {@link Project#layers}.
     */
    clear() {
        const children = this._children
        for (let i = children.length - 1; i >= 0; i--) children[i].remove()
    }

    /**
     * Checks whether the project has any content or not.
     *
     * @return {Boolean}
     */
    isEmpty(): boolean {
        return !this._children.length
    }

    /**
     * Removes this project from the {@link PaperScope#projects} list, and also
     * removes its view, if one was defined.
     */
    remove() {
        if (!super.remove()) return false
        if (this._view) this._view.remove()
        return true
    }

    /**
     * The reference to the project's view.
     *
     * @bean
     * @type View
     */
    getView() {
        return this._view
    }

    get view() {
        return this.getView()
    }

    /**
     * The currently active path style. All selected items and newly
     * created items will be styled with this style.
     *
     * @bean
     * @type Style
     *
     * @example {@paperscript}
     * project.currentStyle = {
     *     fillColor: 'red',
     *     strokeColor: 'black',
     *     strokeWidth: 5
     * }
     *
     * // The following paths will take over all style properties of
     * // the current style:
     * var path = new Path.Circle(new Point(75, 50), 30);
     * var path2 = new Path.Circle(new Point(175, 50), 20);
     *
     * @example {@paperscript}
     * project.currentStyle.fillColor = 'red';
     *
     * // The following path will take over the fill color we just set:
     * var path = new Path.Circle(new Point(75, 50), 30);
     * var path2 = new Path.Circle(new Point(175, 50), 20);
     */
    getCurrentStyle() {
        return this._currentStyle
    }

    setCurrentStyle(style: Style) {
        this._currentStyle.set(style)
    }

    get currentStyle() {
        return this.getCurrentStyle()
    }

    set currentStyle(style: Style) {
        this.setCurrentStyle(style)
    }

    /**
     * The index of the project in the {@link PaperScope#projects} list.
     *
     * @bean
     * @type Number
     */
    getIndex() {
        return this._index
    }

    /**
     * Gives access to the project's configurable options.
     *
     * @bean
     * @type Object
     * @deprecated use {@link PaperScope#settings} instead.
     */
    getOptions() {
        return this._scope.settings
    }

    /**
     * {@grouptitle Project Content}
     *
     * The layers contained within the project.
     *
     * @bean
     * @type Layer[]
     */
    getLayers() {
        return this._children
    }

    /**
     * The layer which is currently active. New items will be created on this
     * layer by default.
     *
     * @bean
     * @type Layer
     */
    getActiveLayer() {
        return this._activeLayer || new Layer({ project: this, insert: true })
    }

    /**
     * The symbol definitions shared by all symbol items contained place ind
     * project.
     *
     * @bean
     * @type SymbolDefinition[]
     */
    getSymbolDefinitions() {
        const definitions = []
        const ids = {}
        this.getItems({
            class: SymbolItem,
            match: function (item: Item) {
                const definition = item._definition
                const id = definition._id
                if (!ids[id]) {
                    ids[id] = true
                    definitions.push(definition)
                }
                return false // No need to collect them.
            }
        })
        return definitions
    }

    removeOn(obj: Object) {
        for (const name in obj) {
            if (obj[name]) {
                // const key = 'mouse' + name
                // const project = this._project
                // const sets = (project._removeSets = project._removeSets || {})
                // sets[key] = sets[key] || {}
                // sets[key][this._id] = this
            }
        }
        return this
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
        this._hitTest(
            point,
            new Base({ all: all }, options) as unknown as HitResultOptions
        )
        return all
    }

    protected _hitTest(
        point: PointType,
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
}
