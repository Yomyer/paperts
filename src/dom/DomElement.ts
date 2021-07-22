import { Rectangle, Size } from '@paperts'

type Element =
    | HTMLElement
    | CSSStyleDeclaration
    | Document
    | Window
    | CanvasRenderingContext2D

export class DomElement {
    private static handlePrefix(
        el: Element,
        name: string,
        set?: boolean,
        value?: string | boolean
    ) {
        const prefixes = ['', 'webkit', 'moz', 'Moz', 'ms', 'o']
        const suffix = name[0].toUpperCase() + name.substring(1)
        for (let i = 0; i < 6; i++) {
            const prefix = prefixes[i]
            const key = prefix ? prefix + suffix : name

            if (key in el) {
                if (set) {
                    el[key] = value
                } else {
                    return el[key]
                }
                break
            }
        }
    }

    static getStyles(el: HTMLElement | SVGDefsElement) {
        const doc = (el && el.nodeType !== 9
            ? el.ownerDocument
            : el) as unknown as Document
        const view = doc && doc.defaultView
        return view && view.getComputedStyle(el, '')
    }

    static getBounds(el: HTMLElement, viewport?: boolean) {
        const doc = el.ownerDocument
        const body = doc.body
        const html = doc.documentElement
        let rect
        try {
            // On IE, for nodes that are not inside the DOM, this throws an
            // exception. Emulate the behavior of all other browsers, which
            // return a rectangle of 0 dimensions.
            rect = el.getBoundingClientRect()
        } catch (e) {
            rect = { left: 0, top: 0, width: 0, height: 0 }
        }
        let x = rect.left - (html.clientLeft || body.clientLeft || 0)
        let y = rect.top - (html.clientTop || body.clientTop || 0)
        if (!viewport) {
            const view = doc.defaultView
            x += view.pageXOffset || html.scrollLeft || body.scrollLeft
            y += view.pageYOffset || html.scrollTop || body.scrollTop
        }
        return new Rectangle(x, y, rect.width, rect.height)
    }

    static getViewportBounds(el: HTMLElement) {
        const doc = el.ownerDocument
        const view = doc.defaultView
        const html = doc.documentElement
        return new Rectangle(
            0,
            0,
            view.innerWidth || html.clientWidth,
            view.innerHeight || html.clientHeight
        )
    }

    static getOffset(el: HTMLElement, viewport?: boolean) {
        return DomElement.getBounds(el, viewport).getPoint()
    }

    static getSize(el: HTMLElement) {
        return DomElement.getBounds(el, true).getSize()
    }

    static isInvisible(el: HTMLElement) {
        return DomElement.getSize(el).equals(new Size(0, 0))
    }

    static isInView(el: HTMLElement) {
        return (
            !DomElement.isInvisible(el) &&
            DomElement.getViewportBounds(el).intersects(
                DomElement.getBounds(el, true)
            )
        )
    }

    static isInserted(el: Element) {
        return document.body.contains(el as HTMLElement)
    }

    static getPrefixed(el: Element, name: string) {
        return el && DomElement.handlePrefix(el, name)
    }

    static setPrefixed(
        el: Element,
        name: string | object,
        value?: string | boolean
    ) {
        if (typeof name === 'object') {
            for (const key in name)
                DomElement.handlePrefix(el, key, true, name[key])
        } else {
            DomElement.handlePrefix(el, name, true, value)
        }
    }
}
