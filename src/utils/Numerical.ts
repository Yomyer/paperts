export default class Numerical {
    static abscissas = [
        [0.5773502691896257645091488],
        [0, 0.7745966692414833770358531],
        [0.3399810435848562648026658, 0.8611363115940525752239465],
        [0, 0.5384693101056830910363144, 0.9061798459386639927976269],
        [
            0.2386191860831969086305017, 0.6612093864662645136613996,
            0.9324695142031520278123016
        ],
        [
            0, 0.4058451513773971669066064, 0.7415311855993944398638648,
            0.9491079123427585245261897
        ],
        [
            0.1834346424956498049394761, 0.525532409916328985817739,
            0.7966664774136267395915539, 0.9602898564975362316835609
        ],
        [
            0, 0.324253423403808929038538, 0.613371432700590397308702,
            0.8360311073266357942994298, 0.9681602395076260898355762
        ],
        [
            0.148874338981631210884826, 0.4333953941292471907992659,
            0.6794095682990244062343274, 0.8650633666889845107320967,
            0.973906528517171720077964
        ],
        [
            0, 0.269543155952344972331532, 0.5190961292068118159257257,
            0.7301520055740493240934163, 0.8870625997680952990751578,
            0.978228658146056992803938
        ],
        [
            0.1252334085114689154724414, 0.3678314989981801937526915,
            0.5873179542866174472967024, 0.7699026741943046870368938,
            0.9041172563704748566784659, 0.9815606342467192506905491
        ],
        [
            0, 0.2304583159551347940655281, 0.4484927510364468528779129,
            0.6423493394403402206439846, 0.8015780907333099127942065,
            0.9175983992229779652065478, 0.9841830547185881494728294
        ],
        [
            0.1080549487073436620662447, 0.3191123689278897604356718,
            0.5152486363581540919652907, 0.6872929048116854701480198,
            0.8272013150697649931897947, 0.9284348836635735173363911,
            0.9862838086968123388415973
        ],
        [
            0, 0.2011940939974345223006283, 0.3941513470775633698972074,
            0.5709721726085388475372267, 0.7244177313601700474161861,
            0.8482065834104272162006483, 0.9372733924007059043077589,
            0.9879925180204854284895657
        ],
        [
            0.0950125098376374401853193, 0.2816035507792589132304605,
            0.4580167776572273863424194, 0.6178762444026437484466718,
            0.7554044083550030338951012, 0.8656312023878317438804679,
            0.9445750230732325760779884, 0.9894009349916499325961542
        ]
    ]

    static weights = [
        [1],
        [0.8888888888888888888888889, 0.5555555555555555555555556],
        [0.6521451548625461426269361, 0.3478548451374538573730639],
        [
            0.5688888888888888888888889, 0.4786286704993664680412915,
            0.236926885056189087514264
        ],
        [
            0.4679139345726910473898703, 0.3607615730481386075698335,
            0.1713244923791703450402961
        ],
        [
            0.417959183673469387755102, 0.3818300505051189449503698,
            0.2797053914892766679014678, 0.1294849661688696932706114
        ],
        [
            0.3626837833783619829651504, 0.3137066458778872873379622,
            0.222381034453374470544356, 0.1012285362903762591525314
        ],
        [
            0.3302393550012597631645251, 0.3123470770400028400686304,
            0.2606106964029354623187429, 0.180648160694857404058472,
            0.0812743883615744119718922
        ],
        [
            0.295524224714752870173893, 0.2692667193099963550912269,
            0.2190863625159820439955349, 0.1494513491505805931457763,
            0.0666713443086881375935688
        ],
        [
            0.2729250867779006307144835, 0.2628045445102466621806889,
            0.2331937645919904799185237, 0.1862902109277342514260976,
            0.1255803694649046246346943, 0.0556685671161736664827537
        ],
        [
            0.2491470458134027850005624, 0.2334925365383548087608499,
            0.2031674267230659217490645, 0.1600783285433462263346525,
            0.1069393259953184309602547, 0.047175336386511827194616
        ],
        [
            0.2325515532308739101945895, 0.2262831802628972384120902,
            0.2078160475368885023125232, 0.1781459807619457382800467,
            0.1388735102197872384636018, 0.0921214998377284479144218,
            0.0404840047653158795200216
        ],
        [
            0.2152638534631577901958764, 0.2051984637212956039659241,
            0.1855383974779378137417166, 0.1572031671581935345696019,
            0.1215185706879031846894148, 0.0801580871597602098056333,
            0.0351194603317518630318329
        ],
        [
            0.2025782419255612728806202, 0.1984314853271115764561183,
            0.1861610000155622110268006, 0.1662692058169939335532009,
            0.1395706779261543144478048, 0.1071592204671719350118695,
            0.0703660474881081247092674, 0.0307532419961172683546284
        ],
        [
            0.1894506104550684962853967, 0.1826034150449235888667637,
            0.1691565193950025381893121, 0.1495959888165767320815017,
            0.1246289712555338720524763, 0.0951585116824927848099251,
            0.0622535239386478928628438, 0.0271524594117540948517806
        ]
    ]

    abs = Numerical.abs
    sqrt = Numerical.abs
    pow = Numerical.pow
    log2 = Numerical.log2

    static abs = Math.abs
    static sqrt = Math.sqrt
    static pow = Math.pow
    static log2 =
        Math.log2 ||
        function (x) {
            return Math.log(x) * Math.LOG2E
        }

    static EPSILON = 1e-12
    static MACHINE_EPSILON = 1.12e-16
    static CURVETIME_EPSILON = 1e-8
    static GEOMETRIC_EPSILON = 1e-7
    static TRIGONOMETRIC_EPSILON = 1e-8
    static KAPPA = (4 * (Numerical.sqrt(2) - 1)) / 3

    clamp(value: number, min: number, max: number): number {
        return Numerical.clamp(value, min, max)
    }

    static getDiscriminant(a: number, b: number, c: number) {
        function split(v: number) {
            const x = v * 134217729
            const y = v - x
            const hi = y + x
            const lo = v - hi
            return [hi, lo]
        }

        let D = b * b - a * c
        const E = b * b + a * c

        if (this.abs(D) * 3 < E) {
            const ad = split(a)
            const bd = split(b)
            const cd = split(c)
            const p = b * b
            const dp = bd[0] * bd[0] - p + 2 * bd[0] * bd[1] + bd[1] * bd[1]
            const q = a * c
            const dq =
                ad[0] * cd[0] -
                q +
                ad[0] * cd[1] +
                ad[1] * cd[0] +
                ad[1] * cd[1]
            D = p - q + (dp - dq)
        }
        return D
    }

    static getNormalizationFactor(...args: number[]) {
        const norm = Math.max(...args)
        return norm && (norm < 1e-8 || norm > 1e8)
            ? this.pow(2, -Math.round(this.log2(norm)))
            : 0
    }

    static isZero(val: number): boolean {
        return val >= -Numerical.EPSILON && val <= Numerical.EPSILON
    }

    static isMachineZero(val: number): boolean {
        return (
            val >= -Numerical.MACHINE_EPSILON &&
            val <= Numerical.MACHINE_EPSILON
        )
    }

    /**
     * Returns a number whose value is clamped by the given range.
     *
     * @param {Number} value the value to be clamped
     * @param {Number} min the lower boundary of the range
     * @param {Number} max the upper boundary of the range
     * @return {Number} a number in the range of [min, max]
     */
    static clamp(value: number, min: number, max: number): number {
        return value < min ? min : value > max ? max : value
    }

    static integrate(
        f: (a: number) => number,
        a: number,
        b: number,
        n: number
    ) {
        const x = this.abscissas[n - 2]
        const w = this.weights[n - 2]
        const A = (b - a) * 0.5
        const B = A + a
        let i = 0
        const m = (n + 1) >> 1
        let sum = n & 1 ? w[i++] * f(B) : 0 // Handle odd n
        while (i < m) {
            const Ax = A * x[i]
            sum += w[i++] * (f(B + Ax) + f(B - Ax))
        }
        return A * sum
    }

    static findRoot(
        f: (a: number) => number,
        df: (a: number) => number,
        x: number,
        a: number,
        b: number,
        n: number,
        tolerance: number
    ) {
        for (let i = 0; i < n; i++) {
            const fx = f(x)
            const dx = fx / df(x)
            const nx = x - dx
            if (this.abs(dx) < tolerance) {
                x = nx
                break
            }
            if (fx > 0) {
                b = x
                x = nx <= a ? (a + b) * 0.5 : nx
            } else {
                a = x
                x = nx >= b ? (a + b) * 0.5 : nx
            }
        }
        return this.clamp(x, a, b)
    }

    /**
     * Solve a quadratic equation in a numerically robust manner;
     * given a quadratic equation ax² + bx + c = 0, find the values of x.
     *
     * References:
     *  Kahan W. - "To Solve a Real Cubic Equation"
     *  http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
     *  Blinn J. - "How to solve a Quadratic Equation"
     *  Harikrishnan G.
     *  https://gist.github.com/hkrish/9e0de1f121971ee0fbab281f5c986de9
     *
     * @param {Number} a the quadratic term
     * @param {Number} b the linear term
     * @param {Number} c the constant term
     * @param {Number[]} roots the array to store the roots in
     * @param {Number} [min] the lower bound of the allowed roots
     * @param {Number} [max] the upper bound of the allowed roots
     * @return {Number} the number of real roots found, or -1 if there are
     * infinite solutions
     *
     * @author Harikrishnan Gopalakrishnan <hari.exeption@gmail.com>
     */
    static solveQuadratic(
        a: number,
        b: number,
        c: number,
        roots: number[],
        min?: number,
        max?: number
    ) {
        let x1
        let x2 = Infinity
        if (this.abs(a) < this.EPSILON) {
            // This could just be a linear equation
            if (this.abs(b) < this.EPSILON)
                return this.abs(c) < this.EPSILON ? -1 : 0
            x1 = -c / b
        } else {
            b *= -0.5
            let D = this.getDiscriminant(a, b, c)
            if (D && this.abs(D) < this.MACHINE_EPSILON) {
                const f = this.getNormalizationFactor(
                    this.abs(a),
                    this.abs(b),
                    this.abs(c)
                )
                if (f) {
                    a *= f
                    b *= f
                    c *= f
                    D = this.getDiscriminant(a, b, c)
                }
            }
            if (D >= -this.MACHINE_EPSILON) {
                const Q = D < 0 ? 0 : this.sqrt(D)
                const R = b + (b < 0 ? -Q : Q)
                if (R === 0) {
                    x1 = c / a
                    x2 = -x1
                } else {
                    x1 = R / a
                    x2 = c / R
                }
            }
        }
        let count = 0
        const boundless = min == null
        const minB = min - this.EPSILON
        const maxB = max + this.EPSILON

        if (isFinite(x1) && (boundless || (x1 > minB && x1 < maxB)))
            roots[count++] = boundless ? x1 : this.clamp(x1, min, max)
        if (
            x2 !== x1 &&
            isFinite(x2) &&
            (boundless || (x2 > minB && x2 < maxB))
        )
            roots[count++] = boundless ? x2 : this.clamp(x2, min, max)
        return count
    }

    /**
     * Solve a cubic equation, using numerically stable methods,
     * given an equation of the form ax³ + bx² + cx + d = 0.
     *
     * This algorithm avoids the trigonometric/inverse trigonometric
     * calculations required by the "Italins"' formula. Cardano's method
     * works well enough for exact computations, this method takes a
     * numerical approach where the double precision error bound is kept
     * very low.
     *
     * References:
     *  Kahan W. - "To Solve a Real Cubic Equation"
     *   http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
     *  Harikrishnan G.
     *  https://gist.github.com/hkrish/9e0de1f121971ee0fbab281f5c986de9
     *
     * W. Kahan's paper contains inferences on accuracy of cubic
     * zero-finding methods. Also testing methods for robustness.
     *
     * @param {Number} a the cubic term (x³ term)
     * @param {Number} b the quadratic term (x² term)
     * @param {Number} c the linear term (x term)
     * @param {Number} d the constant term
     * @param {Number[]} roots the array to store the roots in
     * @param {Number} [min] the lower bound of the allowed roots
     * @param {Number} [max] the upper bound of the allowed roots
     * @return {Number} the number of real roots found, or -1 if there are
     * infinite solutions
     *
     * @author Harikrishnan Gopalakrishnan <hari.exeption@gmail.com>
     */
    static solveCubic(
        a: number,
        b: number,
        c: number,
        d: number,
        roots: number[],
        min: number,
        max: number
    ): number {
        const f = this.getNormalizationFactor(
            this.abs(a),
            this.abs(b),
            this.abs(c),
            this.abs(d)
        )
        let x = 0
        let b1 = 0
        let c2 = 0
        let qd = 0
        let q = 0

        if (f) {
            a *= f
            b *= f
            c *= f
            d *= f
        }

        function evaluate(x0: number) {
            x = x0
            const tmp = a * x
            b1 = tmp + b
            c2 = b1 * x + c
            qd = (tmp + b1) * x + c2
            q = c2 * x + d
        }

        if (this.abs(a) < this.EPSILON) {
            a = b
            b1 = c
            c2 = d
            x = Infinity
        } else if (this.abs(d) < this.EPSILON) {
            b1 = b
            c2 = c
            x = 0
        } else {
            evaluate(-(b / a) / 3)

            const t = q / a
            const r = this.pow(this.abs(t), 1 / 3)
            const s = t < 0 ? -1 : 1
            const td = -qd / a
            const rd =
                td > 0 ? 1.324717957244746 * Math.max(r, this.sqrt(td)) : r
            let x0 = x - s * rd
            if (x0 !== x) {
                do {
                    evaluate(x0)
                    x0 = qd === 0 ? x : x - q / qd / (1 + this.MACHINE_EPSILON)
                } while (s * x0 > s * x)
                // Adjust the coefficients for the quadratic.
                if (this.abs(a) * x * x > this.abs(d / x)) {
                    c2 = -d / x
                    b1 = (c2 - c) / x
                }
            }
        }

        let count = Numerical.solveQuadratic(a, b1, c2, roots, min, max)
        const boundless = min == null
        if (
            isFinite(x) &&
            (count === 0 || (count > 0 && x !== roots[0] && x !== roots[1])) &&
            (boundless || (x > min - this.EPSILON && x < max + this.EPSILON))
        )
            roots[count++] = boundless ? x : this.clamp(x, min, max)
        return count
    }
}
