import {
    Formatter,
    Matrix,
    Item,
    Raster,
    Point,
    Numerical,
    SvgElement,
    Path,
    Shape,
    CompoundPath,
    SymbolItem,
    TextItem,
    Color,
    Base,
    SvgStyles,
    SvgStyleEntry,
    UID
} from '../'

export type SvgExportAttributes = {
    [key: string]: any
}

export type SvgExportOptions = {
    embedImages?: boolean
    matchShapes?: boolean
    asString?: boolean
    onExport?: (
        item: Item,
        node: SVGElement,
        options?: SvgExportOptions
    ) => Element
    precision?: number
    bounds?: any
    matrix?: Matrix
}
export type SvgExportDefinitions = {
    ids?: {}
    svgs?: {}
}

export class SvgExport {
    static exporters = {
        Group: SvgExport.exportGroup,
        Layer: SvgExport.exportGroup,
        Raster: SvgExport.exportRaster,
        Path: SvgExport.exportPath,
        Shape: SvgExport.exportShape,
        CompoundPath: SvgExport.exportCompoundPath,
        SymbolItem: SvgExport.exportSymbolItem,
        PointText: SvgExport.exportText
    }

    static formatter: Formatter

    static definitions: SvgExportDefinitions = { ids: {}, svgs: {} }

    static getTransform(
        matrix: Matrix,
        coordinates?: boolean,
        center?: boolean
    ) {
        const attrs: SvgExportAttributes = {}
        let trans = matrix.getTranslation()

        if (coordinates) {
            let point
            if (matrix.isInvertible()) {
                matrix = matrix.shiftless()
                point = matrix.inverseTransform(trans)
                trans = null
            } else {
                point = new Point()
            }
            attrs[center ? 'cx' : 'x'] = point.x
            attrs[center ? 'cy' : 'y'] = point.y
        }
        if (!matrix.isIdentity()) {
            const decomposed = matrix.decompose()
            if (decomposed) {
                const parts = []
                const angle = decomposed.rotation
                const scale = decomposed.scaling
                const skew = decomposed.skewing
                if (trans && !trans.isZero())
                    parts.push(
                        'translate(' + SvgExport.formatter.point(trans) + ')'
                    )
                if (angle)
                    parts.push(
                        'rotate(' + SvgExport.formatter.number(angle) + ')'
                    )
                if (
                    !Numerical.isZero(scale.x - 1) ||
                    !Numerical.isZero(scale.y - 1)
                )
                    parts.push(
                        'scale(' + SvgExport.formatter.point(scale) + ')'
                    )
                if (skew.x)
                    parts.push(
                        'skewX(' + SvgExport.formatter.number(skew.x) + ')'
                    )
                if (skew.y)
                    parts.push(
                        'skewY(' + SvgExport.formatter.number(skew.y) + ')'
                    )
                attrs.transform = parts.join(' ')
            } else {
                attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')'
            }
        }
        return attrs
    }

    static exportGroup(item: Item, options?: SvgExportOptions) {
        const attrs = SvgExport.getTransform(item.matrix)
        const children = item.children
        const node = SvgElement.create('g', attrs, SvgExport.formatter)
        for (let i = 0, l = children.length; i < l; i++) {
            const child = children[i]
            const childNode = SvgExport.exportSVG(child, options)
            if (childNode) {
                if (child.isClipMask()) {
                    const clip = SvgElement.create('clipPath')
                    clip.appendChild(childNode)
                    SvgExport.setDefinition(child, clip, 'clip')
                    SvgElement.set(node, {
                        'clip-path': 'url(#' + clip.id + ')'
                    })
                } else {
                    node.appendChild(childNode)
                }
            }
        }
        return node
    }

    static exportRaster(item: Raster, options?: SvgExportOptions) {
        const attrs = SvgExport.getTransform(item.matrix, true)
        const size = item.getSize()
        const image = item.getImage() as HTMLImageElement

        attrs.x -= size.width / 2
        attrs.y -= size.height / 2
        attrs.width = size.width
        attrs.height = size.height
        attrs.href =
            (options.embedImages === false && image && image.src) ||
            item.toDataURL()
        return SvgElement.create('image', attrs, SvgExport.formatter)
    }

    static exportPath(item: Path, options: SvgExportOptions) {
        const matchShapes = options.matchShapes
        if (matchShapes) {
            const shape = item.toShape(false)
            if (shape) return SvgExport.exportShape(shape, options)
        }
        const segments = item.segments
        const length = segments.length
        let type
        const attrs = SvgExport.getTransform(item.matrix)
        if (matchShapes && length >= 2 && !item.hasHandles()) {
            if (length > 2) {
                type = item.closed ? 'polygon' : 'polyline'
                const parts = []
                for (let i = 0; i < length; i++) {
                    parts.push(SvgExport.formatter.point(segments[i].point))
                }
                attrs.points = parts.join(' ')
            } else {
                type = 'line'
                const start = segments[0].point
                const end = segments[1].point
                attrs.set({
                    x1: start.x,
                    y1: start.y,
                    x2: end.x,
                    y2: end.y
                })
            }
        } else {
            type = 'path'
            attrs.d = item.getPathData(null, options.precision)
        }
        return SvgElement.create(type, attrs, SvgExport.formatter)
    }

    static exportShape(item: Shape, _options?: SvgExportOptions) {
        let type = item.type
        let radius = item.radius
        const attrs = SvgExport.getTransform(
            item.matrix,
            true,
            type !== 'rectangle'
        )
        if (type === 'rectangle') {
            type = 'rect'
            const size = item.size
            const width = size.width
            const height = size.height
            attrs.x -= width / 2
            attrs.y -= height / 2
            attrs.width = width
            attrs.height = height
            if (radius.isZero()) radius = null
        }
        if (radius) {
            if (type === 'circle') {
                attrs.r = radius
            } else {
                attrs.rx = radius.width
                attrs.ry = radius.height
            }
        }
        return SvgElement.create(type, attrs, SvgExport.formatter)
    }

    static exportCompoundPath(item: CompoundPath, options?: SvgExportOptions) {
        const attrs = SvgExport.getTransform(item.matrix)
        const data = item.getPathData(null, options.precision)
        if (data) attrs.d = data
        return SvgElement.create('path', attrs, SvgExport.formatter)
    }

    static exportSymbolItem(item: SymbolItem, options?: SvgExportOptions) {
        const attrs = SvgExport.getTransform(item.matrix, true)
        const definition = item.definition
        let node = SvgExport.getDefinition(definition, 'symbol')
        const definitionItem = definition.item
        const bounds = definitionItem.getStrokeBounds()
        if (!node) {
            node = SvgElement.create('symbol', {
                viewBox: SvgExport.formatter.rectangle(bounds)
            })
            node.appendChild(SvgExport.exportSVG(definitionItem, options))
            SvgExport.setDefinition(definition, node, 'symbol')
        }
        attrs.href = '#' + node.id
        attrs.x += bounds.x
        attrs.y += bounds.y
        attrs.width = bounds.width
        attrs.height = bounds.height
        attrs.overflow = 'visible'
        return SvgElement.create('use', attrs, SvgExport.formatter)
    }

    static exportGradient(color: Color) {
        let gradientNode = SvgExport.getDefinition(color, 'color')
        if (!gradientNode) {
            const gradient = color.getGradient()
            const radial = gradient.radial
            const origin = color.getOrigin()
            const destination = color.getDestination()
            let attrs: SvgExportAttributes
            if (radial) {
                attrs = {
                    cx: origin.x,
                    cy: origin.y,
                    r: origin.getDistance(destination)
                }
                const highlight = color.getHighlight()
                if (highlight) {
                    attrs.fx = highlight.x
                    attrs.fy = highlight.y
                }
            } else {
                attrs = {
                    x1: origin.x,
                    y1: origin.y,
                    x2: destination.x,
                    y2: destination.y
                }
            }
            attrs.gradientUnits = 'userSpaceOnUse'
            gradientNode = SvgElement.create(
                (radial ? 'radial' : 'linear') + 'Gradient',
                attrs,
                SvgExport.formatter
            )
            const stops = gradient.stops
            for (let i = 0, l = stops.length; i < l; i++) {
                const stop = stops[i]
                const stopColor = stop.color
                const alpha = stopColor.getAlpha()
                const offset = stop.offset
                attrs = {
                    offset: offset == null ? i / (l - 1) : offset
                }
                if (stopColor) attrs['stop-color'] = stopColor.toCSS(true)
                // See applyStyle for an explanation of why there are separated
                // opacity / color attributes.
                if (alpha < 1) attrs['stop-opacity'] = alpha
                gradientNode.appendChild(
                    SvgElement.create('stop', attrs, SvgExport.formatter)
                )
            }
            SvgExport.setDefinition(color, gradientNode, 'color')
        }
        return 'url(#' + gradientNode.id + ')'
    }

    static exportText(item: TextItem) {
        const node = SvgElement.create(
            'text',
            SvgExport.getTransform(item.matrix, true),
            SvgExport.formatter
        )
        node.textContent = item.content
        return node
    }

    static applyStyle(item: Item, node: SVGElement, isRoot?: boolean) {
        const attrs: SvgExportAttributes = {}
        const parent = !isRoot && item.getParent()
        const style: string[] = []

        if (item.name != null) attrs.id = item.name

        Base.each(SvgStyles, function (entry: SvgStyleEntry) {
            const get = entry.get
            const type = entry.type

            if (!item[get]) {
                return
            }

            const value = item[get]()

            if (
                entry.exportFilter
                    ? entry.exportFilter(item, value)
                    : !parent || !Base.equals(parent[get](), value)
            ) {
                if (type === 'color' && value != null) {
                    const alpha = value.getAlpha()
                    if (alpha < 1) attrs[entry.attribute + '-opacity'] = alpha
                }
                if (type === 'style') {
                    style.push(entry.attribute + ': ' + value)
                } else {
                    attrs[entry.attribute] =
                        value == null
                            ? 'none'
                            : type === 'color'
                            ? value.gradient
                                ? SvgExport.exportGradient(value)
                                : value.toCSS(true)
                            : type === 'array'
                            ? value.join(',')
                            : type === 'lookup'
                            ? entry.toSVG[value]
                            : value
                }
            }
        })

        if (style.length) attrs.style = style.join(';')

        if (attrs.opacity === 1) delete attrs.opacity

        if (!item.visible) attrs.visibility = 'hidden'

        return SvgElement.set(node, attrs, SvgExport.formatter)
    }

    static getDefinition(item: Base, type: string) {
        return (
            item &&
            SvgExport.definitions.svgs[
                type +
                    '-' +
                    (item.id ||
                        (item as any).__id ||
                        ((item as any).__id = UID.get('svg')))
            ]
        )
    }

    static setDefinition(item: Base, node: SVGElement, type: string) {
        const typeId = (SvgExport.definitions.ids[type] =
            (SvgExport.definitions.ids[type] || 0) + 1)

        node.id = type + '-' + typeId

        SvgExport.definitions.svgs[
            type + '-' + (item.id || (item as any).__id)
        ] = node
    }

    static exportDefinitions(
        node: SVGElement,
        options?: SvgExportOptions
    ): string | SVGElement {
        let svg = node
        let defs = null
        if (SvgExport.definitions) {
            svg = node.nodeName.toLowerCase() === 'svg' && node
            for (const i in SvgExport.definitions.svgs) {
                if (!defs) {
                    if (!svg) {
                        svg = SvgElement.create('svg')
                        svg.appendChild(node)
                    }
                    defs = svg.insertBefore(
                        SvgElement.create('defs'),
                        svg.firstChild
                    )
                }
                defs.appendChild(SvgExport.definitions.svgs[i])
            }
            SvgExport.definitions = null
        }
        return options.asString
            ? new self.XMLSerializer().serializeToString(svg)
            : svg
    }

    static exportSVG(item: Item, options?: SvgExportOptions, isRoot?: boolean) {
        const exporter = SvgExport.exporters[item.class]
        let node = exporter && exporter(item, options)
        if (node) {
            const onExport = options.onExport
            if (onExport) node = onExport(item, node, options) || node
            const data = JSON.stringify(item.data)
            if (data && data !== '{}' && data !== 'null')
                node.setAttribute('data-paper-data', data)
        }
        return node && SvgExport.applyStyle(item, node, isRoot)
    }

    static setOptions(options?: SvgExportOptions) {
        if (!options) options = {}
        SvgExport.formatter = new Formatter(options.precision)
        return options
    }
}
