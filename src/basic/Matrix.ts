import Base, { ExportJsonOptions } from '../core/Base'
import { Change } from '../item/ChangeFlag'
import { Exportable } from '../utils/Decorators'
import Formatter from '../utils/Formatter'
import Point from './Point'
import Rectangle from './Rectangle'
import { Point as PointType, Size as SizeType } from './Types'

@Exportable()
export default class Matrix extends Base {
    protected _class = 'Matrix'
    protected _a: number
    protected _b: number
    protected _c: number
    protected _d: number
    protected _tx: number
    protected _ty: number
    protected _owner: any // Todo change item

    /**
     * Creates a 2D affine transformation matrix that describes the identity
     * transformation.
     *
     * @name Matrix#initialize
     */
    constructor()

    /**
     * Creates a 2D affine transformation matrix.
     *
     * @name Matrix#initialize
     * @param {Number} a the a property of the transform
     * @param {Number} b the b property of the transform
     * @param {Number} c the c property of the transform
     * @param {Number} d the d property of the transform
     * @param {Number} tx the tx property of the transform
     * @param {Number} ty the ty property of the transform
     */
    constructor(
        a: number,
        b: number,
        c: number,
        d: number,
        tx: number,
        ty: number
    )

    /**
     * Creates a 2D affine transformation matrix.
     *
     * @name Matrix#initialize
     * @param {Number[]} values the matrix values to initialize this matrix with
     */
    constructor(values: number[])

    /**
     * Creates a 2D affine transformation matrix.
     *
     * @name Matrix#initialize
     * @param {Matrix} matrix the matrix to copy the values from
     */
    constructor(matrix: Matrix)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        const count = args.length
        let ok = true
        if (count >= 6) {
            this._set(...args)
        } else if (count === 1 || count === 2) {
            if (args[0] instanceof Matrix) {
                this._set(
                    args[0]._a,
                    args[0]._b,
                    args[0]._c,
                    args[0]._d,
                    args[0]._tx,
                    args[0]._ty,
                    args[1]
                )
            } else if (Array.isArray(args[0])) {
                args = args[1] ? args[0].concat([args[1]]) : args[0]
                this._set(...args)
            } else {
                ok = false
            }
        } else if (!count) {
            this.reset()
        } else {
            ok = false
        }
        if (!ok) {
            throw new Error('Unsupported matrix parameters')
        }
        return this
    }

    set(): this
    set(
        a: number,
        b: number,
        c: number,
        d: number,
        tx: number,
        ty: number
    ): this

    set(values: number[]): this
    set(matrix: Matrix): this
    set(...args: any[]): this {
        return this.initialize(...args)
    }

    protected _set(
        a?: number,
        b?: number,
        c?: number,
        d?: number,
        tx?: number,
        ty?: number,
        _dontNotify?: boolean
    ) {
        this._a = a
        this._b = b
        this._c = c
        this._d = d
        this._tx = tx
        this._ty = ty
        if (!_dontNotify) this._changed()
        return this
    }

    protected _serialize(options: ExportJsonOptions, dictionary: any) {
        return Base.serialize(this.getValues(), options, true, dictionary)
    }

    protected _changed() {
        const owner = this._owner
        if (owner) {
            if (owner._applyMatrix) {
                owner.transform(null, true)
            } else {
                owner._changed(Change.MATRIX)
            }
        }
    }

    /**
     * @return {Matrix} a copy of this transform
     */
    clone(): Matrix {
        return new Matrix(
            this._a,
            this._b,
            this._c,
            this._d,
            this._tx,
            this._ty
        )
    }

    /**
     * Checks whether the two matrices describe the same transformation.
     *
     * @param {Matrix} matrix the matrix to compare this matrix to
     * @return {Boolean} {@true if the matrices are equal}
     */
    equals(mx: Matrix) {
        return (
            mx === this ||
            (mx &&
                this._a === mx._a &&
                this._b === mx._b &&
                this._c === mx._c &&
                this._d === mx._d &&
                this._tx === mx._tx &&
                this._ty === mx._ty)
        )
    }

    /**
     * @return {String} a string representation of this transform
     */
    toString(): string {
        return (
            '[[' +
            [
                Formatter.number(this._a),
                Formatter.number(this._c),
                Formatter.number(this._tx)
            ].join(', ') +
            '], [' +
            [
                Formatter.number(this._b),
                Formatter.number(this._d),
                Formatter.number(this._ty)
            ].join(', ') +
            ']]'
        )
    }

    /**
     * Resets the matrix by setting its values to the ones of the identity
     * matrix that results in no transformation.
     */
    reset(_dontNotify?: boolean) {
        this._a = this._d = 1
        this._b = this._c = this._tx = this._ty = 0
        if (!_dontNotify) this._changed()
        return this
    }

    /**
     * Attempts to apply the matrix to the content of item that it belongs to,
     * meaning its transformation is baked into the item's content or children.
     *
     * @param {Boolean} [recursively=true] controls whether to apply
     *     transformations recursively on children
     * @return {Boolean} {@true if the matrix was applied}
     */
    apply(recursively: boolean, _setApplyMatrix: any): boolean {
        const owner = this._owner
        if (owner) {
            owner.transform(null, Base.pick(recursively, true), _setApplyMatrix)
            // If the matrix was successfully applied, it will be reset now.
            return this.isIdentity()
        }
        return false
    }

    /**
     * Concatenates this matrix with a translate transformation.
     *
     * @name Matrix#translate
     * @function
     * @param {Point} point the vector to translate by
     * @return {Matrix} this affine transform
     */
    translate(point: Point): Matrix

    /**
     * Concatenates this matrix with a translate transformation.
     *
     * @name Matrix#translate
     * @function
     * @param {Number} dx the distance to translate in the x direction
     * @param {Number} dy the distance to translate in the y direction
     * @return {Matrix} this affine transform
     */
    translate(dx: number, dy: number): Matrix
    translate(...args: any[]): Matrix {
        const point = Point.read(args)
        const x = point.x
        const y = point.y
        this._tx += x * this._a + y * this._c
        this._ty += x * this._b + y * this._d
        this._changed()
        return this
    }

    /**
     * Concatenates this matrix with a scaling transformation.
     *
     * @name Matrix#scale
     * @function
     * @param {Number} scale the scaling factor
     * @param {Point} [center] the center for the scaling transformation
     * @return {Matrix} this affine transform
     */
    scale(scale: number, center?: Point): Matrix

    /**
     * Concatenates this matrix with a scaling transformation.
     *
     * @name Matrix#scale
     * @function
     * @param {Number} hor the horizontal scaling factor
     * @param {Number} ver the vertical scaling factor
     * @param {Point} [center] the center for the scaling transformation
     * @return {Matrix} this affine transform
     */
    scale(hor: number, ver: number, center?: Point): Matrix

    scale(...args: any[]): Matrix {
        const scale = Point.read(args)
        const center = Point.read(args, 0, { readNull: true })
        if (center) this.translate(center)
        this._a *= scale.x
        this._b *= scale.x
        this._c *= scale.y
        this._d *= scale.y
        if (center) this.translate(center.negate())
        this._changed()
        return this
    }

    /**
     * Concatenates this matrix with a rotation transformation around an
     * anchor point.
     *
     * @name Matrix#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Point} center the anchor point to rotate around
     * @return {Matrix} this affine transform
     */
    rotate(angle: number, number?: number): Matrix
    rotate(angle: number, array?: number[]): Matrix
    rotate(angle: number, point?: PointType): Matrix
    rotate(angle: number, size?: SizeType): Matrix
    rotate(angle: number, center?: Point): Matrix

    /**
     * Concatenates this matrix with a rotation transformation around an
     * anchor point.
     *
     * @name Matrix#rotate
     * @function
     * @param {Number} angle the angle of rotation measured in degrees
     * @param {Number} x the x coordinate of the anchor point
     * @param {Number} y the y coordinate of the anchor point
     * @return {Matrix} this affine transform
     */
    rotate(angle: number, x?: number, y?: number): Matrix
    rotate(...args: any[]): Matrix {
        const angle = (args[0] * Math.PI) / 180
        const center = Point.read(args, 1)
        const x = center.x
        const y = center.y
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        const tx = x - x * cos + y * sin
        const ty = y - x * sin - y * cos
        const a = this._a
        const b = this._b
        const c = this._c
        const d = this._d
        this._a = cos * a + sin * c
        this._b = cos * b + sin * d
        this._c = -sin * a + cos * c
        this._d = -sin * b + cos * d
        this._tx += tx * a + ty * c
        this._ty += tx * b + ty * d
        this._changed()
        return this
    }

    /**
     * Concatenates this matrix with a shear transformation.
     *
     * @name Matrix#shear
     * @function
     * @param {Point} shear the shear factor in x and y direction
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    shear(shear: Point, center?: Point): Matrix
    /**
     * Concatenates this matrix with a shear transformation.
     *
     * @name Matrix#shear
     * @function
     * @param {Number} hor the horizontal shear factor
     * @param {Number} ver the vertical shear factor
     * @param {Point} [center] the center for the shear transformation
     * @return {Matrix} this affine transform
     */
    shear(hor: number, ver: number, center?: Point): Matrix
    shear(...args: any[]): Matrix {
        const shear = Point.read(args)
        const center = Point.read(args, 0, { readNull: true })
        if (center) this.translate(center)
        const a = this._a
        const b = this._b
        this._a += shear.y * this._c
        this._b += shear.y * this._d
        this._c += shear.x * a
        this._d += shear.x * b
        if (center) this.translate(center.negate())
        this._changed()
        return this
    }

    /**
     * Concatenates this matrix with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Point} skew the skew angles in x and y direction in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew(skew: Point, center?: Point): Matrix
    /**
     * Concatenates this matrix with a skew transformation.
     *
     * @name Matrix#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical skew angle in degrees
     * @param {Point} [center] the center for the skew transformation
     * @return {Matrix} this affine transform
     */
    skew(hor: number, ver: number, center?: Point): Matrix
    skew(...args: any[]): Matrix {
        const skew = Point.read(args)
        const center = Point.read(args, 0, { readNull: true })
        const toRadians = Math.PI / 180
        const shear = new Point(
            Math.tan(skew.x * toRadians),
            Math.tan(skew.y * toRadians)
        )
        return this.shear(shear, center)
    }

    /**
     * Appends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} this matrix, modified
     */
    append(mx: Matrix, _dontNotify?: boolean): this {
        if (mx) {
            const a1 = this._a
            const b1 = this._b
            const c1 = this._c
            const d1 = this._d
            const a2 = mx._a
            const b2 = mx._c
            const c2 = mx._b
            const d2 = mx._d
            const tx2 = mx._tx
            const ty2 = mx._ty
            this._a = a2 * a1 + c2 * c1
            this._c = b2 * a1 + d2 * c1
            this._b = a2 * b1 + c2 * d1
            this._d = b2 * b1 + d2 * d1
            this._tx += tx2 * a1 + ty2 * c1
            this._ty += tx2 * b1 + ty2 * d1
            if (!_dontNotify) this._changed()
        }
        return this
    }

    /**
     * Prepends the specified matrix to this matrix. This is the equivalent of
     * multiplying `(specified matrix) * (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} this matrix, modified
     */
    prepend(mx: Matrix, _dontNotify?: boolean): this {
        if (mx) {
            const a1 = this._a
            const b1 = this._b
            const c1 = this._c
            const d1 = this._d
            const tx1 = this._tx
            const ty1 = this._ty
            const a2 = mx._a
            const b2 = mx._c
            const c2 = mx._b
            const d2 = mx._d
            const tx2 = mx._tx
            const ty2 = mx._ty
            this._a = a2 * a1 + b2 * b1
            this._c = a2 * c1 + b2 * d1
            this._b = c2 * a1 + d2 * b1
            this._d = c2 * c1 + d2 * d1
            this._tx = a2 * tx1 + b2 * ty1 + tx2
            this._ty = c2 * tx1 + d2 * ty1 + ty2
            if (!_dontNotify) this._changed()
        }
        return this
    }

    /**
     * Returns a new matrix as the result of appending the specified matrix to
     * this matrix. This is the equivalent of multiplying
     * `(this matrix) * (specified matrix)`.
     *
     * @param {Matrix} matrix the matrix to append
     * @return {Matrix} the newly created matrix
     */
    appended(mx: Matrix): Matrix {
        return this.clone().append(mx)
    }

    /**
     * Returns a new matrix as the result of prepending the specified matrix
     * to this matrix. This is the equivalent of multiplying
     * `(specified matrix) * (this matrix)`.
     *
     * @param {Matrix} matrix the matrix to prepend
     * @return {Matrix} the newly created matrix
     */
    prepended(mx: Matrix): Matrix {
        return this.clone().prepend(mx)
    }

    /**
     * Inverts the matrix, causing it to perform the opposite transformation.
     * If the matrix is not invertible (in which case {@link #isSingular()}
     * returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    invert(): Matrix {
        const a = this._a
        const b = this._b
        const c = this._c
        const d = this._d
        const tx = this._tx
        const ty = this._ty
        const det = a * d - b * c
        let res = null
        if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
            this._a = d / det
            this._b = -b / det
            this._c = -c / det
            this._d = a / det
            this._tx = (c * ty - d * tx) / det
            this._ty = (b * tx - a * ty) / det
            res = this
        }
        return res
    }

    /**
     * Creates a new matrix that is the inversion of this matrix, causing it to
     * perform the opposite transformation. If the matrix is not invertible (in
     * which case {@link #isSingular()} returns true), `null` is returned.
     *
     * @return {Matrix} this matrix, or `null`, if the matrix is singular.
     */
    inverted(): Matrix {
        return this.clone().invert()
    }

    /**
     * A private helper function to create a clone of this matrix, without the
     * translation factored in.
     *
     * @return {Matrix} a clone of this matrix, with {@link #tx} and {@link #ty}
     * set to `0`.
     */
    protected _shiftless(): Matrix {
        return new Matrix(this._a, this._b, this._c, this._d, 0, 0)
    }

    _orNullIfIdentity() {
        return this.isIdentity() ? null : this
    }

    /**
     * @return {Boolean} whether this matrix is the identity matrix
     */
    isIdentity(): boolean {
        return (
            this._a === 1 &&
            this._b === 0 &&
            this._c === 0 &&
            this._d === 1 &&
            this._tx === 0 &&
            this._ty === 0
        )
    }

    /**
     * Checks whether the matrix is invertible. A matrix is not invertible if
     * the determinant is 0 or any value is infinite or NaN.
     *
     * @return {Boolean} whether the matrix is invertible
     */
    isInvertible(): boolean {
        const det = this._a * this._d - this._c * this._b
        return det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty)
    }

    /**
     * Checks whether the matrix is singular or not. Singular matrices cannot be
     * inverted.
     *
     * @return {Boolean} whether the matrix is singular
     */
    isSingular(): boolean {
        return !this.isInvertible()
    }

    /**
     * Transforms a point and returns the result.
     *
     * @name Matrix#transform
     * @function
     * @param {Point} point the point to be transformed
     * @return {Point} the transformed point
     */
    transform(point: Point): Point

    /**
     * Transforms an array of coordinates by this matrix and stores the results
     * into the destination array, which is also returned.
     *
     * @name Matrix#transform
     * @function
     * @param {Number[]} src the array containing the source points
     * as x, y value pairs
     * @param {Number[]} dst the array into which to store the transformed
     * point pairs
     * @param {Number} count the number of points to transform
     * @return {Number[]} the dst array, containing the transformed coordinates
     */
    transform(src: number[], dst: number[], count: number): number[]

    transform(...args: any[]) {
        return args.length < 3
            ? this._transformPoint(Point.read(args))
            : this._transformCoordinates(...args)
    }

    /**
     * A faster version of transform that only takes one point and does not
     * attempt to convert it.
     */
    _transformPoint(point: Point, dest?: Point, _dontNotify?: boolean) {
        const x = point.x
        const y = point.y
        if (!dest) dest = new Point()
        return dest.set(
            x * this._a + y * this._c + this._tx,
            x * this._b + y * this._d + this._ty,
            _dontNotify
        )
    }

    protected _transformCoordinates(
        src?: number[],
        dst?: number[],
        count?: number
    ) {
        for (let i = 0, max = 2 * count; i < max; i += 2) {
            const x = src[i]
            const y = src[i + 1]
            dst[i] = x * this._a + y * this._c + this._tx
            dst[i + 1] = x * this._b + y * this._d + this._ty
        }
        return dst
    }

    protected _transformCorners(rect: Rectangle) {
        const x1 = rect.x
        const y1 = rect.y
        const x2 = x1 + rect.width
        const y2 = y1 + rect.height
        const coords = [x1, y1, x2, y1, x2, y2, x1, y2]
        return this._transformCoordinates(coords, coords, 4)
    }

    /**
     * Returns the 'transformed' bounds rectangle by transforming each corner
     * point and finding the new bounding box to these points. This is not
     * really the transformed rectangle!
     */
    protected _transformBounds(
        bounds: Rectangle,
        dest: Rectangle,
        _dontNotify?: boolean
    ) {
        const coords = this._transformCorners(bounds)
        const min = coords.slice(0, 2)
        const max = min.slice()
        for (let i = 2; i < 8; i++) {
            const val = coords[i]
            const j = i & 1
            if (val < min[j]) {
                min[j] = val
            } else if (val > max[j]) {
                max[j] = val
            }
        }
        if (!dest) dest = new Rectangle()
        return (dest as any)._set(
            min[0],
            min[1],
            max[0] - min[0],
            max[1] - min[1],
            _dontNotify
        )
    }

    /**
     * Inverse transforms a point and returns the result.
     *
     * @param {Point} point the point to be transformed
     * @return {Point}
     */
    inverseTransform(point: Point): Point
    inverseTransform(...args: any[]) {
        return this._inverseTransform(Point.read(args))
    }

    protected _inverseTransform(
        point: Point,
        dest?: Point,
        _dontNotify?: boolean
    ) {
        const a = this._a
        const b = this._b
        const c = this._c
        const d = this._d
        const tx = this._tx
        const ty = this._ty
        const det = a * d - b * c
        let res = null
        if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
            const x = point.x - this._tx
            const y = point.y - this._ty
            if (!dest) dest = new Point()
            res = (dest as any)._set(
                (x * d - y * c) / det,
                (y * a - x * b) / det,
                _dontNotify
            )
        }
        return res
    }

    /**
     * Decomposes the affine transformation described by this matrix into
     * `scaling`, `rotation` and `skewing`, and returns an object with
     * these properties.
     *
     * @return {Object} the decomposed matrix
     */
    decompose() {
        const a = this._a
        const b = this._b
        const c = this._c
        const d = this._d
        const det = a * d - b * c
        const sqrt = Math.sqrt
        const atan2 = Math.atan2
        const degrees = 180 / Math.PI
        let rotate
        let scale
        let skew
        if (a !== 0 || b !== 0) {
            const r = sqrt(a * a + b * b)
            rotate = Math.acos(a / r) * (b > 0 ? 1 : -1)
            scale = [r, det / r]
            skew = [atan2(a * c + b * d, r * r), 0]
        } else if (c !== 0 || d !== 0) {
            const s = sqrt(c * c + d * d)
            rotate = Math.asin(c / s) * (d > 0 ? 1 : -1)
            scale = [det / s, s]
            skew = [0, atan2(a * c + b * d, s * s)]
        } else {
            rotate = 0
            skew = scale = [0, 0]
        }
        return {
            translation: this.getTranslation(),
            rotation: rotate * degrees || 0,
            scaling: new Point(scale),
            skewing: new Point(skew[0] * degrees, skew[1] * degrees)
        }
    }

    /**
     * The matrix values as an array, in the same sequence as they are passed
     * to {@link #initialize(a, b, c, d, tx, ty)}.
     *
     * @bean
     * @type Number[]
     */
    getValues(): number[] {
        return [this._a, this._b, this._c, this._d, this._tx, this._ty]
    }

    /**
     * The translation of the matrix as a vector.
     *
     * @bean
     * @type Point
     */
    getTranslation() {
        return new Point(this._tx, this._ty)
    }

    /**
     * The scaling values of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Point
     * @see #decompose()
     */
    getScaling() {
        return this.decompose().scaling
    }

    /**
     * The rotation angle of the matrix, if it can be decomposed.
     *
     * @bean
     * @type Number
     * @see #decompose()
     */
    getRotation() {
        return this.decompose().rotation
    }

    /**
     * Applies this matrix to the specified Canvas Context.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    applyToContext(ctx: CanvasRenderingContext2D) {
        if (!this.isIdentity()) {
            ctx.transform(
                this._a,
                this._b,
                this._c,
                this._d,
                this._tx,
                this._ty
            )
        }
    }

    get a(): number {
        return this._a
    }

    set a(value: number) {
        this._a = value
        this._changed()
    }

    get b(): number {
        return this._b
    }

    set b(value: number) {
        this._b = value
        this._changed()
    }

    get c(): number {
        return this._c
    }

    set c(value: number) {
        this._c = value
        this._changed()
    }

    get d(): number {
        return this._d
    }

    set d(value: number) {
        this._d = value
        this._changed()
    }

    get tx(): number {
        return this._tx
    }

    set tx(value: number) {
        this._tx = value
        this._changed()
    }

    get ty(): number {
        return this._ty
    }

    set ty(value: number) {
        this._ty = value
        this._changed()
    }

    get owner() {
        return this._owner
    }

    set owner(owner: any) {
        this._owner = owner
    }
}
