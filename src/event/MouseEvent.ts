import Event from './Event'
import Item from '../item/Item'
import Point from '../basic/Point'

type EventTypes =
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

    type: EventTypes
    point: Point
    target: Item
    delta: Point

    constructor(
        type: EventTypes,
        event: UIEvent,
        key: string,
        character: string
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
