import Item from '../item/Item'
import Curve from '../path/Curve'

export default class CollisionDetection {
    /**
     * Finds collisions between axis aligned bounding boxes of items.
     *
     * This function takes the bounds of all items in the items1 and items2
     * arrays and calls findBoundsCollisions().
     *
     * @param {Array} items1 Array of items for which collisions should be
     *     found.
     * @param {Array} [items2] Array of items  that the first array should be
     *     compared with. If not provided, collisions between items within
     *     the first array will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @returns {Array} Array containing for the bounds at the same index in
     *     items1 an array of the indexes of colliding bounds in items2
     */
    static findItemBoundsCollisions(
        items1: Item[],
        items2: Item[],
        tolerance?: number
    ): number[][] {
        function getBounds(items: Item[]): number[][] {
            const bounds = new Array(items.length)
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBounds()
                bounds[i] = [rect.left, rect.top, rect.right, rect.bottom]
            }
            return bounds
        }

        const bounds1 = getBounds(items1)
        const bounds2 =
            !items2 || items2 === items1 ? bounds1 : getBounds(items2)

        return CollisionDetection.findBoundsCollisions(
            bounds1,
            bounds2,
            tolerance || 0
        )
    }

    /**
     * Finds collisions between curves bounds. For performance reasons this
     * uses broad bounds of the curve, which can be calculated much faster than
     * the actual bounds. Broad bounds guarantee to contain the full curve,
     * but they are usually larger than the actual bounds of a curve.
     *
     * This function takes the broad bounds of all curve values in the curves1
     * and curves2 arrays and calls findBoundsCollisions().
     *
     * @param {Array} curves1 Array of curve values for which collisions should
     *     be found.
     * @param {Array} [curves2] Array of curve values that the first array
     *     should be compared with. If not provided, collisions between curve
     *     bounds within the first arrray will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @param {Boolean} [bothAxis] If true, the sweep is performed along both
     *     axis, and the results include collisions for both: `{ hor, ver }`.
     * @returns {Array} Array containing for the bounds at the same index in
     *     curves1 an array of the indexes of colliding bounds in curves2
     */
    static findCurveBoundsCollisions(
        curves1: Curve[],
        curves2: Curve[],
        tolerance?: number,
        bothAxis?: boolean
    ) {
        function getBounds(curves: Curve[]): number[][] {
            const min = Math.min
            const max = Math.max
            const bounds = new Array(curves.length)
            for (let i = 0; i < curves.length; i++) {
                const v = curves[i]
                bounds[i] = [
                    min(v[0], v[2], v[4], v[6]),
                    min(v[1], v[3], v[5], v[7]),
                    max(v[0], v[2], v[4], v[6]),
                    max(v[1], v[3], v[5], v[7])
                ]
            }
            return bounds
        }

        const bounds1 = getBounds(curves1)
        const bounds2 =
            !curves2 || curves2 === curves1 ? bounds1 : getBounds(curves2)
        if (bothAxis) {
            const hor = CollisionDetection.findBoundsCollisions(
                bounds1,
                bounds2,
                tolerance || 0,
                false,
                true
            )
            const ver = CollisionDetection.findBoundsCollisions(
                bounds1,
                bounds2,
                tolerance || 0,
                true,
                true
            )
            const list = []
            for (let i = 0, l = hor.length; i < l; i++) {
                list[i] = { hor: hor[i], ver: ver[i] }
            }
            return list
        }
        return CollisionDetection.findBoundsCollisions(
            bounds1,
            bounds2,
            tolerance || 0
        )
    }

    /**
     * Finds collisions between two sets of bounding rectangles.
     *
     * The collision detection is implemented as a sweep and prune algorithm
     * with sweep either along the x or y axis (primary axis) and immediate
     * check on secondary axis for potential pairs.
     *
     * Each entry in the bounds arrays must be an array of length 4 with
     * x0, y0, x1, and y1 as the array elements.
     *
     * The returned array has the same length as bounds1. Each entry
     * contains an array with all indices of overlapping bounds of
     * bounds2 (or bounds1 if bounds2 is not provided) sorted
     * in ascending order.
     *
     * If the second bounds array parameter is null, collisions between bounds
     * within the first bounds array will be found. In this case the indexed
     * returned for each bounds will not contain the bounds' own index.
     *
     *
     * @param {Array} boundsA Array of bounds objects for which collisions
     *     should be found.
     * @param {Array} [boundsB] Array of bounds that the first array should
     *     be compared with. If not provided, collisions between bounds within
     *     the first arrray will be returned.
     * @param {Number} [tolerance] If provided, the tolerance will be added to
     *     all sides of each bounds when checking for collisions.
     * @param {Boolean} [sweepVertical] If true, the sweep is performed along
     *     the y-axis.
     * @param {Boolean} [onlySweepAxisCollisions] If true, no collision checks
     *     will be done on the secondary axis.
     * @returns {Array} Array containing for the bounds at the same index in
     *     boundsA an array of the indexes of colliding bounds in boundsB
     */
    static findBoundsCollisions(
        boundsA: number[][],
        boundsB: number[][],
        tolerance?: number,
        sweepVertical?: boolean,
        onlySweepAxisCollisions?: boolean
    ): number[][] {
        const self = !boundsB || boundsA === boundsB
        const allBounds = self ? boundsA : boundsA.concat(boundsB)
        const lengthA = boundsA.length
        const lengthAll = allBounds.length

        function binarySearch(indices: number[], coord: number, value: number) {
            let lo = 0
            let hi = indices.length
            while (lo < hi) {
                const mid = (hi + lo) >>> 1 // Same as Math.floor((hi + lo) / 2)
                if (allBounds[indices[mid]][coord] < value) {
                    lo = mid + 1
                } else {
                    hi = mid
                }
            }
            return lo - 1
        }

        const pri0 = sweepVertical ? 1 : 0
        const pri1 = pri0 + 2
        const sec0 = sweepVertical ? 0 : 1
        const sec1 = sec0 + 2

        const allIndicesByPri0 = new Array(lengthAll)
        for (let i = 0; i < lengthAll; i++) {
            allIndicesByPri0[i] = i
        }
        allIndicesByPri0.sort(function (i1, i2) {
            return allBounds[i1][pri0] - allBounds[i2][pri0]
        })

        const activeIndicesByPri1: number[] = []
        const allCollisions = new Array(lengthA)
        for (let i = 0; i < lengthAll; i++) {
            const curIndex = allIndicesByPri0[i]
            const curBounds = allBounds[curIndex]
            const origIndex = self ? curIndex : curIndex - lengthA
            const isCurrentA = curIndex < lengthA
            const isCurrentB = self || !isCurrentA
            let curCollisions: number[] = isCurrentA ? [] : null
            if (activeIndicesByPri1.length) {
                const pruneCount =
                    binarySearch(
                        activeIndicesByPri1,
                        pri1,
                        curBounds[pri0] - tolerance
                    ) + 1
                activeIndicesByPri1.splice(0, pruneCount)
                if (self && onlySweepAxisCollisions) {
                    curCollisions = curCollisions.concat(activeIndicesByPri1)
                    for (let j = 0; j < activeIndicesByPri1.length; j++) {
                        const activeIndex = activeIndicesByPri1[j]
                        allCollisions[activeIndex].push(origIndex)
                    }
                } else {
                    const curSec1 = curBounds[sec1]
                    const curSec0 = curBounds[sec0]
                    for (let j = 0; j < activeIndicesByPri1.length; j++) {
                        const activeIndex = activeIndicesByPri1[j]
                        const activeBounds = allBounds[activeIndex]
                        const isActiveA = activeIndex < lengthA
                        const isActiveB = self || activeIndex >= lengthA

                        if (
                            onlySweepAxisCollisions ||
                            (((isCurrentA && isActiveB) ||
                                (isCurrentB && isActiveA)) &&
                                curSec1 >= activeBounds[sec0] - tolerance &&
                                curSec0 <= activeBounds[sec1] + tolerance)
                        ) {
                            if (isCurrentA && isActiveB) {
                                curCollisions.push(
                                    self ? activeIndex : activeIndex - lengthA
                                )
                            }
                            if (isCurrentB && isActiveA) {
                                allCollisions[activeIndex].push(origIndex)
                            }
                        }
                    }
                }
            }
            if (isCurrentA) {
                if (boundsA === boundsB) {
                    curCollisions.push(curIndex)
                }
                allCollisions[curIndex] = curCollisions
            }
            if (activeIndicesByPri1.length) {
                const curPri1 = curBounds[pri1]
                const index = binarySearch(activeIndicesByPri1, pri1, curPri1)
                activeIndicesByPri1.splice(index + 1, 0, curIndex)
            } else {
                activeIndicesByPri1.push(curIndex)
            }
        }

        for (let i = 0; i < allCollisions.length; i++) {
            const collisions = allCollisions[i]
            if (collisions) {
                collisions.sort(function (i1: number, i2: number) {
                    return i1 - i2
                })
            }
        }
        return allCollisions
    }
}
