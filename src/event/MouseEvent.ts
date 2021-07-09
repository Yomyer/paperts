import Event from './Event'
import Point from '../basic/Point'
import Emitter from '../core/Emitter'

export type MouseEventTypes =
    | 'mousedown'
    | 'mouseup'
    | 'mousedrag'
    | 'click'
    | 'doubleclick'
    | 'mousemove'
    | 'mouseenter'
    | 'mouseleave'

export default class MouseEvent extends Event {
    protected _class = 'MouseEvent'

    type: MouseEventTypes
    point: Point
    target: Emitter
    delta: Point

    constructor(
        type: MouseEventTypes,
        event: UIEvent,
        point: Point,
        target: Emitter,
        delta: Point
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        this.type = args[0]
        this.event = args[1]
        this.point = args[2]
        this.target = args[3]
        this.delta = args[4]
    }

    /**
     * @return {String} a string representation of the mouse event
     */
    toString(): string {
        return (
            "{ type: '" +
            this.type +
            "', point: " +
            this.point +
            ', target: ' +
            this.target +
            (this.delta ? ', delta: ' + this.delta : '') +
            ', modifiers: ' +
            this.getModifiers() +
            ' }'
        )
    }
}
