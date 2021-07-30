import { Point, Event, Emitter } from '../'

export type MouseEventTypes =
    | 'mousedown'
    | 'mouseup'
    | 'mousedrag'
    | 'click'
    | 'doubleclick'
    | 'mousemove'
    | 'mouseenter'
    | 'mouseleave'

export class MouseEvent extends Event {
    protected _class = 'MouseEvent'

    declare type: MouseEventTypes
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
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this.type = args[0]
        this.event = args[1]
        this.point = args[2]
        this.target = args[3]
        this.delta = args[4]

        return this
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
