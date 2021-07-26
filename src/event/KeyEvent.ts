import { Event } from '@paperts'

export type KeyEventTypes = 'keydown' | 'keyup'

export class KeyEvent extends Event {
    protected _class = 'KeyEvent'

    type: KeyEventTypes
    key: string
    character: string

    constructor(
        type: KeyEventTypes,
        event?: UIEvent,
        key?: string,
        character?: string
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
        this.key = args[2]
        this.character = args[3]

        return this
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
