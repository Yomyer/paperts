import { Base, Size } from '../'

export type EventFunc<T> = (event?: T, ...args: any) => void
export type EventList = {
    [type: string]: EventFunc<any>
}
export type EmitterType = string | EventList

export type FrameEvent = {
    delta: number
    time: number
    count: number
}

export type ResizeEvent = {
    size: Size
    delta: Size
}

export type EventTypeHooks = {
    [key: string]: {
        install?: EventFunc<any>
        uninstall?: EventFunc<any>
    }
}

export type EventTypes =
    | 'onMouseDown'
    | 'onMouseUp'
    | 'onMouseDrag'
    | 'onClick'
    | 'onDoubleClick'
    | 'onMouseMove'
    | 'onMouseEnter'
    | 'onMouseLeave'
    | 'onResize'
    | 'onKeyDown'
    | 'onKeyUp'

export abstract class Emitter extends Base {
    private _eventCache: { [key: string]: EventFunc<any> } = {}

    constructor(..._args: any[]) {
        super()
    }

    protected _eventTypes: EventTypeHooks

    protected _callbacks: {
        [key: string]: [EventFunc<any>]
    }

    on(type: EmitterType, func?: EventFunc<any>): this {
        if (typeof type !== 'string') {
            Base.each(
                type,
                function (this: Emitter, value, key) {
                    this.on(key, value)
                },
                this
            )
        } else {
            const types = this._eventTypes
            const entry = types && types[type]

            let handlers: any = (this._callbacks = this._callbacks || {})
            handlers = handlers[type] = handlers[type] || []

            if (handlers.indexOf(func) === -1) {
                handlers.push(func)
                if (entry && entry.install && handlers.length === 1)
                    entry.install.call(this, type)
            }
        }
        return this
    }

    off(type: EmitterType, func?: EventFunc<any>): this {
        if (typeof type !== 'string') {
            Base.each(
                type,
                function (this: Emitter, value, key) {
                    this.off(key, value)
                },
                this
            )
        } else {
            const types = this._eventTypes
            const entry = types && types[type]
            const handlers = this._callbacks && this._callbacks[type]
            let index

            if (handlers) {
                if (
                    !func ||
                    ((index = handlers.indexOf(func)) !== -1 &&
                        handlers.length === 1)
                ) {
                    if (entry && entry.uninstall)
                        entry.uninstall.call(this, type)
                    delete this._callbacks[type]
                } else if (index !== -1) {
                    handlers.splice(index, 1)
                }
            }
        }

        return this
    }

    once(type: EmitterType, func?: EventFunc<any>): this {
        return this.on(type, function handler(this: any, ...args: any[]) {
            func(...args)
            this.off(type, handler)
        })
    }

    emit(type: string, event?: any, ...args: any[]): boolean {
        // Returns true if any events were emitted, false otherwise.
        let handlers: any = this._callbacks && this._callbacks[type]
        if (!handlers) return false

        args = [event, ...args]
        const setTarget = event && event.target && !event.currentTarget

        handlers = handlers.slice()
        if (setTarget) event.currentTarget = this
        for (let i = 0, l = handlers.length; i < l; i++) {
            if (handlers[i].apply(this, args) === false) {
                if (event && event.stop) event.stop()

                break
            }
        }
        if (setTarget) delete event.currentTarget
        return true
    }

    responds(type: string): boolean {
        return !!(this._callbacks && this._callbacks[type])
    }

    fire(type: string, event?: any, ...args: any[]): boolean {
        return this.emit(type, event, ...args)
    }

    protected _installEvents(install: boolean) {
        const types = this._eventTypes
        const handlers = this._callbacks
        const key = install ? 'install' : 'uninstall'
        if (types) {
            for (const type in handlers) {
                if (handlers[type].length > 0) {
                    const entry = types[type]
                    const func = entry && entry[key]
                    if (func) func.call(this, type)
                }
            }
        }
    }

    protected _injectEvents(events: EventTypeHooks) {
        const types = {}

        Base.each(events, function (entry, key) {
            const isString = typeof entry === 'string'
            const name = isString ? entry : key
            const type = name.substring(2).toLowerCase()
            types[type] = isString ? {} : entry
        })

        this._eventTypes = types
    }

    setEvent(name: string, func: EventFunc<any>) {
        const type = name.substring(2).toLowerCase()

        const prev = this._eventCache['_' + name]
        if (prev) this.off(type, prev)
        if (func) this.on(type, func)
        this._eventCache['_' + name] = func
    }

    getEvent(name: string) {
        return this._eventCache['_' + name]
    }
}
