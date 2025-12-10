import type P5 from "p5"
import _p5_ from "p5"
import Render from "./Render"
import Gameplay from "./Gameplay"
import { customFont } from "./font";



export default class GameClient {
	// rescaled mouse position (0 to 400 width)
	mx: number = 0
	my: number = 0
	touchCountdown: number = 0
	helpImages: P5.Image[] = []

	constructor() {
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

			const createHelpImages = () => {
				p5.push()
				p5.scale(p5.width / 400)
				p5.clear() /// KA background(0,0);

				// highlight rects
				p5.noStroke()
				p5.fill(130, 118, 60)
				p5.rect(182, 39, 140, 22)
				p5.rect(133, 60, 128, 22)
				p5.rect(65, 81, 110, 22)

				p5.rect(222, 150, 125, 21)
				p5.rect(143, 170, 122, 21)
				p5.rect(110, 190, 95, 21)
				p5.rect(58, 210, 92, 21)

				p5.rect(34, 273, 47, 27)
				p5.rect(76, 299, 62, 27)

				p5.rect(45, 417, 65, 22)
				p5.rect(290, 417, 170, 22)

				p5.rect(266, 540, 80, 24)

				customFont.render(
					"welcome to tetromino gold! this is a game\nabout placing pieces and collecting\ngold points. you begin with 30 pieces.",
					15, 45, 10.4, p5.color(255), p5)
				customFont.render(
					"each piece has a golden square. normal\nsquares become golden if there are at\nleast 2 adjacent golden squares. you get a\ngold point for each cleared golden square.",
					15, 155, 10, p5.color(255), p5)
				customFont.render(
					"fill a straight row with squares\nto clear that row. see all rows\nshown above.",
					15, 280, 13, p5.color(255), p5)
				customFont.render(
					"there is another way to clear, click\nswitch to switch to destroyer square,\nwhich clears itself and its adjacents.",
					15, 400, 11.5, p5.color(255), p5)
				customFont.render(
					"good luck! how many gold points\nwill you get? click mobile to\ntoggle touchscreen control.",
					15, 520, 13, p5.color(255), p5)

				const h = p5.height * 0.2
				for (let i = 0; i < 5; i++) {
					this.helpImages.push(p5.get(0, h * i, p5.width, h))
				}
				p5.background(0)
				p5.pop()
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
				p5.angleMode(p5.RADIANS)
				p5.strokeJoin(p5.ROUND)
				p5.frameRate(30)

				createHelpImages()

				// connect instances
				render.p5 = p5
				render.gameplay = gameplay
				gameplay.render = render

				gameplay.setUpNewGame()
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
			p5.touchEnded = () => {
				if (this.touchCountdown > 0) return
				else this.touchCountdown = 5

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