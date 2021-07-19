import Base from '../core/Base'
import Point from '../basic/Point'
import Size from '../basic/Size'
import Item from '../item/Item'
import CompoundPath from './CompundPath'
import { Numerical } from '../utils'
import Options from '../options'
import CanvasProvider from '../canvas/CanvasProvider'
import Matrix from '../basic/Matrix'
import { Point as PointType, Size as SizeType } from '../basic/Types'
import { Change } from '../item'
import CollisionDetection from '../utils/CollisionDetection'
import Curve from './Curve'
import CurveLocation from './CurveLocation'

export type PathSmoothOptions = {
    type?: 'continuous' | 'asymmetric' | 'catmull-rom' | 'geometric'
    factor?: number
    from?: number
    to?: number
}

export type PathOperator = {
    unite?: { [key: string]: boolean }
    intersect?: { [key: string]: boolean }
    subtract?: { [key: string]: boolean }
    exclude?: { [key: string]: boolean }
    divide?: { [key: string]: boolean }
}

export type PathOperators = keyof PathOperator

export type PathOptions = {
    trace?: boolean
    stroke?: boolean
    insert?: boolean
}

export default abstract class PathItem extends Item {
    protected _class = 'PathItem'
    protected _selectBounds = false
    protected _canScaleStroke = true
    protected _children: Path[]
    protected _closed: boolean

    beans = true

    private min = Math.min
    private max = Math.max
    private abs = Math.abs

    private operators: PathOperator = {
        unite: { '1': true, '2': true },
        intersect: { '2': true },
        subtract: { '1': true },
        exclude: { '1': true, '-1': true }
    }

    initialize(): this {
        return this
    }

    /**
     * Creates a path item from the given SVG path-data, determining if the
     * data describes a plain path or a compound-path with multiple
     * sub-paths.
     *
     * @name PathItem.create
     * @function
     * @param {String} pathData the SVG path-data to parse
     * @return {Path|CompoundPath} the newly created path item
     */
    /**
     * Creates a path item from the given segments array, determining if the
     * array describes a plain path or a compound-path with multiple
     * sub-paths.
     *
     * @name PathItem.create
     * @function
     * @param {Number[][]} segments the segments array to parse
     * @return {Path|CompoundPath} the newly created path item
     */
    /**
     * Creates a path item from the given object, determining if the
     * contained information describes a plain path or a compound-path with
     * multiple sub-paths.
     *
     * @name PathItem.create
     * @function
     * @param {Object} object an object containing the properties describing
     *     the item to be created
     * @return {Path|CompoundPath} the newly created path item
     */
    static create(pathData: string): Path | CompoundPath
    static create(segments: number[][]): Path | CompoundPath
    static create(object: object): Path | CompoundPath
    static create(arg: any) {
        let data, segments, compound
        if (Base.isPlainObject(arg)) {
            segments = arg.segments
            data = arg.pathData
        } else if (Array.isArray(arg)) {
            segments = arg
        } else if (typeof arg === 'string') {
            data = arg
        }
        if (segments) {
            const first = segments[0]
            compound = first && Array.isArray(first[0])
        } else if (data) {
            compound =
                (data.match(/m/gi) || []).length > 1 || /z\s*\S+/i.test(data)
        }
        const Ctor = compound ? CompoundPath : Path
        return new Ctor(arg)
    }

    protected _asPathItem(): this {
        return this
    }

    /**
     * Specifies whether the path as a whole is oriented clock-wise, by looking
     * at the path's area.
     * Note that self-intersecting paths and sub-paths of different orientation
     * can result in areas that cancel each other out.
     *
     * @bean
     * @type Boolean
     * @see Path#area
     * @see CompoundPath#area
     */
    isClockwise() {
        return this.getArea() >= 0
    }

    getArea(): number {
        return 0
    }

    setClockwise(clockwise: boolean) {
        if (this.isClockwise() !== (clockwise = !!clockwise)) this.reverse()
    }

    /**
     * The path's geometry, formatted as SVG style path data.
     *
     * @name PathItem#getPathData
     * @bean
     * @type String
     */
    setPathData(data: string) {
        const parts = data && data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi)
        let relative = false
        let coords: string[]
        let previous
        let control
        let current = new Point()
        let start = new Point()

        function getCoord(index: number, coord: string) {
            let val = +coords[index]
            if (relative) val += current[coord]
            return val
        }

        function getPoint(index: number) {
            return new Point(getCoord(index, 'x'), getCoord(index + 1, 'y'))
        }

        this.clear()

        for (let i = 0, l = parts && parts.length; i < l; i++) {
            const part = parts[i]
            const command = part[0]
            const lower = command.toLowerCase()

            coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g)
            const length = coords && coords.length
            relative = command === lower

            if (previous === 'z' && !/[mz]/.test(lower)) this.moveTo(current)
            switch (lower) {
                case 'm':
                case 'l':
                    let move = lower === 'm'
                    for (let j = 0; j < length; j += 2) {
                        this[move ? 'moveTo' : 'lineTo'](
                            (current = getPoint(j))
                        )
                        if (move) {
                            start = current
                            move = false
                        }
                    }
                    control = current
                    break
                case 'h':
                case 'v':
                    const coord = lower === 'h' ? 'x' : 'y'
                    current = current.clone() // Clone as we're going to modify it.
                    for (let j = 0; j < length; j++) {
                        current[coord] = getCoord(j, coord)
                        this.lineTo(current)
                    }
                    control = current
                    break
                case 'c':
                    for (let j = 0; j < length; j += 6) {
                        this.cubicCurveTo(
                            getPoint(j),
                            (control = getPoint(j + 2)),
                            (current = getPoint(j + 4))
                        )
                    }
                    break
                case 's':
                    for (let j = 0; j < length; j += 4) {
                        this.cubicCurveTo(
                            /[cs]/.test(previous)
                                ? current.multiply(2).subtract(control)
                                : current,
                            (control = getPoint(j)),
                            (current = getPoint(j + 2))
                        )
                        previous = lower
                    }
                    break
                case 'q':
                    for (let j = 0; j < length; j += 4) {
                        this.quadraticCurveTo(
                            (control = getPoint(j)),
                            (current = getPoint(j + 2))
                        )
                    }
                    break
                case 't':
                    for (let j = 0; j < length; j += 2) {
                        this.quadraticCurveTo(
                            (control = /[qt]/.test(previous)
                                ? current.multiply(2).subtract(control)
                                : current),
                            (current = getPoint(j))
                        )
                        previous = lower
                    }
                    break
                case 'a':
                    for (let j = 0; j < length; j += 7) {
                        this.arcTo(
                            (current = getPoint(j + 5)),
                            new Size(+coords[j], +coords[j + 1]),
                            +coords[j + 2],
                            +coords[j + 4],
                            +coords[j + 3]
                        )
                    }
                    break
                case 'z':
                    this.closePath(Numerical.EPSILON)
                    current = start
                    break
            }
            previous = lower
        }
    }

    protected _canComposite() {
        return !(this.hasFill() && this.hasStroke())
    }

    protected _contains(point: Point) {
        if (Options.nativeContains || !Options.booleanOperations) {
            const ctx = CanvasProvider.getContext(1, 1)
            this._draw(ctx, { dontFinish: true })
            const res = ctx.isPointInPath(point.x, point.y, this.getFillRule())
            CanvasProvider.release(ctx)
            return res
        } else {
            const winding = point.isInside(
                this.getBounds({ internal: true, handle: true })
            )
                ? this._getWinding(point)
                : {}

            return (
                winding.onPath ||
                !!(this.getFillRule() === 'evenodd'
                    ? winding.windingL & 1 || winding.windingR & 1
                    : winding.winding)
            )
        }
    }

    /**
     * {@grouptitle Path Intersections and Locations}
     *
     * Returns all intersections between two {@link PathItem} items as an array
     * of {@link CurveLocation} objects. {@link CompoundPath} items are also
     * supported.
     *
     * @param {PathItem} path the other item to find the intersections with
     * @param {Function} [include] a callback function that can be used to
     *     filter out undesired locations right while they are collected. When
     *     defined, it shall return {@true to include a location}.
     * @return {CurveLocation[]} the locations of all intersection between the
     *     paths
     * @see #getCrossings(path)
     * @example {@paperscript} // Finding the intersections between two paths
     * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
     * path.strokeColor = 'black';
     *
     * var secondPath = path.clone();
     * var intersectionGroup = new Group();
     *
     * function onFrame(event) {
     *     secondPath.rotate(1);
     *
     *     var intersections = path.getIntersections(secondPath);
     *     intersectionGroup.removeChildren();
     *
     *     for (var i = 0; i < intersections.length; i++) {
     *         var intersectionPath = new Path.Circle({
     *             center: intersections[i].point,
     *             radius: 4,
     *             fillColor: 'red',
     *             parent: intersectionGroup
     *         });
     *     }
     * }
     */
    getIntersections(
        path: PathItem,
        include: Function,
        _matrix?: Matrix,
        _returnFirst?: any
    ): CurveLocation[] {
        const self = this === path || !path
        const matrix1 = this._matrix._orNullIfIdentity()
        const matrix2 = self
            ? matrix1
            : (_matrix || path._matrix)._orNullIfIdentity()

        return self ||
            this.getBounds(matrix1).intersects(
                path.getBounds(matrix2),
                Numerical.EPSILON
            )
            ? Curve.getIntersections(
                  this.getCurves(),
                  !self && path.getCurves(),
                  include,
                  matrix1,
                  matrix2,
                  _returnFirst
              )
            : []
    }

    /**
     * Returns all crossings between two {@link PathItem} items as an array of
     * {@link CurveLocation} objects. {@link CompoundPath} items are also
     * supported. Crossings are intersections where the paths actually are
     * crossing each other, as opposed to simply touching.
     *
     * @param {PathItem} path the other item to find the crossings with
     * @return {CurveLocation[]} the locations of all crossings between the
     *     paths
     * @see #getIntersections(path)
     */
    getCrossings(path: PathItem): CurveLocation[] {
        return this.getIntersections(path, function (inter) {
            return inter.isCrossing()
        })
    }

    /**
     * Returns the nearest location on the path item to the specified point.
     *
     * @param {Point} point the point for which we search the nearest location
     * @return {CurveLocation} the location on the path that's the closest to
     * the specified point
     */
    getNearestLocation(x: number, y: number): CurveLocation
    getNearestLocation(point: PointType): CurveLocation
    getNearestLocation(...args: any[]): CurveLocation {
        const point = Point.read(args)
        const curves = this.getCurves()
        let minDist = Infinity
        let minLoc = null
        for (let i = 0, l = curves.length; i < l; i++) {
            const loc = curves[i].getNearestLocation(point)
            if (loc._distance < minDist) {
                minDist = loc._distance
                minLoc = loc
            }
        }
        return minLoc
    }

    /**
     * Returns the nearest point on the path item to the specified point.
     *
     * @param {Point} point the point for which we search the nearest point
     * @return {Point} the point on the path that's the closest to the specified
     * point
     *
     * @example {@paperscript height=200}
     * var star = new Path.Star({
     *     center: view.center,
     *     points: 10,
     *     radius1: 30,
     *     radius2: 60,
     *     strokeColor: 'black'
     * });
     *
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 3,
     *     fillColor: 'red'
     * });
     *
     * function onMouseMove(event) {
     *     // Get the nearest point from the mouse position
     *     // to the star shaped path:
     *     var nearestPoint = star.getNearestPoint(event.point);
     *
     *     // Move the red circle to the nearest point:
     *     circle.position = nearestPoint;
     * }
     */
    getNearestPoint(x: number, y: number): Point
    getNearestPoint(point: PointType): Point
    getNearestPoint(...args: any[]): Point {
        const loc = this.getNearestLocation(args)
        return loc ? loc.getPoint() : loc
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
    reverse(): void {}

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
    flatten(_flatness = 0.25): void {}

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
    smooth(_options?: PathSmoothOptions): void {}

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
    simplify(_tolerance = 0.5): boolean {
        return false
    }

    /**
     * Interpolates between the two specified path items and uses the result
     * as the geometry for this path item. The number of children and
     * segments in the two paths involved in the operation should be the same.
     *
     * @param {PathItem} from the path item defining the geometry when `factor`
     *     is `0`
     * @param {PathItem} to the path item defining the geometry  when `factor`
     *     is `1`
     * @param {Number} factor the interpolation coefficient, typically between
     *     `0` and `1`, but extrapolation is possible too
     */
    interpolate(from: PathItem, to: PathItem, factor: number) {
        const isPath = !this._children
        const name = isPath ? '_segments' : '_children'
        const itemsFrom = from[name]
        const itemsTo = to[name]
        const items = this[name]
        if (!itemsFrom || !itemsTo || itemsFrom.length !== itemsTo.length) {
            throw new Error(
                'Invalid operands in interpolate() call: ' + from + ', ' + to
            )
        }
        const current = items.length
        const length = itemsTo.length
        if (current < length) {
            const Ctor = isPath ? Segment : Path
            for (let i = current; i < length; i++) {
                this.add(new Ctor())
            }
        } else if (current > length) {
            this[isPath ? 'removeSegments' : 'removeChildren'](length, current)
        }
        for (let i = 0; i < length; i++) {
            items[i].interpolate(itemsFrom[i], itemsTo[i], factor)
        }
        if (isPath) {
            this.setClosed(from._closed)
            this._changed(Change.GEOMETRY)
        }
    }

    /**
     * Compares the geometry of two paths to see if they describe the same
     * shape, detecting cases where paths start in different segments or even
     * use different amounts of curves to describe the same shape, as long as
     * their orientation is the same, and their segments and handles really
     * result in the same visual appearance of curves.
     *
     * @name PathItem#compare
     * @function
     *
     * @param {PathItem} path the path to compare this path's geometry with
     * @return {Boolean} {@true if two paths describe the same shape}
     */
    compare(path: PathItem): boolean {
        let ok = false
        if (path) {
            const paths1 = this._children || [this]
            const paths2 = path._children ? path._children.slice() : [path]
            const length1 = paths1.length
            const length2 = paths2.length
            const matched = []
            let count = 0
            ok = true
            const boundsOverlaps = CollisionDetection.findItemBoundsCollisions(
                paths1,
                paths2,
                Numerical.GEOMETRIC_EPSILON
            )
            for (let i1 = length1 - 1; i1 >= 0 && ok; i1--) {
                const path1 = paths1[i1]
                ok = false
                const pathBoundsOverlaps = boundsOverlaps[i1]
                if (pathBoundsOverlaps) {
                    for (
                        let i2 = pathBoundsOverlaps.length - 1;
                        i2 >= 0 && !ok;
                        i2--
                    ) {
                        if (path1.compare(paths2[pathBoundsOverlaps[i2]])) {
                            if (!matched[pathBoundsOverlaps[i2]]) {
                                matched[pathBoundsOverlaps[i2]] = true
                                count++
                            }
                            ok = true
                        }
                    }
                }
            }
            ok = ok && count === length2
        }
        return ok
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
    moveTo(..._args: any[]): void {}

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
    lineTo(..._args: any[]): void {}

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

    arcTo(..._args: any[]): void {}

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
    curveTo(..._args: any[]): void {}

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
    cubicCurveTo(..._args: any[]): void {}

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
    quadraticCurveTo(..._args: any[]): void {}

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
    closePath(_tolerance?: number): void {}

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
    moveBy(..._args: any[]): void {}

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
    lineBy(..._args: any[]): void {}

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
    arcBy(..._args: any[]): void {}

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
    curveBy(..._args: any[]): void {}

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
    cubicCurveBy(..._args: any[]): void {}

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
    quadraticCurveBy(..._args: any[]): void {}

    private getPaths(path: Path) {
        return path._children || [path]
    }

    private preparePath(path: PathItem, resolve?: boolean) {
        let res = path
            .clone(false)
            .reduce({ simplify: true })
            .transform(null, true, true)

        if (resolve) {
            const paths = this.getPaths(res)
            for (let i = 0, l = paths.length; i < l; i++) {
                const path = paths[i]
                if (!path._closed && !path.isEmpty()) {
                    // Close with epsilon tolerance, to avoid tiny straight
                    // that would cause issues with intersection detection.
                    path.closePath(Numerical.EPSILON)
                    path.getFirstSegment().setHandleIn(0, 0)
                    path.getLastSegment().setHandleOut(0, 0)
                }
            }
            res = res
                .resolveCrossings()
                .reorient(res.getFillRule() === 'nonzero', true)
        }
        return res
    }

    private createResult(
        paths: Path[],
        simplify: boolean,
        path1: Path,
        path2: path,
        options?: PathOptions
    ) {
        let result = new CompoundPath(Item.NO_INSERT)
        result.addChildren(paths)
        result = result.reduce({ simplify: simplify })
        if (!(options && options.insert === false)) {
            result.insertAbove(
                path2 &&
                    path1.isSibling(path2) &&
                    path1.getIndex() < path2.getIndex()
                    ? path2
                    : path1
            )
        }
        result.copyAttributes(path1, true)
        return result
    }

    private filterIntersection(inter: CurveLocation) {
        return inter.hasOverlap() || inter.isCrossing()
    }

    private traceBoolean(
        path1: Path,
        path2: Path,
        operation: PathOperators,
        options: PathOptions
    ) {
        if (
            options &&
            (options.trace === false || options.stroke) &&
            /^(subtract|intersect)$/.test(operation)
        )
            return this.splitBoolean(path1, path2, operation)

        const _path1 = this.preparePath(path1, true)
        const _path2 = path2 && path1 !== path2 && this.preparePath(path2, true)

        const operator = this.operators[operation]

        operator[operation] = true
        if (
            _path2 &&
            (+operator.subtract || +operator.exclude) ^
                (+_path2.isClockwise() ^ +_path1.isClockwise())
        )
            _path2.reverse()

        const crossings = this.divideLocations(
            CurveLocation.expand(
                _path1.getIntersections(_path2, filterIntersection)
            )
        )
        const paths1 = getPaths(_path1)
        const paths2 = _path2 && getPaths(_path2)
        const segments = []
        const curves: Curve[] = []
        let paths

        function collectPaths(paths: Path[]) {
            for (let i = 0, l = paths.length; i < l; i++) {
                const path = paths[i]
                Base.push(segments, path._segments)
                Base.push(curves, path.getCurves())

                path._overlapsOnly = true
            }
        }

        function getCurves(indices: number[]) {
            const list = []
            for (let i = 0, l = indices && indices.length; i < l; i++) {
                list.push(curves[indices[i]])
            }
            return list
        }

        if (crossings.length) {
            collectPaths(paths1)
            if (paths2) collectPaths(paths2)

            const curvesValues = new Array(curves.length)
            for (let i = 0, l = curves.length; i < l; i++) {
                curvesValues[i] = curves[i].getValues()
            }
            const curveCollisions =
                CollisionDetection.findCurveBoundsCollisions(
                    curvesValues,
                    curvesValues,
                    0,
                    true
                ) as any

            const curveCollisionsMap = {}
            for (let i = 0; i < curves.length; i++) {
                const curve = curves[i]
                const id = curve._path._id
                const map = (curveCollisionsMap[id] =
                    curveCollisionsMap[id] || {})
                map[curve.getIndex()] = {
                    hor: getCurves(curveCollisions[i].hor),
                    ver: getCurves(curveCollisions[i].ver)
                }
            }

            for (let i = 0, l = crossings.length; i < l; i++) {
                this.propagateWinding(
                    crossings[i]._segment,
                    _path1,
                    _path2,
                    curveCollisionsMap,
                    operator
                )
            }
            for (let i = 0, l = segments.length; i < l; i++) {
                const segment = segments[i]
                const inter = segment._intersection
                if (!segment._winding) {
                    this.propagateWinding(
                        segment,
                        _path1,
                        _path2,
                        curveCollisionsMap,
                        operator
                    )
                }
                if (!(inter && inter._overlap))
                    segment._path._overlapsOnly = false
            }
            paths = this.tracePaths(segments, operator)
        } else {
            paths = this.reorientPaths(
                paths2 ? paths1.concat(paths2) : paths1.slice(),
                function (w: string) {
                    return !!operator[w]
                }
            )
        }
        return this.createResult(paths, true, path1, path2, options)
    }

    private splitBoolean(path1: Path, path2: Path, operation: PathOperators) {
        const _path1 = this.preparePath(path1)
        const _path2 = this.preparePath(path2)
        const crossings = _path1.getIntersections(
            _path2,
            this.filterIntersection
        )
        const subtract = operation === 'subtract'
        const divide = operation === 'divide'
        const added = {}
        const paths = []

        function addPath(path) {
            if (
                !added[path._id] &&
                (divide ||
                    +_path2.contains(path.getPointAt(path.getLength() / 2)) ^
                        +subtract)
            ) {
                paths.unshift(path)
                return (added[path._id] = true)
            }
        }

        for (let i = crossings.length - 1; i >= 0; i--) {
            const path = crossings[i].split()
            if (path) {
                if (addPath(path)) path.getFirstSegment().setHandleIn(0, 0)
                _path1.getLastSegment().setHandleOut(0, 0)
            }
        }
        addPath(_path1)
        return this.createResult(paths, false, path1, path2)
    }

    /*
     * Creates linked lists between intersections through their _next and _prev
     * properties.
     *
     * @private
     */
    private linkIntersections(from: any, to: any) {
        let prev = from
        while (prev) {
            if (prev === to) return
            prev = prev._previous
        }

        while (from._next && from._next !== to) from = from._next
        if (!from._next) {
            while (to._previous) to = to._previous
            from._next = to
            to._previous = from
        }
    }

    private clearCurveHandles(curves) {
        for (const i = curves.length - 1; i >= 0; i--) curves[i].clearHandles()
    }
}
