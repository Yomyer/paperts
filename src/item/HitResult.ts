import {
    Base,
    PaperScope,
    Color,
    Point,
    Size,
    Item,
    CurveLocation,
    Segment
} from '@paperts'

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
    segments?: boolean
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

export class HitResult extends Base {
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
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]) {
        this.type = args[0]
        this.item = args[1]

        if (args[2]) this.inject(args[2])
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
