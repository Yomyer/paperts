import { Point } from '../basic'
import { EventList } from '../core/Emitter'
import DomElement from './DomElement'

type Element = HTMLElement | Document | Window

export default class DomEvent {
    static nativeRequest = DomElement.getPrefixed(
        window,
        'requestAnimationFrame'
    )

    static requested = false
    static callbacks: Array<() => void> = []
    static timer: NodeJS.Timeout

    static add(el: Element, events: EventList) {
        if (el) {
            for (const type in events) {
                const func = events[type]
                const parts = type.split(/[\s,]+/g)
                for (let i = 0, l = parts.length; i < l; i++) {
                    const name = parts[i]

                    const options =
                        el === document &&
                        (name === 'touchstart' || name === 'touchmove')
                            ? { passive: false }
                            : false
                    el.addEventListener(name, func, options)
                }
            }
        }
    }

    static remove(el: Element, events: EventList) {
        if (el) {
            for (const type in events) {
                const func = events[type]
                const parts = type.split(/[\s,]+/g)
                for (let i = 0, l = parts.length; i < l; i++)
                    el.removeEventListener(parts[i], func, false)
            }
        }
    }

    static getPoint(event: MouseEvent | TouchEvent) {
        const pos = (
            event instanceof TouchEvent && event.targetTouches
                ? event.targetTouches.length
                    ? event.targetTouches[0]
                    : event.changedTouches[0]
                : event
        ) as Touch

        return new Point(
            pos.pageX || pos.clientX + document.documentElement.scrollLeft,
            pos.pageY || pos.clientY + document.documentElement.scrollTop
        )
    }

    static getTarget(event: MouseEvent | TouchEvent): HTMLElement {
        return (event.target || event.srcElement) as HTMLElement
    }

    static getRelatedTarget(event: MouseEvent): HTMLElement {
        return event.relatedTarget || (event as any).toElement
    }

    static getOffset(event: MouseEvent | TouchEvent, target: HTMLElement) {
        return DomEvent.getPoint(event).subtract(
            DomElement.getOffset(target || DomEvent.getTarget(event))
        )
    }

    private static handleCallbacks() {
        const functions = this.callbacks
        this.callbacks = []
        for (let i = 0, l = functions.length; i < l; i++) {
            functions[i]()
        }
        const requested = this.nativeRequest && this.callbacks.length
        if (requested) {
            this.nativeRequest(this.handleCallbacks)
        }
    }

    static requestAnimationFrame(callback: () => void): void {
        this.callbacks.push(callback)
        if (this.nativeRequest) {
            if (!this.requested) {
                this.nativeRequest(this.handleCallbacks)
                this.requested = true
            }
        } else if (!this.timer) {
            this.timer = setInterval(this.handleCallbacks, 1000 / 60)
        }
    }
}
