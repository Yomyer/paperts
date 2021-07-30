import {
    Matrix,
    Base,
    Item,
    DrawOptions,
    ItemSerializeFields,
    PathItem,
    PathSmoothOptions,
    Curve,
    Point,
    HitResult,
    HitResultOptions,
    Path
} from '../'

import { Point as PointType, Size as SizeType } from '../basic/Types'
export type CompoundPathSerializeFields = {
    children: Path[]
} & ItemSerializeFields

export class CompoundPath extends PathItem {
    protected _class = 'CompoundPath'
    protected _serializeFields: CompoundPathSerializeFields = {
        children: []
    }

    beans = true

    /**
     * Creates a new compound path item and places it in the active layer.
     *
     * @param {Path[]} [paths] the paths to place within the compound path
     *
     * @example {@paperscript}
     * // Create a circle shaped path with a hole in it:
     * const circle = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 30
     * });
     *
     * const innerCircle = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 10
     * });
     *
     * const compoundPath = new CompoundPath([circle, innerCircle]);
     * compoundPath.fillColor = 'red';
     *
     * // Move the inner circle 5pt to the right:
     * compoundPath.children[1].position.x += 5;
     */
    constructor(paths: Path[])

    /**
     * Creates a new compound path item from an object description and places it
     * at the top of the active layer.
     *
     * @name CompoundPath#initialize
     * @param {Object} object an object containing properties to be set on the
     *     path
     * @return {CompoundPath} the newly created path
     *
     * @example {@paperscript}
     * const path = new CompoundPath({
     *     children: [
     *         new Path.Circle({
     *             center: new Point(50, 50),
     *             radius: 30
     *         }),
     *         new Path.Circle({
     *             center: new Point(50, 50),
     *             radius: 10
     *         })
     *     ],
     *     fillColor: 'black',
     *     selected: true
     * });
     */
    constructor(object?: object)

    /**
     * Creates a new compound path item from SVG path-data and places it at the
     * top of the active layer.
     *
     * @name CompoundPath#initialize
     * @param {String} pathData the SVG path-data that describes the geometry
     * of this path
     * @return {CompoundPath} the newly created path
     *
     * @example {@paperscript}
     * const pathData = 'M20,50c0,-16.56854 13.43146,-30 30,-30c16.56854,0 30,13.43146 30,30c0,16.56854 -13.43146,30 -30,30c-16.56854,0 -30,-13.43146 -30,-30z M50,60c5.52285,0 10,-4.47715 10,-10c0,-5.52285 -4.47715,-10 -10,-10c-5.52285,0 -10,4.47715 -10,10c0,5.52285 4.47715,10 10,10z';
     * const path = new CompoundPath(pathData);
     * path.fillColor = 'black';
     */
    constructor(pathData: string)

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this._children = []
        this._namedChildren = {}
        if (!this._initialize(args[0])) {
            if (typeof args[0] === 'string') {
                this.setPathData(args[0])
            } else {
                this.addChildren(Array.isArray(args[0]) ? args[0] : args)
            }
        }

        return this
    }

    insertChildren(index: number, items: Array<Path | CompoundPath>) {
        let list = items
        const first = list[0]
        if (first && typeof first[0] === 'number')
            list = [list as unknown as Path | CompoundPath]

        for (let i = items.length - 1; i >= 0; i--) {
            const item = list[i]

            if (list === items && !(item instanceof Path))
                list = Base.slice(list)
            if (Array.isArray(item)) {
                list[i] = new Path({ segments: item, insert: false })
            } else if (item instanceof CompoundPath) {
                list.splice(i, 1, ...item.removeChildren())
                item.remove()
            }
        }
        return super.insertChildren(index, list)
    }

    reduce(options?: any): this {
        const children = this._children
        for (let i = children.length - 1; i >= 0; i--) {
            const path = children[i].reduce(options)
            if (path.isEmpty()) path.remove()
        }
        if (!children.length) {
            const path = new Path(Item.NO_INSERT)
            path.copyAttributes(this)
            path.insertAbove(this)
            this.remove()
            return path as unknown as this
        }
        return super.reduce()
    }

    /**
     * Specifies whether the compound-path is fully closed, meaning all its
     * contained sub-paths are closed path.
     *
     * @bean
     * @type Boolean
     * @see Path#closed
     */
    isClosed() {
        const children = this._children
        for (let i = 0, l = children.length; i < l; i++) {
            if (!children[i].closed) return false
        }
        return true
    }

    setClosed(closed: boolean) {
        const children = this._children
        for (let i = 0, l = children.length; i < l; i++) {
            children[i].setClosed(closed)
        }
    }

    getFirstChild(): Path {
        return super.getFirstChild() as Path
    }

    getLastChild(): Path {
        return super.getLastChild() as Path
    }

    /**
     * The first Segment contained within the compound-path, a short-cut to
     * calling {@link Path#firstSegment} on {@link Item#firstChild}.
     *
     * @bean
     * @type Segment
     */
    getFirstSegment() {
        const first = this.getFirstChild()
        return first && first.getFirstSegment()
    }

    /**
     * The last Segment contained within the compound-path, a short-cut to
     * calling {@link Path#lastSegment} on {@link Item#lastChild}.
     *
     * @bean
     * @type Segment
     */
    getLastSegment() {
        const last = this.getLastChild()
        return last && last.getLastSegment()
    }

    /**
     * All the curves contained within the compound-path, from all its child
     * {@link Path} items.
     *
     * @bean
     * @type Curve[]
     */
    getCurves() {
        const children = this._children
        const curves: Curve[] = []
        for (let i = 0, l = children.length; i < l; i++) {
            Base.push(curves, children[i].getCurves())
        }
        return curves
    }

    /**
     * The first Curve contained within the compound-path, a short-cut to
     * calling {@link Path#firstCurve} on {@link Item#firstChild}.
     *
     * @bean
     * @type Curve
     */
    getFirstCurve() {
        const first = this.getFirstChild()
        return first && first.getFirstCurve()
    }

    /**
     * The last Curve contained within the compound-path, a short-cut to
     * calling {@link Path#lastCurve} on {@link Item#lastChild}.
     *
     * @bean
     * @type Curve
     */
    getLastCurve() {
        const last = this.getLastChild()
        return last && last.getLastCurve()
    }

    /**
     * The area that the compound-path's geometry is covering, calculated by
     * getting the {@link Path#area} of each sub-path and it adding up.
     * Note that self-intersecting paths and sub-paths of different orientation
     * can result in areas that cancel each other out.
     *
     * @bean
     * @type Number
     */
    getArea() {
        const children = this._children
        let area = 0
        for (let i = 0, l = children.length; i < l; i++)
            area += children[i].getArea()
        return area
    }

    /**
     * The total length of all sub-paths in this compound-path, calculated by
     * getting the {@link Path#length} of each sub-path and it adding up.
     *
     * @bean
     * @type Number
     */
    getLength() {
        const children = this._children
        let length = 0
        for (let i = 0, l = children.length; i < l; i++)
            length += children[i].getLength()
        return length
    }

    getPathData(_matrix?: Matrix, _precision?: number) {
        const children = this._children
        const paths: string[] = []
        for (let i = 0, l = children.length; i < l; i++) {
            const child = children[i]
            const mx = child.matrix
            paths.push(
                child.getPathData(
                    _matrix && !mx.isIdentity()
                        ? _matrix.appended(mx)
                        : _matrix,
                    _precision
                )
            )
        }
        return paths.join('')
    }

    _hitTestChildren(
        point: Point,
        options: HitResultOptions,
        viewMatrix?: Matrix
    ): HitResult {
        return super._hitTestChildren(
            point,

            options.class === Path || options.type === 'path'
                ? options
                : Base.set({}, options, { fill: false }),
            viewMatrix
        )
    }

    _draw(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        viewMatrix?: Matrix,
        strokeMatrix?: Matrix
    ) {
        const children = this._children

        if (!children.length) return

        param = { ...param, dontStart: true, dontFinish: true }
        ctx.beginPath()
        for (let i = 0, l = children.length; i < l; i++)
            children[i].draw(ctx, param, strokeMatrix)

        if (!param.clip) {
            this._setStyles(ctx, param, viewMatrix)
            const style = this._style
            if (style.hasFill()) {
                ctx.fill(style.getFillRule())
                ctx.shadowColor = 'rgba(0,0,0,0)'
            }
            if (style.hasStroke()) ctx.stroke()
        }
    }

    _drawSelected(
        ctx: CanvasRenderingContext2D,
        matrix: Matrix,
        selectionItems?: Record<string, Path>
    ) {
        const children = this._children
        for (let i = 0, l = children.length; i < l; i++) {
            const child = children[i]
            const mx = child.matrix

            if (!selectionItems[child.id]) {
                child._drawSelected(
                    ctx,
                    mx.isIdentity() ? matrix : matrix.appended(mx)
                )
            }
        }
    }

    private getCurrentPath(that: CompoundPath, check?: boolean): Path {
        const children = that._children
        if (check && !children.length)
            throw new Error('Use a moveTo() command first')
        return children[children.length - 1]
    }

    /**
     * Adds a straight curve to the path, from the the last segment in the path
     * to the specified point.
     *
     * @name PathItem#lineTo
     * @function
     *
     * @param {Point} point the destination point of the newly added straight
     *     curve
     */
    lineTo(x: number, y: number): void
    lineTo(point: PointType): void
    lineTo(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.lineTo(...args)
    }

    /**
     * Adds a cubic bezier curve to the path, from the last segment to the
     * specified destination point, with the curve itself defined by two
     * specified handles.
     *
     * @name PathItem#cubicCurveTo
     * @function
     *
     * @param {Point} handle1 the location of the first handle of the newly
     *     added curve in absolute coordinates, out of which the relative values
     *     for {@link Segment#handleOut} of its first segment are calculated
     * @param {Point} handle2 the location of the second handle of the newly
     *     added curve in absolute coordinates, out of which the relative values
     *     for {@link Segment#handleIn} of its second segment are calculated
     * @param {Point} to the destination point of the newly added curve
     */
    cubicCurveTo(
        handle1X: number,
        handle1Y: number,
        handle2X: number,
        handle2Y: number,
        toX: number,
        toY: number
    ): void

    cubicCurveTo(handle1: PointType, handle2: PointType, to: PointType): void
    cubicCurveTo(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.cubicCurveTo(...args)
    }

    /**
     * Adds a quadratic bezier curve to the path, from the last segment to the
     * specified destination point, with the curve itself defined by the
     * specified handle.
     *
     * Note that Paper.js only stores cubic curves, so the handle is actually
     * converted.
     *
     * @name PathItem#quadraticCurveTo
     * @function
     *
     * @param {Point} handle the location of the handle of the newly added
     *     quadratic curve in absolute coordinates, out of which the relative
     *     values for {@link Segment#handleOut} of the resulting cubic curve's
     *     first segment and {@link Segment#handleIn} of its second segment are
     *     calculated
     * @param {Point} to the destination point of the newly added curve
     */
    quadraticCurveTo(
        handleX: number,
        handleY: number,
        toX: number,
        toY: number
    ): void

    quadraticCurveTo(handle: PointType, to: PointType): void
    quadraticCurveTo(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.quadraticCurveTo(...args)
    }

    /**
     * Adds a curve from the last segment in the path through the specified
     * `through` point, to the specified destination point by adding one segment
     * to the path.
     *
     * @name PathItem#curveTo
     * @function
     *
     * @param {Point} through the point through which the curve should pass
     * @param {Point} to the destination point of the newly added curve
     * @param {Number} [time=0.5] the curve-time parameter at which the
     *     `through` point is to be located
     *
     * @example {@paperscript height=300}
     * // Interactive example. Move your mouse around the view below:
     *
     * var myPath;
     * function onMouseMove(event) {
     *     // If we created a path before, remove it:
     *     if (myPath) {
     *         myPath.remove();
     *     }
     *
     *     // Create a new path and add a segment point to it
     *     // at {x: 150, y: 150):
     *     myPath = new Path();
     *     myPath.add(150, 150);
     *
     *     // Draw a curve through the position of the mouse to 'toPoint'
     *     var toPoint = new Point(350, 150);
     *     myPath.curveTo(event.point, toPoint);
     *
     *     // Select the path, so we can see its segments:
     *     myPath.selected = true;
     * }
     */
    curveTo(
        throughX: number,
        throughY: number,
        toX: number,
        toY: number,
        time?: number
    ): void

    curveTo(through: PointType, to: PointType, time?: number): void
    curveTo(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.curveTo(...args)
    }

    /**
     * Adds an arc from the position of the last segment in the path, passing
     * through the specified `through` point, to the specified `to` point, by
     * adding one or more segments to the path.
     *
     * @name PathItem#arcTo
     * @function
     *
     * @param {Point} through the point where the arc should pass through
     * @param {Point} to the point where the arc should end
     *
     * @example {@paperscript}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * var firstPoint = new Point(30, 75);
     * path.add(firstPoint);
     *
     * // The point through which we will create the arc:
     * var throughPoint = new Point(40, 40);
     *
     * // The point at which the arc will end:
     * var toPoint = new Point(130, 75);
     *
     * // Draw an arc through 'throughPoint' to 'toPoint'
     * path.arcTo(throughPoint, toPoint);
     *
     * // Add a red circle shaped path at the position of 'throughPoint':
     * var circle = new Path.Circle(throughPoint, 3);
     * circle.fillColor = 'red';
     *
     * @example {@paperscript height=300}
     * // Interactive example. Click and drag in the view below:
     *
     * var myPath;
     * function onMouseDrag(event) {
     *     // If we created a path before, remove it:
     *     if (myPath) {
     *         myPath.remove();
     *     }
     *
     *     // Create a new path and add a segment point to it
     *     // at {x: 150, y: 150):
     *     myPath = new Path();
     *     myPath.add(150, 150);
     *
     *     // Draw an arc through the position of the mouse to 'toPoint'
     *     var toPoint = new Point(350, 150);
     *     myPath.arcTo(event.point, toPoint);
     *
     *     // Select the path, so we can see its segments:
     *     myPath.selected = true;
     * }
     *
     * // When the mouse is released, deselect the path
     * // and fill it with black.
     * function onMouseUp(event) {
     *     myPath.selected = false;
     *     myPath.fillColor = 'black';
     * }
     */
    arcTo(throughX: number, throughY: number, toX: number, toY: number): void
    arcTo(through: PointType, to: PointType): void

    /**
     * Adds an arc from the position of the last segment in the path to
     * the specified point, by adding one or more segments to the path.
     *
     * @name PathItem#arcTo
     * @function
     *
     * @param {Point} to the point where the arc should end
     * @param {Boolean} [clockwise=true] specifies whether the arc should be
     *     drawn in clockwise direction
     *
     * @example {@paperscript}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * path.add(new Point(30, 75));
     * path.arcTo(new Point(130, 75));
     *
     * var path2 = new Path();
     * path2.strokeColor = 'red';
     * path2.add(new Point(180, 25));
     *
     * // To draw an arc in anticlockwise direction,
     * // we pass `false` as the second argument to arcTo:
     * path2.arcTo(new Point(280, 25), false);
     *
     * @example {@paperscript height=300}
     * // Interactive example. Click and drag in the view below:
     * var myPath;
     *
     * // The mouse has to move at least 20 points before
     * // the next mouse drag event is fired:
     * tool.minDistance = 20;
     *
     * // When the user clicks, create a new path and add
     * // the current mouse position to it as its first segment:
     * function onMouseDown(event) {
     *     myPath = new Path();
     *     myPath.strokeColor = 'black';
     *     myPath.add(event.point);
     * }
     *
     * // On each mouse drag event, draw an arc to the current
     * // position of the mouse:
     * function onMouseDrag(event) {
     *     myPath.arcTo(event.point);
     * }
     */
    arcTo(toX: number, toY: number, clockwise?: boolean): void
    arcTo(to: PointType, clockwise?: boolean): void

    arcTo(
        toX: number,
        toY: number,
        radiusWidth: number,
        radiusHeight: number,
        rotation: number,
        clockwise?: boolean,
        large?: number
    ): void

    arcTo(
        to: PointType,
        radius: SizeType,
        rotation: number,
        clockwise?: number,
        large?: number
    ): void

    arcTo(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.arcTo(...args)
    }

    /**
     * Adds a straight curve to the path, from the the last segment in the path
     * to the `to` vector specified relatively to it.
     *
     * @name PathItem#lineBy
     * @function
     *
     * @param {Point} point the vector describing the destination of the newly
     *     added straight curve
     *
     * @example {@paperscript}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * // Add a segment at {x: 50, y: 50}
     * path.add(25, 25);
     *
     * // Add a segment relative to the last segment of the path.
     * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
     * path.lineBy(50, 0);
     *
     * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
     * path.lineBy(0, 50);
     *
     * @example {@paperscript height=300}
     * // Drawing a spiral using lineBy:
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * // Add the first segment at {x: 50, y: 50}
     * path.add(view.center);
     *
     * // Loop 500 times:
     * for (var i = 0; i < 500; i++) {
     *     // Create a vector with an ever increasing length
     *     // and an angle in increments of 45 degrees
     *     var vector = new Point({
     *         angle: i * 45,
     *         length: i / 2
     *     });
     *     // Add the vector relatively to the last segment point:
     *     path.lineBy(vector);
     * }
     *
     * // Smooth the handles of the path:
     * path.smooth();
     *
     * // Uncomment the following line and click on 'run' to see
     * // the construction of the path:
     * // path.selected = true;
     */
    lineBy(x: number, y: number): void
    lineBy(point: PointType): void
    lineBy(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.lineBy(...args)
    }

    /**
     * Adds a cubic bezier curve to the path, from the last segment to the
     * to the specified `to` vector, with the curve itself defined by two
     * specified handles.
     *
     * @name PathItem#cubicCurveBy
     * @function
     *
     * @param {Point} handle1 the location of the first handle of the newly
     *     added curve
     * @param {Point} handle2 the location of the second handle of the newly
     *     added curve
     * @param {Point} to the destination point of the newly added curve
     */
    cubicCurveBy(
        handle1X: number,
        handle1Y: number,
        handle2X: number,
        handle2Y: number,
        toX: number,
        toY: number
    ): void

    cubicCurveBy(handle1: PointType, handle2: PointType, to: PointType): void
    cubicCurveBy(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.cubicCurveBy(...args)
    }

    /**
     * Adds a quadratic bezier curve to the path, from the last segment to the
     * specified destination point, with the curve itself defined by the
     * specified handle.
     *
     * Note that Paper.js only stores cubic curves, so the handle is actually
     * converted.
     *
     * @name PathItem#quadraticCurveBy
     * @function
     *
     * @param {Point} handle the handle of the newly added quadratic curve out
     *     of which the values for {@link Segment#handleOut} of the resulting
     *     cubic curve's first segment and {@link Segment#handleIn} of its
     *     second segment are calculated
     * @param {Point} to the destination point of the newly added curve
     */
    quadraticCurveBy(
        throughX: number,
        throughY: number,
        toX: number,
        toY: number
    ): void

    quadraticCurveBy(through: PointType, to: PointType): void
    quadraticCurveBy(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.quadraticCurveBy(...args)
    }

    /**
     * Adds a curve from the last segment in the path through the specified
     * `through` vector, to the specified `to` vector, all specified relatively
     * to it by these given vectors, by adding one segment to the path.
     *
     * @name PathItem#curveBy
     * @function
     *
     * @param {Point} through the vector through which the curve should pass
     * @param {Point} to the destination vector of the newly added curve
     * @param {Number} [time=0.5] the curve-time parameter at which the
     *     `through` point is to be located
     */
    curveBy(
        throughX: number,
        throughY: number,
        toX: number,
        toY: number,
        time?: number
    ): void

    curveBy(through: PointType, to: PointType, time?: number): void
    curveBy(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.curveBy(...args)
    }

    /**
     * Adds an arc from the position of the last segment in the path, passing
     * through the specified `through` vector, to the specified `to` vector, all
     * specified relatively to it by these given vectors, by adding one or more
     * segments to the path.
     *
     * @name PathItem#arcBy
     * @function
     *
     * @param {Point} through the vector where the arc should pass through
     * @param {Point} to the vector where the arc should end
     */
    arcBy(throughX: number, throughY: number, toX: number, toY: number): void
    arcBy(through: PointType, to: PointType): void

    /**
     * Adds an arc from the position of the last segment in the path to the `to`
     * vector specified relatively to it, by adding one or more segments to the
     * path.
     *
     * @name PathItem#arcBy
     * @function
     *
     * @param {Point} to the vector where the arc should end
     * @param {Boolean} [clockwise=true] specifies whether the arc should be
     *     drawn in clockwise direction
     */
    arcBy(x: number, y: number, clockwise: boolean): void
    arcBy(point: PointType, clockwise: boolean): void
    arcBy(...args: any[]): void {
        const path = this.getCurrentPath(this, true)
        path.arcBy(...args)
    }

    /**
     * {@grouptitle Postscript Style Drawing Commands}
     *
     * On a normal empty {@link Path}, the point is simply added as the path's
     * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
     * created as a child and the point is added as its first segment.
     *
     * @name PathItem#moveTo
     * @function
     *
     * @param {Point} point the point in which to start the path
     */
    moveTo(x: number, y: number): void
    moveTo(point: PointType): void
    moveTo(...args: any[]): void {
        const current = this.getCurrentPath(this)
        const path =
            current && current.isEmpty() ? current : new Path(Item.NO_INSERT)
        if (path !== current) this.addChild(path)
        path.moveTo(...args)
    }

    /**
     * {@grouptitle Relative Drawing Commands}
     *
     * If called on a {@link CompoundPath}, a new {@link Path} is created as a
     * child and a point is added as its first segment relative to the position
     * of the last segment of the current path.
     *
     * @name PathItem#moveBy
     * @function
     *
     * @param {Point} to
     */
    moveBy(toX: number, toY: number): void
    moveBy(to: PointType): void
    moveBy(...args: any[]): void {
        const current = this.getCurrentPath(this, true)
        const last = current && current.getLastSegment()
        const point = Point.read(args)
        this.moveTo(last ? point.add(last.point) : point)
    }

    /**
     * Closes the path. When closed, Paper.js connects the first and last
     * segment of the path with an additional curve. The difference to setting
     * {@link Path#closed} to `true` is that this will also merge the first
     * segment with the last if they lie in the same location.
     *
     * @name PathItem#closePath
     * @function
     *
     * @see Path#closed
     */
    closePath(tolerance?: number): void {
        this.getCurrentPath(this, true).closePath(tolerance)
    }

    /**
     * {@grouptitle Path Manipulation}
     *
     * Reverses the orientation of the path item. When called on
     * {@link CompoundPath} items, each of the nested paths is reversed. On
     * {@link Path} items, the sequence of {@link Path#segments} is reversed.
     *
     * @name PathItem#reverse
     * @function
     */
    reverse(): void {
        const children = this._children
        for (let i = 0, l = children.length; i < l; i++) {
            children[i].reverse()
        }
    }

    /**
     * Flattens the curves in path items to a sequence of straight lines, by
     * subdividing them enough times until the specified maximum error is met.
     *
     * @name PathItem#flatten
     * @function
     *
     * @param {Number} [flatness=0.25] the maximum error between the flattened
     *     lines and the original curves
     *
     * @example {@paperscript}
     * // Flattening a circle shaped path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Select the path, so we can inspect its segments:
     * path.selected = true;
     *
     * // Create a copy of the path and move it by 150 points:
     * var copy = path.clone();
     * copy.position.x += 150;
     *
     * // Flatten the copied path, with a maximum error of 4 points:
     * copy.flatten(4);
     */
    flatten(flatness = 0.25): void {
        const children = this._children

        for (let i = 0, l = children.length; i < l; i++) {
            children[i].flatten(flatness)
        }
    }

    /**
     * Fits a sequence of as few curves as possible through the path's anchor
     * points, ignoring the path items's curve-handles, with an allowed maximum
     * error. When called on {@link CompoundPath} items, each of the nested
     * paths is simplified. On {@link Path} items, the {@link Path#segments}
     * array is processed and replaced by the resulting sequence of fitted
     * curves.
     *
     * This method can be used to process and simplify the point data received
     * from a mouse or touch device.
     *
     * @name PathItem#simplify
     * @function
     *
     * @param {Number} [tolerance=2.5] the allowed maximum error when fitting
     *     the curves through the segment points
     * @return {Boolean} {@true if the method was capable of fitting curves
     *     through the path's segment points}
     *
     * @example {@paperscript height=300}
     * // Click and drag below to draw to draw a line, when you release the
     * // mouse, the is made smooth using path.simplify():
     *
     * var path;
     * function onMouseDown(event) {
     *     // If we already made a path before, deselect it:
     *     if (path) {
     *         path.selected = false;
     *     }
     *
     *     // Create a new path and add the position of the mouse
     *     // as its first segment. Select it, so we can see the
     *     // segment points:
     *     path = new Path({
     *         segments: [event.point],
     *         strokeColor: 'black',
     *         selected: true
     *     });
     * }
     *
     * function onMouseDrag(event) {
     *     // On every drag event, add a segment to the path
     *     // at the position of the mouse:
     *     path.add(event.point);
     * }
     *
     * function onMouseUp(event) {
     *     // When the mouse is released, simplify the path:
     *     path.simplify();
     *     path.selected = true;
     * }
     */
    simplify(tolerance = 0.5): boolean {
        const children = this._children
        let res: boolean
        for (let i = 0, l = children.length; i < l; i++) {
            res = children[i].simplify(tolerance) || res
        }
        return res
    }

    /**
     * Smooths the path item without changing the amount of segments in the path
     * or moving the segments' locations, by smoothing and adjusting the angle
     * and length of the segments' handles based on the position and distance of
     * neighboring segments.
     *
     * Smoothing works both for open paths and closed paths, and can be applied
     * to the full path, as well as a sub-range of it. If a range is defined
     * using the `options.from` and `options.to` properties, only the curve
     * handles inside that range are touched. If one or both limits of the range
     * are specified in negative indices, the indices are wrapped around the end
     * of the curve. That way, a smoothing range in a close path can even wrap
     * around the connection between the last and the first segment.
     *
     * Four different smoothing methods are available:
     *
     * - `'continuous'` smooths the path item by adjusting its curve handles so
     *     that the first and second derivatives of all involved curves are
     *     continuous across their boundaries.
     *
     *     This method tends to result in the smoothest results, but does not
     *     allow for further parametrization of the handles.
     *
     * - `'asymmetric'` is based on the same principle as `'continuous'` but
     *     uses different factors so that the result is asymmetric. This used to
     *     the only method available until v0.10.0, and is currently still the
     *     default when no method is specified, for reasons of backward
     *     compatibility. It will eventually be removed.
     *
     * - `'catmull-rom'` uses the Catmull-Rom spline to smooth the segment.
     *
     *     The optionally passed factor controls the knot parametrization of the
     *     algorithm:
     *
     *     - `0.0`: the standard, uniform Catmull-Rom spline
     *     - `0.5`: the centripetal Catmull-Rom spline, guaranteeing no
     *         self-intersections
     *     - `1.0`: the chordal Catmull-Rom spline
     *
     * - `'geometric'` use a simple heuristic and empiric geometric method to
     *     smooth the segment's handles. The handles were weighted, meaning that
     *     big differences in distances between the segments will lead to
     *     probably undesired results.
     *
     *     The optionally passed factor defines the tension parameter (`0...1`),
     *     controlling the amount of smoothing as a factor by which to scale
     *     each handle.
     *
     * @name PathItem#smooth
     * @function
     *
     * @option [options.type='asymmetric'] {String} the type of smoothing
     *     method: {@values 'continuous', 'asymmetric', 'catmull-rom',
     *     'geometric'}
     * @option options.factor {Number} the factor parameterizing the smoothing
     *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
     * @option options.from {Number|Segment|Curve} the segment or curve at which
     *     to start smoothing, if not the full path shall be smoothed
     *     (inclusive). This can either be a segment index, or a segment or
     *     curve object that is part of the path. If the passed number is
     *     negative, the index is wrapped around the end of the path.
     * @option options.to {Number|Segment|Curve} the segment or curve to which
     *     the handles of the path shall be processed (inclusive). This can
     *     either be a segment index, or a segment or curve object that is part
     *     of the path. If the passed number is negative, the index is wrapped
     *     around the end of the path.
     *
     * @param {Object} [options] the smoothing options
     * @see Segment#smooth([options])
     *
     * @example {@paperscript}
     * // Smoothing a closed shape:
     *
     * // Create a rectangular path with its top-left point at
     * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
     * var path = new Path.Rectangle({
     *     point: [30, 25],
     *     size: [50, 50],
     *     strokeColor: 'black',
     * });
     *
     * // Select the path, so we can see its handles:
     * path.fullySelected = true;
     *
     * // Create a copy of the path and move it 100 to the right:
     * var copy = path.clone();
     * copy.position.x += 100;
     *
     * // Smooth the segments of the copy:
     * copy.smooth({ type: 'continuous' });
     *
     * @example {@paperscript height=220}
     * var path = new Path();
     * path.strokeColor = 'black';
     *
     * path.add(new Point(30, 50));
     *
     * var y = 5;
     * var x = 3;
     *
     * for (var i = 0; i < 28; i++) {
     *     y *= -1.1;
     *     x *= 1.1;
     *     path.lineBy(x, y);
     * }
     *
     * // Create a copy of the path and move it 100 down:
     * var copy = path.clone();
     * copy.position.y += 120;
     *
     * // Select the path, so we can see its handles:
     * copy.fullySelected = true;
     *
     * // Smooth the path using centripetal Catmull-Rom splines:
     * copy.smooth({ type: 'catmull-rom', factor: 0.5 });
     *
     * @example {@paperscript height=110}
     * // Smoothing ranges of paths, using segments, curves or indices:
     *
     * // Create 5 rectangles, next to each other:
     * var paths = [];
     * for (var i = 0; i < 5; i++) {
     *     paths.push(new Path.Rectangle({
     *         point: [30 + i * 100, 30],
     *         size: [50, 50],
     *         fullySelected: true
     *     }));
     * }
     * // Smooth a range, using segments:
     * paths[1].smooth({
     *     type: 'continuous',
     *     from: paths[1].segments[0],
     *     to: paths[1].segments[2]
     * });
     *
     * // Smooth a range, using curves:
     * paths[2].smooth({
     *     type: 'continuous',
     *     from: paths[2].curves[0],
     *     to: paths[2].curves[1]
     * });
     *
     * // Smooth a range, using indices:
     * paths[3].smooth({ type: 'continuous', from: 0, to: 2 });
     *
     * // Smooth a range, using negative indices:
     * paths[4].smooth({ type: 'continuous', from: -1, to: 1 });
     */
    smooth(options?: PathSmoothOptions): void {
        const children = this._children

        for (let i = 0, l = children.length; i < l; i++) {
            children[i].smooth(options)
        }
    }
}
