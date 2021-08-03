import './App.css'

import { PaperScope, Point, Path, Size, Rectangle } from '@yomyer/paperts'
import { useEffect, useRef } from 'react'

function App() {
    const canvasRef1 = useRef<HTMLCanvasElement>(null)
    const canvasRef2 = useRef<HTMLCanvasElement>(null)

    // const a = new Path.Circle([50, 50], 40)

    useEffect(() => {
        if (canvasRef1.current) {
            const scope = new PaperScope()
            scope.setup(canvasRef1.current)

            let topLeft = new Point(200, 200)
            let size = new Size(150, 100)
            let rectangle = new Rectangle(topLeft, size)
            let path = new Path.Ellipse(rectangle)
            path.fillColor = 'black'

            topLeft = new Point(5, 400)
            size = new Size(100, 50)
            rectangle = new Rectangle(topLeft, size)
            path = new Path.Ellipse(rectangle)
            path.fillColor = 'yellow'

            path = new Path.Circle(new Point(50, 50), 25)
            path.fillColor = 'red'

            const win = window as any
            win._json = scope.project.exportJSON()
            console.log(win._json)
        }
        if (canvasRef2.current) {
            const scope = new PaperScope()
            scope.setup(canvasRef2.current)

            scope.project.importJSON((window as any)._json)
        }
    }, [])

    return (
        <div className='App'>
            <h1>Canvas</h1>
            <canvas ref={canvasRef1} width='500' height='500'></canvas>
            <canvas ref={canvasRef2} width='500' height='500'></canvas>
        </div>
    )
}

export default App
