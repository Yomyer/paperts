import Item from '../item/Item'
import PointBase from './PointBase'
import ItemSelection from '../item/ItemSelection'

export default class LinkedPoint extends PointBase {
    protected _owner: any
    protected _setter: string
    protected _x: number
    protected _y: number

    initialize(x: number, y: number, owner: Item, setter: string): this {
        this._x = x
        this._y = y
        this._owner = owner
        this._setter = setter

        return this
    }

    protected _set(x: number, y: number, _dontNotify?: boolean) {
        this._x = x
        this._y = y
        if (!_dontNotify) this._owner[this._setter](this)
        return this
    }

    get x() {
        return this._x
    }

    set x(x) {
        this._x = x
        this._owner[this._setter](this)
    }

    get y() {
        return this._y
    }

    set y(y) {
        this._y = y
        this._owner[this._setter](this)
    }

    isSelected() {
        return !!(this._owner._selection & this._getSelection())
    }

    setSelected(selected: boolean) {
        this._owner._changeSelection(this._getSelection(), selected)
    }

    protected _getSelection() {
        return this._setter === 'setPosition' ? ItemSelection.POSITION : 0
    }
}
