import {
    Runtime,
    DomEvent,
    Base,
    PaperScope,
    Http,
    Tool,
    Point,
    Size,
    Color
} from '../'
import * as acron from 'acorn'

@Runtime(() => {
    PaperScript.load()
})
export class PaperScript {
    static binaryOperators = {
        '+': '__add',
        '-': '__subtract',
        '*': '__multiply',
        '/': '__divide',
        '%': '__modulo',
        '==': '__equals',
        '!=': '__equals'
    }

    static unaryOperators = {
        '-': '__negate',
        '+': '__self'
    }

    static loadScript(script: HTMLScriptElement): PaperScope {
        if (
            /^text\/(?:x-|)paperscript$/.test(script.type) &&
            PaperScope.getAttribute(script, 'ignore') !== 'true'
        ) {
            const canvasId = PaperScope.getAttribute(script, 'canvas')
            const canvas = document.getElementById(
                canvasId
            ) as HTMLCanvasElement

            const src = script.src || script.getAttribute('data-src')
            const async = PaperScope.hasAttribute(script, 'async')
            const scopeAttribute = 'data-paper-scope'
            if (!canvas)
                throw new Error(
                    'Unable to find canvas with id "' + canvasId + '"'
                )

            const scope =
                PaperScope.get(canvas.getAttribute(scopeAttribute)) ||
                new PaperScope().setup(canvas)

            canvas.setAttribute(scopeAttribute, scope.id.toString())

            if (src) {
                Http.request({
                    url: src,
                    async: async,
                    mimeType: 'text/plain',
                    onLoad: function (code: XMLHttpRequest | string) {
                        PaperScript.execute(code as string, scope, src)
                    }
                })
            } else {
                // We can simply get the code form the script tag.
                PaperScript.execute(script.innerHTML, scope, script.baseURI)
            }

            // Mark script as loaded now.
            script.setAttribute('data-paper-ignore', 'true')
            return scope
        }

        return null
    }

    static __$__(left: any, operator: string, right: any) {
        const handler = PaperScript.binaryOperators[operator]
        if (left && left[handler]) {
            const res = left[handler](right)
            return operator === '!=' ? !res : res
        }
        switch (operator) {
            case '+':
                return left + right
            case '-':
                return left - right
            case '*':
                return left * right
            case '/':
                return left / right
            case '%':
                return left % right
            case '==':
                return left === right
            case '!=':
                return left !== right
        }
    }

    // Unary Operator Handler
    static $__(operator: string, value: any) {
        const handler = PaperScript.unaryOperators[operator]
        if (value && value[handler]) return value[handler]()
        switch (operator) {
            case '+':
                return +value
            case '-':
                return -value
        }
    }

    static execute(code: string, scope: PaperScope, options: string) {
        PaperScope.setGlobalPaper(scope)
        const paper = scope
        const view = scope.getView()
        const tool =
            /\btool\.\w+|\s+on(?:Key|Mouse)(?:Up|Down|Move|Drag)\b/.test(
                code
            ) && !/\bnew\s+Tool\b/.test(code)
                ? new Tool()
                : null
        const toolHandlers = tool ? tool.events : []
        const handlers = ['onFrame', 'onResize'].concat(toolHandlers)

        const params: any[] = []
        const args: any[] = []
        let func
        const compiled: any =
            typeof code === 'object' ? code : PaperScript.compile(code, options)
        code = compiled.code

        function expose(scope: any, hidden?: boolean) {
            for (const key in scope) {
                if (
                    (hidden || !/^_/.test(key)) &&
                    new RegExp(
                        '([\\b\\s\\W]|^)' + key.replace(/\$/g, '\\$') + '\\b'
                    ).test(code)
                ) {
                    params.push(key)
                    args.push(scope[key])
                }
            }
        }
        expose(
            {
                __$__: PaperScript.__$__,
                $__: PaperScript.$__,
                paper: scope,
                tool: tool
            },
            true
        )
        expose(scope)

        code = 'var module = { exports: {} }; ' + code

        let exports = Base.each(
            handlers,
            function (this: any, key) {
                if (new RegExp('\\s+' + key + '\\b').test(code)) {
                    params.push(key)
                    this.push('module.exports.' + key + ' = ' + key + ';')
                }
            },
            []
        ).join('\n')

        if (exports) {
            code += '\n' + exports
        }

        code += '\nreturn module.exports;'
        const agent = paper.agent
        if (
            document &&
            (agent.chrome || (agent.firefox && agent.versionNumber < 40))
        ) {
            const script = document.createElement('script')
            const head =
                document.head || document.getElementsByTagName('head')[0]

            if (agent.firefox) code = '\n' + code
            script.appendChild(
                document.createTextNode(
                    'document.__paperscript__ = function(' +
                        params +
                        ') {' +
                        code +
                        '\n}'
                )
            )
            head.appendChild(script)
            func = (document as any).__paperscript__
            delete (document as any).__paperscript__
            head.removeChild(script)
        } else {
            // eslint-disable-next-line no-new-func
            func = Function(params as unknown as string, code)
        }
        exports = func && func.apply(scope, args)
        const obj = exports || {}

        Base.each(toolHandlers, function (key) {
            const value = obj[key]
            if (value) tool[key] = value
        })
        if (view) {
            if (obj.onResize) view.onResize = obj.onResize

            view.emit('resize', {
                size: view.size,
                delta: new Point()
            })
            if (obj.onFrame) view.onFrame = obj.onFrame

            view.requestUpdate()
        }
        return exports
    }

    static parse(code: any, options: any) {
        return acron.parse(code, options)
    }

    static compile(code: string, options: any) {
        if (!code) return ''
        options = options || {}

        const insertions: number[][] = []

        function getOffset(offset: number) {
            for (let i = 0, l = insertions.length; i < l; i++) {
                const insertion = insertions[i]
                if (insertion[0] >= offset) break
                offset += insertion[1]
            }
            return offset
        }

        function getCode(node: any) {
            return code.substring(
                getOffset(node.range[0]),
                getOffset(node.range[1])
            )
        }

        function getBetween(left: any, right: any) {
            return code.substring(
                getOffset(left.range[1]),
                getOffset(right.range[0])
            )
        }

        function replaceCode(node: any, str: string) {
            const start = getOffset(node.range[0])
            const end = getOffset(node.range[1])
            let insert = 0

            for (let i = insertions.length - 1; i >= 0; i--) {
                if (start > insertions[i][0]) {
                    insert = i + 1
                    break
                }
            }
            insertions.splice(insert, 0, [start, str.length - end + start])
            code = code.substring(0, start) + str + code.substring(end)
        }

        function handleOverloading(node: any, parent: any) {
            switch (node.type) {
                case 'UnaryExpression': // -a
                    if (
                        node.operator in PaperScript.unaryOperators &&
                        node.argument.type !== 'Literal'
                    ) {
                        const arg = getCode(node.argument)
                        replaceCode(
                            node,
                            '$__("' + node.operator + '", ' + arg + ')'
                        )
                    }
                    break
                case 'BinaryExpression': // a + b, a - b, a / b, a * b, a == b, ...
                    if (
                        node.operator in PaperScript.binaryOperators &&
                        node.left.type !== 'Literal'
                    ) {
                        const left = getCode(node.left)
                        const right = getCode(node.right)
                        const between = getBetween(node.left, node.right)
                        const operator = node.operator
                        replaceCode(
                            node,
                            '__$__(' +
                                left +
                                ',' +
                                between.replace(
                                    new RegExp('\\' + operator),
                                    '"' + operator + '"'
                                ) +
                                ', ' +
                                right +
                                ')'
                        )
                    }
                    break
                case 'UpdateExpression': // a++, a--, ++a, --a
                case 'AssignmentExpression': /// a += b, a -= b
                    const parentType = parent && parent.type
                    if (
                        !(
                            parentType === 'ForStatement' ||
                            (parentType === 'BinaryExpression' &&
                                /^[=!<>]/.test(parent.operator)) ||
                            (parentType === 'MemberExpression' &&
                                parent.computed)
                        )
                    ) {
                        if (node.type === 'UpdateExpression') {
                            const arg = getCode(node.argument)
                            const exp =
                                '__$__(' +
                                arg +
                                ', "' +
                                node.operator[0] +
                                '", 1)'
                            let str = arg + ' = ' + exp
                            if (node.prefix) {
                                str = '(' + str + ')'
                            } else if (
                                parentType === 'AssignmentExpression' ||
                                parentType === 'VariableDeclarator' ||
                                parentType === 'BinaryExpression'
                            ) {
                                if (getCode(parent.left || parent.id) === arg)
                                    str = exp
                                str = arg + '; ' + str
                            }
                            replaceCode(node, str)
                        } else {
                            if (
                                /^.=$/.test(node.operator) &&
                                node.left.type !== 'Literal'
                            ) {
                                const left = getCode(node.left)
                                const right = getCode(node.right)
                                const exp =
                                    left +
                                    ' = __$__(' +
                                    left +
                                    ', "' +
                                    node.operator[0] +
                                    '", ' +
                                    right +
                                    ')'

                                replaceCode(
                                    node,
                                    /^\(.*\)$/.test(getCode(node))
                                        ? '(' + exp + ')'
                                        : exp
                                )
                            }
                        }
                    }
                    break
            }
        }

        function handleExports(node: any) {
            switch (node.type) {
                case 'ExportDefaultDeclaration':
                    replaceCode(
                        {
                            range: [node.start, node.declaration.start]
                        },
                        'module.exports = '
                    )
                    break
                case 'ExportNamedDeclaration':
                    const declaration = node.declaration
                    const specifiers = node.specifiers
                    if (declaration) {
                        const declarations = declaration.declarations
                        if (declarations) {
                            declarations.forEach(function (dec: any) {
                                replaceCode(
                                    dec,
                                    'module.exports.' + getCode(dec)
                                )
                            })
                            replaceCode(
                                {
                                    range: [
                                        node.start,
                                        declaration.start +
                                            declaration.kind.length
                                    ]
                                },
                                ''
                            )
                        }
                    } else if (specifiers) {
                        const exports = specifiers
                            .map(function (specifier: any) {
                                const name = getCode(specifier)
                                return (
                                    'module.exports.' +
                                    name +
                                    ' = ' +
                                    name +
                                    '; '
                                )
                            })
                            .join('')
                        if (exports) {
                            replaceCode(node, exports)
                        }
                    }
                    break
            }
        }

        function walkAST(node: any, _parent: any, paperFeatures: any) {
            if (node) {
                for (const key in node) {
                    if (key !== 'range' && key !== 'loc') {
                        const value = node[key]
                        if (Array.isArray(value)) {
                            for (let i = 0, l = value.length; i < l; i++) {
                                walkAST(value[i], node, paperFeatures)
                            }
                        } else if (value && typeof value === 'object') {
                            walkAST(value, node, paperFeatures)
                        }
                    }
                }

                if (paperFeatures.operatorOverloading !== false) {
                    handleOverloading(node, parent)
                }

                if (paperFeatures.moduleExports !== false) {
                    handleExports(node)
                }
            }
        }
        function encodeVLQ(value: any) {
            let res = ''
            const base64 =
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
            value = (Math.abs(value) << 1) + (value < 0 ? 1 : 0)
            while (value || !res) {
                let next = value & (32 - 1)
                value >>= 5
                if (value) next |= 32
                res += base64[next]
            }
            return res
        }

        const url = options.url || ''
        const sourceMaps = options.sourceMaps
        const paperFeatures = options.paperFeatures || {}
        const source = options.source || code
        let offset = options.offset || 0
        const agent = PaperScope.paper.agent
        const version = agent.versionNumber
        let offsetCode = false
        const lineBreaks = /\r\n|\n|\r/gm
        let map: any

        if (
            sourceMaps &&
            ((agent.chrome && version >= 30) ||
                (agent.webkit && version >= 537.76) || // >= Safari 7.0.4
                (agent.firefox && version >= 23) ||
                agent.node)
        ) {
            if (agent.node) {
                offset -= 2
            } else if (window && url && !window.location.href.indexOf(url)) {
                const html = document.getElementsByTagName('html')[0].innerHTML
                offset =
                    html.substr(0, html.indexOf(code) + 1).match(lineBreaks)
                        .length + 1
            }

            offsetCode =
                offset > 0 &&
                !(
                    (agent.chrome && version >= 36) ||
                    (agent.safari && version >= 600) ||
                    (agent.firefox && version >= 40) ||
                    agent.node
                )
            const mappings = ['AA' + encodeVLQ(offsetCode ? 0 : offset) + 'A']
            mappings.length =
                (code.match(lineBreaks) || []).length +
                1 +
                (offsetCode ? offset : 0)
            map = {
                version: 3,
                file: url,
                names: [],
                mappings: mappings.join(';AACA'),
                sourceRoot: '',
                sources: [url],
                sourcesContent: [source]
            }
        }
        if (
            paperFeatures.operatorOverloading !== false ||
            paperFeatures.moduleExports !== false
        ) {
            walkAST(
                PaperScript.parse(code, {
                    ranges: true,
                    preserveParens: true,
                    sourceType: 'module'
                }),
                null,
                paperFeatures
            )
        }
        if (map) {
            if (offsetCode) {
                code = new Array(offset + 1).join('\n') + code
            }
            if (/^(inline|both)$/.test(sourceMaps)) {
                code +=
                    '\n//# sourceMappingURL=data:application/json;base64,' +
                    self.btoa(unescape(encodeURIComponent(JSON.stringify(map))))
            }
            code += '\n//# sourceURL=' + (url || 'paperscript')
        }
        return {
            url: url,
            source: source,
            code: code,
            map: map
        }
    }

    static loadAll() {
        const paperts = (window as any).paperts || (window as any).paper
        if (paperts) {
            Object.assign(window, paperts)

            Object.defineProperty(window, 'view', {
                get: function view() {
                    return PaperScope.paper.getView()
                }
            })

            Object.defineProperty(window, 'project', {
                get: function view() {
                    return PaperScope.paper.project
                }
            })

            const fields = Base.each(
                [
                    'add',
                    'subtract',
                    'multiply',
                    'divide',
                    'modulo',
                    'equals',
                    'negate'
                ],
                function (this: any, name) {
                    this['__' + name] = '#' + name
                },
                {
                    // Needed for '+' unary operator:
                    __self: function () {
                        return this
                    }
                }
            )

            Point.inject(fields)
            Size.inject(fields)
            Color.inject(fields)
        }

        Base.each(
            document && document.getElementsByTagName('script'),
            PaperScript.loadScript
        )
    }

    static load() {
        if (window) {
            if (document.readyState === 'complete') {
                setTimeout(PaperScript.loadAll)
            } else {
                DomEvent.add(window, { load: PaperScript.loadAll })
            }
        }
    }
}
