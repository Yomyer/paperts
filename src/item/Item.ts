import Emitter from '../core/Emitter'

export default class Item extends Emitter {
    static NO_INSERT: { insert: false }

    protected _class = 'Item'
    protected _name: string = null
    protected _applyMatrix = true
    protected _canApplyMatrix = true
    protected _canScaleStroke = false

    /*
    protected _pivot: Point = null
    protected _visible = true
    protected _blendMode = 'normal'
    protected _opacity = 1
    protected _locked = false
    protected _guide = false
    protected _clipMask = false
    protected _selection = 0
    protected _selectBounds = true
    protected _selectChildren = false
    protected _serializeFields = {
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

    initialize(props: {}, point: any) {
        const hasProps = props && Base.isPlainObject(props)
        const internal = hasProps && props.internal === true
        const matrix = (this._matrix = new Matrix())
        const project = (hasProps && props.project) || paper.project
        const settings = paper.settings

        this._id = internal ? null : UID.get()
        this._parent = this._index = null

        this._applyMatrix = this._canApplyMatrix && settings.applyMatrix

        if (point) matrix.translate(point)

        matrix._owner = this
        this._style = new Style(project._currentStyle, this, project)

        if (
            internal ||
            (hasProps && props.insert == false) ||
            (!settings.insertItems && !(hasProps && props.insert === true))
        ) {
            this._setProject(project)
        } else {
            ;((hasProps && props.parent) || project)._insertItem(
                undefined,
                this,
                true
            ) // _created = true
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
    */

    // eslint-disable-next-line no-useless-constructor
    constructor() {
        super()
    }
}
