import type P5 from "p5"
import GameClient from "./main"
import Gameplay, { ClearableSquare, OriginalPiece, sqDirs, SquareData } from "./Gameplay"
import { customFont } from "./font"

export type PositionType = [number, number]
export type SquareID = [number, number, number] // [face, x, y]


// AdvancedSquareVertex
type ASV = { edgeVert: PositionType, distCount: number }
// Animated Placing Square Snapshot
export type APSSnap = { id: SquareID, startDeg?: number, endDeg?: number, aSqVerts?: [ASV, ASV, ASV, ASV] } // snapshot of a square at one face
// AnimatedPlacingSquare: array of the same square with all (1-3) snaps
export type APS = { sqData: SquareData, snaps: APSSnap[] }

type Particle = {
  pos: PositionType,
  vel: PositionType,
  size: number
}

type GoldenLaser = {
  targetPos: PositionType
  startPos: PositionType
  pos1: PositionType
  pos2: PositionType
  delay: number // how long the line is
}

export default class Render {
  gc: GameClient
  p5!: P5
  gameplay!: Gameplay

  CONSTS = {
    SL: 60, // square length
    GC: { x: 200, y: 220 }, // grid center
    LASER_SPEED: 20
  }

  GRID_VERTICES: {
    verts: PositionType[],
    faces: PositionType[][][][] // 3 faces each has 3x3 squares each has 4 vertices 
  }

  btnPrgs: Record<string, number> = {
    help: 1,
    next: 1,
    touchscreen: 1,
    place: 1,
    rotate: 1,
    switch: 1,
    replay: 1
  }
  hoveredBtn: null | "REPLAY" | "HELP" | "TOUCHSCREEN" | "PLACE" | "ROTATE" | "SWITCH" = null

  hintAtHelp: boolean = true
  helpModal: {
    isOpened: boolean, index: number, targetY: number, prevY: number, prg: number
  } = {
      isOpened: false, index: 0, targetY: 0, prevY: -100, prg: 0
    }

  animatedPlacingSqs: APS[] = []
  highestSnapsCount: number = 0

  animatedSpreadingSqs: ({ id: SquareID, prg: number })[] = []
  animatedClearingSqs: ClearableSquare[] = []

  goldenLasers: GoldenLaser[] = []
  piecesMovementPrg: number = 0

  touchscreenOn: boolean = false

  RATINGS: [number, string][] = [
    // [score threshold, text]
    [0, ""],
    [60, "awesome!"],
    [70, "excellent!"],
    [80, "brilliant!"],
    [90, "incredible!"],
    [100, "legendary!!!"]
  ]
  endModal: {
    subphase: "MESSAGE" | "DELAY" | "PRE-RATING" | "RATING",
    score: number,
    rating: number,
    prg: number,
    particles: Particle[],
    img: P5.Image | null,
    imgPrg: number
  } = {
      subphase: "MESSAGE",
      score: 0,
      rating: 0,
      prg: 1,
      particles: [],
      img: null,
      imgPrg: 0
    }

  input: {
    hoveredSquare: SquareID | null
    calculatedSqs: {
      id: SquareID, isGolden: boolean,
      isOutOfBound?: boolean, isOverlapped?: boolean,
      overlapSelf?: boolean
    }[]
  } = { hoveredSquare: null, calculatedSqs: [] }

  constructor(gameClient: GameClient) {
    this.gc = gameClient

    this.GRID_VERTICES = {
      verts: [[this.CONSTS.GC.x, this.CONSTS.GC.y]], // starts with center vertex
      faces: []
    }

    const { SL, GC } = this.CONSTS
    const GV = this.GRID_VERTICES
    const { PI, cos, sin } = Math

    // >>> COMPUTE GRID_VERTICES.verts
    // each cube face
    for (let i = 0; i < 3; i++) {
      const deg = PI / 180 * (i * 120 - 150)
      const deg2 = deg + PI / 180 * 120
      const cosDeg = cos(deg)
      const sinDeg = sin(deg)
      const cosDeg2 = cos(deg2)
      const sinDeg2 = sin(deg2)

      // each (vertical) row (1,2,3 => index + 1)
      for (let r = 1; r < 4; r++) {
        // starts with first vertex...
        const rowVerts: PositionType[] = [
          [cosDeg * SL * r + GC.x, sinDeg * SL * r + GC.y]
        ]

        // ...then add 3 more (horizontal)
        for (let rr = 1; rr < 4; rr++) {
          const lastRV = rowVerts[rowVerts.length - 1]
          rowVerts.push([
            lastRV[0] + cosDeg2 * SL,
            lastRV[1] + sinDeg2 * SL
          ])
        }

        // add to GV.verts
        GV.verts.push(...rowVerts)
      }
    }

    // >>> SET GRID_VERTICES.sqVerts
    // each cube face
    for (let i = 0; i < 3; i++) {
      const rows = []
      // each (vertical) row
      for (let r = 0; r < 3; r++) {
        const sqs = []
        // each square
        for (let rr = 0; rr < 3; rr++) {
          // first square in top face example vertices order: left, top, right, bottom
          const nextFaceIndex = i === 2 ? 0 : i + 1
          const sqVerts: PositionType[] = [
            GV.verts[i * 12 + r * 4 + rr + 1],
            GV.verts[i * 12 + r * 4 + rr + 2],
            // first row has different last 3rd and 4th vertices
            // 3rd vertice is center if is first row and first square (rr)
            r === 0 ?
              GV.verts[nextFaceIndex * 12 + (rr + 1) * 4 - 3] :
              GV.verts[i * 12 + (r - 1) * 4 + rr + 2],
            r === 0 ?
              (rr === 0 ? GV.verts[0] : GV.verts[nextFaceIndex * 12 + rr * 4 - 3]) :
              GV.verts[i * 12 + (r - 1) * 4 + rr + 1]
          ]

          sqs.push(sqVerts)
        }
        rows.push(sqs)
      }
      GV.faces.push(rows)
    }

  }

  isPointInParallelogram(P: PositionType, [A, B, C, D]: PositionType[]): boolean {
    const ABx = B[0] - A[0];
    const ABy = B[1] - A[1];
    const ADx = D[0] - A[0];
    const ADy = D[1] - A[1];
    const APx = P[0] - A[0];
    const APy = P[1] - A[1];

    const denom = ABx * ADy - ABy * ADx;
    if (denom === 0) return false;

    // Cross-product numerators
    const u_num = APx * ADy - APy * ADx;
    const v_num = ABx * APy - ABy * APx;

    // Compare without dividing by denom
    if (denom > 0) {
      return (
        u_num >= 0 && u_num <= denom &&
        v_num >= 0 && v_num <= denom
      );
    } else {
      return (
        u_num <= 0 && u_num >= denom &&
        v_num <= 0 && v_num >= denom
      );
    }
  }

  getHoveredSquare(): SquareID | null {
    if (this.gameplay.phase !== "PLAY" || this.helpModal.isOpened) { return null } // not play phase || is showing help
    const { verts } = this.GRID_VERTICES
    const mousePos: PositionType = [this.gc.mx, this.gc.my]
    let faceIndex: number | null = null;

    // top face
    if (this.isPointInParallelogram(mousePos, [verts[0], verts[9], verts[12], verts[21]])) {
      faceIndex = 0
    } else if (this.isPointInParallelogram(mousePos, [verts[0], verts[21], verts[24], verts[33]])) {
      faceIndex = 1
    } else if (this.isPointInParallelogram(mousePos, [verts[0], verts[33], verts[36], verts[9]])) {
      faceIndex = 2
    }

    if (typeof faceIndex === "number") {
      const rows = this.GRID_VERTICES.faces[faceIndex]
      for (let r = 0; r < rows.length; r++) {
        const sqs = rows[r]
        for (let rr = 0; rr < sqs.length; rr++) {
          if (this.isPointInParallelogram([this.gc.mx, this.gc.my], sqs[rr])) {
            return [faceIndex, r, rr]
          }
        }
      }
    }

    return null
  }

  renderGrid() {
    const { p5 } = this
    const { verts } = this.GRID_VERTICES
    p5.stroke(this.getSqColor(1))
    p5.strokeWeight(1)

    for (let f = 0; f < 3; f++) {
      const nextFaceIndex = f === 2 ? 0 : f + 1
      // vertical lines
      for (let x = 0; x < 4; x++) {
        const v1 = x === 0 ? verts[0] : verts[nextFaceIndex * 12 + (x - 1) * 4 + 1]
        const v2 = verts[f * 12 + x + 8 + 1]
        p5.line(v1[0], v1[1], v2[0], v2[1])
      }

      // horizontal lines
      for (let y = 0; y < 3; y++) {
        const v1 = verts[f * 12 + y * 4 + 1]
        const v2 = verts[f * 12 + y * 4 + 4]
        p5.line(v1[0], v1[1], v2[0], v2[1])
      }
    }
  }

  getSteppedSqID(sd: sqDirs, id: SquareID): SquareID | null {
    id = id.slice() as SquareID

    for (let i = 0; i < sd.length; i++) {
      switch (sd[i]) {
        case "U":
          if (id[1] === 2) return null
          id[1]++
          break
        case "R":
          if (id[2] === 2) return null
          id[2]++
          break
        case "D":
          // going to next face?
          if (id[1] === 0) {
            id = [id[0] === 2 ? 0 : id[0] + 1, id[2], 0]
            // apply rotation to sd
            sd = sd.map(d => this.gameplay.getRotatedDir(d, false))
          } else {
            id[1]--
          }
          break
        case "L":
          // going to previous face?
          if (id[2] === 0) {
            id = [id[0] === 0 ? 2 : id[0] - 1, 0, id[1]]
            // apply rotation to sd
            sd = sd.map(d => this.gameplay.getRotatedDir(d, true))
          } else {
            id[2]--
          }
          break
      }
    }
    return id
  }

  renderBtn(t: string, tSize: number, tx: number, ty: number, prg: number, x: number, y: number, w: number, h: number, r: number) {
    const p5 = this.p5
    p5.push()
    p5.translate(x, y)
    if (r !== 0) { p5.rotate(r) }
    if (prg < 1) {
      const s = Math.sin(Math.PI * Math.max(0, Math.min(1, prg)))
      p5.scale(1 + s * 0.2, 1 - s * 0.2)
      p5.fill(p5.lerpColor(
        p5.color(214, 180, 30),
        p5.color(this.getSqColor(1)),
        prg
      ))
    }
    else { p5.fill(this.getSqColor(1)) }
    p5.rect(0, 0, w, h, 10)
    customFont.render(t, tx, ty, tSize, p5.color(250), p5)
    p5.pop()
  }

  pointInRotRect(
    mx: number,
    my: number,
    x: number,
    y: number,
    w: number,
    h: number,
    tiltRight: boolean
  ): boolean {
    const dx = mx - x;
    const dy = my - y;
    const sin = tiltRight ? -0.5 : 0.5;
    const cos = Math.sqrt(3) / 2;
    return Math.abs(dx * cos - dy * sin) <= w * 0.5 && Math.abs(dx * sin + dy * cos) <= h * 0.5;
  }

  renderButtons() {
    this.hoveredBtn = null // reset
    const { mx, my } = this.gc
    const _30deg = Math.PI / 180 * 30

    // top left button
    this.renderBtn("help", 20, -35, 10, this.btnPrgs.help, 105, 55, 150, 35, -_30deg)
    // top right button
    this.renderBtn("mobile: " + (this.touchscreenOn ? "on" : "off"), 14, -62, 7, this.btnPrgs.touchscreen, 295, 55, 150, 35, _30deg)
    // switch btn
    this.renderBtn("switch", 18, -46, 9, this.btnPrgs.switch, 200, 560, 150, 35, 0)
    if (this.touchscreenOn) {
      // bottom left button
      this.renderBtn("place", 18, -37, 9, this.btnPrgs.place, 105, 385, 150, 35, _30deg)
      // bottom right button
      this.renderBtn("rotate", 18, -48, 9, this.btnPrgs.rotate, 295, 385, 150, 35, -_30deg)
    }

    // update all of btnPrgs
    for (const key in this.btnPrgs) {
      if (this.btnPrgs[key] < 1) {
        this.btnPrgs[key] = Math.min(1, this.btnPrgs[key] + 0.16) // btn animation speed
      }
    }

    if (this.gameplay.phase === "END") { return } // blocked on end phase
    // help modal
    if (this.helpModal.isOpened) {
      /// next btn & hover
      return
    }

    if (this.touchscreenOn) {
      if (this.pointInRotRect(mx, my, 105, 385, 150, 35, true)) {
        return this.hoveredBtn = "PLACE"
      }
      if (this.pointInRotRect(mx, my, 295, 385, 150, 35, false)) {
        return this.hoveredBtn = "ROTATE"
      }
    }

    if (this.pointInRotRect(mx, my, 105, 55, 150, 35, false)) {
      return this.hoveredBtn = "HELP"
    }
    if (this.pointInRotRect(mx, my, 295, 55, 150, 35, true)) {
      return this.hoveredBtn = "TOUCHSCREEN"
    }
    if (mx > 125 && mx < 275 && my > 540 && my < 580) {
      return this.hoveredBtn = "SWITCH"
    }
  }

  isThePlacingSquare(id: SquareID): boolean {
    if (this.gameplay.phase !== "PLACE") { return false }
    for (let i = 0; i < this.animatedPlacingSqs.length; i++) {
      const sqs = this.animatedPlacingSqs[i]
      const sid = sqs.snaps[sqs.snaps.length - 1].id
      if (id[0] === sid[0] && id[1] === sid[1] && id[2] === sid[2]) { return true }
    }
    return false
  }

  renderExistingSquares() {
    const { boardData } = this.gameplay
    const p5 = this.p5

    p5.stroke(this.getSqColor(1))
    p5.strokeWeight(4)
    for (let i = 0; i < 3; i++) {
      const rows = this.GRID_VERTICES.faces[i]
      for (let r = 0; r < 3; r++) {
        const sqs = rows[r]
        for (let rr = 0; rr < 3; rr++) {
          const sqVerts = sqs[rr]

          const sd = boardData[i][r][rr]
          if (sd === 0) { continue } // no square here

          // check if is placing phase then don't render placing squares
          if (this.isThePlacingSquare([i, r, rr])) { continue }
          p5.fill(this.getSqColor(boardData[i][r][rr]))
          p5.beginShape()
          for (let sv = 0; sv < sqVerts.length; sv++) {
            p5.vertex(sqVerts[sv][0], sqVerts[sv][1])
          }
          p5.endShape(p5.CLOSE)
        }
      }
    }

  }

  getPieceImageData(op: OriginalPiece) {
    const { sqList, goldenSqIndex } = op
    const hIndex: number = goldenSqIndex === "CENTER" ? 0 : goldenSqIndex + 1
    const sqsCoors: PositionType[] = [[0, 0]]
    for (let j = 0; j < sqList.length; j++) {
      const sqdirs = sqList[j]
      const coor: PositionType = [0, 0]
      for (let d = 0; d < sqdirs.length; d++) {
        switch (sqdirs[d]) {
          case "U":
            coor[1]++
            break
          case "D":
            coor[1]--
            break
          case "L":
            coor[0]--
            break
          case "R":
            coor[0]++
            break
        }
      }
      sqsCoors.push(coor)
    }

    // fix some pieces
    const RP = this.gameplay.RAW_PIECES
    if (sqList === RP[6]) {
      for (let c = 0; c < sqsCoors.length; c++) {
        sqsCoors[c][1] += 0.5
      }
    }
    if (sqList === RP[1] || sqList === RP[3]) {
      for (let c = 0; c < sqsCoors.length; c++) {
        sqsCoors[c][0]++
      }
    }
    if (sqList === RP[0] || sqList === RP[1]) {
      for (let c = 0; c < sqsCoors.length; c++) {
        sqsCoors[c][1]--
      }
    }
    if (sqList === RP[5]) {
      for (let c = 0; c < sqsCoors.length; c++) {
        sqsCoors[c][1] -= 0.5
        sqsCoors[c][0] += 0.5
      }
    }
    return { sqsCoors, hIndex }
  }

  getSqColor(sd: SquareData): P5.Color {
    if (sd === 1) { return this.p5.color(130, 118, 60) }
    if (sd === 2) { return this.p5.color(245, 228, 44) } // golden
    if (sd === 3) { return this.p5.color(242, 80, 245) } // destroyer
    return this.p5.color(0, 0, 0)
  }

  renderEndModal() {
    const { p5, gameplay: gp, endModal } = this
    const sp = endModal.subphase

    // bg & message
    if (sp === "RATING") { p5.background(26, 23, 11) }
    else {
      const prg = 1 - Math.pow(1 - gp.ug, 3)
      // bg rect
      p5.noStroke()
      p5.fill(26, 23, 11, sp === "MESSAGE" ? prg * 230 : (sp === "DELAY" ? 230 : 230 + prg * 25))
      p5.rect(200, 300, 400, sp === "MESSAGE" ? prg * 150 : (sp === "DELAY" ? 150 : 150 + prg * 450))
      customFont.render(
        gp.gameOverMessage === "NO_PIECES" ? "no more pieces" : "out of space",
        (gp.gameOverMessage === "NO_PIECES" ? 415 : 435) -
        (sp === "MESSAGE" ? prg * 390 : (sp === "DELAY" ? 390 : 390 + prg * 390)),
        312, 30, p5.color(250, 100, 100), p5
      )
    }

    // rating
    if (sp === "PRE-RATING" || sp === "RATING") {
      const RATINGS = this.RATINGS
      const offX = sp === "RATING" ? 400 : (1 - Math.pow(1 - gp.ug, 3)) * 400
      endModal.prg = Math.min(1, endModal.prg + 0.05)

      // max rating? stay at 0.5 prg
      if (endModal.rating === RATINGS.length - 1 && endModal.prg > 0.5) { endModal.prg = 0.5 }
      const calculatedPrg = Math.sin(Math.PI * Math.max(0, Math.min(1, endModal.prg)))
      p5.push()
      p5.translate(600 - offX, 300)
      p5.scale(1 + calculatedPrg * 0.4)

      // outline behind
      const colorValue = p5.lerpColor(this.getSqColor(1), this.getSqColor(2), calculatedPrg)
      p5.stroke(colorValue)
      p5.noFill()
      p5.strokeWeight(10)
      p5.circle(0, 0, 150)
      for (let i = 0; i < endModal.particles.length; i++) {
        const pc = endModal.particles[i]
        p5.strokeWeight(pc.size * 0.15)
        p5.circle(pc.pos[0], pc.pos[1], pc.size)
      }

      // front filling
      p5.noStroke()
      p5.fill(26, 23, 11)
      p5.circle(0, 0, 150)
      let speed = 2 + calculatedPrg * 8
      for (let i = endModal.particles.length - 1; i >= 0; i--) {
        const pc = endModal.particles[i]
        p5.circle(pc.pos[0], pc.pos[1], pc.size)
        // update
        pc.pos[0] += pc.vel[0] * speed
        pc.pos[1] += pc.vel[1] * speed
        pc.size -= 1.3 + calculatedPrg * 4.5 // shrink speed
        if (pc.size <= 0) { endModal.particles.splice(i, 1) }
      }

      // score
      const textWidth = customFont.render(endModal.score + "", -1000, 0, 36, p5.color(0, 0), p5)
      customFont.render(endModal.score + "", -textWidth / 2, 20, 36, this.getSqColor(2), p5)

      // passively spawn circles, spawn rate scaled with score??
      if (p5.frameCount % (2 - (endModal.prg < 1 ? 1 : 0)) === 0) {
        const randomDeg = Math.random() * Math.PI * 2
        endModal.particles.push({
          pos: [0, 0],
          vel: [Math.cos(randomDeg), Math.sin(randomDeg)],
          size: 100
        })
      }

      // rating text
      if (endModal.rating > 0) {
        p5.noStroke()
        customFont.render(
          RATINGS[endModal.rating][1],
          -130, -140, 28, colorValue, p5)
      }
      p5.pop()

      // update score
      if (endModal.score < gp.goldPoints && p5.frameCount % 2 === 0) {
        endModal.score++
        // count faster if currently less than 40
        if (endModal.score < 40) { endModal.score = Math.min(gp.goldPoints, endModal.score + 1) }
        // rating up?
        if (endModal.rating < RATINGS.length - 1 &&
          endModal.score >= RATINGS[endModal.rating + 1][0]) {
          endModal.rating++
          endModal.prg = 0
        }
      }

      // render replay button
      if (endModal.score === gp.goldPoints && endModal.subphase === "RATING") {
        p5.noStroke()
        this.renderBtn("play again", 18, -82, 9, this.btnPrgs.replay, 200, 540, 200, 50, 0)
        this.btnPrgs.replay = Math.min(1, this.btnPrgs.replay + 0.14)
        const { mx, my } = this.gc
        this.hoveredBtn = null // reset
        if (mx > 100 && mx < 300 && my > 515 && my < 565) {
          this.hoveredBtn = "REPLAY"
        }
      }
    }
  }

  renderHelpModal() {
    const { p5, helpModal } = this
    const y = helpModal.prevY + (1 - Math.pow(1 - helpModal.prg, 3)) * (helpModal.targetY - helpModal.prevY)

    p5.stroke(this.getSqColor(1))
    p5.strokeWeight(3)
    p5.fill(26, 23, 11, 220)
    p5.rect(200, y, 420, 170)

    p5.image(this.gc.helpImages[helpModal.index], 200, y - 30, 400, 120)
    // hint drawings based on index
    switch (helpModal.index) {
      case 0:
        break
      case 1:
        break
      case 2:
        break
      case 3:
        break
      case 4:
        break
    }
    // next btn
    p5.noStroke()
    this.renderBtn(Math.random() > 0.5 ? "next" : "done", 18, -32, 9, this.btnPrgs.next, 200, y + 55, 140, 35, 0)
    // update prg
    helpModal.prg = Math.min(1, helpModal.prg + 0.05)
  }

  draw() {
    const { p5, gameplay: gp, endModal } = this
    p5.cursor(p5.ARROW)

    // end subphase RATING 
    if (endModal.subphase === "RATING") {
      this.renderEndModal()
      return
    }

    const goldenColor = this.getSqColor(2)
    const normalColor = this.getSqColor(1)

    p5.background(26, 23, 11)
    p5.noStroke()
    this.renderButtons()
    this.renderGrid()
    this.renderExistingSquares()


    // desktop render
    if (!this.touchscreenOn) {
      // show HAND cursor if hovering on a button
      if (this.hoveredBtn) { p5.cursor(p5.HAND) }

      // render control hints
      const _30deg = Math.PI / 180 * 30
      p5.noStroke()
      p5.push()
      p5.translate(50, 350)
      p5.rotate(_30deg)
      customFont.render("click: place", 0, 0, 12, normalColor, p5)
      p5.pop()
      p5.push()
      p5.translate(260, 400)
      p5.rotate(-_30deg)
      customFont.render("r: rotate\ns: switch", 0, 0, 12, normalColor, p5)
      p5.pop()
    }


    const { currentPiece } = gp
    // holding a piece?
    if (currentPiece) {
      // update hoverSquare
      const hoveredSquare = this.getHoveredSquare()
      this.input.hoveredSquare = hoveredSquare // for click action
      if (hoveredSquare) {
        currentPiece.hoveredSq = hoveredSquare

        // rotate piece if changed face
        const { lastHoveredFaceIndex } = gp
        if (lastHoveredFaceIndex !== hoveredSquare[0]) {
          // clockwise if going to previous face
          const goingPreviousFace = (lastHoveredFaceIndex === 0 && hoveredSquare[0] === 2) ||
            (lastHoveredFaceIndex === 1 && hoveredSquare[0] === 0) ||
            (lastHoveredFaceIndex === 2 && hoveredSquare[0] === 1)
          gp.rotatePiece(goingPreviousFace)
          gp.lastHoveredFaceIndex = hoveredSquare[0] as 0 | 1 | 2
        }

      }
      else {
        if (this.hoveredBtn === "ROTATE" || this.hoveredBtn === "PLACE" || this.hoveredBtn === "SWITCH") { }
        // is NOT hovering on ROTATE/PLACE/SWITCH button? then change to null
        else { currentPiece.hoveredSq = null }
      }

      // render piece preview
      if (currentPiece.hoveredSq) {
        const calculatedSqs: this["input"]["calculatedSqs"] = [
          // including center square
          { id: currentPiece.hoveredSq, isGolden: currentPiece.op.goldenSqIndex === "CENTER" }
        ]

        // all other squares beside center square
        for (let i = 0; i < currentPiece.sqList.length; i++) {
          const id = this.getSteppedSqID(currentPiece.sqList[i], currentPiece.hoveredSq)
          if (id === null) {
            calculatedSqs.push({ id: currentPiece.hoveredSq, isGolden: false, isOutOfBound: true })
          }
          else {
            calculatedSqs.push({ id, isGolden: currentPiece.op.goldenSqIndex === i })
          }
        }

        // check if overlapped (also set possible)
        let possiblePlacement = true
        for (let i = 0; i < calculatedSqs.length; i++) {
          const sq = calculatedSqs[i]
          sq.isOverlapped = gp.boardData[sq.id[0]][sq.id[1]][sq.id[2]] !== 0
          if (sq.isOverlapped || sq.isOutOfBound) { possiblePlacement = false }
        }

        // special case for O-piece, not possible if being on all 3 faces
        if (currentPiece.op.sqList === gp.RAW_PIECES[6]) {
          const facesList: number[] = []
          for (let i = 0; i < calculatedSqs.length; i++) {
            const sq = calculatedSqs[i]
            if (!facesList.includes(sq.id[0])) { facesList.push(sq.id[0]) }
          }
          // set overlapSelf to FIRST sqs
          if (facesList.length === 3) {
            calculatedSqs[0].overlapSelf = true
            possiblePlacement = false
          }
        }

        // rendering
        for (let i = 0; i < calculatedSqs.length; i++) {
          const { id, isGolden, isOutOfBound } = calculatedSqs[i]
          if (isOutOfBound) continue

          const sqVerts = this.GRID_VERTICES.faces[id[0]][id[1]][id[2]]
          if (possiblePlacement) {
            if (isGolden) {
              if (gp.useGold) { p5.fill(237, 252, 66, 140) }
              else { p5.fill(240, 38, 216, 140) } // destroyer
            }
            else { p5.fill(150, 255, 180, 140) } // normal
          } else {
            p5.fill(242, 82, 82, 140) // red
          }
          p5.noStroke()
          p5.beginShape();
          for (let sv = 0; sv < sqVerts.length; sv++) {
            p5.vertex(sqVerts[sv][0], sqVerts[sv][1]);
          }
          p5.endShape(p5.CLOSE);
        }

        if (possiblePlacement && !this.touchscreenOn) { p5.cursor(p5.HAND) }
        this.input.calculatedSqs = calculatedSqs // for click action
      }
    }


    // render next pieces
    p5.stroke(normalColor)
    p5.strokeWeight(2)
    for (let i = 0; i < 2; i++) {
      const piece = gp.nextPieces[i]
      if (piece === null) break

      const yOffset = (1 - this.piecesMovementPrg) * (i === 0 ? 60 : 150)
      const { sqsCoors, hIndex } = this.getPieceImageData(piece)
      for (let si = 0; si < sqsCoors.length; si++) {
        const coor = sqsCoors[si]
        if (hIndex === si) { p5.fill(goldenColor) } else { p5.fill(normalColor) }
        p5.square(coor[1] * 18 + 350, coor[0] * 18 + 460 + i * 60 + yOffset, 18)
      }
    }
    if (this.piecesMovementPrg < 1) { this.piecesMovementPrg = Math.min(1, this.piecesMovementPrg + 0.08) }

    // render current piece
    if (currentPiece) {
      const { sqsCoors, hIndex } = this.getPieceImageData(currentPiece.op)
      const prg = 1 - this.piecesMovementPrg
      const squareSize = 30 - 12 * prg
      p5.strokeWeight(3 + (-1 * prg))
      for (let si = 0; si < sqsCoors.length; si++) {
        const coor = sqsCoors[si]
        if (hIndex === si) {
          if (gp.useGold) { p5.fill(goldenColor) }
          else { p5.fill(this.getSqColor(3)) }
        }
        else { p5.fill(normalColor) }
        p5.square(
          coor[1] * squareSize + 200 + (150 * prg),
          coor[0] * squareSize + 475 + (-15 * prg),
          squareSize
        )
      }
    }


    // render PLACE, SPREAD, CLEAR animations
    if (gp.phase !== "PLAY") {
      p5.stroke(normalColor)
      p5.strokeWeight(4)
      let colorValue: P5.Color = p5.color(0)
      const { animatedSpreadingSqs, animatedClearingSqs, GRID_VERTICES } = this

      // render clearing squares
      for (let i = animatedClearingSqs.length - 1; i >= 0; i--) {
        const acsq = animatedClearingSqs[i]
        // check if is placing phase then don't render placing squares
        if (this.isThePlacingSquare(acsq.id)) { continue }

        p5.fill(this.getSqColor(acsq.prevState))
        const sqVerts = GRID_VERTICES.faces[acsq.id[0]][acsq.id[1]][acsq.id[2]]
        const centerPos: PositionType = [
          (sqVerts[0][0] + sqVerts[1][0] + sqVerts[2][0] + sqVerts[3][0]) / 4,
          (sqVerts[0][1] + sqVerts[1][1] + sqVerts[2][1] + sqVerts[3][1]) / 4
        ]

        p5.push()
        p5.translate(centerPos[0], centerPos[1])
        if (acsq.prg > 0) {
          const t = acsq.prg
          const s = 1 - t + 4 * t * (1 - t) * (1.8 - 1) // last one is adjustable peak
          p5.scale(s)
        }
        p5.beginShape()
        for (let sv = 0; sv < sqVerts.length; sv++) {
          p5.vertex(sqVerts[sv][0] - centerPos[0], sqVerts[sv][1] - centerPos[1])
        }
        p5.endShape(p5.CLOSE)
        p5.pop()

        if (gp.phase === "CLEAR") {
          acsq.prg += 0.06
          if (acsq.prg > 1) {
            animatedClearingSqs.shift() // always first to leave
            // was golden? add golden laser
            if (acsq.prevState === 2) {
              this.goldenLasers.push({
                targetPos: [25, 475], // gold points position
                startPos: centerPos.slice() as PositionType,
                pos1: centerPos.slice() as PositionType,
                pos2: centerPos.slice() as PositionType,
                delay: 4
              })
            }
          }
        }
      }

      // render spreading squares
      for (let i = animatedSpreadingSqs.length - 1; i >= 0; i--) {
        const assq = animatedSpreadingSqs[i]
        // check if is placing phase then don't render placing squares
        if (this.isThePlacingSquare(assq.id)) { continue }

        if (assq.prg < 0) {
          colorValue = normalColor
        } else if (assq.prg < 1) {
          colorValue = p5.color(250)
        } else {
          colorValue = goldenColor
        }

        p5.fill(colorValue)
        p5.beginShape()
        const sqVerts = GRID_VERTICES.faces[assq.id[0]][assq.id[1]][assq.id[2]]
        for (let sv = 0; sv < sqVerts.length; sv++) {
          p5.vertex(sqVerts[sv][0], sqVerts[sv][1])
        }
        p5.endShape(p5.CLOSE)

        if (gp.phase === "SPREAD") {
          assq.prg += 0.12
          if (assq.prg > 1) {
            animatedSpreadingSqs.shift() // always first to leave
          }
        }
      }

      if (gp.phase === "PLACE") {
        const { PI, cos, sin } = Math
        const SL = this.CONSTS.SL

        if (gp.placingSubphase === "SLIDE") {
          const firstFace = this.animatedPlacingSqs[0].snaps[0].id[0]
          let enterDeg = -90 // first face case
          // all squares are at the same face on first snap
          if (firstFace === 1) { enterDeg = 30 }
          else if (firstFace === 2) { enterDeg = 150 }
          enterDeg = PI / 180 * enterDeg
          const calculatedPrg = 1 - (1 - Math.pow(1 - gp.ug, 3))
          const offX = cos(enterDeg) * calculatedPrg * 300
          const offY = sin(enterDeg) * calculatedPrg * 300

          p5.stroke(normalColor)
          p5.strokeWeight(4)
          // for each square
          for (let i = 0; i < 4; i++) {
            const aps = this.animatedPlacingSqs[i]
            const snap = aps.snaps[0] // FIRST snap

            p5.fill(this.getSqColor(aps.sqData))
            p5.beginShape()
            // for each vertex
            for (let v = 0; v < 4; v++) {
              const { edgeVert, distCount } = snap.aSqVerts![v]
              p5.vertex(
                edgeVert[0] + cos(snap.endDeg!) * distCount * SL + offX,
                edgeVert[1] + sin(snap.endDeg!) * distCount * SL + offY
              )
            }
            p5.endShape(p5.CLOSE)
          }
          // update ug
          if (gp.ug < 1) {
            gp.ug = Math.min(1, gp.ug + 0.05)
          } else {
            gp.ug = 0
            if (this.highestSnapsCount > 1) { gp.placingSubphase = "WRAP1" }
            else { gp.phase = "SPREAD" }
          }
        } else { // wrap 1 & 2
          for (let i = 0; i < 4; i++) {
            const aps = this.animatedPlacingSqs[i]

            // if current snap then animate rotation, else render at endDeg
            let snap = aps.snaps[0]
            let isRotating = false
            if (gp.placingSubphase === "WRAP1") {
              if (aps.snaps.length > 1) {
                snap = aps.snaps[1]
                isRotating = true
              }
            } else {
              if (aps.snaps.length === 2) { snap = aps.snaps[1] }
              else if (aps.snaps.length === 3) {
                snap = aps.snaps[2]
                isRotating = true
              }
            }

            p5.fill(this.getSqColor(aps.sqData))
            p5.beginShape()
            if (isRotating) {
              const d = p5.map(gp.ug, 0, 1, snap.startDeg!, snap.endDeg!)
              for (let v = 0; v < 4; v++) {
                const { edgeVert, distCount } = snap.aSqVerts![v]
                p5.vertex(
                  edgeVert[0] + cos(d) * distCount * SL,
                  edgeVert[1] + sin(d) * distCount * SL
                )
              }
            } else {
              for (let v = 0; v < 4; v++) {
                const { edgeVert, distCount } = snap.aSqVerts![v]
                p5.vertex(
                  edgeVert[0] + cos(snap.endDeg!) * distCount * SL,
                  edgeVert[1] + sin(snap.endDeg!) * distCount * SL
                )
              }
            }
            p5.endShape(p5.CLOSE)
          }
          // update ug
          if (gp.ug < 1) {
            gp.ug = Math.min(1, gp.ug + 0.1)
          } else {
            gp.ug = 0
            if (gp.placingSubphase === "WRAP1") {
              if (this.highestSnapsCount > 2) { gp.placingSubphase = "WRAP2" }
              else { gp.phase = "SPREAD" }
            } else { // wrap2 done
              gp.phase = "SPREAD"
            }
          }
        }
      }

      // done spreading? update delay
      if (gp.phase === "SPREAD") {
        if (animatedSpreadingSqs.length === 0) {
          if (gp.ug < 1) {
            gp.ug += 0.2
          } else {
            gp.ug = 0
            gp.phase = "CLEAR"
          }
        }
      }

      // done clearing? change to play phase (or end phase)
      if (gp.phase === "CLEAR") {
        if (animatedClearingSqs.length === 0) {
          if (gp.gameOverMessage !== null) {
            gp.phase = "END"
            gp.ug = 0
            this.helpModal.isOpened = false
          }
          else { gp.phase = "PLAY" }
        }
      }
    }

    // render gold points
    p5.stroke(normalColor)
    p5.strokeWeight(3)
    p5.fill(goldenColor)
    p5.square(25, 475, 16)
    customFont.render(gp.goldPoints + "", 43, 487, 26, p5.color(245, 228, 44), p5)

    // render remaining num
    customFont.render(gp.remainingPieces + " left", 20, 518, 15, normalColor, p5)

    // render golden lasers
    const LASER_SPEED = this.CONSTS.LASER_SPEED
    for (let i = this.goldenLasers.length - 1; i >= 0; i--) {
      const gl = this.goldenLasers[i]

      let dx = gl.targetPos[0] - gl.pos1[0],
        dy = gl.targetPos[1] - gl.pos1[1],
        d = Math.hypot(dx, dy)
      // would go past target? set to targetPos
      if (LASER_SPEED >= d) {
        gl.pos1[0] = gl.targetPos[0]
        gl.pos1[1] = gl.targetPos[1]
      } else {
        gl.pos1[0] += dx / d * LASER_SPEED
        gl.pos1[1] += dy / d * LASER_SPEED
      }
      if (gl.delay > 0) { gl.delay-- }
      else {
        // update pos2
        let dx = gl.targetPos[0] - gl.pos2[0],
          dy = gl.targetPos[1] - gl.pos2[1],
          d = Math.hypot(dx, dy)
        // would go past target? remove laser and add to score
        if (LASER_SPEED >= d) {
          gp.goldPoints++
          this.goldenLasers.splice(i, 1)
        } else {
          gl.pos2[0] += dx / d * LASER_SPEED
          gl.pos2[1] += dy / d * LASER_SPEED
        }
      }

      p5.stroke(normalColor)
      p5.strokeWeight(10)
      p5.line(gl.pos1[0], gl.pos1[1], gl.pos2[0], gl.pos2[1])
      p5.stroke(245, 228, 44)
      p5.strokeWeight(5)
      p5.line(gl.pos1[0], gl.pos1[1], gl.pos2[0], gl.pos2[1])
    }

    // render hint at help
    if (this.hintAtHelp) {
      p5.stroke(255)
      p5.strokeWeight(6)
      p5.push()
      p5.translate(50, 30)
      p5.rotate(-1.2)
      const yOff = Math.cos(p5.frameCount * 0.3) * 7
      p5.line(0, 20 + yOff, 0, -20 + yOff)
      p5.line(0, 20 + yOff, 10, 5 + yOff)
      p5.line(0, 20 + yOff, -10, 5 + yOff)
      p5.pop()
    }

    if (this.helpModal.isOpened) { this.renderHelpModal() }

    // end phase (MESSAGE), wait until no more laser
    if (gp.phase === "END" && this.goldenLasers.length === 0) {
      if (gp.ug < 1) {
        gp.ug = Math.min(1, gp.ug + 0.025)
      } else {
        gp.ug = 0
        if (endModal.subphase === "MESSAGE") {
          endModal.subphase = "DELAY"
        } else if (endModal.subphase === "DELAY") {
          endModal.subphase = "PRE-RATING"
        } else if (endModal.subphase === "PRE-RATING") {
          endModal.subphase = "RATING"
          this.btnPrgs.replay = 0
        }
      }
      this.renderEndModal()
    }

    // animate end phase image
    if (endModal.img) {
      p5.image(endModal.img, 200 + endModal.imgPrg * 400, 300, 400, 600)
      endModal.imgPrg = Math.min(1, endModal.imgPrg + 0.1)
      if (endModal.imgPrg >= 1) { endModal.img = null }
    }
  }

  click() {
    const gp = this.gameplay

    if (gp.phase === "END") {
      // check restart btn
      if (this.hoveredBtn === "REPLAY") {
        gp.setUpNewGame()
        const p5 = this.p5
        this.endModal.img = p5.get(0, 0, p5.width, p5.height)
      }
      return
    }

    // mouse control?
    if (!this.touchscreenOn) {
      // place piece if hovering on a square
      if (this.input.hoveredSquare) { return gp.placePiece() }
    }

    switch (this.hoveredBtn) {
      case "HELP":
        this.btnPrgs.help = 0
        this.hintAtHelp = false
        this.helpModal.isOpened = true
        this.helpModal.prevY = -100
        this.helpModal.targetY = 180
        this.helpModal.index = 0
        this.helpModal.prg = 0
        return
      case "TOUCHSCREEN":
        this.btnPrgs.touchscreen = 0
        this.touchscreenOn = !this.touchscreenOn
        this.btnPrgs.place = 0
        this.btnPrgs.rotate = 0
        return
      case "SWITCH":
        this.btnPrgs.switch = 0
        gp.switchType()
        return
      case "PLACE":
        this.btnPrgs.place = 0
        if (gp.currentPiece && gp.currentPiece.hoveredSq) {
          gp.placePiece()
        }
        return
      case "ROTATE":
        this.btnPrgs.rotate = 0
        this.gameplay.rotatePiece(true)
        return
    }
  }

  keyPressed() {
    if (this.p5.keyCode === 82) {
      this.gameplay.rotatePiece(true)
    }
    if (this.p5.keyCode === 83) {
      this.btnPrgs.switch = 0
      this.gameplay.switchType()
    }
  }
}
