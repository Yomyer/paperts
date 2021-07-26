import {
    Base,
    PaperScope,
    Numerical,
    Point,
    Size,
    Matrix,
    LinkedSize,
    Item,
    Rectangle,
    BoundsOptions,
    CloneOptions,
    DrawOptions,
    ItemProps,
    ItemSerializeFields,
    Change,
    HitResult,
    HitResultOptions,
    Path
} from '@paperts'

import {
    Size as SizeType,
    Point as PointType,
    Rectangle as RectangleType
} from '../basic/Types'

export type ShapeTypes = 'rectangle' | 'circle' | 'ellipse'

export type ShapeSerializFields = ItemSerializeFields & {
    type?: ShapeTypes
    size?: null
    radius?: Size
}

export class Shape extends Item {
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

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(props?: ItemProps, point?: Point): this {
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

    /**
     * Creates a circular shape item.
     *
     * @name Shape.Circle
     * @param {Point} center the center point of the circle
     * @param {Number} radius the radius of the circle
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var shape = new Shape.Circle(new Point(80, 50), 30);
     * shape.strokeColor = 'black';
     */
    /**
     * Creates a circular shape item from the properties described by an
     * object literal.
     *
     * @name Shape.Circle
     * @param {Object} object an object containing properties describing the
     *     shape's attributes
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var shape = new Shape.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     strokeColor: 'black'
     * });
     */
    static get Circle(): {
        (pointX: PointType, pointY: PointType, radius: number): Shape
        (point: PointType, radius: number): Shape
        (object?: object): Shape
        new (pointX: PointType, pointY: PointType, radius: number): Shape
        new (point: PointType, radius: number): Shape
        new (object?: object): Shape
    } {
        return function (...args: any[]) {
            const center = Point.readNamed(args, 'center')
            const radius = Base.readNamed(args, 'radius')

            return Shape.createShape(
                'circle',
                center,
                new Size(+radius * 2),
                +radius,
                args
            )
        } as any
    }

    /**
     * Creates a rectangular shape item, with optionally rounded corners.
     *
     * @name Shape.Rectangle
     * @param {Rectangle} rectangle the rectangle object describing the
     * geometry of the rectangular shape to be created
     * @param {Size} [radius=null] the size of the rounded corners
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
     * var shape = new Shape.Rectangle(rectangle);
     * shape.strokeColor = 'black';
     *
     * @example {@paperscript} // The same, with rounder corners
     * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
     * var cornerSize = new Size(10, 10);
     * var shape = new Shape.Rectangle(rectangle, cornerSize);
     * shape.strokeColor = 'black';
     */
    /**
     * Creates a rectangular shape item from a point and a size object.
     *
     * @name Shape.Rectangle
     * @param {Point} point the rectangle's top-left corner.
     * @param {Size} size the rectangle's size.
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var point = new Point(20, 20);
     * var size = new Size(60, 60);
     * var shape = new Shape.Rectangle(point, size);
     * shape.strokeColor = 'black';
     */
    /**
     * Creates a rectangular shape item from the passed points. These do not
     * necessarily need to be the top left and bottom right corners, the
     * constructor figures out how to fit a rectangle between them.
     *
     * @name Shape.Rectangle
     * @param {Point} from the first point defining the rectangle
     * @param {Point} to the second point defining the rectangle
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var from = new Point(20, 20);
     * var to = new Point(80, 80);
     * var shape = new Shape.Rectangle(from, to);
     * shape.strokeColor = 'black';
     */
    /**
     * Creates a rectangular shape item from the properties described by an
     * object literal.
     *
     * @name Shape.Rectangle
     * @param {Object} object an object containing properties describing the
     *     shape's attributes
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var shape = new Shape.Rectangle({
     *     point: [20, 20],
     *     size: [60, 60],
     *     strokeColor: 'black'
     * });
     *
     * @example {@paperscript}
     * var shape = new Shape.Rectangle({
     *     from: [20, 20],
     *     to: [80, 80],
     *     strokeColor: 'black'
     * });
     *
     * @example {@paperscript}
     * var shape = new Shape.Rectangle({
     *     rectangle: {
     *         topLeft: [20, 20],
     *         bottomRight: [80, 80]
     *     },
     *     strokeColor: 'black'
     * });
     *
     * @example {@paperscript}
     * var shape = new Shape.Rectangle({
     *  topLeft: [20, 20],
     *     bottomRight: [80, 80],
     *     radius: 10,
     *     strokeColor: 'black'
     * });
     */

    static get Rectangle(): {
        (rectangle: RectangleType, radius: SizeType): Shape
        (
            pointX: number,
            pointY: number,
            sizeWidth: number,
            sizeHeight: number
        ): Shape
        (point: PointType, size: SizeType): Shape
        (fromt: PointType, to: PointType): Shape
        (object?: object): Shape
        new (rectangle: RectangleType, radius: SizeType): Shape
        new (
            pointX: number,
            pointY: number,
            sizeWidth: number,
            sizeHeight: number
        ): Shape
        new (point: PointType, size: SizeType): Shape
        new (fromt: PointType, to: PointType): Shape
        new (object?: object): Shape
    } {
        return function (...args: any[]) {
            const rect = Rectangle.readNamed(args, 'rectangle')
            const radius = Size.min(
                Size.readNamed(args, 'radius'),
                rect.getSize(true).divide(2)
            )
            return Shape.createShape(
                'rectangle',
                rect.getCenter(true),
                rect.getSize(true),
                radius,
                args
            )
        } as any
    }

    /**
     * Creates an elliptical shape item.
     *
     * @name Shape.Ellipse
     * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
     * var shape = new Shape.Ellipse(rectangle);
     * shape.fillColor = 'black';
     */
    /**
     * Creates an elliptical shape item from the properties described by an
     * object literal.
     *
     * @name Shape.Ellipse
     * @param {Object} object an object containing properties describing the
     *     shape's attributes
     * @return {Shape} the newly created shape
     *
     * @example {@paperscript}
     * var shape = new Shape.Ellipse({
     *     point: [20, 20],
     *     size: [180, 60],
     *     fillColor: 'black'
     * });
     *
     * @example {@paperscript} // Placing by center and radius
     * var shape = new Shape.Ellipse({
     *     center: [110, 50],
     *     radius: [90, 30],
     *     fillColor: 'black'
     * });
     */
    static get Ellipse(): {
        (rectangle: RectangleType, radius: SizeType): Shape
        (
            pointX: number,
            pointY: number,
            sizeWidth: number,
            sizeHeight: number
        ): Shape
        (point: PointType, size: SizeType): Shape
        (fromX: number, fromY: number, toX: number, toY: number): Shape
        (fromt: PointType, to: PointType): Shape
        (object?: object): Shape
        new (rectangle: RectangleType, radius: SizeType): Shape
        new (
            pointX: number,
            pointY: number,
            sizeWidth: number,
            sizeHeight: number
        ): Shape
        new (point: PointType, size: SizeType): Shape
        new (fromX: number, fromY: number, toX: number, toY: number): Shape
        new (fromt: PointType, to: PointType): Shape
        new (object?: object): Shape
    } {
        return function (...args: any[]) {
            const ellipse = Shape._readEllipse(args)
            const radius = ellipse.radius

            return Shape.createShape(
                'ellipse',
                ellipse.center,
                radius.multiply(2),
                radius,
                args
            )
        } as any
    }

    static _readEllipse(args: any[]) {
        let center, radius
        if (Base.hasNamed(args, 'radius')) {
            center = Point.readNamed(args, 'center')
            radius = Size.readNamed(args, 'radius')
        } else {
            const rect = Rectangle.readNamed(args, 'rectangle')
            center = rect.getCenter(true)
            radius = rect.getSize(true).divide(2)
        }
        return { center: center, radius: radius }
    }
}
