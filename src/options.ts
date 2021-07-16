const version = '0.12.15'

const load = typeof window === 'object'

const Options = {
    version: version + (load ? '-load' : ''),
    load: load,
    parser: 'acorn',
    svg: true,
    booleanOperations: true,
    nativeContains: false,
    paperScript: true
}

export default Options
