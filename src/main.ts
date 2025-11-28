import _p5_ from "p5"
import Render from "./Render"
import Gameplay from "./Gameplay"


export function getRandomItem<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export default class GameClient {
	// rescaled mouse position (0 to 400 width)
	mx: number
	my: number
	touchCountdown: number
	isPressing: boolean

	constructor() {
		this.mx = 0
		this.my = 0
		this.touchCountdown = 0
		this.isPressing = false

		const render = new Render(this)
		const gameplay = new Gameplay(this)

		const sketch = (p5: _p5_) => {
			const getCanvasSize = () => {
				const HEIGHT_RATIO = 1.5
				const CANVAS_WIDTH = Math.min(
					window.innerWidth,
					window.innerHeight / HEIGHT_RATIO
				)
				return [CANVAS_WIDTH, CANVAS_WIDTH * HEIGHT_RATIO]
			}

			p5.windowResized = () => {
				const [w, h] = getCanvasSize()
				p5.resizeCanvas(w, h)
			}

			p5.setup = () => {
				const [w, h] = getCanvasSize()
				p5.createCanvas(
					w,
					h,
					p5.P2D,
					document.getElementById("game-canvas") as HTMLCanvasElement
				)

				// p5 configs
				p5.textAlign(p5.CENTER, p5.CENTER)
				p5.rectMode(p5.CENTER)
				p5.imageMode(p5.CENTER)
				p5.angleMode(p5.DEGREES)
				p5.strokeJoin(p5.ROUND)
				p5.frameRate(30)

				// connect instances
				render.p5 = p5
				render.gameplay = gameplay
				gameplay.render = render

			}

			p5.draw = () => {
				this.touchCountdown-- // update input delay
				// rescale canvas and mouse position
				this.mx = (p5.mouseX * 400) / p5.width
				this.my = (p5.mouseY * 400) / p5.width
				p5.scale(p5.width / 400)

				p5.clear(0, 0, 0, 0)
				render.draw()
			}

			p5.touchStarted = () => {
				this.isPressing = true
			}

			p5.touchEnded = () => {
				this.isPressing = false
				if (this.touchCountdown > 0) return
				else this.touchCountdown = 10

				render.click()
			}

			p5.keyPressed = () => {
				render.keyPressed()
			}
		}

		new _p5_(sketch)
	}
}

new GameClient()