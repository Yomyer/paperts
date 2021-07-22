import Base from '../core/Base'
import Item from '../item/Item'
import PathItem from '../item/PathItem'
import Shape from '../item/Shape'
import TextItem from '../text/TextItem'

type SvgStyleEntry = {
    type: string
    property: string
    attribute: string
    toSVG: { [key: string]: string | boolean }
    fromSVG: { [key: string]: string | boolean }
    exportFilter: () => void
    get: string
    set: string
}

type SvgStyleProps = {
    fillColor: SvgStyleEntry
    fillRule: SvgStyleEntry
    strokeColor: SvgStyleEntry
    strokeWidth: SvgStyleEntry
    strokeCap: SvgStyleEntry
    strokeJoin: SvgStyleEntry
    strokeScaling: SvgStyleEntry
    miterLimit: SvgStyleEntry
    dasharray: SvgStyleEntry
    dashOffset: SvgStyleEntry
    fontFamily: SvgStyleEntry
    fontWeight: SvgStyleEntry
    fontSize: SvgStyleEntry
    justification: SvgStyleEntry
    opacity: SvgStyleEntry
    blendMode: SvgStyleEntry
}

const SvgStyles = Base.each(
    {
        fillColor: ['fill', 'color'],
        fillRule: ['fill-rule', 'string'],
        strokeColor: ['stroke', 'color'],
        strokeWidth: ['stroke-width', 'number'],
        strokeCap: ['stroke-linecap', 'string'],
        strokeJoin: ['stroke-linejoin', 'string'],
        strokeScaling: [
            'vector-effect',
            'lookup',
            {
                true: 'none',
                false: 'non-scaling-stroke'
            },
            function (item: Item, value: boolean) {
                // no inheritance, only applies to graphical elements
                return (
                    !value &&
                    (item instanceof PathItem ||
                        item instanceof Shape ||
                        item instanceof TextItem)
                )
            }
        ],
        miterLimit: ['stroke-miterlimit', 'number'],
        dashArray: ['stroke-dasharray', 'array'],
        dashOffset: ['stroke-dashoffset', 'number'],
        fontFamily: ['font-family', 'string'],
        fontWeight: ['font-weight', 'string'],
        fontSize: ['font-size', 'number'],
        justification: [
            'text-anchor',
            'lookup',
            {
                left: 'start',
                center: 'middle',
                right: 'end'
            }
        ],
        opacity: ['opacity', 'number'],
        blendMode: ['mix-blend-mode', 'style']
    },
    function (this: any, entry, key) {
        const part = Base.capitalize(key)
        const lookup = entry[2]

        this[key] = {
            type: entry[1],
            property: key,
            attribute: entry[0],
            toSVG: lookup,
            fromSVG:
                lookup &&
                Base.each(
                    lookup,
                    function (this: any, value, name) {
                        this[value] = name
                    },
                    {}
                ),
            exportFilter: entry[3],
            get: 'get' + part,
            set: 'set' + part
        }
    },
    {}
)

export default SvgStyles as SvgStyleProps
