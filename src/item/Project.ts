import PaperScopeItem from '../core/PaperScopeItem'
import { Style } from '../style'
import Item from './Item'

export default class Project extends PaperScopeItem {
    protected _class: 'Project'
    protected _list: 'projects'
    protected _reference: 'project'
    protected _compactSerialize: true
    protected _children: Item[]
    protected _namedChildren: any
    protected _activeLayer: any
    protected _currentStyle: Style
    protected _view: View
    protected _selectionItems: any
    protected _selectionCount: number
    protected _updateVersion: number

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(element): this {
        // Activate straight away by passing true to PaperScopeItem constructor,
        // so paper.project is set, as required by Layer and DoumentView
        // constructors.
        super.initialize(true)

        this._children = []
        this._namedChildren = {}
        this._activeLayer = null
        this._currentStyle = new Style(null, null, this)
        // If no view is provided, we create a 1x1 px canvas view just so we
        // have something to do size calculations with.
        // (e.g. PointText#_getBounds)
        this._view = View.create(
            this,
            element || CanvasProvider.getCanvas(1, 1)
        )
        this._selectionItems = {}
        this._selectionCount = 0
        // See Item#draw() for an explanation of _updateVersion
        this._updateVersion = 0
        // Change tracking, not in use for now. Activate once required:
        // this._changes = [];
        // this._changesById = {};

        return this
    }

    get view() {
        return this._view
    }
}
