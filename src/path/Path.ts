import Item, { ItemSerializeFields } from '../item/Item'
import PathItem from './PathItem'
import Segment from './Segment'
import Curve from './Curve'
import Base from '../core/Base'
import { Change, ChangeFlag } from '../item'
import CompoundPath from './CompundPath'
import Matrix from '../basic/Matrix'
import Formatter from '../utils/Formatter'
import Point from '../basic/Point'
import { SegmentSelection } from './SegmentSelection'
import ItemSelection from '../item/ItemSelection'
import CurveLocation from './CurveLocation'
import { Numerical } from '../utils'

export type PathSerializeFields = {
    segments: Segment[]
    closed: boolean
} & ItemSerializeFields

type SegmentType = Segment | Point | Number[]

export default class Path extends PathItem {
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
    constructor(object: object)

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

    constructor(...args: any[]) {
        super(...args)
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

    getStyle() {
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

    /**
     * The last Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getLastSegment() {
        return this._segments[this._segments.length - 1]
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

    /**
     * The first Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getFirstCurve() {
        return this.getCurves()[0]
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

    get lenght() {
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
        const area = this._area
        if (area == null) {
            const segments = this._segments
            const closed = this._closed
            let area = 0
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

    setSelection(selection: boolean) {
        if (!(+selection & ItemSelection.ITEM)) this._selectSegments(false)
        super.setSelection(selection)
    }

    _selectSegments(selected: boolean) {
        const segments = this._segments
        const length = segments.length
        const selection = selected ? SegmentSelection.ALL : 0
        this._segmentSelection = selection * length

        for (let i = 0; i < length; i++) segments[i].selection = !!selection
    }

    _updateSelection(
        segment: Segment,
        oldSelection: boolean,
        newSelection: boolean
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
            ? curve._segment1
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
            const segment = this._segments[i]
            const handleIn = segment.handleIn
            segment.handleIn = segment.handleOut
            segment.handleOut = handleIn
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
}
