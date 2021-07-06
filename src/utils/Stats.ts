class Panel {
    private min = Infinity
    private max = 0
    private context: CanvasRenderingContext2D

    private round = Math.round
    private PR = this.round(window.devicePixelRatio || 1)
    private WIDTH = 80 * this.PR
    private HEIGHT = 48 * this.PR
    private TEXT_X = 3 * this.PR
    private TEXT_Y = 2 * this.PR
    private GRAPH_X = 3 * this.PR
    private GRAPH_Y = 15 * this.PR
    private GRAPH_WIDTH = 74 * this.PR
    private GRAPH_HEIGHT = 30 * this.PR

    dom: HTMLCanvasElement

    constructor(
        private name: string,
        private foregroundColor: string,
        private backgroundColor: string
    ) {
        const canvas = document.createElement('canvas')
        canvas.width = this.WIDTH
        canvas.height = this.HEIGHT
        canvas.style.cssText = 'width:80px;height:48px'

        this.context = canvas.getContext('2d')
        this.context.font =
            'bold ' + 9 * this.PR + 'px Helvetica,Arial,sans-serif'
        this.context.textBaseline = 'top'

        this.context.fillStyle = this.backgroundColor
        this.context.fillRect(0, 0, this.WIDTH, this.HEIGHT)

        this.context.fillStyle = this.foregroundColor
        this.context.fillText(this.name, this.TEXT_X, this.TEXT_Y)
        this.context.fillRect(
            this.GRAPH_X,
            this.GRAPH_Y,
            this.GRAPH_WIDTH,
            this.GRAPH_HEIGHT
        )

        this.context.fillStyle = this.backgroundColor
        this.context.globalAlpha = 0.9
        this.context.fillRect(
            this.GRAPH_X,
            this.GRAPH_Y,
            this.GRAPH_WIDTH,
            this.GRAPH_HEIGHT
        )

        this.dom = canvas
    }

    update(value: number, maxValue: number) {
        this.min = Math.min(this.min, value)
        this.max = Math.max(this.max, value)

        this.context.fillStyle = this.backgroundColor
        this.context.globalAlpha = 1
        this.context.fillRect(0, 0, this.WIDTH, this.GRAPH_Y)
        this.context.fillStyle = this.foregroundColor
        this.context.fillText(
            this.round(value) +
                ' ' +
                this.name +
                ' (' +
                this.round(this.min) +
                '-' +
                this.round(this.max) +
                ')',
            this.TEXT_X,
            this.TEXT_Y
        )

        this.context.drawImage(
            this.dom,
            this.GRAPH_X + this.PR,
            this.GRAPH_Y,
            this.GRAPH_WIDTH - this.PR,
            this.GRAPH_HEIGHT,
            this.GRAPH_X,
            this.GRAPH_Y,
            this.GRAPH_WIDTH - this.PR,
            this.GRAPH_HEIGHT
        )

        this.context.fillRect(
            this.GRAPH_X + this.GRAPH_WIDTH - this.PR,
            this.GRAPH_Y,
            this.PR,
            this.GRAPH_HEIGHT
        )

        this.context.fillStyle = this.backgroundColor
        this.context.globalAlpha = 0.9
        this.context.fillRect(
            this.GRAPH_X + this.GRAPH_WIDTH - this.PR,
            this.GRAPH_Y,
            this.PR,
            this.round((1 - value / maxValue) * this.GRAPH_HEIGHT)
        )
    }
}
export default class Stats {
    REVISION: number

    static Panel = Panel

    private mode = 0
    private container: HTMLDivElement
    private beginTime = 0
    private prevTime = 0
    private frames = 0
    private fpsPanel: Panel
    private msPanel: Panel
    private memPanel: Panel

    constructor() {
        this.container = document.createElement('div')
        this.container.style.cssText =
            'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000'
        this.container.addEventListener(
            'click',
            (event) => {
                event.preventDefault()
                this.showPanel(++this.mode % this.container.children.length)
            },
            false
        )

        this.beginTime = (performance || Date).now()
        this.prevTime = this.beginTime
        this.frames = 0

        this.fpsPanel = this.addPanel(new Stats.Panel('FPS', '#0ff', '#002'))
        this.msPanel = this.addPanel(new Stats.Panel('MS', '#0f0', '#020'))

        if (self.performance && (self.performance as any).memory) {
            this.memPanel = this.addPanel(new Stats.Panel('MB', '#f08', '#201'))
        }

        this.showPanel(0)
    }

    get dom(): HTMLDivElement {
        return this.container
    }

    begin() {
        this.beginTime = (performance || Date).now()
    }

    end(): number {
        this.frames++

        const time = (performance || Date).now()
        this.msPanel.update(time - this.beginTime, 200)

        if (time > this.prevTime + 1000) {
            this.fpsPanel.update(
                (this.frames * 1000) / (time - this.prevTime),
                100
            )

            this.prevTime = time
            this.frames = 0

            if (this.memPanel) {
                const memory = (performance as any).memory
                this.memPanel.update(
                    memory.usedJSHeapSize / 1048576,
                    memory.jsHeapSizeLimit / 1048576
                )
            }
        }

        return time
    }

    update() {
        this.beginTime = this.end()
    }

    addPanel(panel: Panel): Panel {
        this.container.appendChild(panel.dom)
        return panel
    }

    showPanel(id: number): void {
        for (let i = 0; i < this.container.children.length; i++) {
            ;(this.container.children[i] as HTMLElement).style.display =
                i === id ? 'block' : 'none'
        }
        this.mode = id
    }
}
