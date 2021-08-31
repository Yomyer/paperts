import { Point, Numerical, Segment, SegmentSelection } from '../'

export class SegmentPoint extends Point {
    protected _class = 'SegmentPoint'
    protected _owner: Segment

    constructor(point: Point, owner: Segment, key: string)

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    override initialize(...args: any[]): this {
        const point: Point = args[0]
        const owner: Segment = args[1]
        const key: number = args[2]

        let x, y, selected
        if (!point) {
            x = y = 0
        } else if ((x = point[0]) !== undefined) {
            y = point[1]
        } else {
            let pt = point
            if ((x = pt.x) === undefined) {
                pt = Point.read(args)
                x = pt.x
            }
            y = pt.y
            selected = pt.selected
        }
        this._x = x
        this._y = y

        if (owner) {
            this._owner = owner
            owner[key] = this
        }

        if (selected) this.setSelected(true)

        return this
    }

    set(...args: any[]): this {
        return super.initialize(...args)
    }

    _set(x: number, y: number, _?: boolean) {
        this._x = x
        this._y = y
        this._owner.changed(this)
        return this
    }

    getX() {
        return this._x
    }

    setX(x: number) {
        this._x = x
        this._owner.changed(this)
    }

    getY() {
        return this._y
    }

    setY(y: number) {
        this._y = y
        this._owner.changed(this)
    }

    isZero() {
        const isZero = Numerical.isZero
        return isZero(this._x) && isZero(this._y)
    }

    isSelected(): boolean {
        return !!(+this._owner.selection & this._getSelection())
    }

    setSelected(selected: boolean) {
        this._owner._changeSelection(this._getSelection(), selected)
    }

    get selected(): boolean {
        return this.isSelected()
    }

    set selected(selected: boolean) {
        this.setSelected(selected)
    }

    _getSelection() {
        const owner = this._owner
        return this === owner.point
            ? SegmentSelection.POINT
            : this === owner.handleIn
            ? SegmentSelection.HANDLE_IN
            : this === owner.handleOut
            ? SegmentSelection.HANDLE_OUT
            : 0
    }
}
