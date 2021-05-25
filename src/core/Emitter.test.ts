import Item from '../item/Item'

test('emit()', () => {
    let response = ''
    const emitter = new Item()
    emitter.on('test', (e) => {
        response += e
    })

    emitter.on('test', (e) => {
        response += e
    })

    emitter.emit('test', 'foo')
    emitter.emit('test', 'bar')

    expect(response).toStrictEqual('foofoobarbar')
})

test('fire()', () => {
    let response = ''
    const emitter = new Item()
    emitter.on('test', (e) => {
        response += e
    })

    emitter.on('test', (e) => {
        response += e
    })

    emitter.fire('test', 'foo')
    emitter.fire('test', 'bar')

    expect(response).toStrictEqual('foofoobarbar')
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
