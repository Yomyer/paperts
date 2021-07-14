import Base from '../core/Base'
import Color from '../style/Color'
import Point from '../basic/Point'
import PaperScope from '../core/PaperScope'
import Size from '../basic/Size'
import Item from './Item'

export type HitResultTypes =
    | 'segment'
    | 'handle-in'
    | 'handle-out'
    | 'curve'
    | 'stroke'
    | 'fill'
    | 'bounds'
    | 'center'
    | 'pixel'
    | 'position'

export type HitResultName =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'left-center'
    | 'top-center'
    | 'right-center'
    | 'bottom- center'

export type HitResultOptions = {
    tolerance?: number
    type?: string
    class?: typeof Base
    match?: (hit: HitResult) => boolean
    fill?: boolean
    stroke?: boolean
    segment?: boolean
    curves?: boolean
    handles?: boolean
    ends?: boolean
    position?: boolean
    center?: boolean
    bounds?: boolean
    guides?: boolean
    selected?: boolean
    all?: HitResult[]
    _tolerancePadding?: Size
}

export default class HitResult extends Base {
    protected _class = 'HitResult'

    type: HitResultTypes
    item: Item
    name: HitResultName
    location: CurveLocation
    color: Color
    segment: Segment
    point: Point

    constructor(type: HitResultTypes, item: Item, values?: any)
    constructor(...args: any[]) {
        super(...args)
    }

    initialize(type: HitResultTypes, item: Item, values?: any) {
        this.type = type
        this.item = item

        if (values) this.inject(values)
    }

    static getOptions(args: HitResultOptions | any[]): HitResultOptions {
        const options = args && Base.read(args)
        return new Base(
            {
                type: null,
                tolerance: PaperScope.paper.settings.hitTolerance,
                fill: !options,
                stroke: !options,
                segments: !options,
                handles: false,
                ends: false,
                position: false,
                center: false,
                bounds: false,
                guides: false,
                selected: false
            },
            options
        ) as unknown as HitResultOptions
    }
}
