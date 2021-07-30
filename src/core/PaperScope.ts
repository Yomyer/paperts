import {
    Base,
    UID,
    Tool,
    Project,
    CanvasProvider,
    BlendMode,
    BlendModes
} from '../'

import { Size as SizeType } from '../basic/Types'
import Options from '../options'

export type OSPlatforms =
    | 'darwin'
    | 'win'
    | 'mac'
    | 'linux'
    | 'freebsd'
    | 'sunos'

export type BrowsersPlatforms =
    | 'opera'
    | 'chrome'
    | 'safari'
    | 'webkit'
    | 'firefox'
    | 'msie'
    | 'trident'
    | 'atom'
    | 'node'

export type PapperAgent = {
    opera?: boolean
    chrome?: boolean
    safari?: boolean
    webkit?: boolean
    firefox?: boolean
    msie?: boolean
    trident?: boolean
    atom?: boolean
    node?: boolean
    jsdom?: boolean
    name?: BrowsersPlatforms
    darwin?: boolean
    win?: boolean
    mac?: boolean
    linux?: boolean
    freebsd?: boolean
    sunos?: boolean
    platform?: OSPlatforms
    version?: string
    versionNumber?: number | 'jsdom'
}

export type PaperSupport = {
    nativeDash: boolean
    nativeBlendModes: BlendModes
}

export type PapperSettings = {
    applyMatrix: boolean
    insertItems: boolean
    handleSize: number
    hitTolerance: number
}

export class PaperScope extends Base {
    public _class = 'PaperScope'
    static _paper: PaperScope

    static proto: typeof PaperScope

    settings: PapperSettings

    /**
     * The currently active project.
     *
     * @name PaperScope#project
     * @type Project
     */
    project: Project

    /**
     * The list of all open projects within the current Paper.js context.
     *
     * @name PaperScope#projects
     * @type Project[]
     */
    projects: Project[]

    /**
     * The list of available tools.
     *
     * @name PaperScope#tools
     * @property
     * @type Tool[]
     */
    tools: Tool[]

    /**
     * The reference to the active tool.
     *
     * @name PaperScope#tool
     * @property
     * @type Tool
     */
    tool: Tool

    version = Options.version

    static agent: PapperAgent = {}
    static browser: PapperAgent
    static support: PaperSupport

    static _scopes: { [key: string]: PaperScope } = {}

    constructor(..._args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize()
        }
    }

    initialize(): this {
        this.paper = this

        this.settings = {
            applyMatrix: true,
            insertItems: true,
            handleSize: 4,
            hitTolerance: 0
        } as PapperSettings

        this.project = null
        this.projects = []
        this.tools = []
        this._id = UID.get()

        PaperScope._scopes[this._id] = this

        if (!this.support) {
            const ctx = CanvasProvider.getContext(1, 1) || {}
            PaperScope.support = {
                nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
                nativeBlendModes: BlendMode.nativeModes
            }
            CanvasProvider.release(ctx)
        }
        if (!this.agent) {
            const user = self.navigator.userAgent.toLowerCase()
            const os = (/(darwin|win|mac|linux|freebsd|sunos)/.exec(user) ||
                [])[0]
            const platform = os === 'darwin' ? 'mac' : (os as OSPlatforms)
            const agent = (PaperScope.agent = PaperScope.browser =
                { platform }) as PapperAgent
            if (platform) agent[platform] = true

            user.replace(
                /(opera|chrome|safari|webkit|firefox|msie|trident|atom|node|jsdom)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv:v?([.\d]+))?/g,
                function (
                    _: any,
                    n: BrowsersPlatforms,
                    v1: any,
                    v2: any,
                    rv: any
                ): string {
                    if (!agent.chrome) {
                        const v =
                            n === 'opera'
                                ? v2
                                : /^(node|trident)$/.test(n)
                                ? rv
                                : v1
                        agent.version = v
                        agent.versionNumber = parseFloat(v)
                        n =
                            ({ trident: 'msie', jsdom: 'node' } as unknown)[
                                n
                            ] || n
                        agent.name = n
                        agent[n] = true
                    }
                    return null
                }
            )
            if (agent.chrome) delete agent.webkit
            if (agent.atom) delete agent.chrome
        }

        return this
    }

    get agent(): PapperAgent {
        return PaperScope.agent
    }

    get browser(): PapperAgent {
        return PaperScope.browser
    }

    get support(): PaperSupport {
        return PaperScope.support
    }

    static get paper() {
        if (!PaperScope._paper) {
            this._paper = new PaperScope().setup([100, 100])
        }

        return PaperScope._paper
    }

    static set paper(paper: PaperScope) {
        PaperScope._paper = paper
    }

    get paper() {
        return PaperScope._paper
    }

    set paper(paper: PaperScope) {
        PaperScope._paper = paper
    }

    /**
     * The reference to the active project's view.
     *
     * @bean
     * @type View
     */
    getView() {
        const project = this.project
        return project && project.view
    }

    /**
     * A reference to the local scope. This is required, so `paper` will always
     * refer to the local scope, even when calling into it from another scope.
     * `paper.activate();` will have to be called in such a situation.
     *
     * @bean
     * @type PaperScript
     * @private
     */
    getPaper() {
        return this
    }

    /**
     * Injects the paper scope into any other given scope. Can be used for
     * example to inject the currently active PaperScope into the window's
     * global scope, to emulate PaperScript-style globally accessible Paper
     * classes and objects.
     *
     * <b>Please note:</b> Using this method may override native constructors
     * (e.g. Path). This may cause problems when using Paper.js in conjunction
     * with other libraries that rely on these constructors. Keep the library
     * scoped if you encounter issues caused by this.
     *
     * @example
     * paper.install(window);
     */
    install(scope: any) {
        Base.each(['project', 'view', 'tool'], (key) => {
            Base.define(scope, key, {
                configurable: true,
                get: () => {
                    return this[key]
                }
            })
        })

        for (const key in this) {
            if (!/^_/.test(key) && this[key]) {
                scope[key] = this[key]
            }
        }
    }

    /**
     * Sets up an empty project for us. If a canvas is provided, it also creates
     * a {@link View} for it, both linked to this scope.
     *
     * @param {HTMLCanvasElement|String|Size} element the HTML canvas element
     * this scope should be associated with, or an ID string by which to find
     * the element, or the size of the canvas to be created for usage in a web
     * worker.
     */
    setup(element: HTMLCanvasElement | String | SizeType) {
        this.paper = this
        this.project = new Project(element, this)
        return this
    }

    createCanvas(width: number, height: number) {
        return CanvasProvider.getCanvas(width, height)
    }

    /**
     * Activates this PaperScope, so all newly created items will be placed
     * in its active project.
     */
    activate() {
        this.paper = this
    }

    clear() {
        const projects = this.projects
        const tools = this.tools
        for (let i = projects.length - 1; i >= 0; i--) {
            projects[i].remove()
        }
        for (let i = tools.length - 1; i >= 0; i--) {
            tools[i].remove()
        }
    }

    remove() {
        this.clear()
        delete PaperScope._scopes[this._id]
    }

    /**
     * Set the global paper object to the current scope
     *
     * @param {PaperScope} scope
     */
    static setGlobalPaper(scope: PaperScope) {
        PaperScope._paper = scope
    }

    static clearGlobalPaper() {
        PaperScope._paper = null
        PaperScope._scopes = {}
        return PaperScope.paper
    }

    static get(id: string) {
        return PaperScope._scopes[id] || null
    }

    static getAttribute(el: HTMLElement, attr: string) {
        return el.getAttribute(attr) || el.getAttribute('data-paper-' + attr)
    }

    static hasAttribute(el: HTMLElement, attr: string): boolean {
        return el.hasAttribute(attr) || el.hasAttribute('data-paper-' + attr)
    }
}
