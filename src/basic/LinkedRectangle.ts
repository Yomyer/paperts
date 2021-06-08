import RectangleBase from './RectangleBase'
import ItemSelection from '../item/ItemSelection'

export default class LinkedRectangle extends RectangleBase {
    protected _owner: any
    protected _setter: string
    protected _x: number
    protected _y: number
    protected _width: number
    protected _height: number
    protected _dontNotify: boolean

    initialize(
        x: number,
        y: number,
        width: number,
        height: number,
        owner: any,
        setter: string
    ) {
        this._set(x, y, width, height, true)
        this._owner = owner
        this._setter = setter

        return this
    }

    protected _set(
        x: number,
        y: number,
        width: number,
        height: number,
        _dontNotify?: boolean
    ) {
        this._x = x
        this._y = y
        this._width = width
        this._height = height
        if (!_dontNotify) this._owner[this._setter](this)
        return this
    }

    get x() {
        return this._x
    }

    set x(value: number) {
        this._x = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    get y() {
        return this._y
    }

    set y(value: number) {
        this._y = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    get width() {
        return this._y
    }

    set width(value: number) {
        this._width = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    get height() {
        return this._y
    }

    set height(value: number) {
        this._height = value

        if (!this._dontNotify) this._owner[this._setter](this)
    }

    protected setPoint(...args: any) {
        this._dontNotify = true
        super.setPoint(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setSize(...args: any) {
        this._dontNotify = true
        super.setSize(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setCenter(...args: any) {
        this._dontNotify = true
        super.setCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)

        return this
    }

    protected setLeft(...args: any) {
        this._dontNotify = true
        super.setLeft(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTop(...args: any) {
        this._dontNotify = true
        super.setTop(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setRight(...args: any) {
        this._dontNotify = true
        super.setRight(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottom(...args: any) {
        this._dontNotify = true
        super.setBottom(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setCenterX(...args: any) {
        this._dontNotify = true
        super.setCenterX(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setCenterY(...args: any) {
        this._dontNotify = true
        super.setCenterY(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTopLeft(...args: any) {
        this._dontNotify = true
        super.setTopLeft(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTopRight(...args: any) {
        this._dontNotify = true
        super.setTopRight(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottomLeft(...args: any) {
        this._dontNotify = true
        super.setBottomLeft(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottomRight(...args: any) {
        this._dontNotify = true
        super.setBottomRight(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setLeftCenter(...args: any) {
        this._dontNotify = true
        super.setLeftCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setTopCenter(...args: any) {
        this._dontNotify = true
        super.setTopCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setRightCenter(...args: any) {
        this._dontNotify = true
        super.setRightCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    protected setBottomCenter(...args: any) {
        this._dontNotify = true
        super.setBottomCenter(...args)
        this._dontNotify = false
        this._owner[this._setter](this)
    }

    isSelected() {
        return !!(this._owner._selection & ItemSelection.BOUNDS)
    }

    setSelected(selected: boolean) {
        const owner = this._owner
        if (owner._changeSelection) {
            owner._changeSelection(ItemSelection.BOUNDS, selected)
        }
    }
}
