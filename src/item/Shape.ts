import Point from '../basic/Point'
import Size from '../basic/Size'
import Base from '../core/Base'
import Item, {
    BoundsOptions,
    CloneOptions,
    DrawOptions,
    ItemProps,
    ItemSerializeFields
} from './Item'
import LinkedSize from '../../dist/basic/LinkedSize.d'
import { Size as SizeType } from '../basic/Types'
import { Change } from './ChangeFlag'
import PaperScope from '../../dist/core/PaperScope'
import Matrix from '../basic/Matrix'
import Rectangle from '../basic/Rectangle'
import { Numerical } from '../utils'
import HitResult, { HitResultOptions } from './HitResult'
import Shape from './Shape'

export type ShapeTypes = 'rectangle' | 'circle' | 'ellipse'

export type ShapeSerializFields = ItemSerializeFields & {
    type?: ShapeTypes
    size?: null
    radius?: Size
}

export default class Shape extends Item {
    protected _class = 'Shape'
    protected _applyMatrix = false
    protected _canApplyMatrix = false
    protected _canScaleStroke = true
    protected _serializeFields: ShapeSerializFields = {
        type: null,
        size: null,
        radius: null
    }

    protected _type: ShapeTypes
    protected _size: Size
    protected _radius: Size

    initialize(props: ItemProps, point?: Point): this {
        this._initialize(props, point)

        return this
    }

    protected _equals(item: Shape) {
        return (
            this._type === item._type &&
            this._size.equals(item._size) &&
            Base.equals(this._radius, item._radius)
        )
    }

    copyContent(source: Shape) {
        this.setType(source._type)
        this.setSize(source._size)
        this.setRadius(source._radius)
    }

    /**
     * The type of shape of the item as a string.
     *
     * @bean
     * @type String
     * @values 'rectangle', 'circle', 'ellipse'
     */
    getType() {
        return this._type
    }

    setType(type: ShapeTypes) {
        this._type = type
    }

    get type() {
        return this.getType()
    }

    set type(type: ShapeTypes) {
        this.setType(type)
    }

    /**
     * The size of the shape.
     *
     * @bean
     * @type Size
     */
    getSize() {
        const size = this._size
        return new LinkedSize(size.width, size.height, this, 'setSize')
    }

    setSize(width: number, height: number): void
    setSize(size: SizeType): void
    setSize(...args: any[]): void {
        const size = Size.read(args)
        if (!this._size) {
            this._size = size.clone()
        } else if (!this._size.equals(size)) {
            const type = this._type
            let width = size.width
            let height = size.height
            if (type === 'rectangle') {
                this._radius = Size.min(this._radius, size.divide(2).abs())
            } else if (type === 'circle') {
                width = height = (width + height) / 2
                this._radius = new Size(width / 2)
            } else if (type === 'ellipse') {
                this._radius = new Size(width / 2, height / 2)
            }
            this._size.set(width, height)
            this._changed(Change.GEOMETRY)
        }
    }

    get size() {
        return this.getSize()
    }

    set size(size: SizeType) {
        this.setSize(size)
    }

    /**
     * The radius of the shape, as a number if it is a circle, or a size object
     * for ellipses and rounded rectangles.
     *
     * @bean
     * @type Number|Size
     */
    getRadius(): number | Size {
        const rad = this._radius
        return this._type === 'circle'
            ? rad.width
            : (new LinkedSize(
                  rad.width,
                  rad.height,
                  this,
                  'setRadius'
              ) as unknown as Size)
    }

    setRadius(width: number, height: number): void
    setRadius(radius: SizeType): void
    setRadius(...args: any[]): void {
        let radius = args[0]
        const type = this._type
        if (type === 'circle' && radius instanceof Size) {
            if (radius === this._radius) return
            const size = +radius * 2
            this._radius = radius
            this._size.set(size, size)
        } else {
            radius = Size.read(args)
            if (!this._radius) {
                this._radius = radius.clone()
            } else {
                if (this._radius.equals(radius)) return
                this._radius.set(radius)
                if (type === 'rectangle') {
                    const size = Size.max(this._size, radius.multiply(2))
                    this._size.set(size)
                } else if (type === 'ellipse') {
                    this._size.set(radius.width * 2, radius.height * 2)
                }
            }
        }
        this._changed(Change.GEOMETRY)
    }

    get radius() {
        return this.getRadius()
    }

    set radius(radius: SizeType) {
        this.setRadius(radius)
    }

    isEmpty() {
        return false
    }

    /**
     * Creates a new path item with same geometry as this shape item, and
     * inherits all settings from it, similar to {@link Item#clone()}.
     *
     * @param {Boolean} [insert=true] specifies whether the new path should be
     *     inserted into the scene graph. When set to `true`, it is inserted
     *     above the shape item
     * @return {Path} the newly created path item with the same geometry as
     *     this shape item
     * @see Path#toShape(insert)
     */
    toPath(insert: boolean): Path {
        const paper = PaperScope.paper
        const path = new Path[Base.capitalize(this._type)]({
            center: new Point(),
            size: this._size,
            radius: this._radius,
            insert: false
        })
        path.copyAttributes(this)

        if (paper.settings.applyMatrix) path.setApplyMatrix(true)
        if (insert === undefined || insert) path.insertAbove(this)
        return path
    }

    toShape(options?: boolean | CloneOptions): Shape {
        return this.clone(options)
    }

    protected _asPathItem() {
        return this.toPath(false)
    }

    protected _draw(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        viewMatrix?: Matrix,
        strokeMatrix?: Matrix
    ) {
        const style = this._style
        const hasFill = style.hasFill()
        const hasStroke = style.hasStroke()
        const dontPaint = param.dontFinish || param.clip
        const untransformed = !strokeMatrix
        if (hasFill || hasStroke || dontPaint) {
            const type = this._type
            const radius = this._radius
            const isCircle = type === 'circle'
            if (!param.dontStart) ctx.beginPath()
            if (untransformed && isCircle) {
                ctx.arc(0, 0, +radius, 0, Math.PI * 2, true)
            } else {
                const rx = isCircle ? radius : radius.width
                const ry = isCircle ? radius : radius.height
                const size = this._size
                const width = size.width
                const height = size.height
                if (
                    untransformed &&
                    type === 'rectangle' &&
                    rx === 0 &&
                    ry === 0
                ) {
                    // Rectangles with no rounding
                    ctx.rect(-width / 2, -height / 2, width, height)
                } else {
                    // Round rectangles, ellipses, transformed circles
                    const x = width / 2
                    const y = height / 2
                    // Use 1 - KAPPA to calculate position of control points
                    // from the corners inwards.
                    const kappa = 1 - Numerical.KAPPA
                    const cx = +rx * kappa
                    const cy = +ry * kappa
                    // Build the coordinates list, so it can optionally be
                    // transformed by the strokeMatrix.
                    const c = [
                        -x,
                        -y + +ry,
                        -x,
                        -y + cy,
                        -x + cx,
                        -y,
                        -x + +rx,
                        -y,
                        x - +rx,
                        -y,
                        x - cx,
                        -y,
                        x,
                        -y + cy,
                        x,
                        -y + +ry,
                        x,
                        y - +ry,
                        x,
                        y - cy,
                        x - cx,
                        y,
                        x - +rx,
                        y,
                        -x + +rx,
                        y,
                        -x + cx,
                        y,
                        -x,
                        y - cy,
                        -x,
                        y - +ry
                    ]
                    if (strokeMatrix) strokeMatrix.transform(c, c, 32)
                    ctx.moveTo(c[0], c[1])
                    ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7])
                    if (x !== rx) ctx.lineTo(c[8], c[9])
                    ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15])
                    if (y !== ry) ctx.lineTo(c[16], c[17])
                    ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23])
                    if (x !== rx) ctx.lineTo(c[24], c[25])
                    ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31])
                }
            }
            ctx.closePath()
        }
        if (!dontPaint && (hasFill || hasStroke)) {
            this._setStyles(ctx, param, viewMatrix)
            if (hasFill) {
                ctx.fill(style.getFillRule())
                ctx.shadowColor = 'rgba(0,0,0,0)'
            }
            if (hasStroke) ctx.stroke()
        }
    }

    protected _canComposite() {
        return !(this.hasFill() && this.hasStroke())
    }

    protected _getBounds(matrix: Matrix, options: BoundsOptions) {
        let rect = new Rectangle(this._size).setCenter(0, 0)
        const style = this._style
        const strokeWidth =
            options.stroke && style.hasStroke() && style.getStrokeWidth()

        if (matrix) rect = matrix.transformBounds(rect)
        return strokeWidth
            ? rect.expand(
                  Path._getStrokePadding(
                      strokeWidth,
                      this._getStrokeMatrix(matrix, options)
                  )
              )
            : rect
    }

    private getCornerCenter(
        point: Point,
        expand?: number | Size
    ): { point: Point; quadrant: number } {
        const radius = this._radius
        if (!radius.isZero()) {
            const halfSize = this._size.divide(2)
            for (let q = 1; q <= 4; q++) {
                // Calculate the bounding boxes of the four quarter ellipses
                // that define the rounded rectangle, and hit-test these.
                // Setup `dir` to be in quadrant `q` (See Point#isInQuadrant()):
                const dir = new Point(q > 1 && q < 4 ? -1 : 1, q > 2 ? -1 : 1)
                const corner = dir.multiply(halfSize)
                const center = corner.subtract(dir.multiply(radius))
                const rect = new Rectangle(
                    expand ? corner.add(dir.multiply(expand)) : corner,
                    center
                )
                if (rect.contains(point)) return { point: center, quadrant: q }
            }
        }

        return null
    }

    private isOnEllipseStroke(
        point: Point,
        radius: number | Size,
        padding: number | Size,
        quadrant?: number
    ): boolean {
        const vector = point.divide(radius)

        return (
            (!quadrant || vector.isInQuadrant(quadrant)) &&
            vector.subtract(vector.normalize()).multiply(radius).divide(padding)
                .length <= 1
        )
    }

    protected _contains(point: Point) {
        if (this._type === 'rectangle') {
            const center = this.getCornerCenter(point)
            return center
                ? point
                      .subtract(center.point)
                      .divide(this._radius)
                      .getLength() <= 1
                : super._contains(point)
        } else {
            return point.divide(this.size).getLength() <= 0.5
        }
    }

    protected _hitTestSelf(
        point: Point,
        options: HitResultOptions,
        viewMatrix: Matrix,
        strokeMatrix: Matrix
    ) {
        let hit = false
        const style = this._style
        const hitStroke = options.stroke && style.hasStroke()
        const hitFill = options.fill && style.hasFill()

        if (hitStroke || hitFill) {
            const type = this._type
            const radius = this._radius
            const strokeRadius = hitStroke ? style.getStrokeWidth() / 2 : 0
            const strokePadding = options._tolerancePadding.add(
                Path._getStrokePadding(
                    strokeRadius,
                    !style.getStrokeScaling() && strokeMatrix
                )
            )
            if (type === 'rectangle') {
                const padding = strokePadding.multiply(2)
                const center = this.getCornerCenter(point, padding)
                if (center) {
                    hit = this.isOnEllipseStroke(
                        point.subtract(center.point),
                        radius,
                        strokePadding,
                        center.quadrant
                    )
                } else {
                    const rect = new Rectangle(this._size).setCenter(0, 0)
                    const outer = rect.expand(padding)
                    const inner = rect.expand(padding.negate())
                    hit =
                        outer.containsPoint(point) &&
                        !inner.containsPoint(point)
                }
            } else {
                hit = this.isOnEllipseStroke(point, radius, strokePadding)
            }
        }

        return hit
            ? new HitResult(hitStroke ? 'stroke' : 'fill', this)
            : super._hitTestSelf(point, options, viewMatrix, strokeMatrix)
    }

    private static createShape(
        type: ShapeTypes,
        point: Point,
        size: Size,
        radius: Size | number,
        args?: any
    ): Shape {
        const item = Base.create(Shape.prototype) as Shape
        item._type = type
        item._size = size
        item._radius = new Size(radius as Size)
        item._initialize(Base.getNamed(args), point)
        return item
    }

    static Circle: new (...args: any[]) => Shape = function (
        ...args: any[]
    ): Shape {
        const center = Point.readNamed(args, 'center')
        const radius = Base.readNamed(args, 'radius')
        return Shape.createShape(
            'circle',
            center,
            new Size(+radius * 2),
            +radius,
            args
        )
    } as unknown as new (...args: any[]) => Shape
}

const a = new Shape.Circle('dasda')
