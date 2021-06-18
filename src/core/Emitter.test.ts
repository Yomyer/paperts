import Item from '../item/Item'

test('emit()', () => {
    const emitter = new Item()
    let called = ''
    const handler = function (e: string) {
        called = e
    }
    // eslint-disable-next-line dot-notation
    emitter['_eventTypes'] = {
        mousemove: {}
    }
    emitter.on('mousemove', handler)
    emitter.on('custom', handler)

    emitter.emit('mousemove', 'mousemove')
    expect(called === 'mousemove').toStrictEqual(true)

    emitter.emit('custom', 'custom')
    expect(called === 'custom').toStrictEqual(true)
})

test('fire()', () => {
    const emitter = new Item()
    let called = ''
    const handler = function (e: string) {
        called = e
    }
    // eslint-disable-next-line dot-notation
    emitter['_eventTypes'] = {
        mousemove: {}
    }
    emitter.on('mousemove', handler)
    emitter.on('custom', handler)

    emitter.fire('mousemove', 'mousemove')
    expect(called === 'mousemove').toStrictEqual(true)

    emitter.fire('custom', 'custom')
    expect(called === 'custom').toStrictEqual(true)
})

test('once()', () => {
    let response = ''

    const emitter = new Item()
    emitter.once('test', (e) => {
        response += e
    })

    emitter.emit('test', 'foo')
    emitter.emit('test', 'bar')

    expect(response).toStrictEqual('foo')
})

test('responds()', () => {
    const emitter = new Item()

    emitter.on('test', () => {})

    expect(emitter.responds('test')).toStrictEqual(true)
    expect(emitter.responds('test2')).toStrictEqual(false)
})

test('on()', function () {
    const emitter = new Item()
    let installed = false
    // fake event type registration
    // eslint-disable-next-line dot-notation
    emitter['_eventTypes'] = {
        mousemove: {
            install: function () {
                installed = true
            }
        }
    }

    expect(!emitter.responds('mousemove')).toStrictEqual(true)
    emitter.on('mousemove', function () {})
    expect(emitter.responds('mousemove')).toStrictEqual(true)
    expect(installed).toStrictEqual(true)

    // one time installation only
    installed = false
    emitter.on('mousemove', function () {})
    expect(!installed).toStrictEqual(true)

    emitter.on('customUnregistered', function () {})
    expect(emitter.responds('customUnregistered')).toStrictEqual(true)
})

test('off()', function () {
    const emitter = new Item()
    let uninstalled = false
    let called = 0
    const handler = function () {
        called++
    }
    const handler2 = function () {}

    // eslint-disable-next-line dot-notation
    emitter['_eventTypes'] = {
        mousemove: {
            uninstall: function () {
                uninstalled = true
            }
        }
    }

    emitter.on('mousemove', handler)
    emitter.on('mousemove', handler2)
    emitter.on('custom', handler)
    emitter.emit('mousemove')
    expect(called === 1).toStrictEqual(true)

    emitter.off('mousemove', handler2)
    emitter.emit('mousemove')
    expect(called === 2).toStrictEqual(true)
    expect(!uninstalled).toStrictEqual(true)

    emitter.off('mousemove', handler)
    emitter.emit('mousemove')
    expect(called === 2).toStrictEqual(true)
    expect(uninstalled).toStrictEqual(true)

    called = 0
    emitter.emit('custom')
    expect(called === 1).toStrictEqual(true)
    emitter.off('custom', handler)
    emitter.emit('custom')
    expect(called === 1).toStrictEqual(true)
})
