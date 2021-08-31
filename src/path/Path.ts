import {
    Item,
    BoundsOptions,
    DrawOptions,
    ItemSerializeFields,
    PathItem,
    PathSmoothOptions,
    Segment,
    SegmentSmoothOptions,
    Curve,
    Base,
    Change,
    ChangeFlag,
    CompoundPath,
    Matrix,
    Formatter,
    Point,
    LinkedPoint,
    SegmentSelection,
    ItemSelection,
    CurveLocation,
    Numerical,
    PathFlattener,
    PathFitter,
    Shape,
    Line,
    Size,
    HitResult,
    HitResultOptions,
    HitResultTypes,
    Style,
    StrokeCaps,
    StrokeJoins,
    PaperScope,
    Rectangle,
    Exportable
} from '../'

import {
    Point as PointType,
    Size as SizeType,
    Rectangle as RectangleType
} from '../basic/Types'

export type PathSerializeFields = {
    segments: Segment[]
    closed: boolean
} & ItemSerializeFields

type SegmentType = Segment | Point | Number[]

@Exportable()
export class Path extends PathItem {
    protected _class = 'Path'
    protected _serializeFields: PathSerializeFields = {
        segments: [],
        closed: false
    }

    protected _segments: Segment[]
    protected _version: number
    protected _curves: Curve[]
    protected _segmentSelection: number
    protected _length: number
    protected _area: number
    protected _overlapsOnly: boolean

    private static kappa = Numerical.KAPPA
    private static ellipseSegments: any = [
        new Segment([-1, 0], [0, Numerical.KAPPA], [0, -Numerical.KAPPA]),
        new Segment([0, -1], [-Numerical.KAPPA, 0], [Numerical.KAPPA, 0]),
        new Segment([1, 0], [0, -Numerical.KAPPA], [0, Numerical.KAPPA]),
        new Segment([0, 1], [Numerical.KAPPA, 0], [-Numerical.KAPPA, 0])
    ]

    /**
     * Creates a new path item and places it at the top of the active layer.
     *
     * @name Path#initialize
     * @param {Segment[]} [segments] An array of segments (or points to be
     * converted to segments) that will be added to the path
     *
     * @example
     * // Create an empty path and add segments to it:
     * var path = new Path();
     * path.strokeColor = 'black';
     * path.add(new Point(30, 30));
     * path.add(new Point(100, 100));
     *
     * @example
     * // Create a path with two segments:
     * var segments = [new Point(30, 30), new Point(100, 100)];
     * var path = new Path(segments);
     * path.strokeColor = 'black';
     */
    constructor(segment: Segment[])

    /**
     * Creates a new path item from an object description and places it at the
     * top of the active layer.
     *
     * @name Path#initialize
     * @param {Object} object an object containing properties to be set on the
     *     path
     *
     * @example {@paperscript}
     * var path = new Path({
     *     segments: [[20, 20], [80, 80], [140, 20]],
     *     fillColor: 'black',
     *     closed: true
     * });
     *
     * @example {@paperscript}
     * var path = new Path({
     *     segments: [[20, 20], [80, 80], [140, 20]],
     *     strokeColor: 'red',
     *     strokeWidth: 20,
     *     strokeCap: 'round',
     *     selected: true
     * });
     */
    constructor(object?: object)

    /**
     * Creates a new path item from SVG path-data and places it at the top of
     * the active layer.
     *
     * @name Path#initialize
     * @param {String} pathData the SVG path-data that describes the geometry
     * of this path
     *
     * @example {@paperscript}
     * var pathData = 'M100,50c0,27.614-22.386,50-50,50S0,77.614,0,50S22.386,0,50,0S100,22.386,100,50';
     * var path = new Path(pathData);
     * path.fillColor = 'red';
     */
    constructor(pathData: string)

    constructor(...segments: PointType[])

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this._closed = false
        this._segments = []
        this._version = 0

        const segments = Array.isArray(args[0])
            ? typeof args[0][0] === 'object'
                ? args[0]
                : args
            : args[0] &&
              args[0].size === undefined &&
              (args[0].x !== undefined || args[0].point !== undefined)
            ? args
            : null
        if (segments && segments.length > 0) {
            this.setSegments(segments)
        } else {
            this._curves = undefined
            this._segmentSelection = 0
            if (!segments && typeof args[0] === 'string') {
                this.setPathData(args[0])
                args[0] = null
            }
        }

        this._initialize(!segments && args[0])

        return this
    }

    protected _equals(item: Path) {
        return (
            this._closed === item._closed &&
            Base.equals(this._segments, item._segments)
        )
    }

    get version() {
        return this._version
    }

    copyContent(source: Path) {
        this.setSegments(source._segments)
        this._closed = source._closed
    }

    protected _changed(flags: ChangeFlag | Change) {
        super._changed(flags)

        if (flags & ChangeFlag.GEOMETRY) {
            this._length = this._area = undefined
            if (flags & ChangeFlag.SEGMENTS) {
                this._version++
            } else if (this._curves) {
                for (let i = 0, l = this._curves.length; i < l; i++)
                    this._curves[i].changed()
            }
        } else if (flags & ChangeFlag.STROKE) {
            this._bounds = undefined
        }
    }

    getStyle(): Style {
        const parent = this._parent
        return (parent instanceof CompoundPath ? parent : this).style
    }

    /**
     * The segments contained within the path.
     *
     * @bean
     * @type Segment[]
     */
    getSegments() {
        return this._segments
    }

    setSegments(segments: Segment[]) {
        const fullySelected = this.isFullySelected()
        let length = segments && segments.length
        this._segments.length = 0
        this._segmentSelection = 0

        this._curves = undefined
        if (length) {
            const last = segments[length - 1]
            if (typeof last === 'boolean') {
                this.setClosed(last)
                length--
            }
            this._add(Segment.readList(segments, 0, {}, length))
        }
        if (fullySelected) this.setFullySelected(true)
    }

    get segments() {
        return this.getSegments()
    }

    set segments(segments: Segment[]) {
        this.setSegments(segments)
    }

    /**
     * The first Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getFirstSegment() {
        return this._segments[0]
    }

    get firstSegment() {
        return this.getFirstSegment()
    }

    /**
     * The last Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getLastSegment() {
        return this._segments[this._segments.length - 1]
    }

    get lastSegment() {
        return this.getLastSegment()
    }

    /**
     * The curves contained within the path.
     *
     * @bean
     * @type Curve[]
     */
    getCurves() {
        let curves = this._curves
        const segments = this._segments
        if (!curves) {
            const length = this._countCurves()
            curves = this._curves = new Array(length)
            for (let i = 0; i < length; i++)
                curves[i] = new Curve(
                    this,
                    segments[i],
                    segments[i + 1] || segments[0]
                )
        }
        return curves
    }

    get curves() {
        return this.getCurves()
    }

    /**
     * The first Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getFirstCurve() {
        return this.getCurves()[0]
    }

    get firstCurve() {
        return this.getFirstCurve()
    }

    /**
     * The last Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getLastCurve() {
        const curves = this.getCurves()
        return curves[curves.length - 1]
    }

    get lastCurve() {
        return this.getLastCurve()
    }

    /**
     * Specifies whether the path is closed. If it is closed, Paper.js connects
     * the first and last segments.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * var myPath = new Path();
     * myPath.strokeColor = 'black';
     * myPath.add(new Point(50, 75));
     * myPath.add(new Point(100, 25));
     * myPath.add(new Point(150, 75));
     *
     * // Close the path:
     * myPath.closed = true;
     */
    isClosed() {
        return this._closed
    }

    setClosed(closed: boolean) {
        if (this._closed !== (closed = !!closed)) {
            this._closed = closed

            if (this._curves) {
                const length = (this._curves.length = this._countCurves())
                if (closed)
                    this._curves[length - 1] = new Curve(
                        this,
                        this._segments[length - 1],
                        this._segments[0]
                    )
            }

            this._changed(Change.SEGMENTS)
        }
    }

    getPathData(_matrix?: Matrix, _precision?: number) {
        const segments = this._segments
        const length = segments.length
        const f = new Formatter(_precision)
        const coords = new Array(6)
        let first = true
        let curX: number
        let curY: number
        let prevX: number
        let prevY: number
        let inX: number
        let inY: number
        let outX: number
        let outY: number
        const parts: string[] = []

        function addSegment(segment: Segment, skipLine?: boolean) {
            segment._transformCoordinates(_matrix, coords)
            curX = coords[0]
            curY = coords[1]
            if (first) {
                parts.push('M' + f.pair(curX, curY))
                first = false
            } else {
                inX = coords[2]
                inY = coords[3]
                if (
                    inX === curX &&
                    inY === curY &&
                    outX === prevX &&
                    outY === prevY
                ) {
                    if (!skipLine) {
                        const dx = curX - prevX
                        const dy = curY - prevY
                        parts.push(
                            dx === 0
                                ? 'v' + f.number(dy)
                                : dy === 0
                                ? 'h' + f.number(dx)
                                : 'l' + f.pair(dx, dy)
                        )
                    }
                } else {
                    parts.push(
                        'c' +
                            f.pair(outX - prevX, outY - prevY) +
                            ' ' +
                            f.pair(inX - prevX, inY - prevY) +
                            ' ' +
                            f.pair(curX - prevX, curY - prevY)
                    )
                }
            }
            prevX = curX
            prevY = curY
            outX = coords[4]
            outY = coords[5]
        }

        if (!length) return ''

        for (let i = 0; i < length; i++) addSegment(segments[i])

        if (this._closed && length > 0) {
            addSegment(segments[0], true)
            parts.push('z')
        }
        return parts.join('')
    }

    get pathData() {
        return this.getPathData()
    }

    set pathData(data: string) {
        this.setPathData(data)
    }

    isEmpty() {
        return !this._segments.length
    }

    protected _transformContent(matrix: Matrix) {
        const segments = this._segments
        const coords = new Array(6)
        for (let i = 0, l = segments.length; i < l; i++)
            segments[i]._transformCoordinates(matrix, coords, true)
        return true
    }

    /**
     * Private method that adds segments to the segment list. It assumes that
     * the passed object is an array of segments already and does not perform
     * any checks. If a curves list was requested, it will be kept in sync with
     * the segments list automatically.
     */
    protected _add(segs: Segment[], index?: number) {
        const segments = this._segments
        const curves = this._curves
        const amount = segs.length
        const append = index == null
        index = append ? segments.length : index

        for (let i = 0; i < amount; i++) {
            let segment = segs[i]

            if (segment.path) segment = segs[i] = segment.clone()
            segment.path = this
            segment.index = index + i

            if (segment.selection)
                this._updateSelection(segment, 0, segment.selection)
        }

        if (append) {
            Base.push(segments, segs)
        } else {
            segments.splice(index, 0, ...segs)

            for (let i = index + amount, l = segments.length; i < l; i++)
                segments[i].index = i
        }

        if (curves) {
            const total = this._countCurves()

            const start =
                index > 0 && index + amount - 1 === total ? index - 1 : index
            let insert = start
            const end = Math.min(start + amount, total)

            if ((segs as any)._curves) {
                curves.splice(start, 0, ...(segs as any)._curves)
                insert += (segs as any)._curves.length
            }
            for (let i = insert; i < end; i++)
                curves.splice(i, 0, new Curve(this, null, null))
            this._adjustCurves(start, end)
        }

        this._changed(Change.SEGMENTS)
        return segs
    }

    /**
     * Adjusts segments of curves before and after inserted / removed segments.
     */
    protected _adjustCurves(start: number, end: number) {
        const segments = this._segments
        const curves = this._curves
        let curve: Curve

        for (let i = start; i < end; i++) {
            curve = curves[i]
            curve.path = this
            curve.segment1 = segments[i]
            curve.segment2 = segments[i + 1] || segments[0]
            curve.changed()
        }

        if (
            (curve =
                curves[
                    this._closed && !start ? segments.length - 1 : start - 1
                ])
        ) {
            curve.segment2 = segments[start] || segments[0]
            curve.changed()
        }

        if ((curve = curves[end])) {
            curve.segment1 = segments[end]
            curve.changed()
        }
    }

    /**
     * Returns the amount of curves this path item is supposed to have, based
     * on its amount of #segments and #closed state.
     */
    protected _countCurves() {
        const length = this._segments.length
        return !this._closed && length > 0 ? length - 1 : length
    }

    /**
     * Adds one or more segments to the end of the {@link #segments} array of
     * this path.
     *
     * @param {...(Segment|Point|Number[])} segment the segment or point to be
     * added.
     * @return {Segment|Segment[]} the added segment(s). This is not necessarily
     * the same object, e.g. if the segment to be added already belongs to
     * another path.
     *
     * @example {@paperscript}
     * // Adding segments to a path using point objects:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * // Add a segment at {x: 30, y: 75}
     * path.add(new Point(30, 75));
     *
     * // Add two segments in one go at {x: 100, y: 20}
     * // and {x: 170, y: 75}:
     * path.add(new Point(100, 20), new Point(170, 75));
     *
     * @example {@paperscript}
     * // Adding segments to a path using arrays containing number pairs:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * // Add a segment at {x: 30, y: 75}
     * path.add([30, 75]);
     *
     * // Add two segments in one go at {x: 100, y: 20}
     * // and {x: 170, y: 75}:
     * path.add([100, 20], [170, 75]);
     *
     * @example {@paperscript}
     * // Adding segments to a path using objects:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * // Add a segment at {x: 30, y: 75}
     * path.add({x: 30, y: 75});
     *
     * // Add two segments in one go at {x: 100, y: 20}
     * // and {x: 170, y: 75}:
     * path.add({x: 100, y: 20}, {x: 170, y: 75});
     *
     * @example {@paperscript}
     * // Adding a segment with handles to a path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(30, 75));
     *
     * // Add a segment with handles:
     * var point = new Point(100, 20);
     * var handleIn = new Point(-50, 0);
     * var handleOut = new Point(50, 0);
     * var added = path.add(new Segment(point, handleIn, handleOut));
     *
     * // Select the added segment, so we can see its handles:
     * added.selected = true;
     *
     * path.add(new Point(170, 75));
     */
    add(...args: SegmentType[]): Segment | Segment[] {
        return args.length > 1 && typeof args[0] !== 'number'
            ? this._add(Segment.readList(args))
            : this._add([Segment.read(args)])[0]
    }

    /**
     * Inserts one or more segments at a given index in the list of this path's
     * segments.
     *
     * @param {Number} index the index at which to insert the segment
     * @param {Segment|Point} segment the segment or point to be inserted.
     * @return {Segment} the added segment. This is not necessarily the same
     * object, e.g. if the segment to be added already belongs to another path
     *
     * @example {@paperscript}
     * // Inserting a segment:
     * var myPath = new Path();
     * myPath.strokeColor = 'black';
     * myPath.add(new Point(50, 75));
     * myPath.add(new Point(150, 75));
     *
     * // Insert a new segment into myPath at index 1:
     * myPath.insert(1, new Point(100, 25));
     *
     * // Select the segment which we just inserted:
     * myPath.segments[1].selected = true;
     *
     * @example {@paperscript}
     * // Inserting multiple segments:
     * var myPath = new Path();
     * myPath.strokeColor = 'black';
     * myPath.add(new Point(50, 75));
     * myPath.add(new Point(150, 75));
     *
     * // Insert two segments into myPath at index 1:
     * myPath.insert(1, [80, 25], [120, 25]);
     *
     * // Select the segments which we just inserted:
     * myPath.segments[1].selected = true;
     * myPath.segments[2].selected = true;
     */
    insert(index: number, ...segment: SegmentType[]): Segment | Segment[]
    insert(...args: any[]): Segment | Segment[] {
        return args.length > 2 && typeof args[1] !== 'number'
            ? this._add(Segment.readList(args, 1), args[0])
            : this._add([Segment.read(args, 1)], args[0])[0]
    }

    addSegment(x: number, y: number): Segment
    addSegment(segment: SegmentType): Segment
    addSegment(...args: any[]): Segment {
        return this._add([Segment.read(args)])[0]
    }

    insertSegment(index: number, x: number, y: number): Segment
    insertSegment(index: number, segment: SegmentType): Segment
    insertSegment(...args: any[]) {
        return this._add([Segment.read(args, 1)], args[0])[0]
    }

    /**
     * Adds an array of segments (or types that can be converted to segments)
     * to the end of the {@link #segments} array.
     *
     * @param {Segment[]} segments
     * @return {Segment[]} an array of the added segments. These segments are
     * not necessarily the same objects, e.g. if the segment to be added already
     * belongs to another path
     *
     * @example {@paperscript}
     * // Adding an array of Point objects:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     * var points = [new Point(30, 50), new Point(170, 50)];
     * path.addSegments(points);
     *
     * @example {@paperscript}
     * // Adding an array of [x, y] arrays:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     * var array = [[30, 75], [100, 20], [170, 75]];
     * path.addSegments(array);
     *
     * @example {@paperscript}
     * // Adding segments from one path to another:
     *
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     * path.addSegments([[30, 75], [100, 20], [170, 75]]);
     *
     * var path2 = new Path();
     * path2.strokeColor = 'red';
     *
     * // Add the second and third segments of path to path2:
     * path2.add(path.segments[1], path.segments[2]);
     *
     * // Move path2 30pt to the right:
     * path2.position.x += 30;
     */
    addSegments(segments: Segment[]): Segment[] {
        return this._add(Segment.readList(segments))
    }

    /**
     * Inserts an array of segments at a given index in the path's
     * {@link #segments} array.
     *
     * @param {Number} index the index at which to insert the segments
     * @param {Segment[]} segments the segments to be inserted
     * @return {Segment[]} an array of the added segments. These segments are
     * not necessarily the same objects, e.g. if the segment to be added already
     * belongs to another path
     */
    insertSegments(index: number, segments: Segment[]): Segment[] {
        return this._add(Segment.readList(segments), index)
    }

    /**
     * Removes the segment at the specified index of the path's
     * {@link #segments} array.
     *
     * @param {Number} index the index of the segment to be removed
     * @return {Segment} the removed segment
     *
     * @example {@paperscript}
     * // Removing a segment from a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var path = new Path.Circle({
     *     center: new Point(80, 50),
     *     radius: 35,
     *     strokeColor: 'black'
     * });
     *
     * // Remove its second segment:
     * path.removeSegment(1);
     *
     * // Select the path, so we can see its segments:
     * path.selected = true;
     */
    removeSegment(index: number): Segment {
        return this.removeSegments(index, index + 1)[0] || null
    }

    /**
     * Removes all segments from the path's {@link #segments} array.
     *
     * @name Path#removeSegments
     * @alias Path#clear
     * @function
     * @return {Segment[]} an array containing the removed segments
     */
    /**
     * Removes the segments from the specified `from` index to the `to` index
     * from the path's {@link #segments} array.
     *
     * @param {Number} from the beginning index, inclusive
     * @param {Number} [to=segments.length] the ending index, exclusive
     * @return {Segment[]} an array containing the removed segments
     *
     * @example {@paperscript}
     * // Removing segments from a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var path = new Path.Circle({
     *     center: new Point(80, 50),
     *     radius: 35,
     *     strokeColor: 'black'
     * });
     *
     * // Remove the segments from index 1 till index 2:
     * path.removeSegments(1, 2);
     *
     * // Select the path, so we can see its segments:
     * path.selected = true;
     */
    removeSegments(
        start?: number,
        end?: number,
        _includeCurves?: boolean
    ): Segment[] {
        start = start || 0
        end = Base.pick(end, this._segments.length)
        const segments = this._segments
        let curves = this._curves
        const count = segments.length
        const removed = segments.splice(start, end - start)
        const amount = removed.length
        if (!amount) return removed

        for (let i = 0; i < amount; i++) {
            const segment = removed[i]
            if (segment.selection)
                this._updateSelection(segment, segment.selection, 0)

            segment.index = segment.path = null
        }
        for (let i = start, l = segments.length; i < l; i++)
            segments[i].index = i

        if (curves) {
            const index =
                start > 0 && end === count + (this._closed ? 1 : 0)
                    ? start - 1
                    : start
            curves = curves.splice(index, amount)

            for (let i = curves.length - 1; i >= 0; i--) curves[i].path = null

            if (_includeCurves) (removed as any)._curves = curves.slice(1)
            this._adjustCurves(index, index)
        }

        this._changed(Change.SEGMENTS)
        return removed
    }

    clear() {
        this.removeSegments()
    }

    /**
     * Checks if any of the curves in the path have curve handles set.
     *
     * @return {Boolean} {@true if the path has curve handles set}
     * @see Segment#hasHandles()
     * @see Curve#hasHandles()
     */
    hasHandles(): boolean {
        const segments = this._segments
        for (let i = 0, l = segments.length; i < l; i++) {
            if (segments[i].hasHandles()) return true
        }
        return false
    }

    /**
     * Clears the path's handles by setting their coordinates to zero,
     * turning the path into a polygon (or a polyline if it isn't closed).
     */
    clearHandles() {
        const segments = this._segments
        for (let i = 0, l = segments.length; i < l; i++)
            segments[i].clearHandles()
    }

    /**
     * The approximate length of the path.
     *
     * @bean
     * @type Number
     */
    getLength() {
        if (this._length == null) {
            const curves = this.getCurves()
            let length = 0
            for (let i = 0, l = curves.length; i < l; i++)
                length += curves[i].getLength()
            this._length = length
        }
        return this._length
    }

    get length() {
        return this.getLength()
    }

    /**
     * The area that the path's geometry is covering. Self-intersecting paths
     * can contain sub-areas that cancel each other out.
     *
     * @bean
     * @type Number
     */
    getArea() {
        let area = this._area
        if (area === null || area === undefined) {
            const segments = this._segments
            const closed = this._closed
            area = 0
            for (let i = 0, l = segments.length; i < l; i++) {
                const last = i + 1 === l
                area += Curve.getArea(
                    Curve.getValues(
                        segments[i],
                        segments[last ? 0 : i + 1],
                        null,
                        last && !closed
                    )
                )
            }
            this._area = area
        }
        return area
    }

    get area() {
        return this.getArea()
    }

    get overlapsOnly() {
        return this._overlapsOnly
    }

    set overlapsOnly(overlapsOnly: boolean) {
        this._overlapsOnly = overlapsOnly
    }

    /**
     * Specifies whether an path is selected and will also return `true` if the
     * path is partially selected, i.e. one or more of its segments is selected.
     *
     * Paper.js draws the visual outlines of selected items on top of your
     * project. This can be useful for debugging, as it allows you to see the
     * construction of paths, position of path curves, individual segment points
     * and bounding boxes of symbol and raster items.
     *
     * @bean
     * @type Boolean
     * @see Project#selectedItems
     * @see Segment#selected
     * @see Point#selected
     *
     * @example {@paperscript}
     * // Selecting an item:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * path.selected = true; // Select the path
     *
     * @example {@paperscript}
     * // A path is selected, if one or more of its segments is selected:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Select the second segment of the path:
     * path.segments[1].selected = true;
     *
     * // If the path is selected (which it is), set its fill color to red:
     * if (path.selected) {
     *     path.fillColor = 'red';
     * }
     *
     */
    /**
     * Specifies whether the path and all its segments are selected. Cannot be
     * `true` on an empty path.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * // A path is fully selected, if all of its segments are selected:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * path.fullySelected = true;
     *
     * var path2 = new Path.Circle({
     *     center: [180, 50],
     *     radius: 35
     * });
     *
     * // Deselect the second segment of the second path:
     * path2.segments[1].selected = false;
     *
     * // If the path is fully selected (which it is),
     * // set its fill color to red:
     * if (path.fullySelected) {
     *     path.fillColor = 'red';
     * }
     *
     * // If the second path is fully selected (which it isn't, since we just
     * // deselected its second segment),
     * // set its fill color to red:
     * if (path2.fullySelected) {
     *     path2.fillColor = 'red';
     * }
     */
    isFullySelected() {
        const length = this._segments.length
        return (
            this.isSelected() &&
            length > 0 &&
            this._segmentSelection === length * SegmentSelection.ALL
        )
    }

    setFullySelected(selected: boolean) {
        if (selected) this._selectSegments(true)
        this.setSelected(selected)
    }

    get fullySelected() {
        return this.isFullySelected()
    }

    set fullySelected(selected: boolean) {
        this.setFullySelected(selected)
    }

    setSelection(selection: number) {
        if (!(+selection & ItemSelection.ITEM)) this._selectSegments(false)
        super.setSelection(selection)
    }

    _selectSegments(selected: boolean) {
        const segments = this._segments
        const length = segments.length
        const selection = selected ? SegmentSelection.ALL : 0
        this._segmentSelection = selection * length

        for (let i = 0; i < length; i++) segments[i].selection = selection
    }

    _updateSelection(
        segment: Segment,
        oldSelection: number,
        newSelection: number
    ) {
        segment.selection = newSelection
        const selection = (this._segmentSelection +=
            +newSelection - +oldSelection)

        if (selection > 0) this.setSelected(true)
    }

    /**
     * Divides the path on the curve at the given offset or location into two
     * curves, by inserting a new segment at the given location.
     *
     * @param {Number|CurveLocation} location the offset or location on the
     *     path at which to divide the existing curve by inserting a new segment
     * @return {Segment} the newly inserted segment if the location is valid,
     *     `null` otherwise
     * @see Curve#divideAt(location)
     */
    divideAt(location: number | CurveLocation): Segment {
        const loc = this.getLocationAt(location)
        let curve
        return loc && (curve = loc.getCurve().divideAt(loc.getCurveOffset()))
            ? curve.segment1
            : null
    }

    /**
     * Splits the path at the given offset or location. After splitting, the
     * path will be open. If the path was open already, splitting will result in
     * two paths.
     *
     * @param {Number|CurveLocation} location the offset or location at which to
     *     split the path
     * @return {Path} the newly created path after splitting, if any
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     strokeColor: 'black'
     * });
     *
     * var pointOnCircle = view.center + {
     *     length: 40,
     *     angle: 30
     * };
     *
     * var location = path.getNearestLocation(pointOnCircle);
     *
     * path.splitAt(location);
     * path.lastSegment.selected = true;
     *
     * @example {@paperscript} // Splitting an open path
     * // Draw a V shaped path:
     * var path = new Path([20, 20], [50, 80], [80, 20]);
     * path.strokeColor = 'black';
     *
     * // Split the path half-way:
     * var path2 = path.splitAt(path.length / 2);
     *
     * // Give the resulting path a red stroke-color
     * // and move it 20px to the right:
     * path2.strokeColor = 'red';
     * path2.position.x += 20;
     *
     * @example {@paperscript} // Splitting a closed path
     * var path = new Path.Rectangle({
     *     from: [20, 20],
     *     to: [80, 80],
     *     strokeColor: 'black'
     * });
     *
     * // Split the path half-way:
     * path.splitAt(path.length / 2);
     *
     * // Move the first segment, to show where the path
     * // was split:
     * path.firstSegment.point.x += 20;
     *
     * // Select the first segment:
     * path.firstSegment.selected = true;
     */
    splitAt(location: number | CurveLocation): Path {
        const loc = this.getLocationAt(location)
        let index = loc && loc.index
        let time = loc && loc.time
        const tMin = Numerical.CURVETIME_EPSILON
        const tMax = 1 - tMin
        if (time > tMax) {
            index++
            time = 0
        }
        const curves = this.getCurves()
        if (index >= 0 && index < curves.length) {
            if (time >= tMin) {
                curves[index++].divideAtTime(time)
            }

            const segs = this.removeSegments(index, this._segments.length, true)
            let path: Path
            if (this._closed) {
                this.setClosed(false)
                path = this
            } else {
                path = new Path(Item.NO_INSERT)
                path.insertAbove(this)
                path.copyAttributes(this)
            }
            path._add(segs, 0)
            this.addSegment(segs[0])
            return path
        }
        return null
    }

    /**
     * Joins the path with the other specified path, which will be removed in
     * the process. They can be joined if the first or last segments of either
     * path lie in the same location. Locations are optionally compare with a
     * provide `tolerance` value.
     *
     * If `null` or `this` is passed as the other path, the path will be joined
     * with itself if the first and last segment are in the same location.
     *
     * @param {Path} path the path to join this path with; `null` or `this` to
     *     join the path with itself
     * @param {Number} [tolerance=0] the tolerance with which to decide if two
     *     segments are to be considered the same location when joining
     *
     * @example {@paperscript}
     * // Joining two paths:
     * var path = new Path({
     *     segments: [[30, 25], [30, 75]],
     *     strokeColor: 'black'
     * });
     *
     * var path2 = new Path({
     *     segments: [[200, 25], [200, 75]],
     *     strokeColor: 'black'
     * });
     *
     * // Join the paths:
     * path.join(path2);
     *
     * @example {@paperscript}
     * // Joining two paths that share a point at the start or end of their
     * // segments array:
     * var path = new Path({
     *     segments: [[30, 25], [30, 75]],
     *     strokeColor: 'black'
     * });
     *
     * var path2 = new Path({
     *     segments: [[30, 25], [80, 25]],
     *     strokeColor: 'black'
     * });
     *
     * // Join the paths:
     * path.join(path2);
     *
     * // After joining, path with have 3 segments, since it
     * // shared its first segment point with the first
     * // segment point of path2.
     *
     * // Select the path to show that they have joined:
     * path.selected = true;
     *
     * @example {@paperscript}
     * // Joining two paths that connect at two points:
     * var path = new Path({
     *     segments: [[30, 25], [80, 25], [80, 75]],
     *     strokeColor: 'black'
     * });
     *
     * var path2 = new Path({
     *     segments: [[30, 25], [30, 75], [80, 75]],
     *     strokeColor: 'black'
     * });
     *
     * // Join the paths:
     * path.join(path2);
     *
     * // Because the paths were joined at two points, the path is closed
     * // and has 4 segments.
     *
     * // Select the path to show that they have joined:
     * path.selected = true;
     */
    join(path: Path, tolerance?: number): this {
        const epsilon = tolerance || 0
        if (path && path !== this) {
            const segments = path._segments
            const last1 = this.getLastSegment()
            let last2 = path.getLastSegment()
            if (!last2) return this

            if (last1 && last1.point.isClose(last2.point, epsilon))
                path.reverse()

            const first2 = path.getFirstSegment()
            if (last1 && last1.point.isClose(first2.point, epsilon)) {
                last1.setHandleOut(first2.handleOut)
                this._add(segments.slice(1))
            } else {
                const first1 = this.getFirstSegment()
                if (first1 && first1.point.isClose(first2.point, epsilon))
                    path.reverse()

                last2 = path.getLastSegment()

                if (first1 && first1.point.isClose(last2.point, epsilon)) {
                    first1.setHandleIn(last2.handleIn)
                    this._add(segments.slice(0, segments.length - 1), 0)
                } else {
                    this._add(segments.slice())
                }
            }

            if (path._closed) this._add([segments[0]])
            path.remove()
        }

        const first = this.getFirstSegment()
        const last = this.getLastSegment()
        if (first !== last && first.point.isClose(last.point, epsilon)) {
            first.setHandleIn(last.handleIn)
            last.remove()
            this.setClosed(true)
        }

        return this
    }

    /**
     * Reduces the path by removing curves that have a length of 0,
     * and unnecessary segments between two collinear flat curves.
     *
     * @return {Path} the reduced path
     */
    reduce(options: { simplify?: boolean }): this {
        const curves = this.getCurves()
        const simplify = options && options.simplify
        const tolerance = simplify ? Numerical.GEOMETRIC_EPSILON : 0

        for (let i = curves.length - 1; i >= 0; i--) {
            const curve = curves[i]

            if (
                !curve.hasHandles() &&
                (!curve.hasLength(tolerance) ||
                    (simplify && curve.isCollinear(curve.getNext())))
            )
                curve.remove()
        }
        return this
    }

    reverse() {
        this._segments.reverse()
        for (let i = 0, l = this._segments.length; i < l; i++) {
            const segment: any = this._segments[i]
            const handleIn = segment.handleIn
            segment._handleIn = segment.handleOut
            segment._handleOut = handleIn
            segment.index = i
        }
        // Clear curves since it all has changed.
        this._curves = null
        this._changed(Change.GEOMETRY)
    }

    flatten(flatness?: number) {
        const flattener = new PathFlattener(this, flatness || 0.25, 256, true)
        const parts = flattener.parts
        const length = parts.length
        const segments: Segment[] = []
        for (let i = 0; i < length; i++) {
            segments.push(new Segment(parts[i].curve.slice(0, 2)))
        }
        if (!this._closed && length > 0) {
            segments.push(new Segment(parts[length - 1].curve.slice(6)))
        }
        this.setSegments(segments)
    }

    simplify(tolerance?: number) {
        const segments = new PathFitter(this).fit(tolerance || 2.5)
        if (segments) this.setSegments(segments)
        return !!segments
    }

    smooth(options: PathSmoothOptions) {
        const that = this
        const opts = (options || {}) as PathSmoothOptions
        const type = opts.type || 'asymmetric'
        const segments = this._segments
        const length = segments.length
        const closed = this._closed

        function getIndex(value: number | Curve | Segment, _default?: number) {
            let index = value && (value as Curve | Segment).index
            if (
                index != null &&
                (value instanceof Curve || value instanceof Segment)
            ) {
                const path = value.path
                if (path && path !== that)
                    throw new Error(
                        value.class +
                            ' ' +
                            index +
                            ' of ' +
                            path +
                            ' is not part of ' +
                            that
                    )

                if (_default && value instanceof Curve) index++
            } else {
                index = typeof value === 'number' ? value : _default
            }

            return Math.min(
                index < 0 && closed
                    ? index % length
                    : index < 0
                    ? index + length
                    : index,
                length - 1
            )
        }

        const loop = closed && opts.from === undefined && opts.to === undefined
        let from = getIndex(opts.from, 0)
        let to = getIndex(opts.to, length - 1)

        if (from > to) {
            if (closed) {
                from -= length
            } else {
                const tmp = from
                from = to
                to = tmp
            }
        }
        if (/^(?:asymmetric|continuous)$/.test(type)) {
            const asymmetric = type === 'asymmetric'
            const min = Math.min
            const amount = to - from + 1
            let n = amount - 1
            const padding = loop ? min(amount, 4) : 1
            let paddingLeft = padding
            let paddingRight = padding
            const knots = []

            if (!closed) {
                paddingLeft = min(1, from)
                paddingRight = min(1, length - to - 1)
            }

            n += paddingLeft + paddingRight
            if (n <= 1) return
            for (let i = 0, j = from - paddingLeft; i <= n; i++, j++) {
                knots[i] = segments[(j < 0 ? j + length : j) % length].point
            }

            let x = knots[0].x + 2 * knots[1].x
            let y = knots[0].y + 2 * knots[1].y
            let f = 2
            const n1 = n - 1
            const rx = [x]
            const ry = [y]
            const rf = [f]
            const px = []
            const py = []

            for (let i = 1; i < n; i++) {
                const internal = i < n1
                const a = internal ? 1 : asymmetric ? 1 : 2
                const b = internal ? 4 : asymmetric ? 2 : 7
                const u = internal ? 4 : asymmetric ? 3 : 8
                const v = internal ? 2 : asymmetric ? 0 : 1
                const m = a / f
                f = rf[i] = b - m
                x = rx[i] = u * knots[i].x + v * knots[i + 1].x - m * x
                y = ry[i] = u * knots[i].y + v * knots[i + 1].y - m * y
            }

            px[n1] = rx[n1] / rf[n1]
            py[n1] = ry[n1] / rf[n1]
            for (let i = n - 2; i >= 0; i--) {
                px[i] = (rx[i] - px[i + 1]) / rf[i]
                py[i] = (ry[i] - py[i + 1]) / rf[i]
            }
            px[n] = (3 * knots[n].x - px[n1]) / 2
            py[n] = (3 * knots[n].y - py[n1]) / 2

            for (
                let i = paddingLeft, max = n - paddingRight, j = from;
                i <= max;
                i++, j++
            ) {
                const segment = segments[j < 0 ? j + length : j]
                const pt = segment.point
                const hx = px[i] - pt.x
                const hy = py[i] - pt.y
                if (loop || i < max) segment.setHandleOut(hx, hy)
                if (loop || i > paddingLeft) segment.setHandleIn(-hx, -hy)
            }
        } else {
            for (let i = from; i <= to; i++) {
                segments[i < 0 ? i + length : i].smooth(
                    opts as SegmentSmoothOptions,
                    !loop && i === from,
                    !loop && i === to
                )
            }
        }
    }

    /**
     * Attempts to create a new shape item with same geometry as this path item,
     * and inherits all settings from it, similar to {@link Item#clone()}.
     *
     * @param {Boolean} [insert=true] specifies whether the new shape should be
     * inserted into the scene graph. When set to `true`, it is inserted above
     * the path item
     * @return {Shape} the newly created shape item with the same geometry as
     * this path item if it can be matched, `null` otherwise
     * @see Shape#toPath(insert)
     */
    toShape(insert?: boolean): Shape {
        if (!this._closed) return null

        const segments = this._segments
        let Type
        let size
        let radius
        let topCenter

        function isCollinear(i: number, j: number): boolean {
            const seg1 = segments[i]
            const seg2 = seg1.getNext()
            const seg3 = segments[j]
            const seg4 = seg3.getNext()
            return (
                seg1.handleOut.isZero() &&
                seg2.handleIn.isZero() &&
                seg3.handleOut.isZero() &&
                seg4.handleIn.isZero() &&
                seg2.point
                    .subtract(seg1.point)
                    .isCollinear(seg4.point.subtract(seg3.point))
            )
        }

        function isOrthogonal(i: number): boolean {
            const seg2 = segments[i]
            const seg1 = seg2.getPrevious()
            const seg3 = seg2.getNext()
            return (
                seg1.handleOut.isZero() &&
                seg2.handleIn.isZero() &&
                seg2.handleOut.isZero() &&
                seg3.handleIn.isZero() &&
                seg2.point
                    .subtract(seg1.point)
                    .isOrthogonal(seg3.point.subtract(seg2.point))
            )
        }

        function isArc(i: number): boolean {
            const seg1 = segments[i]
            const seg2 = seg1.getNext()
            const handle1 = seg1.handleOut
            const handle2 = seg2.handleIn
            const kappa = Numerical.KAPPA

            if (handle1.isOrthogonal(handle2)) {
                const pt1 = seg1.point
                const pt2 = seg2.point

                const corner = new Line(pt1, handle1, true).intersect(
                    new Line(pt2, handle2, true),
                    true
                )
                return (
                    corner &&
                    Numerical.isZero(
                        handle1.getLength() / corner.subtract(pt1).getLength() -
                            kappa
                    ) &&
                    Numerical.isZero(
                        handle2.getLength() / corner.subtract(pt2).getLength() -
                            kappa
                    )
                )
            }
            return false
        }

        function getDistance(i: number, j: number): number {
            return segments[i].point.getDistance(segments[j].point)
        }

        if (
            !this.hasHandles() &&
            segments.length === 4 &&
            isCollinear(0, 2) &&
            isCollinear(1, 3) &&
            isOrthogonal(1)
        ) {
            Type = Shape.Rectangle
            size = new Size(getDistance(0, 3), getDistance(0, 1))
            topCenter = segments[1].point.add(segments[2].point).divide(2)
        } else if (
            segments.length === 8 &&
            isArc(0) &&
            isArc(2) &&
            isArc(4) &&
            isArc(6) &&
            isCollinear(1, 5) &&
            isCollinear(3, 7)
        ) {
            Type = Shape.Rectangle
            size = new Size(getDistance(1, 6), getDistance(0, 3))
            radius = size
                .subtract(new Size(getDistance(0, 7), getDistance(1, 2)))
                .divide(2)
            topCenter = segments[3].point.add(segments[4].point).divide(2)
        } else if (
            segments.length === 4 &&
            isArc(0) &&
            isArc(1) &&
            isArc(2) &&
            isArc(3)
        ) {
            if (Numerical.isZero(getDistance(0, 2) - getDistance(1, 3))) {
                Type = Shape.Circle
                radius = getDistance(0, 2) / 2
            } else {
                Type = Shape.Ellipse
                radius = new Size(getDistance(2, 0) / 2, getDistance(3, 1) / 2)
            }
            topCenter = segments[1].point
        }

        if (Type) {
            const center = this.getPosition(true)
            const shape = new Type({
                center: center,
                size: size,
                radius: radius,
                insert: false
            })

            shape.copyAttributes(this, true)
            shape.matrix.prepend(this._matrix)
            shape.rotate(topCenter.subtract(center).getAngle() + 90)
            if (insert === undefined || insert) shape.insertAbove(this)
            return shape
        }
        return null
    }

    toPath() {
        return this.clone()
    }

    compare(path: Path) {
        if (!path || path instanceof CompoundPath) return super.compare(path)

        const curves1 = this.getCurves()
        const curves2 = path.getCurves()
        const length1 = curves1.length
        const length2 = curves2.length

        if (!length1 || !length2) {
            return length1 === length2
        }
        let v1 = curves1[0].getValues()
        const values2 = []
        let pos1 = 0
        let pos2
        let end1 = 0
        let end2

        for (let i = 0; i < length2; i++) {
            const v2 = curves2[i].getValues()
            values2.push(v2)
            const overlaps = Curve.getOverlaps(v1, v2)
            if (overlaps) {
                pos2 = !i && overlaps[0][0] > 0 ? length2 - 1 : i
                end2 = overlaps[0][1]
                break
            }
        }

        const abs = Math.abs
        const epsilon = Numerical.CURVETIME_EPSILON
        let v2 = values2[pos2]
        let start2

        while (v1 && v2) {
            const overlaps = Curve.getOverlaps(v1, v2)
            if (overlaps) {
                const t1 = overlaps[0][0]
                if (abs(t1 - end1) < epsilon) {
                    end1 = overlaps[1][0]
                    if (end1 === 1) {
                        v1 = ++pos1 < length1 ? curves1[pos1].getValues() : null
                        end1 = 0
                    }

                    const t2 = overlaps[0][1]
                    if (abs(t2 - end2) < epsilon) {
                        if (!start2) start2 = [pos2, t2]
                        end2 = overlaps[1][1]
                        if (end2 === 1) {
                            if (++pos2 >= length2) pos2 = 0
                            v2 = values2[pos2] || curves2[pos2].getValues()
                            end2 = 0
                        }
                        if (!v1) {
                            return start2[0] === pos2 && start2[1] === end2
                        }
                        continue
                    }
                }
            }
            break
        }
        return false
    }

    _hitTestSelf(
        point: Point,
        options: HitResultOptions,
        _viewMatrix: Matrix,
        strokeMatrix: Matrix
    ): HitResult {
        const that = this
        const style = this.getStyle()
        const segments = this._segments
        const numSegments = segments.length
        const closed = this._closed
        const tolerancePadding = options._tolerancePadding
        let strokePadding = tolerancePadding
        let join: StrokeJoins
        let cap: StrokeCaps
        let miterLimit: number
        let area: Path
        let loc
        let res
        const hitStroke = options.stroke && style.hasStroke()
        const hitFill = options.fill && style.hasFill()
        const hitCurves = options.curves
        const strokeRadius = hitStroke
            ? style.getStrokeWidth() / 2
            : (hitFill && options.tolerance > 0) || hitCurves
            ? 0
            : null

        if (strokeRadius !== null) {
            if (strokeRadius > 0) {
                join = style.getStrokeJoin()
                cap = style.getStrokeCap()
                miterLimit = style.getMiterLimit()
                strokePadding = strokePadding.add(
                    Path._getStrokePadding(strokeRadius, strokeMatrix)
                )
            } else {
                join = cap = 'round'
            }
        }

        function isCloseEnough(pt: Point, padding: Size) {
            return point.subtract(pt).divide(padding).length <= 1
        }

        function checkSegmentPoint(
            seg: Segment,
            pt: LinkedPoint | Point,
            name: HitResultTypes
        ) {
            if (!options.selected || (pt as LinkedPoint).isSelected()) {
                const anchor = seg.point
                if (pt !== anchor) pt = pt.add(anchor)
                if (isCloseEnough(pt, strokePadding)) {
                    return new HitResult(name, that, {
                        segment: seg,
                        point: pt
                    })
                }
            }

            return null
        }

        function checkSegmentPoints(seg: Segment, ends?: boolean) {
            return (
                ((ends || options.segments) &&
                    checkSegmentPoint(seg, seg.point, 'segment')) ||
                (!ends &&
                    options.handles &&
                    (checkSegmentPoint(seg, seg.handleIn, 'handle-in') ||
                        checkSegmentPoint(seg, seg.handleOut, 'handle-out')))
            )
        }

        function addToArea(point: Point) {
            area.add(point)
        }

        function checkSegmentStroke(segment: Segment) {
            const isJoin =
                closed || (segment.index > 0 && segment.index < numSegments - 1)
            if ((isJoin ? join : cap) === 'round') {
                return isCloseEnough(segment.point, strokePadding)
            } else {
                area = new Path({ internal: true, closed: true })
                if (isJoin) {
                    if (!segment.isSmooth()) {
                        Path._addBevelJoin(
                            segment,
                            join,
                            strokeRadius,
                            miterLimit,
                            null,
                            strokeMatrix,
                            addToArea,
                            true
                        )
                    }
                } else if (cap === 'square') {
                    Path._addSquareCap(
                        segment,
                        cap,
                        strokeRadius,
                        null,
                        strokeMatrix,
                        addToArea,
                        true
                    )
                }

                if (!area.isEmpty()) {
                    let loc
                    return (
                        area.contains(point) ||
                        ((loc = area.getNearestLocation(point)) &&
                            isCloseEnough(loc.getPoint(), tolerancePadding))
                    )
                }
            }

            return null
        }

        if (options.ends && !options.segments && !closed) {
            if (
                (res =
                    checkSegmentPoints(segments[0], true) ||
                    checkSegmentPoints(segments[numSegments - 1], true))
            )
                return res
        } else if (options.segments || options.handles) {
            for (let i = 0; i < numSegments; i++)
                if ((res = checkSegmentPoints(segments[i]))) return res
        }
        if (strokeRadius !== null) {
            loc = this.getNearestLocation(point)

            if (loc) {
                const time = loc.getTime()
                if (time === 0 || (time === 1 && numSegments > 1)) {
                    if (!checkSegmentStroke(loc.getSegment())) loc = null
                } else if (!isCloseEnough(loc.getPoint(), strokePadding)) {
                    loc = null
                }
            }

            if (!loc && join === 'miter' && numSegments > 1) {
                for (let i = 0; i < numSegments; i++) {
                    const segment = segments[i]
                    if (
                        point.getDistance(segment.point) <=
                            miterLimit * strokeRadius &&
                        checkSegmentStroke(segment)
                    ) {
                        loc = segment.getLocation()
                        break
                    }
                }
            }
        }

        return (!loc && hitFill && this._contains(point)) ||
            (loc && !hitStroke && !hitCurves)
            ? new HitResult('fill', this)
            : loc
            ? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
                  location: loc,
                  point: loc.getPoint()
              })
            : null
    }

    /**
     * Calculates the point on the path at the given offset.
     *
     * @name Path#getPointAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the point at the given offset
     *
     * @example {@paperscript height=150}
     * // Finding the point on a path at a given offset:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * // We're going to be working with a third of the length
     * // of the path as the offset:
     * var offset = path.length / 3;
     *
     * // Find the point on the path:
     * var point = path.getPointAt(offset);
     *
     * // Create a small circle shaped path at the point:
     * var circle = new Path.Circle({
     *     center: point,
     *     radius: 3,
     *     fillColor: 'red'
     * });
     *
     * @example {@paperscript height=150}
     * // Iterating over the length of a path:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * var amount = 5;
     * var length = path.length;
     * for (var i = 0; i < amount + 1; i++) {
     *     var offset = i / amount * length;
     *
     *     // Find the point on the path at the given offset:
     *     var point = path.getPointAt(offset);
     *
     *     // Create a small circle shaped path at the point:
     *     var circle = new Path.Circle({
     *         center: point,
     *         radius: 3,
     *         fillColor: 'red'
     *     });
     * }
     */
    getPointAt(offset: number): Point {
        const loc = this.getLocationAt(offset)
        return loc && loc.getPoint()
    }

    /**
     * Calculates the normalized tangent vector of the path at the given offset.
     *
     * @name Path#getTangentAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the normalized tangent vector at the given offset
     *
     * @example {@paperscript height=150}
     * // Working with the tangent vector at a given offset:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * // We're going to be working with a third of the length
     * // of the path as the offset:
     * var offset = path.length / 3;
     *
     * // Find the point on the path:
     * var point = path.getPointAt(offset);
     *
     * // Find the tangent vector at the given offset
     * // and give it a length of 60:
     * var tangent = path.getTangentAt(offset) * 60;
     *
     * var line = new Path({
     *     segments: [point, point + tangent],
     *     strokeColor: 'red'
     * })
     *
     * @example {@paperscript height=200}
     * // Iterating over the length of a path:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * var amount = 6;
     * var length = path.length;
     * for (var i = 0; i < amount + 1; i++) {
     *     var offset = i / amount * length;
     *
     *     // Find the point on the path at the given offset:
     *     var point = path.getPointAt(offset);
     *
     *     // Find the tangent vector on the path at the given offset
     *     // and give it a length of 60:
     *     var tangent = path.getTangentAt(offset) * 60;
     *
     *     var line = new Path({
     *         segments: [point, point + tangent],
     *         strokeColor: 'red'
     *     })
     * }
     */
    getTangentAt(offset: number): Point {
        const loc = this.getLocationAt(offset)
        return loc && loc.getTangent()
    }

    /**
     * Calculates the normal vector of the path at the given offset.
     *
     * @name Path#getNormalAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the normal vector at the given offset
     *
     * @example {@paperscript height=150}
     * // Working with the normal vector at a given offset:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * // We're going to be working with a third of the length
     * // of the path as the offset:
     * var offset = path.length / 3;
     *
     * // Find the point on the path:
     * var point = path.getPointAt(offset);
     *
     * // Find the normal vector on the path at the given offset
     * // and give it a length of 30:
     * var normal = path.getNormalAt(offset) * 30;
     *
     * var line = new Path({
     *     segments: [point, point + normal],
     *     strokeColor: 'red'
     * });
     *
     * @example {@paperscript height=200}
     * // Iterating over the length of a path:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * var amount = 10;
     * var length = path.length;
     * for (var i = 0; i < amount + 1; i++) {
     *     var offset = i / amount * length;
     *
     *     // Find the point on the path at the given offset:
     *     var point = path.getPointAt(offset);
     *
     *     // Find the normal vector on the path at the given offset
     *     // and give it a length of 30:
     *     var normal = path.getNormalAt(offset) * 30;
     *
     *     var line = new Path({
     *         segments: [point, point + normal],
     *         strokeColor: 'red'
     *     });
     * }
     */
    getNormalAt(offset: number): Point {
        const loc = this.getLocationAt(offset)
        return loc && loc.getNormal()
    }

    /**
     * Calculates the weighted tangent vector of the path at the given offset.
     *
     * @name Path#getWeightedTangentAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the weighted tangent vector at the given offset
     */
    getWeightedTangentAt(offset: number): Point {
        const loc = this.getLocationAt(offset)
        return loc && loc.getWeightedTangent()
    }

    /**
     * Calculates the weighted normal vector of the path at the given offset.
     *
     * @name Path#getWeightedNormalAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the weighted normal vector at the given offset
     */
    getWeightedNormalAt(offset: number): Point {
        const loc = this.getLocationAt(offset)
        return loc && loc.getWeightedNormal()
    }

    /**
     * Calculates the curvature of the path at the given offset. Curvatures
     * indicate how sharply a path changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The path's radius
     * at the given offset is the reciprocal value of its curvature.
     *
     * @name Path#getCurvatureAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Number} the normal vector at the given offset
     */
    getCurvatureAt(offset: number): number {
        const loc = this.getLocationAt(offset)
        return loc && loc.getCurvature()
    }

    /**
     * {@grouptitle Positions on Paths and Curves}
     *
     * Returns the curve location of the specified point if it lies on the
     * path, `null` otherwise.
     *
     * @param {Point} point the point on the path
     * @return {CurveLocation} the curve location of the specified point
     */
    getLocationOf(x: number, y: number): CurveLocation
    getLocationOf(point: PointType): CurveLocation
    getLocationOf(...args: any[]): CurveLocation
    getLocationOf(...args: any[]): CurveLocation {
        const point = Point.read(args)
        const curves = this.getCurves()
        for (let i = 0, l = curves.length; i < l; i++) {
            const loc = curves[i].getLocationOf(point)
            if (loc) return loc
        }
        return null
    }

    /**
     * Returns the length of the path from its beginning up to up to the
     * specified point if it lies on the path, `null` otherwise.
     *
     * @param {Point} point the point on the path
     * @return {Number} the length of the path up to the specified point
     */
    getOffsetOf(x: number, y: number): number
    getOffsetOf(point: PointType): number
    getOffsetOf(...args: any[]): number {
        const loc = this.getLocationOf(...args)
        return loc ? loc.getOffset() : null
    }

    /**
     * Returns the curve location of the specified offset on the path.
     *
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {CurveLocation} the curve location at the specified offset
     */
    getLocationAt(offset: number | CurveLocation): CurveLocation {
        if (typeof offset === 'number') {
            const curves = this.getCurves()
            let length = 0
            for (let i = 0, l = curves.length; i < l; i++) {
                const start = length
                const curve = curves[i]
                length += curve.getLength()
                if (length > offset) {
                    return curve.getLocationAt(offset - start)
                }
            }

            if (curves.length > 0 && offset <= this.getLength()) {
                return new CurveLocation(curves[curves.length - 1], 1)
            }
        } else if (offset && offset.getPath && offset.getPath() === this) {
            return offset
        }
        return null
    }

    /**
     * Calculates path offsets where the path is tangential to the provided
     * tangent. Note that tangents at the start or end are included. Tangents at
     * segment points are returned even if only one of their handles is
     * collinear with the provided tangent.
     *
     * @param {Point} tangent the tangent to which the path must be tangential
     * @return {Number[]} path offsets where the path is tangential to the
     * provided tangent
     */
    getOffsetsWithTangent(x: number, y: number): number[]
    getOffsetsWithTangent(point: PointType): number[]
    getOffsetsWithTangent(...args: any[]): number[] {
        const tangent = Point.read(args)
        if (tangent.isZero()) {
            return []
        }

        const offsets = []
        let curveStart = 0
        const curves = this.getCurves()
        for (let i = 0, l = curves.length; i < l; i++) {
            const curve = curves[i]
            const curveTimes = curve.getTimesWithTangent(tangent)
            for (let j = 0, m = curveTimes.length; j < m; j++) {
                const offset = curveStart + curve.getOffsetAtTime(curveTimes[j])
                if (offsets.indexOf(offset) < 0) {
                    offsets.push(offset)
                }
            }
            curveStart += curve.length
        }
        return offsets
    }

    private drawHandles(
        ctx: CanvasRenderingContext2D,
        segments: Segment[],
        matrix: Matrix,
        size: number
    ) {
        if (size <= 0) return

        const half = size / 2
        const miniSize = size - 2
        const miniHalf = half - 1
        const coords = new Array(6)
        let pX: number
        let pY: number

        function drawHandle(index: number) {
            const hX = coords[index]
            const hY = coords[index + 1]
            if (pX !== hX || pY !== hY) {
                ctx.beginPath()
                ctx.moveTo(pX, pY)
                ctx.lineTo(hX, hY)
                ctx.stroke()
                ctx.beginPath()
                ctx.arc(hX, hY, half, 0, Math.PI * 2, true)
                ctx.fill()
            }
        }

        for (let i = 0, l = segments.length; i < l; i++) {
            const segment = segments[i]
            const selection = segment.selection
            segment._transformCoordinates(matrix, coords)
            pX = coords[0]
            pY = coords[1]
            if (+selection & SegmentSelection.HANDLE_IN) drawHandle(2)
            if (+selection & SegmentSelection.HANDLE_OUT) drawHandle(4)

            ctx.fillRect(pX - half, pY - half, size, size)

            if (miniSize > 0 && !(+selection & SegmentSelection.POINT)) {
                const fillStyle = ctx.fillStyle
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(pX - miniHalf, pY - miniHalf, miniSize, miniSize)
                ctx.fillStyle = fillStyle
            }
        }
    }

    private drawSegments(
        ctx: CanvasRenderingContext2D,
        path: Path,
        matrix: Matrix
    ) {
        const segments = path._segments
        const length = segments.length
        const coords = new Array(6)
        let first = true
        let curX: number
        let curY: number
        let prevX: number
        let prevY: number
        let inX: number
        let inY: number
        let outX: number
        let outY: number

        function drawSegment(segment: Segment) {
            if (matrix) {
                segment._transformCoordinates(matrix, coords)
                curX = coords[0]
                curY = coords[1]
            } else {
                const point = segment.point
                curX = point.x
                curY = point.y
            }
            if (first) {
                ctx.moveTo(curX, curY)
                first = false
            } else {
                if (matrix) {
                    inX = coords[2]
                    inY = coords[3]
                } else {
                    const handle = segment.handleIn
                    inX = curX + handle.x
                    inY = curY + handle.y
                }
                if (
                    inX === curX &&
                    inY === curY &&
                    outX === prevX &&
                    outY === prevY
                ) {
                    ctx.lineTo(curX, curY)
                } else {
                    ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY)
                }
            }
            prevX = curX
            prevY = curY
            if (matrix) {
                outX = coords[4]
                outY = coords[5]
            } else {
                const handle = segment.handleOut
                outX = prevX + handle.x
                outY = prevY + handle.y
            }
        }

        for (let i = 0; i < length; i++) drawSegment(segments[i])

        if (path._closed && length > 0) drawSegment(segments[0])
    }

    protected _draw(
        ctx: CanvasRenderingContext2D,
        param?: DrawOptions,
        viewMatrix?: Matrix,
        strokeMatrix?: Matrix
    ) {
        const dontStart = param.dontStart
        const dontPaint = param.dontFinish || param.clip
        const style = this.getStyle()
        const hasFill = style.hasFill()
        const hasStroke = style.hasStroke()
        const dashArray = style.getDashArray()
        const paper = PaperScope.paper
        const dashLength =
            !paper.support.nativeDash &&
            hasStroke &&
            dashArray &&
            dashArray.length

        if (!dontStart) ctx.beginPath()

        if (hasFill || (hasStroke && !dashLength) || dontPaint) {
            this.drawSegments(ctx, this, strokeMatrix)
            if (this._closed) ctx.closePath()
        }

        function getOffset(i: number) {
            return dashArray[((i % dashLength) + dashLength) % dashLength]
        }

        if (!dontPaint && (hasFill || hasStroke)) {
            this._setStyles(ctx, param, viewMatrix)
            if (hasFill) {
                ctx.fill(style.getFillRule())
                ctx.shadowColor = 'rgba(0,0,0,0)'
            }

            if (hasStroke) {
                if (dashLength) {
                    if (!dontStart) ctx.beginPath()
                    const flattener = new PathFlattener(
                        this,
                        0.25,
                        32,
                        false,
                        strokeMatrix
                    )
                    const length = flattener.length
                    let from = -style.getDashOffset()
                    let to: number
                    let i = 0

                    while (from > 0) {
                        from -= getOffset(i--) + getOffset(i--)
                    }
                    while (from < length) {
                        to = from + getOffset(i++)
                        if (from > 0 || to > 0)
                            flattener.drawPart(
                                ctx,
                                Math.max(from, 0),
                                Math.max(to, 0)
                            )
                        from = to + getOffset(i++)
                    }
                }
                ctx.stroke()
            }
        }
    }

    _drawSelected(ctx: CanvasRenderingContext2D, matrix: Matrix) {
        const paper = PaperScope.paper
        ctx.beginPath()
        this.drawSegments(ctx, this, matrix)
        ctx.stroke()
        this.drawHandles(ctx, this._segments, matrix, paper.settings.handleSize)
    }

    private getCurrentSegment() {
        const segments = this._segments
        if (!segments.length) throw new Error('Use a moveTo() command first')
        return segments[segments.length - 1]
    }

    moveTo(x: number, y: number): void
    moveTo(point: PointType): void
    moveTo(...args: any[]): void
    moveTo(...args: any[]): void {
        const segments = this._segments
        if (segments.length === 1) this.removeSegment(0)

        if (!segments.length) this._add([new Segment(Point.read(args))])
    }

    moveBy(toX: number, toY: number): void
    moveBy(to: PointType): void
    moveBy(..._args: any[]): void
    moveBy(..._args: any[]): void {
        throw new Error('moveBy() is unsupported on Path items.')
    }

    lineTo(x: number, y: number): void
    lineTo(point: PointType): void
    lineTo(...args: any[]): void
    lineTo(...args: any[]): void {
        this._add([new Segment(Point.read(args))])
    }

    cubicCurveTo(
        handle1X: number,
        handle1Y: number,
        handle2X: number,
        handle2Y: number,
        toX: number,
        toY: number
    ): void

    cubicCurveTo(handle1: PointType, handle2: PointType, to: PointType): void
    cubicCurveTo(...args: any[]): void
    cubicCurveTo(...args: any[]): void {
        const handle1 = Point.read(args)
        const handle2 = Point.read(args)
        const to = Point.read(args)
        const current = this.getCurrentSegment()

        current.setHandleOut(handle1.subtract(current.point))

        this._add([new Segment(to, handle2.subtract(to))])
    }

    quadraticCurveTo(
        handleX: number,
        handleY: number,
        toX: number,
        toY: number
    ): void

    quadraticCurveTo(handle: PointType, to: PointType): void
    quadraticCurveTo(...args: any[]): void
    quadraticCurveTo(...args: any[]): void {
        const handle = Point.read(args)
        const to = Point.read(args)
        const current = this.getCurrentSegment().point

        this.cubicCurveTo(
            handle.add(current.subtract(handle).multiply(1 / 3)),
            handle.add(to.subtract(handle).multiply(1 / 3)),
            to
        )
    }

    curveTo(
        throughX: number,
        throughY: number,
        toX: number,
        toY: number,
        time?: number
    ): void

    curveTo(through: PointType, to: PointType, time?: number): void
    curveTo(...args: any[]): void
    curveTo(...args: any[]): void {
        const through = Point.read(args)
        const to = Point.read(args)
        const t = Base.pick(Base.read(args), 0.5)
        const t1 = 1 - t
        const current = this.getCurrentSegment().point

        const handle = through
            .subtract(current.multiply(t1 * t1))
            .subtract(to.multiply(t * t))
            .divide(2 * t * t1)
        if (handle.isNaN())
            throw new Error(
                'Cannot put a curve through points with parameter = ' + t
            )
        this.quadraticCurveTo(handle, to)
    }

    arcTo(throughX: number, throughY: number, toX: number, toY: number): void
    arcTo(through: PointType, to: PointType): void
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

    arcTo(...args: any[]): void
    arcTo(...args: any[]): void {
        const abs = Math.abs
        const sqrt = Math.sqrt
        const current = this.getCurrentSegment()
        const from = current.point
        let to = Point.read(args)
        let through: Point
        const peek = Base.peek(args)
        const clockwise = Base.pick(peek, true)

        let center
        let extent
        let vector
        let matrix

        if (typeof clockwise === 'boolean') {
            const middle = from.add(to).divide(2)
            through = middle.add(
                middle.subtract(from).rotate(clockwise ? -90 : 90)
            )
        } else if (Base.remain(args) <= 2) {
            through = to
            to = Point.read(args)
        } else if (!from.equals(to)) {
            const radius = Size.read(args)
            const isZero = Numerical.isZero

            if (isZero(radius.width) || isZero(radius.height))
                return this.lineTo(to)

            const rotation = Base.read(args) as unknown as number
            const clockwise = !!Base.read(args)
            const large = !!Base.read(args)
            const middle = from.add(to).divide(2)
            const pt = from.subtract(middle).rotate(-rotation)
            const x = pt.x
            const y = pt.y
            let rx = abs(radius.width)
            let ry = abs(radius.height)
            let rxSq = rx * rx
            let rySq = ry * ry
            const xSq = x * x
            const ySq = y * y

            let factor = sqrt(xSq / rxSq + ySq / rySq)
            if (factor > 1) {
                rx *= factor
                ry *= factor
                rxSq = rx * rx
                rySq = ry * ry
            }
            factor =
                (rxSq * rySq - rxSq * ySq - rySq * xSq) /
                (rxSq * ySq + rySq * xSq)
            if (abs(factor) < Numerical.EPSILON) factor = 0
            if (factor < 0)
                throw new Error('Cannot create an arc with the given arguments')
            center = new Point((rx * y) / ry, (-ry * x) / rx)
                .multiply((large === clockwise ? -1 : 1) * sqrt(factor))
                .rotate(rotation)
                .add(middle)

            matrix = new Matrix()
                .translate(center)
                .rotate(rotation)
                .scale(rx, ry)

            vector = matrix.inverseTransform(from)
            extent = vector.getDirectedAngle(matrix.inverseTransform(to))

            if (!clockwise && extent > 0) extent -= 360
            else if (clockwise && extent < 0) extent += 360
        }
        if (through) {
            const l1 = new Line(
                from.add(through).divide(2),
                through.subtract(from).rotate(90),
                true
            )
            const l2 = new Line(
                through.add(to).divide(2),
                to.subtract(through).rotate(90),
                true
            )
            const line = new Line(from, to)
            const throughSide = line.getSide(through)
            center = l1.intersect(l2, true)

            if (!center) {
                if (!throughSide) return this.lineTo(to)
                throw new Error('Cannot create an arc with the given arguments')
            }
            vector = from.subtract(center)
            extent = vector.getDirectedAngle(to.subtract(center))
            const centerSide = line.getSide(center, true)
            if (centerSide === 0) {
                extent = throughSide * abs(extent)
            } else if (throughSide === centerSide) {
                extent += extent < 0 ? 360 : -360
            }
        }
        if (extent) {
            const epsilon = Numerical.GEOMETRIC_EPSILON
            const ext = abs(extent)

            const count = ext >= 360 ? 4 : Math.ceil((ext - epsilon) / 90)
            const inc = extent / count
            const half = (inc * Math.PI) / 360
            const z = ((4 / 3) * Math.sin(half)) / (1 + Math.cos(half))
            const segments: Segment[] = []
            for (let i = 0; i <= count; i++) {
                let pt = to
                let out = null
                if (i < count) {
                    out = vector.rotate(90).multiply(z)
                    if (matrix) {
                        pt = matrix.transformPoint(vector)
                        out = matrix
                            .transformPoint(vector.add(out))
                            .subtract(pt)
                    } else {
                        pt = center.add(vector)
                    }
                }
                if (!i) {
                    current.setHandleOut(out)
                } else {
                    let _in = vector.rotate(-90).multiply(z)
                    if (matrix) {
                        _in = matrix
                            .transformPoint(vector.add(_in))
                            .subtract(pt)
                    }
                    segments.push(new Segment(pt, _in, out))
                }
                vector = vector.rotate(inc)
            }
            this._add(segments)
        }
    }

    lineBy(x: number, y: number): void
    lineBy(point: PointType): void
    lineBy(...args: any[]): void
    lineBy(...args: any[]): void {
        const to = Point.read(args)
        const current = this.getCurrentSegment().point
        this.lineTo(current.add(to))
    }

    curveBy(
        throughX: number,
        throughY: number,
        toX: number,
        toY: number,
        time?: number
    ): void

    curveBy(through: PointType, to: PointType, time?: number): void
    curveBy(...args: any[]): void
    curveBy(...args: any[]): void {
        const through = Point.read(args)
        const to = Point.read(args)
        const parameter = Base.read(args) as unknown as number
        const current = this.getCurrentSegment().point
        this.curveTo(current.add(through), current.add(to), parameter)
    }

    cubicCurveBy(
        handle1X: number,
        handle1Y: number,
        handle2X: number,
        handle2Y: number,
        toX: number,
        toY: number
    ): void

    cubicCurveBy(handle1: PointType, handle2: PointType, to: PointType): void
    cubicCurveBy(...args: any[]): void
    cubicCurveBy(...args: any[]): void {
        const handle1 = Point.read(args)
        const handle2 = Point.read(args)
        const to = Point.read(args)
        const current = this.getCurrentSegment().point
        this.cubicCurveTo(
            current.add(handle1),
            current.add(handle2),
            current.add(to)
        )
    }

    quadraticCurveBy(
        throughX: number,
        throughY: number,
        toX: number,
        toY: number
    ): void

    quadraticCurveBy(through: PointType, to: PointType): void
    quadraticCurveBy(...args: any[]): void
    quadraticCurveBy(...args: any[]): void {
        const handle = Point.read(args)
        const to = Point.read(args)
        const current = this.getCurrentSegment().point
        this.quadraticCurveTo(current.add(handle), current.add(to))
    }

    arcBy(throughX: number, throughY: number, toX: number, toY: number): void
    arcBy(through: PointType, to: PointType): void
    arcBy(x: number, y: number, clockwise: boolean): void
    arcBy(point: PointType, clockwise: boolean): void
    arcBy(...args: any[]): void
    arcBy(...args: any[]): void {
        const current = this.getCurrentSegment().point
        const point = current.add(Point.read(args))
        const clockwise = Base.pick(Base.peek(args), true)
        if (typeof clockwise === 'boolean') {
            this.arcTo(point, clockwise)
        } else {
            this.arcTo(point, current.add(Point.read(args)))
        }
    }

    closePath(tolerance?: number) {
        this.setClosed(true)
        this.join(this, tolerance)
    }

    protected _getBounds(matrix: Matrix, options: BoundsOptions) {
        const method = options.handle
            ? 'getHandleBounds'
            : options.stroke
            ? 'getStrokeBounds'
            : 'getBounds'
        return Path[method](this._segments, this._closed, this, matrix, options)
    }

    static getBounds(
        segments: Segment[],
        closed: boolean,
        _path: Path,
        matrix?: Matrix,
        _options?: BoundsOptions,
        strokePadding?: number[]
    ) {
        const first = segments[0]

        if (!first) return new Rectangle()
        let coords = new Array(6)
        let prevCoords = first._transformCoordinates(matrix, new Array(6))
        const min = prevCoords.slice(0, 2)
        const max = min.slice()
        const roots = new Array(2)

        function processSegment(segment: Segment) {
            segment._transformCoordinates(matrix, coords)
            for (let i = 0; i < 2; i++) {
                Curve._addBounds(
                    prevCoords[i],
                    prevCoords[i + 4],
                    coords[i + 2],
                    coords[i],
                    i,
                    strokePadding ? strokePadding[i] : 0,
                    min,
                    max,
                    roots
                )
            }
            const tmp = prevCoords
            prevCoords = coords
            coords = tmp
        }

        for (let i = 1, l = segments.length; i < l; i++)
            processSegment(segments[i])
        if (closed) processSegment(first)
        return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1])
    }

    static getStrokeBounds(
        segments: Segment[],
        closed: boolean,
        path: Path,
        matrix?: Matrix,
        options?: BoundsOptions
    ) {
        const style = path.getStyle()
        const stroke = style.hasStroke()
        const strokeWidth = style.getStrokeWidth()
        const strokeMatrix = stroke && path._getStrokeMatrix(matrix, options)
        const strokePadding =
            stroke && Path._getStrokePadding(strokeWidth, strokeMatrix)

        let bounds = Path.getBounds(
            segments,
            closed,
            path,
            matrix,
            options,
            strokePadding
        )
        if (!stroke) return bounds
        const strokeRadius = strokeWidth / 2
        const join = style.getStrokeJoin()
        const cap = style.getStrokeCap()
        const miterLimit = style.getMiterLimit()
        const joinBounds = new Rectangle(new Size(strokePadding))

        function addPoint(point: Point) {
            bounds = bounds.include(point)
        }

        function addRound(segment: Segment) {
            bounds = bounds.unite(
                joinBounds.setCenter(segment.point.transform(matrix))
            )
        }

        function addJoin(segment: Segment, join: StrokeJoins) {
            if (join === 'round' || segment.isSmooth()) {
                addRound(segment)
            } else {
                Path._addBevelJoin(
                    segment,
                    join,
                    strokeRadius,
                    miterLimit,
                    matrix,
                    strokeMatrix,
                    addPoint
                )
            }
        }

        function addCap(segment: Segment, cap: StrokeCaps) {
            if (cap === 'round') {
                addRound(segment)
            } else {
                Path._addSquareCap(
                    segment,
                    cap,
                    strokeRadius,
                    matrix,
                    strokeMatrix,
                    addPoint
                )
            }
        }

        const length = segments.length - (closed ? 0 : 1)
        if (length > 0) {
            for (let i = 1; i < length; i++) {
                addJoin(segments[i], join)
            }
            if (closed) {
                addJoin(segments[0], join)
            } else {
                addCap(segments[0], cap)
                addCap(segments[segments.length - 1], cap)
            }
        }
        return bounds
    }

    /**
     * Returns the horizontal and vertical padding that a transformed round
     * stroke adds to the bounding box, by calculating the dimensions of a
     * rotated ellipse.
     */
    static _getStrokePadding(radius: number, matrix: Matrix) {
        if (!matrix) return [radius, radius]

        const hor = new Point(radius, 0).transform(matrix)
        const ver = new Point(0, radius).transform(matrix)
        const phi = hor.getAngleInRadians()
        const a = hor.getLength()
        const b = ver.getLength()
        const sin = Math.sin(phi)
        const cos = Math.cos(phi)
        const tan = Math.tan(phi)
        const tx = Math.atan2(b * tan, a)
        const ty = Math.atan2(b, tan * a)

        return [
            Math.abs(a * Math.cos(tx) * cos + b * Math.sin(tx) * sin),
            Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)
        ]
    }

    static _addBevelJoin(
        segment: Segment,
        join: StrokeJoins,
        radius: number,
        miterLimit: number,
        matrix: Matrix,
        strokeMatrix: Matrix,
        addPoint: (point: Point) => void,
        isArea?: boolean
    ) {
        const curve2 = segment.getCurve()
        const curve1 = curve2.getPrevious()
        const point = curve2.getPoint1().transform(matrix)
        let normal1 = curve1
            .getNormalAtTime(1)
            .multiply(radius)
            .transform(strokeMatrix)
        let normal2 = curve2
            .getNormalAtTime(0)
            .multiply(radius)
            .transform(strokeMatrix)
        const angle = normal1.getDirectedAngle(normal2)

        if (angle < 0 || angle >= 180) {
            normal1 = normal1.negate()
            normal2 = normal2.negate()
        }
        if (isArea) addPoint(point)
        addPoint(point.add(normal1))

        if (join === 'miter') {
            const corner = new Line(
                point.add(normal1),
                new Point(-normal1.y, normal1.x),
                true
            ).intersect(
                new Line(
                    point.add(normal2),
                    new Point(-normal2.y, normal2.x),
                    true
                ),
                true
            )
            if (corner && point.getDistance(corner) <= miterLimit * radius) {
                addPoint(corner)
            }
        }

        addPoint(point.add(normal2))
    }

    protected static _addSquareCap(
        segment: Segment,
        cap: StrokeCaps,
        radius: number,
        matrix: Matrix,
        strokeMatrix: Matrix,
        addPoint: (point: Point) => void,
        isArea?: boolean
    ) {
        let point = segment.point.transform(matrix)
        const loc = segment.getLocation()

        const normal = loc
            .getNormal()
            .multiply(loc.getTime() === 0 ? radius : -radius)
            .transform(strokeMatrix)

        if (cap === 'square') {
            if (isArea) {
                addPoint(point.subtract(normal))
                addPoint(point.add(normal))
            }
            point = point.add(normal.rotate(-90))
        }
        addPoint(point.add(normal))
        addPoint(point.subtract(normal))
    }

    static getHandleBounds(
        segments: Segment[],
        _closed: boolean,
        path: Path,
        matrix?: Matrix,
        options?: BoundsOptions
    ) {
        const style = path.getStyle()
        const stroke = options.stroke && style.hasStroke()
        let strokePadding
        let joinPadding
        if (stroke) {
            const strokeMatrix = path._getStrokeMatrix(matrix, options)
            const strokeRadius = style.getStrokeWidth() / 2
            let joinRadius = strokeRadius
            if (style.getStrokeJoin() === 'miter')
                joinRadius = strokeRadius * style.getMiterLimit()
            if (style.getStrokeCap() === 'square')
                joinRadius = Math.max(joinRadius, strokeRadius * Math.SQRT2)
            strokePadding = Path._getStrokePadding(strokeRadius, strokeMatrix)
            joinPadding = Path._getStrokePadding(joinRadius, strokeMatrix)
        }
        const coords = new Array(6)
        let x1 = Infinity
        let x2 = -x1
        let y1 = x1
        let y2 = x2
        for (let i = 0, l = segments.length; i < l; i++) {
            const segment = segments[i]
            segment._transformCoordinates(matrix, coords)
            for (let j = 0; j < 6; j += 2) {
                const padding = !j ? joinPadding : strokePadding
                const paddingX = padding ? padding[0] : 0
                const paddingY = padding ? padding[1] : 0
                const x = coords[j]
                const y = coords[j + 1]
                const xn = x - paddingX
                const xx = x + paddingX
                const yn = y - paddingY
                const yx = y + paddingY
                if (xn < x1) x1 = xn
                if (xx > x2) x2 = xx
                if (yn < y1) y1 = yn
                if (yx > y2) y2 = yx
            }
        }
        return new Rectangle(x1, y1, x2 - x1, y2 - y1)
    }

    private static createPath(
        segments: Segment[],
        closed: boolean,
        args: object
    ) {
        const props = Base.getNamed(args)
        const path = new Path(props && props.insert === false && Item.NO_INSERT)
        path._add(segments)
        path._closed = closed

        return path.set(props, { insert: true })
    }

    private static createEllipse(center: Point, radius: Size, args: object) {
        const segments = new Array(4)
        for (let i = 0; i < 4; i++) {
            const segment = Path.ellipseSegments[i]
            segments[i] = new Segment(
                segment.point.multiply(radius).add(center),
                segment.handleIn.multiply(radius),
                segment.handleOut.multiply(radius)
            )
        }
        return Path.createPath(segments, true, args)
    }

    /**
     * {@grouptitle Shaped Paths}
     *
     * Creates a linear path item from two points describing a line.
     *
     * @name Path.Line
     * @param {Point} from the line's starting point
     * @param {Point} to the line's ending point
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var from = new Point(20, 20);
     * var to = new Point(80, 80);
     * var path = new Path.Line(from, to);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a linear path item from the properties described by an object
     * literal.
     *
     * @name Path.Line
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Line({
     *     from: [20, 20],
     *     to: [80, 80],
     *     strokeColor: 'black'
     * });
     */
    static get Line(): {
        (fromX: number, fromY: number, toX: number, toY: number): Path
        (from: PointType, to: PointType): Path
        (object?: object): Path
        new (fromX: number, fromY: number, toX: number, toY: number): Path
        new (from: PointType, to: PointType): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            return Path.createPath(
                [
                    new Segment(Point.readNamed(args, 'from')),
                    new Segment(Point.readNamed(args, 'to'))
                ],
                false,
                args
            )
        } as any
    }

    /**
     * Creates a circular path item.
     *
     * @name Path.Circle
     * @param {Point} center the center point of the circle
     * @param {Number} radius the radius of the circle
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Circle(new Point(80, 50), 30);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a circular path item from the properties described by an
     * object literal.
     *
     * @name Path.Circle
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 30,
     *     strokeColor: 'black'
     * });
     */
    static get Circle(): {
        (centerX: number, centerY: number, radius: number): Path
        (center: PointType, radius: number): Path
        (object?: object): Path
        new (centerX: number, centerY: number, radius: number): Path
        new (center: PointType, radius: number): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            const center = Point.readNamed(args, 'center')
            const radius = Base.readNamed(args, 'radius') as Size

            return Path.createEllipse(center, new Size(radius), args)
        } as any
    }

    /**
     * Creates a rectangular path item, with optionally rounded corners.
     *
     * @name Path.Rectangle
     * @param {Rectangle} rectangle the rectangle object describing the
     * geometry of the rectangular path to be created
     * @param {Size} [radius=null] the size of the rounded corners
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
     * var path = new Path.Rectangle(rectangle);
     * path.strokeColor = 'black';
     *
     * @example {@paperscript} // The same, with rounder corners
     * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
     * var cornerSize = new Size(10, 10);
     * var path = new Path.Rectangle(rectangle, cornerSize);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a rectangular path item from a point and a size object.
     *
     * @name Path.Rectangle
     * @param {Point} point the rectangle's top-left corner.
     * @param {Size} size the rectangle's size.
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var point = new Point(20, 20);
     * var size = new Size(60, 60);
     * var path = new Path.Rectangle(point, size);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a rectangular path item from the passed points. These do not
     * necessarily need to be the top left and bottom right corners, the
     * constructor figures out how to fit a rectangle between them.
     *
     * @name Path.Rectangle
     * @param {Point} from the first point defining the rectangle
     * @param {Point} to the second point defining the rectangle
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var from = new Point(20, 20);
     * var to = new Point(80, 80);
     * var path = new Path.Rectangle(from, to);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a rectangular path item from the properties described by an
     * object literal.
     *
     * @name Path.Rectangle
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Rectangle({
     *     point: [20, 20],
     *     size: [60, 60],
     *     strokeColor: 'black'
     * });
     *
     * @example {@paperscript}
     * var path = new Path.Rectangle({
     *     from: [20, 20],
     *     to: [80, 80],
     *     strokeColor: 'black'
     * });
     *
     * @example {@paperscript}
     * var path = new Path.Rectangle({
     *     rectangle: {
     *         topLeft: [20, 20],
     *         bottomRight: [80, 80]
     *     },
     *     strokeColor: 'black'
     * });
     *
     * @example {@paperscript}
     * var path = new Path.Rectangle({
     *  topLeft: [20, 20],
     *     bottomRight: [80, 80],
     *     radius: 10,
     *     strokeColor: 'black'
     * });
     */
    static get Rectangle(): {
        (rectangle: RectangleType, radius: SizeType): Path
        (point: PointType, size: SizeType): Path
        (fromt: PointType, to: PointType): Path
        (object?: object): Path
        new (rectangle: RectangleType, radius: SizeType): Path
        new (point: PointType, size: SizeType): Path
        new (fromt: PointType, to: PointType): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            const rect = Rectangle.readNamed(args, 'rectangle')
            let radius = Size.readNamed(args, 'radius', 0, { readNull: true })
            const bl = rect.getBottomLeft(true)
            const tl = rect.getTopLeft(true)
            const tr = rect.getTopRight(true)
            const br = rect.getBottomRight(true)
            let segments
            if (!radius || radius.isZero()) {
                segments = [
                    new Segment(bl),
                    new Segment(tl),
                    new Segment(tr),
                    new Segment(br)
                ]
            } else {
                radius = Size.min(radius, rect.getSize(true).divide(2))
                const rx = radius.width
                const ry = radius.height
                const hx = rx * Path.kappa
                const hy = ry * Path.kappa
                segments = [
                    new Segment(bl.add(rx, 0), null, [-hx, 0]),
                    new Segment(bl.subtract(0, ry), [0, hy]),
                    new Segment(tl.add(0, ry), null, [0, -hy]),
                    new Segment(tl.add(rx, 0), [-hx, 0], null),
                    new Segment(tr.subtract(rx, 0), null, [hx, 0]),
                    new Segment(tr.add(0, ry), [0, -hy], null),
                    new Segment(br.subtract(0, ry), null, [0, hy]),
                    new Segment(br.subtract(rx, 0), [hx, 0])
                ]
            }
            return Path.createPath(segments, true, args)
        } as any
    }

    /**
     * Creates an elliptical path item.
     *
     * @name Path.Ellipse
     * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
     * var path = new Path.Ellipse(rectangle);
     * path.fillColor = 'black';
     */
    /**
     * Creates an elliptical path item from the properties described by an
     * object literal.
     *
     * @name Path.Ellipse
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Ellipse({
     *     point: [20, 20],
     *     size: [180, 60],
     *     fillColor: 'black'
     * });
     *
     * @example {@paperscript} // Placing by center and radius
     * var shape = new Path.Ellipse({
     *     center: [110, 50],
     *     radius: [90, 30],
     *     fillColor: 'black'
     * });
     */
    static get Ellipse(): {
        (rectangle: RectangleType, radius: SizeType): Path
        (point: PointType, size: SizeType): Path
        (fromt: PointType, to: PointType): Path
        (object?: object): Path
        new (rectangle: RectangleType, radius: SizeType): Path
        new (point: PointType, size: SizeType): Path
        new (fromt: PointType, to: PointType): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            const ellipse = Shape._readEllipse(args)
            return Path.createEllipse(ellipse.center, ellipse.radius, args)
        } as any
    }

    /**
     * Creates a circular arc path item.
     *
     * @name Path.Arc
     * @param {Point} from the starting point of the circular arc
     * @param {Point} through the point the arc passes through
     * @param {Point} to the end point of the arc
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var from = new Point(20, 20);
     * var through = new Point(60, 20);
     * var to = new Point(80, 80);
     * var path = new Path.Arc(from, through, to);
     * path.strokeColor = 'black';
     *
     */
    /**
     * Creates an circular arc path item from the properties described by an
     * object literal.
     *
     * @name Path.Arc
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Arc({
     *     from: [20, 20],
     *     through: [60, 20],
     *     to: [80, 80],
     *     strokeColor: 'black'
     * });
     */
    static get Arc(): {
        (
            fromX: PointType,
            fromY: PointType,
            throughX: PointType,
            throughY: PointType,
            toX: PointType,
            toY: PointType
        ): Path
        (from: PointType, through: PointType, to: PointType): Path
        (object?: object): Path
        new (
            fromX: PointType,
            fromY: PointType,
            throughX: PointType,
            throughY: PointType,
            toX: PointType,
            toY: PointType
        ): Path
        new (from: PointType, through: PointType, to: PointType): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            const from = Point.readNamed(args, 'from')
            const through = Point.readNamed(args, 'through')
            const to = Point.readNamed(args, 'to')
            const props = Base.getNamed(args)

            const path = new Path(
                props && props.insert === false && Item.NO_INSERT
            )
            path.moveTo(from)
            path.arcTo(through, to)
            return path.set(props)
        } as any
    }

    /**
     * Creates a regular polygon shaped path item.
     *
     * @name Path.RegularPolygon
     * @param {Point} center the center point of the polygon
     * @param {Number} sides the number of sides of the polygon
     * @param {Number} radius the radius of the polygon
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var center = new Point(50, 50);
     * var sides = 3;
     * var radius = 40;
     * var triangle = new Path.RegularPolygon(center, sides, radius);
     * triangle.fillColor = 'black';
     */
    /**
     * Creates a regular polygon shaped path item from the properties
     * described by an object literal.
     *
     * @name Path.RegularPolygon
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var triangle = new Path.RegularPolygon({
     *     center: [50, 50],
     *     sides: 10,
     *     radius: 40,
     *     fillColor: 'black'
     * });
     */
    static get RegularPolygon(): {
        (center: PointType, sides: number, radis: number): Path
        (centerX: number, centerY: number, sides: number, radis: number): Path
        (object?: object): Path
        new (center: PointType, sides: number, radis: number): Path
        new (
            centerX: number,
            centerY: number,
            sides: number,
            radis: number
        ): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            const center = Point.readNamed(args, 'center')
            const sides = Base.readNamed(args, 'sides') as unknown as number
            const radius = Base.readNamed(args, 'radius') as unknown as number
            const step = 360 / sides
            const three = sides % 3 === 0
            const vector = new Point(0, three ? -radius : radius)
            const offset = three ? -1 : 0.5
            const segments = new Array(sides)
            for (let i = 0; i < sides; i++)
                segments[i] = new Segment(
                    center.add(vector.rotate((i + offset) * step))
                )
            return Path.createPath(segments, true, args)
        } as any
    }

    /**
     * Creates a star shaped path item.
     *
     * The largest of `radius1` and `radius2` will be the outer radius of
     * the star. The smallest of radius1 and radius2 will be the inner
     * radius.
     *
     * @name Path.Star
     * @param {Point} center the center point of the star
     * @param {Number} points the number of points of the star
     * @param {Number} radius1
     * @param {Number} radius2
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var center = new Point(50, 50);
     * var points = 12;
     * var radius1 = 25;
     * var radius2 = 40;
     * var path = new Path.Star(center, points, radius1, radius2);
     * path.fillColor = 'black';
     */
    /**
     * Creates a star shaped path item from the properties described by an
     * object literal.
     *
     * @name Path.Star
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path.Star({
     *     center: [50, 50],
     *     points: 12,
     *     radius1: 25,
     *     radius2: 40,
     *     fillColor: 'black'
     * });
     */
    static get Star(): {
        (
            center: PointType,
            points: number,
            radius1: number,
            radius2: number
        ): Path
        (
            centerX: number,
            centerY: number,
            points: number,
            radius1: number,
            radius2: number
        ): Path
        (object?: object): Path
        new (
            center: PointType,
            points: number,
            radius1: number,
            radius2: number
        ): Path
        new (
            centerX: number,
            centerY: number,
            points: number,
            radius1: number,
            radius2: number
        ): Path
        new (object?: object): Path
    } {
        return function (...args: any[]) {
            const center = Point.readNamed(args, 'center')
            const points =
                (Base.readNamed(args, 'points') as unknown as number) * 2
            const radius1 = Base.readNamed(args, 'radius1') as unknown as number
            const radius2 = Base.readNamed(args, 'radius2') as unknown as number
            const step = 360 / points
            const vector = new Point(0, -1)
            const segments = new Array(points)
            for (let i = 0; i < points; i++)
                segments[i] = new Segment(
                    center.add(
                        vector
                            .rotate(step * i)
                            .multiply(i % 2 ? radius2 : radius1)
                    )
                )
            return Path.createPath(segments, true, args)
        } as any
    }
}
