import Item from '../item/Item'
import SizeBase from './SizeBase'

export default class LinkedSize extends SizeBase {
    protected _owner: any
    protected _setter: string
    protected _width: number
    protected _height: number

    initialize(
        width: number,
        height: number,
        owner: Item,
        setter: string
    ): this {
        this._width = width
        this._height = height
        this._owner = owner
        this._setter = setter

        return this
    }

    protected _set(width: number, height: number, _dontNotify?: boolean) {
        this._width = width
        this._height = height
        if (!_dontNotify) this._owner[this._setter](this)
        return this
    }

    get width(): number {
        return this._width
    }

    set width(width: number) {
        this._width = width
        this._owner[this._setter](this)
    }

    get height(): number {
        return this._height
    }

    set height(height: number) {
        this._height = height
        this._owner[this._setter](this)
    }
}
