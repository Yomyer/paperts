import Formatter from '../utils/Formatter'

export type AttributeNamespace = {
    href: string
    xlink: string
    xmlns: string
    'xmlns:xlink': string
}

export type AttributeNamespaceKeys = keyof AttributeNamespace

export default class SvgElement {
    static svg = 'http://www.w3.org/2000/svg'
    static xmlns = 'http://www.w3.org/2000/xmlns'
    static xlink = 'http://www.w3.org/1999/xlink'

    static attributeNamespace = {
        href: SvgElement.xlink,
        xlink: SvgElement.xmlns,
        xmlns: SvgElement.xmlns + '/',
        'xmlns:xlink': SvgElement.xmlns + '/'
    }

    static create(
        tag: string,
        attributes?: { [key: string]: string },
        formatter?: Formatter
    ) {
        return SvgElement.set(
            document.createElementNS(SvgElement.svg, tag),
            attributes,
            formatter
        )
    }

    static get(node: Element, name: string) {
        const namespace = SvgElement.attributeNamespace[name]
        const value = namespace
            ? node.getAttributeNS(namespace, name)
            : node.getAttribute(name)
        return value === 'null' ? null : value
    }

    static set(
        node: Element,
        attributes: { [key: string]: string | number },
        formatter: Formatter
    ) {
        for (const name in attributes) {
            let value = attributes[name]
            const namespace = SvgElement.attributeNamespace[name]
            if (typeof value === 'number' && formatter)
                value = formatter.number(value)
            if (namespace) {
                node.setAttributeNS(namespace, name, value.toString())
            } else {
                node.setAttribute(name, value.toString())
            }
        }
        return node
    }
}
