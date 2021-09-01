import {
    Matrix,
    Rectangle,
    Point,
    Size,
    Base,
    Shape,
    Raster,
    PointText,
    Item,
    Group,
    Path,
    PathItem,
    SymbolDefinition,
    Color,
    Gradient,
    GradientStop,
    SvgElement,
    SvgStyles,
    DomElement,
    PaperScope,
    Http,
    Project
} from '../'

export type SvgImportOptions = {
    expandShapes?: boolean
    onLoad?: (item: Item, svg: HTMLElement) => void
    onError?: (message: DOMException | string, status: number) => void
    insert?: boolean
    applyMatrix?: boolean
    svg?: SVGElement | String
    options?: object
    onImport: (
        node: HTMLElement | SVGDefsElement,
        item: Item,
        options: SvgImportOptions
    ) => Item
}

export class SvgImport {
    static definitions = {}
    static rootSize: Size

    static getValue<T>(
        node: HTMLElement,
        name: string,
        isString?: boolean,
        allowNull?: boolean,
        allowPercent?: boolean,
        defaultValue?: string
    ): T {
        const value = SvgElement.get(node, name) || defaultValue
        const res =
            value == null
                ? allowNull
                    ? null
                    : isString
                    ? ''
                    : 0
                : isString
                ? value
                : parseFloat(value)

        return (/%\s*$/.test(value)
            ? (+res / 100) *
              (allowPercent
                  ? 1
                  : SvgImport.rootSize[
                        /x|^width/.test(name) ? 'width' : 'height'
                    ])
            : res) as unknown as T
    }

    static getPoint<T extends HTMLElement>(
        node: T,
        x?: string,
        y?: string,
        allowNull?: boolean,
        allowPercent?: boolean,
        defaultX?: string,
        defaultY?: string
    ) {
        x = SvgImport.getValue<string>(
            node,
            x || 'x',
            false,
            allowNull,
            allowPercent,
            defaultX
        )
        y = SvgImport.getValue<string>(
            node,
            y || 'y',
            false,
            allowNull,
            allowPercent,
            defaultY
        )
        return allowNull && (x == null || y == null) ? null : new Point(+x, +y)
    }

    static getSize<T extends HTMLElement>(
        node: T,
        w?: string,
        h?: string,
        allowNull?: boolean,
        allowPercent?: boolean
    ) {
        w = SvgImport.getValue(
            node,
            w || 'width',
            false,
            allowNull,
            allowPercent
        )
        h = SvgImport.getValue(
            node,
            h || 'height',
            false,
            allowNull,
            allowPercent
        )
        return allowNull && (w == null || h == null) ? null : new Size(+w, +h)
    }

    static convertValue(
        value: string,
        type: string,
        lookup?: { [key: string]: any }
    ) {
        return value === 'none'
            ? null
            : type === 'number'
            ? parseFloat(value)
            : type === 'array'
            ? value
                ? value.split(/[\s,]+/g).map(parseFloat)
                : []
            : type === 'color'
            ? SvgImport.getDefinition(value) || value
            : type === 'lookup'
            ? lookup[value]
            : value
    }

    static importGroup(
        node: HTMLElement,
        type: string,
        options: SvgImportOptions,
        isRoot: boolean
    ) {
        const nodes = node.children
        const isClip = type === 'clippath'
        const isDefs = type === 'defs'
        let item = new Group()
        const project = item.project as any
        const currentStyle = project._currentStyle
        const children = []
        if (!isClip && !isDefs) {
            item = SvgImport.applyAttributes(item, node, isRoot)
            project._currentStyle = item.style.clone()
        }
        if (isRoot) {
            const defs = node.querySelectorAll('defs')
            for (let i = 0, l = defs.length; i < l; i++) {
                SvgImport.importNode(defs[i], options, false)
            }
        }

        for (let i = 0, l = nodes.length; i < l; i++) {
            const childNode = nodes[i] as HTMLElement
            let child
            if (
                childNode.nodeType === 1 &&
                !/^defs$/i.test(childNode.nodeName) &&
                (child = SvgImport.importNode(childNode, options, false)) &&
                !(child instanceof SymbolDefinition)
            )
                children.push(child)
        }
        item.addChildren(children)

        if (isClip)
            item = SvgImport.applyAttributes(item.reduce(), node, isRoot)

        project._currentStyle = currentStyle
        if (isClip || isDefs) {
            item.remove()
            item = null
        }
        return item
    }

    static importPoly(node: HTMLElement, type: string) {
        const coords = node
            .getAttribute('points')
            .match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g)
        const points = []
        for (let i = 0, l = coords.length; i < l; i += 2)
            points.push(
                new Point(parseFloat(coords[i]), parseFloat(coords[i + 1]))
            )
        const path = new Path(points)
        if (type === 'polygon') path.closePath()
        return path
    }

    static importPath(node: HTMLElement) {
        return PathItem.create(node.getAttribute('d'))
    }

    static importGradient(node: HTMLElement, type: string) {
        const id = (
            SvgImport.getValue<string>(node, 'href', true) || ''
        ).substring(1)
        const radial = type === 'radialgradient'
        let gradient
        if (id) {
            console.log(id, SvgImport.definitions)
            gradient = SvgImport.definitions[id].getGradient()

            if (gradient._radial ^ +radial) {
                gradient = gradient.clone()
                gradient._radial = radial
            }
        } else {
            const nodes = node.childNodes as unknown as HTMLElement[]
            const stops: GradientStop[] = []
            for (let i = 0, l = nodes.length; i < l; i++) {
                const child = nodes[i]
                if (child.nodeType === 1)
                    stops.push(
                        SvgImport.applyAttributes<GradientStop>(
                            new GradientStop(),
                            child
                        )
                    )
            }
            gradient = new Gradient(stops, radial)
        }
        let origin
        let destination
        let highlight
        const scaleToBounds =
            SvgImport.getValue(node, 'gradientUnits', true) !== 'userSpaceOnUse'
        // Allow percentages in all values if scaleToBounds is true:
        if (radial) {
            origin = SvgImport.getPoint(
                node,
                'cx',
                'cy',
                false,
                scaleToBounds,
                '50%',
                '50%'
            )
            destination = origin.add(
                +SvgImport.getValue(
                    node,
                    'r',
                    false,
                    false,
                    scaleToBounds,
                    '50%'
                ),
                0
            )
            highlight = SvgImport.getPoint(
                node,
                'fx',
                'fy',
                true,
                scaleToBounds
            )
        } else {
            origin = SvgImport.getPoint(
                node,
                'x1',
                'y1',
                false,
                scaleToBounds,
                '0%',
                '0%'
            )
            destination = SvgImport.getPoint(
                node,
                'x2',
                'y2',
                false,
                scaleToBounds,
                '100%',
                '0%'
            )
        }
        const color = SvgImport.applyAttributes<Color>(
            new Color(gradient, origin, destination, highlight),
            node
        )

        ;(color as any)._scaleToBounds = scaleToBounds
    }

    static importers = {
        '#document': function (
            node: HTMLElement,
            _: string,
            options: SvgImportOptions,
            isRoot: boolean
        ) {
            const nodes = node.children
            for (let i = 0, l = nodes.length; i < l; i++) {
                const child = nodes[i] as HTMLElement
                if (child.nodeType === 1)
                    return SvgImport.importNode(child, options, isRoot)
            }
        },
        g: SvgImport.importGroup,
        svg: SvgImport.importGroup,
        clippath: SvgImport.importGroup,
        polygon: SvgImport.importPoly,
        polyline: SvgImport.importPoly,
        path: SvgImport.importPath,
        lineargradient: SvgImport.importGradient,
        radialgradient: SvgImport.importGradient,
        image: function (node: HTMLElement) {
            const raster = new Raster(SvgImport.getValue(node, 'href', true))
            raster.on('load', function (this: Raster) {
                const size = SvgImport.getSize(node)
                this.setSize(size)

                const center = SvgImport.getPoint(node).add(size.divide(2))
                this._matrix.append(new Matrix().translate(center))
            })
            return raster
        },
        symbol: function (
            node: HTMLElement,
            type: string,
            options: SvgImportOptions,
            isRoot: boolean
        ) {
            return new SymbolDefinition(
                SvgImport.importGroup(node, type, options, isRoot),
                true
            )
        },
        defs: SvgImport.importGroup,
        use: function (node: HTMLElement) {
            const id = (
                SvgImport.getValue<string>(node, 'href', true) || ''
            ).substring(1)

            const definition = SvgImport.definitions[id]
            const point = SvgImport.getPoint(node)
            return definition
                ? definition instanceof SymbolDefinition
                    ? definition.place(point)
                    : definition.clone().translate(point)
                : null
        },
        circle: function (node: HTMLElement) {
            return new Shape.Circle(
                SvgImport.getPoint(node, 'cx', 'cy'),
                +SvgImport.getValue(node, 'r')
            )
        },
        ellipse: function (node: HTMLElement) {
            // We only use object literal notation where the default one is not
            // supported (e.g. center / radius fo Shape.Ellipse).
            return new Shape.Ellipse({
                center: SvgImport.getPoint(node, 'cx', 'cy'),
                radius: SvgImport.getSize(node, 'rx', 'ry')
            })
        },
        rect: function (node: HTMLElement) {
            return new Shape.Rectangle(
                new Rectangle(
                    SvgImport.getPoint(node),
                    SvgImport.getSize(node)
                ),
                SvgImport.getSize(node, 'rx', 'ry')
            )
        },
        line: function (node: HTMLElement) {
            return new Path.Line(
                SvgImport.getPoint(node, 'x1', 'y1'),
                SvgImport.getPoint(node, 'x2', 'y2')
            )
        },
        text: function (node: HTMLElement) {
            const text = new PointText(
                SvgImport.getPoint(node).add(
                    SvgImport.getPoint(node, 'dx', 'dy')
                )
            )
            text.setContent(node.textContent.trim() || '')
            return text
        },
        switch: SvgImport.importGroup
    }

    static applyTransform(
        item: Item,
        _: string,
        name: string,
        node: HTMLElement
    ) {
        if (item.transform) {
            const transforms = (node.getAttribute(name) || '').split(/\)\s*/g)
            const matrix = new Matrix()
            for (let i = 0, l = transforms.length; i < l; i++) {
                const transform = transforms[i]
                if (!transform) break

                const parts = transform.split(/\(\s*/)
                const command = parts[0]
                const p = parts[1].split(/[\s,]+/g)
                const v: number[] = []
                for (let j = 0, m = p.length; j < m; j++)
                    v[j] = parseFloat(p[j])
                switch (command) {
                    case 'matrix':
                        matrix.append(
                            new Matrix(v[0], v[1], v[2], v[3], v[4], v[5])
                        )
                        break
                    case 'rotate':
                        matrix.rotate(v[0], v[1] || 0, v[2] || 0)
                        break
                    case 'translate':
                        matrix.translate(v[0], v[1] || 0)
                        break
                    case 'scale':
                        matrix.scale(v)
                        break
                    case 'skewX':
                        matrix.skew(v[0], 0)
                        break
                    case 'skewY':
                        matrix.skew(0, v[0])
                        break
                }
            }
            item.transform(matrix)
        }
    }

    static applyOpacity(item: Item, value: string, name: string) {
        const key = name === 'fill-opacity' ? 'getFillColor' : 'getStrokeColor'
        const color = item[key] && item[key]()
        if (color) color.setAlpha(parseFloat(value))
    }

    static attributes = Base.set(
        Base.each(
            SvgStyles,
            function (this: Base, entry) {
                this[entry.attribute] = function (item: Item, value: string) {
                    if (item[entry.set]) {
                        item[entry.set](
                            SvgImport.convertValue(
                                value,
                                entry.type,
                                entry.fromSVG
                            )
                        )
                        if (entry.type === 'color') {
                            const color = item[entry.get]()
                            if (color) {
                                if (color._scaleToBounds) {
                                    const bounds = item.getBounds()
                                    color.transform(
                                        new Matrix()
                                            .translate(bounds.getPoint())
                                            .scale(bounds.getSize())
                                    )
                                }
                            }
                        }
                    }
                }
            },
            {}
        ),
        {
            id: function (item: Item, value: string) {
                SvgImport.definitions[value] = item
                if (item.setName) item.setName(value)
            },

            'clip-path': function (item: Item, value: string) {
                // https://www.w3.org/TR/SVG/masking.html#ClipPathProperty
                let clip = SvgImport.getDefinition(value)
                if (clip) {
                    clip = clip.clone()
                    clip.setClipMask(true)
                    // If item is already a group, move the clip-path inside
                    if (item instanceof Group) {
                        item.insertChild(0, clip)
                    } else {
                        return new Group(clip, item)
                    }
                }

                return null
            },

            gradientTransform: SvgImport.applyTransform,
            transform: SvgImport.applyTransform,

            'fill-opacity': SvgImport.applyOpacity,
            'stroke-opacity': SvgImport.applyOpacity,

            visibility: function (item: Item, value: string) {
                if (item.setVisible) item.setVisible(value === 'visible')
            },

            display: function (item: Item, value: string) {
                if (item.setVisible) item.setVisible(value !== null)
            },

            'stop-color': function (item: GradientStop, value: string) {
                if (item.setColor) item.setColor(value)
            },

            'stop-opacity': function (item: GradientStop, value: string) {
                if (item.color) item.color.setAlpha(parseFloat(value))
            },

            offset: function (item: GradientStop, value: string) {
                // https://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
                if (item.setOffset) {
                    const percent = value.match(/(.*)%$/)
                    item.setOffset(
                        percent ? +percent[1] / 100 : parseFloat(value)
                    )
                }
            },

            viewBox: function (
                item: Item,
                value: string,
                _: string,
                node: HTMLElement,
                styles: any
            ) {
                const rect = new Rectangle(
                    SvgImport.convertValue(value, 'array')
                )
                const size = SvgImport.getSize(node, null, null, true)
                let group
                let matrix
                if (item instanceof Group) {
                    const scale = size ? size.divide(rect.getSize()) : 1
                    matrix = new Matrix()
                        .scale(scale)
                        .translate(rect.getPoint().negate())
                    group = item
                } else if (item instanceof SymbolDefinition) {
                    if (size) rect.setSize(size)
                    group = item.item
                }
                if (group) {
                    if (
                        SvgImport.getAttribute(node, 'overflow', styles) !==
                        'visible'
                    ) {
                        // Add a clip path at the top of this symbol's group
                        const clip = new Shape.Rectangle(rect)
                        clip.setClipMask(true)
                        group.addChild(clip)
                    }
                    if (matrix) group.transform(matrix)
                }
            }
        }
    )

    static getAttribute(
        node: HTMLElement | SVGDefsElement,
        name: string,
        styles: any
    ) {
        const attr = node.attributes[name]
        let value = attr && attr.value
        if (!value && node.style) {
            const style = Base.camelize(name)
            value = node.style[style]
            if (!value && styles.node[style] !== styles.parent[style])
                value = styles.node[style]
        }
        return !value ? undefined : value === 'none' ? null : value
    }

    /**
     * Converts various SVG styles and attributes into Paper.js styles and
     * attributes and applies them to the passed item.
     *
     * @param {HTMLElement} node an SVG node to read style and attributes from
     * @param {Item} item the item to apply the style and attributes to
     */
    static applyAttributes<T>(item: T, node: HTMLElement, isRoot?: boolean): T

    static applyAttributes<T extends HTMLElement>(
        item: Item,
        node: T,
        isRoot?: boolean
    ): Item {
        const parent = node.parentElement
        const styles = {
            node: DomElement.getStyles(node) || {},
            parent:
                (!isRoot &&
                    !/^defs$/i.test(parent.tagName) &&
                    DomElement.getStyles(parent as unknown as HTMLElement)) ||
                {}
        }
        Base.each(SvgImport.attributes, function (apply, name) {
            const value = SvgImport.getAttribute(node, name, styles)
            item =
                (value !== undefined &&
                    apply(item, value, name, node, styles)) ||
                item
        })
        return item
    }

    static getDefinition(value: string) {
        const match = value && value.match(/\((?:["'#]*)([^"')]+)/)
        const name = match && match[1]
        let res =
            name &&
            SvgImport.definitions[
                window
                    ? name.replace(window.location.href.split('#')[0] + '#', '')
                    : name
            ]

        if (res && res._scaleToBounds) {
            res = res.clone()
            res._scaleToBounds = true
        }
        return res
    }

    static importNode<T extends HTMLElement>(
        node: T | SVGDefsElement,
        options: SvgImportOptions,
        isRoot?: boolean
    ) {
        const type = node.nodeName.toLowerCase()
        const paper = PaperScope.paper
        const isElement = type !== '#document'
        const body = document.body
        let container
        let parent
        let next
        if (isRoot && isElement) {
            SvgImport.rootSize = paper.getView().getSize()
            SvgImport.rootSize =
                SvgImport.getSize(node as HTMLElement, null, null, true) ||
                SvgImport.rootSize
            container = SvgElement.create('svg', {
                style: 'stroke-width: 1px; stroke-miterlimit: 10'
            })
            parent = node.parentNode
            next = node.nextSibling
            container.appendChild(node)
            body.appendChild(container)
        }

        const settings = paper.settings
        const applyMatrix = settings.applyMatrix
        const insertItems = settings.insertItems
        settings.applyMatrix = false
        settings.insertItems = false
        const importer = SvgImport.importers[type]
        let item = (importer && importer(node, type, options, isRoot)) || null
        settings.insertItems = insertItems
        settings.applyMatrix = applyMatrix
        if (item) {
            if (isElement && !(item instanceof Group))
                item = SvgImport.applyAttributes(
                    item,
                    node as HTMLElement,
                    isRoot
                )

            const onImport = options.onImport
            const data = isElement && node.getAttribute('data-paper-data')
            if (onImport) item = onImport(node, item, options) || item
            if (options.expandShapes && item instanceof Shape) {
                item.remove()
                item = item.toPath()
            }
            if (data) item._data = JSON.parse(data)
        }
        if (container) {
            body.removeChild(container)
            if (parent) {
                if (next) {
                    parent.insertBefore(node, next)
                } else {
                    parent.appendChild(node)
                }
            }
        }
        if (isRoot) {
            SvgImport.definitions = {}
            if (item && Base.pick(options.applyMatrix, applyMatrix))
                item.matrix.apply(true, true)
        }
        return item
    }

    static importSVG(
        source: string | ArrayBuffer | File | HTMLElement,
        options: SvgImportOptions | Function,
        owner: Item | Project
    ): Item {
        if (!source) return null

        const opts: SvgImportOptions = (
            typeof options === 'function' ? { onLoad: options } : options || {}
        ) as SvgImportOptions

        const scope = PaperScope.paper
        let item = null

        function onLoad<T extends string>(svg: T | HTMLElement) {
            try {
                let node =
                    typeof svg === 'object'
                        ? svg
                        : (new self.DOMParser().parseFromString(
                              svg.trim(),
                              'image/svg+xml'
                          ) as unknown as HTMLElement)
                if (!node.nodeName) {
                    node = null
                    throw new Error('Unsupported SVG source: ' + source)
                }
                PaperScope.setGlobalPaper(scope)
                item = SvgImport.importNode(node, opts, true)
                if (!opts || opts.insert !== false) {
                    owner.insertItem(undefined, item)
                }
                const onLoad = opts.onLoad
                if (onLoad) onLoad(item, svg as HTMLElement)
            } catch (e) {
                onError(e)
            }
        }

        function onError(message: DOMException | string, status?: number) {
            const onError = opts.onError
            if (onError) {
                onError(message, status)
            } else {
                console.log(message)
                throw new Error(message as string)
            }
        }

        if (typeof source === 'string' && !/^[\s\S]*</.test(source)) {
            const node = document.getElementById(source)

            if (node) {
                onLoad(node)
            } else {
                Http.request({
                    url: source,
                    async: true,
                    onLoad: onLoad as unknown as (
                        xhr: XMLHttpRequest,
                        message: string
                    ) => void,
                    onError: onError
                })
            }
        } else if (typeof File !== 'undefined' && source instanceof File) {
            const reader = new FileReader()
            reader.onload = function () {
                onLoad(reader.result as string)
            }
            reader.onerror = function () {
                onError(reader.error)
            }
            return reader.readAsText(source) as unknown as Item
        } else {
            onLoad(source as string)
        }

        return item
    }
}
