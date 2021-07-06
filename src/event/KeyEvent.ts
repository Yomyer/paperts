import Event from './Event'

type EventTypes = 'keydown' | 'keyup'

export default class KeyEvent extends Event {
    protected _class = 'KeyEvent'

    type: EventTypes
    key: string
    character: string

    constructor(
        type: EventTypes,
        event?: UIEvent,
        key?: string,
        character?: string
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        this.type = args[0]
        this.event = args[1]
        this.key = args[2]
        this.character = args[3]
    }

    /**
     * @return {String} a string representation of the key event
     */
    toString(): string {
        return (
            "{ type: '" +
            this.type +
            "', key: '" +
            this.key +
            "', character: '" +
            this.character +
            "', modifiers: " +
            this.getModifiers() +
            ' }'
        )
    }
}
