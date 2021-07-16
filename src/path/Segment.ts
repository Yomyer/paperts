import Base, { Dictionary } from '../core/Base'

import { Point as PointType } from '../basic/Type  '
import SegmentPoint from './SegmentPoint'
import { ExportJsonOptions } from '../../dist/core/Base'
import { Change } from '../item'
import { Point } from '../basic'
import { SegmentSelection } from './SegmentSelection'

export default class Segment extends Base {
    protected _class = 'Segment'
    protected _selection = false
    protected _point: SegmentPoint
    protected _handleIn: SegmentPoint
    protected _handleOut: SegmentPoint
    protected _path: Path

    beans = true

    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
     * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
     *     anchor point of the segment that describes the in tangent of the
     *     segment
     * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
     *     anchor point of the segment that describes the out tangent of the
     *     segment
     *
     * @example {@paperscript}
     * var handleIn = new Point(-80, -100);
     * var handleOut = new Point(80, 100);
     *
     * var firstPoint = new Point(100, 50);
     * var firstSegment = new Segment(firstPoint, null, handleOut);
     *
     * var secondPoint = new Point(300, 50);
     * var secondSegment = new Segment(secondPoint, handleIn, null);
     *
     * var path = new Path(firstSegment, secondSegment);
     * path.strokeColor = 'black';
     */
    constructor(point?: PointType, handleIn?: PointType, handleOut?: PointType)

    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Object} object an object containing properties to be set on the
     *     segment
     *
     * @example {@paperscript}
     * // Creating segments using object notation:
     * var firstSegment = new Segment({
     *     point: [100, 50],
     *     handleOut: [80, 100]
     * });
     *
     * var secondSegment = new Segment({
     *     point: [300, 50],
     *     handleIn: [-80, -100]
     * });
     *
     * var path = new Path({
     *     segments: [firstSegment, secondSegment],
     *     strokeColor: 'black'
     * });
     */
    constructor(object: object)

    /**
     * Creates a new Segment object.
     *
     * @param {Number} x the x coordinate of the segment point
     * @param {Number} y the y coordinate of the segment point
     * @param {Number} inX the x coordinate of the the handle point relative to
     * the anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Number} inY the y coordinate of the the handle point relative to
     * the anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Number} outX the x coordinate of the the handle point relative to
     * the anchor point of the segment that describes the out tangent of the
     * segment
     * @param {Number} outY the y coordinate of the the handle point relative to
     * the anchor point of the segment that describes the out tangent of the
     * segment
     *
     * @example {@paperscript}
     * var inX = -80;
     * var inY = -100;
     * var outX = 80;
     * var outY = 100;
     *
     * var x = 100;
     * var y = 50;
     * var firstSegment = new Segment(x, y, inX, inY, outX, outY);
     *
     * var x2 = 300;
     * var y2 = 50;
     * var secondSegment = new Segment( x2, y2, inX, inY, outX, outY);
     *
     * var path = new Path(firstSegment, secondSegment);
     * path.strokeColor = 'black';
     * @ignore
     */
    constructor(
        x: number,
        y: number,
        inX: number,
        inY: number,
        outX: number,
        outY: number
    )

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        const count = args.length
        let point
        let handleIn
        let handleOut
        let selection

        if (count > 0) {
            if (args[0] == null || typeof args[0] === 'object') {
                if (count === 1 && args[0] && 'point' in args[0]) {
                    point = args[0].point
                    handleIn = args[0].handleIn
                    handleOut = args[0].handleOut
                    selection = args[0].selection
                } else {
                    point = args[0]
                    handleIn = args[1]
                    handleOut = args[2]
                    selection = args[3]
                }
            } else {
                point = [args[0], args[1]]
                handleIn = args[2] !== undefined ? [args[2], args[3]] : null
                handleOut = args[4] !== undefined ? [args[4], args[5]] : null
            }
        }
        new SegmentPoint(point, this, '_point')
        new SegmentPoint(handleIn, this, '_handleIn')
        new SegmentPoint(handleOut, this, '_handleOut')
        if (selection) this.setSelection(selection)
    }

    protected _serialize(options?: ExportJsonOptions, dictionary?: Dictionary) {
        const point = this._point
        const selection = this._selection
        const obj =
            selection || this.hasHandles()
                ? [point, this._handleIn, this._handleOut]
                : point
        if (selection) obj.push(selection)
        return Base.serialize(obj, options, true, dictionary)
    }

    protected _changed(point?: SegmentPoint): any {
        const path = this._path
        if (!path) return

        const curves = path._curves
        const index = this._index
        let curve
        if (curves) {
            if (
                (!point || point === this._point || point === this._handleIn) &&
                (curve =
                    index > 0
                        ? curves[index - 1]
                        : path._closed
                        ? curves[curves.length - 1]
                        : null)
            )
                curve._changed()

            if (
                (!point ||
                    point === this._point ||
                    point === this._handleOut) &&
                (curve = curves[index])
            )
                curve._changed()
        }
        path._changed(Change.SEGMENTS)
    }

    /**
     * The anchor point of the segment.
     *
     * @bean
     * @type Point
     */
    getPoint() {
        return this._point
    }

    setPoint(x: number, y: number): void
    setPoint(point: PointType): void
    setPoint(...args: any[]): void {
        this._point.set(Point.read(args))
    }

    get point() {
        return this.getPoint()
    }

    set point(point: PointType) {
        this.setPoint(point)
    }

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the in tangent of the segment.
     *
     * @bean
     * @type Point
     */
    getHandleIn() {
        return this._handleIn
    }

    setHandleIn(x: number, y: number): void
    setHandleIn(point: PointType): void
    setHandleIn(...args: any[]): void {
        this._handleIn.set(Point.read(args))
    }

    get handleIn() {
        return this.getHandleIn()
    }

    set handleIn(point: PointType) {
        this.setHandleIn(point)
    }

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the out tangent of the segment.
     *
     * @bean
     * @type Point
     */
    getHandleOut() {
        return this._handleOut
    }

    setHandleOut(x: number, y: number): void
    setHandleOut(point: PointType): void
    setHandleOut(...args: any[]): void {
        this._handleOut.set(Point.read(args))
    }

    get handleOut() {
        return this.getHandleOut()
    }

    set handleOut(point: PointType) {
        this.setHandleOut(point)
    }

    /**
     * Checks if the segment has any curve handles set.
     *
     * @return {Boolean} {@true if the segment has handles set}
     * @see Segment#handleIn
     * @see Segment#handleOut
     * @see Curve#hasHandles()
     * @see Path#hasHandles()
     */
    hasHandles(): boolean {
        return !this._handleIn.isZero() || !this._handleOut.isZero()
    }

    /**
     * Checks if the segment connects two curves smoothly, meaning that its two
     * handles are collinear and segment does not form a corner.
     *
     * @return {Boolean} {@true if the segment is smooth}
     * @see Point#isCollinear()
     */
    isSmooth(): boolean {
        const handleIn = this._handleIn
        const handleOut = this._handleOut
        return (
            !handleIn.isZero() &&
            !handleOut.isZero() &&
            handleIn.isCollinear(handleOut)
        )
    }

    /**
     * Clears the segment's handles by setting their coordinates to zero,
     * turning the segment into a corner.
     */
    clearHandles() {
        this._handleIn._set(0, 0)
        this._handleOut._set(0, 0)
    }

    getSelection() {
        return this._selection
    }

    setSelection(selection: boolean) {
        const oldSelection = this._selection
        const path = this._path

        this._selection = selection = selection || false

        if (path && selection !== oldSelection) {
            path._updateSelection(this, oldSelection, selection)
            path._changed(Change.ATTRIBUTE)
        }
    }

    get selection() {
        return this.getSelection()
    }

    set selection(selection: boolean) {
        this.setSelection(selection)
    }

    _changeSelection(flag: SegmentSelection, selected: boolean) {
        const selection = this._selection
        this.setSelection(!!(selected ? +selection | flag : +selection & ~flag))
    }

    /**
     * Specifies whether the segment is selected.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40
     * });
     *
     * // Select the third segment point:
     * path.segments[2].selected = true;
     */
    isSelected() {
        return !!(+this._selection & SegmentSelection.ALL)
    }

    setSelected(selected: boolean) {
        this._changeSelection(SegmentSelection.ALL, selected)
    }

    /**
     * {@grouptitle Hierarchy}
     *
     * The index of the segment in the {@link Path#segments} array that the
     * segment belongs to.
     *
     * @bean
     * @type Number
     */
    getIndex() {
        return this._index !== undefined ? this._index : null
    }

    get index() {
        return this.getIndex()
    }

    /**
     * The path that the segment belongs to.
     *
     * @bean
     * @type Path
     */
    getPath() {
        return this._path || null
    }

    get path() {
        return this.getPath()
    }

    /**
     * The curve that the segment belongs to. For the last segment of an open
     * path, the previous segment is returned.
     *
     * @bean
     * @type Curve
     */
    getCurve() {
        const path = this._path
        let index = this._index
        if (path) {
            // The last segment of an open path belongs to the last curve.
            if (
                index > 0 &&
                !path._closed &&
                index === path._segments.length - 1
            )
                index--
            return path.getCurves()[index] || null
        }
        return null
    }

    get curve() {
        return this.getCurve()
    }

    /**
     * The curve location that describes this segment's position on the path.
     *
     * @bean
     * @type CurveLocation
     */
    getLocation() {
        const curve = this.getCurve()
        return curve
            ? // Determine whether the parameter for this segment is 0 or 1.
              new CurveLocation(curve, this === curve._segment1 ? 0 : 1)
            : null
    }

    get location() {
        return this.getLocation()
    }
}
