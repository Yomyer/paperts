import { Point, EventList, DomElement } from '../'

type Element = HTMLElement | Document | Window

const nativeRequest = DomElement.getPrefixed(window, 'requestAnimationFrame')

export class DomEvent {
    static requested = false
    static callbacks: Array<() => void> = []
    static timer: any

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
        const functions = DomEvent.callbacks
        DomEvent.callbacks = []
        for (let i = 0, l = functions.length; i < l; i++) {
            functions[i]()
        }
        const requested = nativeRequest && DomEvent.callbacks.length
        if (requested) {
            nativeRequest(DomEvent.handleCallbacks)
        }
    }

    static requestAnimationFrame(callback: () => void): void {
        DomEvent.callbacks.push(callback)
        if (nativeRequest) {
            if (!DomEvent.requested) {
                nativeRequest(DomEvent.handleCallbacks)
                DomEvent.requested = true
            }
        } else if (!DomEvent.timer) {
            DomEvent.timer = setInterval(DomEvent.handleCallbacks, 1000 / 60)
        }
    }
}
