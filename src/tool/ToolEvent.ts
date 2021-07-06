import { Point } from '../basic'
import Event from '../event/Event'
import Item from '../item/Item'
import Tool from './Tool'

export type EventTypes = 'mousedown' | 'mouseup' | 'mousemove' | 'mousedrag'

export default class ToolEvent extends Event {
    protected _class = 'ToolEvent'
    protected _item: Item = null
    protected _point: Point
    protected _lastPoint: Point
    protected _downPoint: Point
    protected _middlePoint: Point
    protected _delta: Point

    type: EventTypes
    tool: Tool

    constructor(tool: Tool, type: EventTypes, event: UIEvent)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        this.tool = args[0]
        this.type = args[1]
        this.event = args[2]
    }

    /**
     * Convenience method to allow local overrides of point values.
     * See application below.
     */
    _choosePoint(point: Point, toolPoint: Point) {
        return point || (toolPoint ? toolPoint.clone() : null)
    }

    /**
     * The position of the mouse in project coordinates when the event was
     * fired.
     *
     * @example
     * function onMouseDrag(event) {
     *     // the position of the mouse when it is dragged
     *     console.log(event.point);
     * }
     *
     * function onMouseUp(event) {
     *     // the position of the mouse when it is released
     *     console.log(event.point);
     * }
     *
     * @bean
     * @type Point
     */
    getPoint() {
        return this._choosePoint(this._point, this.tool.point)
    }

    setPoint(point: Point) {
        this._point = point
    }

    /**
     * The position of the mouse in project coordinates when the previous
     * event was fired.
     *
     * @bean
     * @type Point
     */
    getLastPoint() {
        return this._choosePoint(this._lastPoint, this.tool.lastPoint)
    }

    setLastPoint(lastPoint: Point) {
        this._lastPoint = lastPoint
    }

    /**
     * The position of the mouse in project coordinates when the mouse button
     * was last clicked.
     *
     * @bean
     * @type Point
     */
    getDownPoint() {
        return this._choosePoint(this._downPoint, this.tool.downPoint)
    }

    setDownPoint(downPoint: Point) {
        this._downPoint = downPoint
    }

    /**
     * The point in the middle between {@link #lastPoint} and
     * {@link #point}. This is a useful position to use when creating
     * artwork based on the moving direction of the mouse, as returned by
     * {@link #delta}.
     *
     * @bean
     * @type Point
     */
    getMiddlePoint() {
        // For explanations, see getDelta()
        if (!this._middlePoint && this.tool.lastPoint) {
            // (point + lastPoint) / 2
            return this.tool.point.add(this.tool.lastPoint).divide(2)
        }
        return this._middlePoint
    }

    setMiddlePoint(middlePoint: Point) {
        this._middlePoint = middlePoint
    }

    /**
     * The difference between the current position and the last position of the
     * mouse when the event was fired. In case of the mouseup event, the
     * difference to the mousedown position is returned.
     *
     * @bean
     * @type Point
     */
    getDelta() {
        return !this._delta && this.tool.lastPoint
            ? this.tool.point.subtract(this.tool.lastPoint)
            : this._delta
    }

    setDelta(delta: Point) {
        this._delta = delta
    }

    /**
     * The number of times the mouse event was fired.
     *
     * @bean
     * @type Number
     */
    getCount() {
        // Return downCount for both mouse down and up, since
        // the count is the same.
        return this.tool[
            /^mouse(down|up)$/.test(this.type) ? '_downCount' : '_moveCount'
        ]
    }

    setCount(count: number) {
        this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count'] =
            count
    }

    /**
     * The item at the position of the mouse (if any).
     *
     * If the item is contained within one or more {@link Group} or
     * {@link CompoundPath} items, the most top level group or compound path
     * that it is contained within is returned.
     *
     * @bean
     * @type Item
     */
    getItem() {
        if (!this._item) {
            const result = this.tool.scope.project.hitTest(this.getPoint())
            if (result) {
                let item = result.item
                let parent = item._parent
                while (/^(Group|CompoundPath)$/.test(parent._class)) {
                    item = parent
                    parent = parent._parent
                }
                this._item = item
            }
        }
        return this._item
    }

    setItem(item: Item) {
        this._item = item
    }

    /**
     * @return {String} a string representation of the tool event
     */
    toString(): string {
        return (
            '{ type: ' +
            this.type +
            ', point: ' +
            this.getPoint() +
            ', count: ' +
            this.getCount() +
            ', modifiers: ' +
            this.getModifiers() +
            ' }'
        )
    }
}
