import { Matrix, Rectangle } from '../basic'
import Point from '../basic/Point'
import Size from '../basic/Size'
import { Base } from '../core'
import { Item } from '../item'
import Group from '../item/Group'
import PathItem from '../item/PathItem'
import SymbolDefinition from '../item/SymbolDefinition'
import { Color, Gradient, GradientStop } from '../style'
import SvgElement from './SvgElement'
import SvgStyles from './SvgStyles'

export default class SvgImport {
    static definitions = {}
    static rootSize: Size

    static getValue(
        node: HTMLElement,
        name: string,
        isString?: boolean,
        allowNull?: boolean,
        allowPercent?: boolean,
        defaultValue?: string
    ) {
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

        return /%\s*$/.test(value)
            ? (
                  (+res / 100) *
                  (allowPercent
                      ? 1
                      : SvgImport.rootSize[
                            /x|^width/.test(name) ? 'width' : 'height'
                        ])
              ).toString()
            : res.toString()
    }

    static getPoint(
        node: HTMLElement,
        x?: string,
        y?: string,
        allowNull?: boolean,
        allowPercent?: boolean,
        defaultX?: string,
        defaultY?: string
    ) {
        x = SvgImport.getValue(
            node,
            x || 'x',
            false,
            allowNull,
            allowPercent,
            defaultX
        )
        y = SvgImport.getValue(
            node,
            y || 'y',
            false,
            allowNull,
            allowPercent,
            defaultY
        )
        return allowNull && (x == null || y == null) ? null : new Point(+x, +y)
    }

    static getSize(
        node: HTMLElement,
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
        options: any,
        isRoot: boolean
    ) {
        const nodes = node.childNodes
        const isClip = type === 'clippath'
        const isDefs = type === 'defs'
        let item = new Group()
        const project = item.project
        const currentStyle = project.currentStyle
        const children = []
        if (!isClip && !isDefs) {
            item = SvgImport.applyAttributes(item, node, isRoot)
            project.currentStyle = item.style.clone()
        }
        if (isRoot) {
            // Import all defs first, since in SVG they can be in any location.
            // e.g. Affinity Designer exports defs as last.
            const defs = node.querySelectorAll('defs')
            for (let i = 0, l = defs.length; i < l; i++) {
                SvgImport.importNode(defs[i], options, false)
            }
        }

        for (let i = 0, l = nodes.length; i < l; i++) {
            const childNode = nodes[i]
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
        // Restore currentStyle
        project.currentStyle = currentStyle
        if (isClip || isDefs) {
            // We don't want the defs in the DOM. But we might want to use
            // Symbols for them to save memory?
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
        const id = (SvgImport.getValue(node, 'href', true) || '').substring(1)
        const radial = type === 'radialgradient'
        let gradient
        if (id) {
            gradient = SvgImport.definitions[id].getGradient()

            if (gradient._radial ^ +radial) {
                gradient = gradient.clone()
                gradient._radial = radial
            }
        } else {
            const nodes = node.childNodes
            const stops = []
            for (let i = 0, l = nodes.length; i < l; i++) {
                const child = nodes[i]
                if (child.nodeType === 1)
                    stops.push(
                        SvgImport.applyAttributes(new GradientStop(), child)
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
        const color = SvgImport.applyAttributes(
            new Color(gradient, origin, destination, highlight),
            node
        )
        color._scaleToBounds = scaleToBounds
    }

    static importers = {
        '#document': function (
            node: HTMLElement,
            _: string,
            options: any,
            isRoot: boolean
        ) {
            const nodes = node.childNodes
            for (let i = 0, l = nodes.length; i < l; i++) {
                const child = nodes[i]
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
            options: any,
            isRoot: boolean
        ) {
            return new SymbolDefinition(
                SvgImport.importGroup(node, type, options, isRoot),
                true
            )
        },
        defs: SvgImport.importGroup,
        use: function (node: HTMLElement) {
            const id = (SvgImport.getValue(node, 'href', true) || '').substring(
                1
            )
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
                SvgImport.getValue(node, 'r')
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

            'stop-color': function (item: Item, value: string) {
                if (item.setColor) item.setColor(value)
            },

            'stop-opacity': function (item: Item, value: string) {
                if (item.color) item.color.setAlpha(parseFloat(value))
            },

            offset: function (item: Item, value: string) {
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
                name: string,
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

    static getAttribute(node: HTMLElement, name: string, styles: any) {
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
}
