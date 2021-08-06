import { Path, CompoundPath, Point, PathItem } from '../../src'
import { compareBoolean } from '../helpers'

function testOperations(path1: Path, path2: Path, results: any[]) {
    compareBoolean(function () {
        return path1.unite(path2)
    }, results[0])

    compareBoolean(function () {
        return path2.unite(path1)
    }, results[0])

    compareBoolean(function () {
        return path1.subtract(path2)
    }, results[1])

    compareBoolean(function () {
        return path2.subtract(path1)
    }, results[2])

    compareBoolean(function () {
        return path1.intersect(path2)
    }, results[3])

    compareBoolean(function () {
        return path2.intersect(path1)
    }, results[3])

    compareBoolean(function () {
        return path1.exclude(path2)
    }, results[4])

    compareBoolean(function () {
        return path2.exclude(path1)
    }, results[4])
}

test('Boolean operations without crossings', function () {
    const path1 = new Path.Rectangle({
        point: [0, 0],
        size: [200, 200]
    })

    const path2 = new Path.Rectangle({
        point: [50, 50],
        size: [100, 100]
    })

    const path3 = new Path.Rectangle({
        point: [250, 50],
        size: [100, 100]
    })

    testOperations(path1, path2, [
        'M0,200v-200h200v200z',
        'M0,200v-200h200v200zM150,150v-100h-100v100z',
        '',
        'M50,150v-100h100v100z',
        'M0,200v-200h200v200zM150,150v-100h-100v100z'
    ])

    testOperations(path1, path3, [
        'M0,200v-200h200v200zM250,150v-100h100v100z',
        'M0,200v-200h200v200z',
        'M350,150v-100h-100v100z',
        '',
        'M0,200v-200h200v200zM250,150v-100h100v100z'
    ])
})

test('frame.intersect(rect)', function () {
    const frame = new CompoundPath()
    frame.addChild(new Path.Rectangle(new Point(140, 10), [100, 300]))
    frame.addChild(new Path.Rectangle(new Point(150, 80), [50, 80]))
    const rect = new Path.Rectangle(new Point(50, 50), [100, 150])

    compareBoolean(function () {
        return frame.intersect(rect)
    }, 'M140,50l10,0l0,150l-10,0z')
})

test('PathItem#resolveCrossings()', function () {
    const paths = [
        'M100,300l0,-50l50,-50l-50,0l150,0l-150,0l50,0l-50,0l100,0l-100,0l0,-100l200,0l0,200z',
        'M50,300l0,-150l50,25l0,-75l200,0l0,200z M100,200l50,0l-50,-25z',
        'M330.1,388.5l-65,65c0,0 -49.1,-14.5 -36.6,-36.6c12.5,-22.1 92.4,25.1 92.4,25.1c0,0 -33.3,-73.3 -23.2,-85.9c10,-12.8 32.4,32.4 32.4,32.4z',
        'M570,290l5.8176000300452415,33.58556812220928l-28.17314339506561,-14.439003967264455l31.189735425395614,-4.568209255479985c-5.7225406635552645e-9,-3.907138079739525e-8 -59.366611385062015,8.695139599513823 -59.366611385062015,8.695139599513823z',
        'M228.26666666666668,222.72h55.46666666666667c3.05499999999995,0 5.546666666666624,2.4916666666666742 5.546666666666624,5.546666666666681v55.46666666666667c0,3.05499999999995 -2.4916666666666742,5.546666666666624 -5.546666666666624,5.546666666666624h-55.46666666666667c-3.055000000000007,0 -5.546666666666681,-2.4916666666666742 -5.546666666666681,-5.546666666666624v-55.46666666666667c0,-3.055000000000007 2.4916666666666742,-5.546666666666681 5.546666666666681,-5.546666666666681zM283.73333399705655,289.2799999999998c-2.212411231994338e-7,1.1368683772161603e-13 2.212409526691772e-7,0 0,0z'
    ]
    const results = [
        'M100,300l0,-50l50,-50l-50,0l0,-100l200,0l0,200z',
        'M50,300l0,-150l50,25l0,-75l200,0l0,200z M100,200l50,0l-50,-25z',
        'M291.85631,426.74369l-26.75631,26.75631c0,0 -49.1,-14.5 -36.6,-36.6c7.48773,-13.23831 39.16013,-1.61018 63.35631,9.84369z M330.1,388.5l-22.09831,22.09831c-8.06306,-21.54667 -15.93643,-47.46883 -10.30169,-54.49831c10,-12.8 32.4,32.4 32.4,32.4z M320.9,442c0,0 -12.84682,-7.58911 -29.04369,-15.25631l16.14539,-16.14539c6.38959,17.07471 12.89831,31.40169 12.89831,31.40169z',
        'M570,290l5.8176,33.58557l-28.17314,-14.439c-14.32289,2.0978 -28.17688,4.12693 -28.17688,4.12693z',
        'M228.26666666666668,222.72h55.46666666666667c3.05499999999995,0 5.546666666666624,2.4916666666666742 5.546666666666624,5.546666666666681v55.46666666666667c0,3.05499999999995 -2.4916666666666742,5.546666666666624 -5.546666666666624,5.546666666666624h-55.46666666666667c-3.055000000000007,0 -5.546666666666681,-2.4916666666666742 -5.546666666666681,-5.546666666666624v-55.46666666666667c0,-3.055000000000007 2.4916666666666742,-5.546666666666681 5.546666666666681,-5.546666666666681z'
    ]
    for (let i = 0; i < paths.length; i++) {
        const path = PathItem.create(paths[i])
        const result = PathItem.create(results[i])
        path.fillRule = 'evenodd'
        compareBoolean(path.resolveCrossings(), result)
    }
})
