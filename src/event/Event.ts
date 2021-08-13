import { Base, Key } from '../'

export class Event extends Base {
    protected _class = 'Event'

    event: UIEvent
    type: string
    prevented = false
    stopped = false

    constructor(event?: UIEvent)

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this.event = args[0]
        this.type = this.event && this.event.type

        return this
    }

    /**
     * Cancels the event if it is cancelable, without stopping further
     * propagation of the event.
     */
    preventDefault() {
        this.prevented = true
        this.event.preventDefault()
    }

    /**
     * Prevents further propagation of the current event.
     */
    stopPropagation() {
        this.stopped = true
        this.event.stopPropagation()
    }

    /**
     * Cancels the event if it is cancelable, and stops stopping further
     * propagation of the event. This is has the same effect as calling both
     * {@link #stopPropagation()} and {@link #preventDefault()}.
     *
     * Any handler can also return `false` to indicate that `stop()` should be
     * called right after.
     */
    stop() {
        this.stopPropagation()
        this.preventDefault()
    }

    /**
     * The time at which the event was created, in milliseconds since the epoch.
     *
     * @bean
     * @type Number
     */
    getTimeStamp() {
        return this.event.timeStamp
    }

    get timeStamp() {
        return this.getTimeStamp()
    }

    /**
     * The current state of the keyboard modifiers.
     *
     * @bean
     * @type object
     * @see Key.modifiers
     */
    getModifiers() {
        return Key.modifiers
    }

    get modifiers() {
        return this.getModifiers()
    }
}
