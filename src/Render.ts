import type P5 from "p5"
import GameClient from "./main"
import Gameplay, { OriginalPiece, sqDirs, SquareData } from "./Gameplay"

export type PositionType = [number, number]
export type SquareID = [number, number, number] // [face, x, y]


// AdvancedSquareVertex
type ASV = { edgeVert: PositionType, distCount: number }
// Animated Placing Square Snapshot
export type APSSnap = { id: SquareID, startDeg?: number, endDeg?: number, aSqVerts?: [ASV, ASV, ASV, ASV] } // snapshot of a square at one face
// AnimatedPlacingSquare: array of the same square with all (1-3) snaps
export type APS = { sqData: SquareData, snaps: APSSnap[] }

export default class Render {
  gc: GameClient
  p5!: P5
  gameplay!: Gameplay

  CONSTS = {
    SL: 60, // square length
    GC: { x: 200, y: 220 } // grid center
  }

  GRID_VERTICES: {
    verts: PositionType[],
    faces: PositionType[][][][] // 3 faces each has 3x3 squares each has 4 vertices 
  }

  animatedPlacingSqs: APS[] = []

  touchscreenOn: boolean = false

  input: {
    hoveredSquare: SquareID | null
    calculatedSqs: {
      id: SquareID, isGolden: boolean,
      isOutOfBound?: boolean, isOverlapped?: boolean
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
    p5.stroke(100)
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

  renderButtons() {
    const { p5 } = this

    // temp setup
    p5.fill(100)
    p5.noStroke()

    // top left button
    p5.push()
    p5.translate(105, 55)
    p5.rotate(-30)
    p5.rect(0, 0, 150, 35, 10)
    p5.pop()

    // top right button
    p5.push()
    p5.translate(295, 55)
    p5.rotate(30)
    p5.rect(0, 0, 150, 35, 10)
    p5.pop()

    // bottom left button
    p5.push()
    p5.translate(105, 385)
    p5.rotate(30)
    p5.rect(0, 0, 150, 35, 10)
    p5.pop()

    // bottom right button
    p5.push()
    p5.translate(295, 385)
    p5.rotate(-30)
    p5.rect(0, 0, 150, 35, 10)
    p5.pop()

  }

  renderExistingSquares() {
    const { boardData } = this.gameplay
    const { p5 } = this

    p5.stroke(0)
    p5.strokeWeight(4)
    for (let i = 0; i < 3; i++) {
      const rows = this.GRID_VERTICES.faces[i]
      for (let r = 0; r < 3; r++) {
        const sqs = rows[r]
        for (let rr = 0; rr < 3; rr++) {
          const sqVerts = sqs[rr]

          const sqData: SquareData = boardData[i][r][rr]
          if (sqData === 0) { continue }
          if (sqData === 1) {
            p5.fill(150)
          } else if (sqData === 2) {
            p5.fill(237, 252, 66) // golden
          } else if (sqData === 3) {
            p5.fill(240, 38, 216) // destroyer
          }

          p5.beginShape();
          for (let sv = 0; sv < sqVerts.length; sv++) {
            p5.vertex(sqVerts[sv][0], sqVerts[sv][1]);
          }
          p5.endShape(p5.CLOSE);
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
    if (sqList === RP[1] || sqList === RP[3]) {
      for (let c = 0; c < sqsCoors.length; c++) {
        sqsCoors[c][0]++
      }
    }
    return { sqsCoors, hIndex }
  }

  draw() {
    const gp = this.gameplay
    const p5 = this.p5

    p5.background(50);

    this.renderButtons()

    this.renderGrid()

    this.renderExistingSquares()

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
        // is NOT hovering on ROTATE/PLACE button? then change to null
        /////

        currentPiece.hoveredSq = null
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
          const sq = calculatedSqs[i];
          sq.isOverlapped = gp.boardData[sq.id[0]][sq.id[1]][sq.id[2]] !== 0
          if (sq.isOverlapped || sq.isOutOfBound) { possiblePlacement = false }
        }

        // rendering
        for (let i = 0; i < calculatedSqs.length; i++) {
          const { id, isGolden, isOutOfBound } = calculatedSqs[i]
          if (isOutOfBound) continue

          const sqVerts = this.GRID_VERTICES.faces[id[0]][id[1]][id[2]]
          if (possiblePlacement) {
            if (isGolden) {
              if (gp.useGold) { p5.fill(237, 252, 66, 140) }
              else { p5.fill(240, 38, 216, 140) }
            }
            else { p5.fill(150, 255, 180, 140) }
          } else {
            p5.fill(242, 82, 82, 140)
          }
          p5.noStroke()
          p5.beginShape();
          for (let sv = 0; sv < sqVerts.length; sv++) {
            p5.vertex(sqVerts[sv][0], sqVerts[sv][1]);
          }
          p5.endShape(p5.CLOSE);
        }


        // for click action
        this.input.calculatedSqs = calculatedSqs
      }



    }


    // render next pieces
    gp.nextPieces
    p5.stroke(0)
    p5.strokeWeight(2)
    for (let i = 0; i < 2; i++) {
      const piece = gp.nextPieces[i]
      if (piece === null) break

      const { sqsCoors, hIndex } = this.getPieceImageData(piece)
      for (let si = 0; si < sqsCoors.length; si++) {
        const coor = sqsCoors[si]
        if (hIndex === si) { p5.fill("yellow") } else { p5.fill(140) }
        p5.square(coor[1] * 20 + 230 + i * 100, coor[0] * 20 + 500, 20)
      }
    }
    // render current piece
    if (currentPiece) {
      const { sqsCoors, hIndex } = this.getPieceImageData(currentPiece.op)
      for (let si = 0; si < sqsCoors.length; si++) {
        const coor = sqsCoors[si]
        if (hIndex === si) {
          if (gp.useGold) { p5.fill("yellow") }
          else { p5.fill(240, 38, 216) }
        }
        else { p5.fill(140) }
        p5.square(coor[1] * 20 + 80, coor[0] * 20 + 500, 20)
      }
    }


    //// test text
    p5.fill(250)
    p5.textSize(24)
    // p5.text(this.input.hoveredSquare + "", 50, 20)
    p5.text(gp.remainingPieces + "\n" + gp.goldPoints, 370, 40)



    ////// test render first snap
    if (this.animatedPlacingSqs.length > 0) {
      const { cos, sin } = Math
      const SL = this.CONSTS.SL
      p5.stroke(0)
      p5.strokeWeight(4)
      // for each square
      for (let i = 0; i < 4; i++) {
        const aps = this.animatedPlacingSqs[i]
        const snap = aps.snaps[0] // FIRST snap

        if (aps.sqData === 1) {
          p5.fill(200)
        } else if (aps.sqData === 2) {
          p5.fill(237, 252, 66) // golden
        } else if (aps.sqData === 3) {
          p5.fill(240, 38, 216) // destroyer
        }
        p5.beginShape()
        // for each vertex
        for (let v = 0; v < 4; v++) {
          const { edgeVert, distCount } = snap.aSqVerts![v]
          p5.vertex(
            edgeVert[0] + cos(snap.endDeg!) * distCount * SL,
            edgeVert[1] + sin(snap.endDeg!) * distCount * SL
          )
        }
        p5.endShape(p5.CLOSE)
      }
    }










  }

  click() {
    const p5 = this.p5
    const gp = this.gameplay

    // touchscreen mode
    if (this.touchscreenOn) {

    }
    // desktop mode
    else {
      // place piece if hovering on a square
      if (this.input.hoveredSquare) { gp.placePiece() }
    }
  }

  keyPressed() {
    if (this.p5.keyCode === 82) {
      this.gameplay.rotatePiece(true)
    }
    if (this.p5.keyCode === 32) {
      this.gameplay.switchType()
    }
  }
}


/*
const COS_30 = Math.sqrt(3) / 2; 
const SIN_30 = 0.5;
function pointInRotRect(
  mx: number,
  my: number,
  x: number,
  y: number,
  w: number,
  h: number,
  deg: 30 | -30
): boolean {
  const dx = mx - x;
  const dy = my - y;
  const sin = deg === 30 ? -SIN_30 : SIN_30;
  const cos = COS_30;
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return Math.abs(rx) <= w * 0.5 && Math.abs(ry) <= h * 0.5;
}
*/