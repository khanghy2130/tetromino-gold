import GameClient, { getRandomItem } from "./main"
import Render, { APS, APSSnap, PositionType, SquareID } from "./Render"

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type SquareData = 0 | 1 | 2 | 3 // none | normal | golden | destroyer

export type OriginalPiece = {
  sqList: sqDirs[]
  goldenSqIndex: number | "CENTER" // index of square
}

export type ClearableSquare = { id: SquareID, prevState: SquareData, prg: number }

type CurrentPiece = {
  op: OriginalPiece
  sqList: sqDirs[] // transformed sqList, apply rotation here
  hoveredSq: SquareID | null
}

export type sqDirs = ("U" | "D" | "L" | "R")[] // for one square in a piece

export default class Gameplay {
  gc: GameClient
  render!: Render

  RAW_PIECES: sqDirs[][] = [
    // not include center square
    [["R"], ["U"], ["U", "U"]], // L
    [["L"], ["U"], ["U", "U"]], // J
    [["U"], ["R"], ["R", "D"]], // S
    [["U"], ["L"], ["L", "D"]], // Z
    [["U"], ["R"], ["D"]], // T
    [["D"], ["U"], ["U", "U"]], // I
  ]

  boardData: SquareData[][][] = [] // face > row > square
  phase: "CLEAR" | "PLAY" | "PLACE" | "SPREAD" | "END" = "PLAY"
  placingSubphase: "SLIDE" | "WRAP1" | "WRAP2" = "SLIDE"
  ug: number = 0 // universal progress for all animations

  currentPiece: CurrentPiece | null = null
  nextPieces: [OriginalPiece | null, OriginalPiece | null] = [null, null]
  useGold: boolean = true

  remainingPieces: number = 0
  goldPoints: number = 0
  gameOverMessage: "NO_PIECES" | "NO_SPACE" | null = null // null is not game over yet
  lastHoveredFaceIndex: 0 | 1 | 2 = 1 // second face is default


  constructor(gameClient: GameClient) {
    this.gc = gameClient
  }

  getNewPiece(): OriginalPiece {
    // make sure new piece is not the same type as last one
    let sqList: sqDirs[] = getRandomItem(this.RAW_PIECES)
    while (sqList === this.nextPieces[0]?.sqList) {
      sqList = getRandomItem(this.RAW_PIECES)
    }
    return {
      sqList: sqList,
      goldenSqIndex: getRandomItem([0, 1, 2, "CENTER"])
    }
  }

  setUpNewGame() {
    // reset
    this.remainingPieces = 30
    this.goldPoints = 0
    this.currentPiece = null
    this.gameOverMessage = null

    // set starting nextPieces
    this.nextPieces = [this.getNewPiece(), this.getNewPiece()]
    this.shiftPiecesInventory() // set currentPiece

    // empty board data
    this.boardData = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => 0)
      )
    );

  }


  // called after modifying remainingPieces
  shiftPiecesInventory() {
    this.lastHoveredFaceIndex = 1 // reset
    this.render.piecesMovementPrg = 0

    // set currentPiece to the next one
    const nextPiece = this.nextPieces[0]
    if (nextPiece === null) {
      this.currentPiece = null // out of pieces
      this.gameOverMessage = "NO_PIECES"
    } else {
      this.currentPiece = {
        op: nextPiece,
        sqList: nextPiece.sqList.map(item => item.slice()),
        hoveredSq: null
      }
      this.useGold = true
    }

    // shift and create new 2nd piece in nextPieces
    const { nextPieces, remainingPieces } = this
    nextPieces[0] = nextPieces[1]
    nextPieces[1] = remainingPieces > 2 ? this.getNewPiece() : null
  }

  getRotatedDir(d: sqDirs[number], clockwise: boolean): sqDirs[number] {
    const DIRS: sqDirs[number][] = ["U", "R", "D", "L"]
    if (clockwise) {
      let i = DIRS.indexOf(d) + 1
      if (i > 3) { i = 0 }
      return DIRS[i]
    } else {
      let i = DIRS.indexOf(d) - 1
      if (i < 0) { i = 3 }
      return DIRS[i]
    }
  }

  rotatePiece(clockwise: boolean) {
    const { currentPiece } = this
    if (!currentPiece) return
    currentPiece.sqList = this.rotateSqList(currentPiece.sqList, clockwise)
  }

  rotateSqList(sqList: sqDirs[], clockwise: boolean): sqDirs[] {
    return sqList.map(
      sq => sq.map(d => this.getRotatedDir(d, clockwise))
    )
  }

  getAdjacentSqIDs(sid: SquareID): SquareID[] {
    const asids: SquareID[] = []
    // top
    if (sid[1] < 2) { asids.push([sid[0], sid[1] + 1, sid[2]]) }
    // right
    if (sid[2] < 2) { asids.push([sid[0], sid[1], sid[2] + 1]) }
    // down
    if (sid[1] > 0) { asids.push([sid[0], sid[1] - 1, sid[2]]) }
    else { asids.push([sid[0] === 2 ? 0 : sid[0] + 1, sid[2], 0]) }
    // left
    if (sid[2] > 0) { asids.push([sid[0], sid[1], sid[2] - 1]) }
    else { asids.push([sid[0] === 0 ? 2 : sid[0] - 1, 0, sid[1]]) }

    return asids
  }

  // clear and return list of cleared squares, empty array if no clearing
  getClearableSqs(): Required<ClearableSquare>[] {
    const sqs: MakeOptional<ClearableSquare, "prg">[] = []
    const bd = this.boardData

    // check for destroyer
    const csqs = this.render.input.calculatedSqs
    let destroyerID: SquareID | null = null
    for (let i = 0; i < csqs.length; i++) {
      const csq = csqs[i]
      if (csq.isGolden) {
        if (bd[csq.id[0]][csq.id[1]][csq.id[2]] === 3) { destroyerID = csq.id }
        break
      }
    }
    if (destroyerID) {
      // clear itself and its adjs, no need to check if already added
      sqs.push({ id: destroyerID, prevState: 3 })
      const asids = this.getAdjacentSqIDs(destroyerID)
      for (let ai = 0; ai < asids.length; ai++) {
        const asid = asids[ai]
        const sqData = bd[asid[0]][asid[1]][asid[2]]
        if (sqData !== 0) {
          sqs.push({ id: asid, prevState: sqData })
        }
      }
    }

    // each face: check horizontal
    for (let i = 0; i < 3; i++) {
      const ni = i === 2 ? 0 : i + 1

      for (let r = 0; r < 3; r++) {
        const sids: SquareID[] = [
          [i, 2, r], [i, 1, r], [i, 0, r],
          [ni, r, 0], [ni, r, 1], [ni, r, 2],
        ]
        // check isClearable
        let isClearable = true
        for (let s = 0; s < sids.length; s++) {
          const sid = sids[s]
          if (bd[sid[0]][sid[1]][sid[2]] === 0) {
            isClearable = false
            break
          }
        }
        if (isClearable) {
          // add to list (if not already in there)
          outer: for (let s = 0; s < sids.length; s++) {
            const sid = sids[s]
            // already added? continue
            for (let ci = 0; ci < sqs.length; ci++) {
              const cid = sqs[ci].id
              if (cid[0] === sid[0] && cid[1] === sid[1] && cid[2] === sid[2]) { continue outer }
            }
            const sqData = bd[sid[0]][sid[1]][sid[2]]
            sqs.push({ id: sid, prevState: sqData })
          }
        }
      }
    }

    // add .prg
    for (let i = 0; i < sqs.length; i++) {
      sqs[i].prg = -0.1 - i * 0.1 // delay between clearing squares
    }
    return sqs as ClearableSquare[]
  }

  hasPossiblePlacement(): boolean {
    if (!this.currentPiece) { return true }
    const getSteppedSqID = this.render.getSteppedSqID.bind(this.render)

    // for each empty sq
    for (let i = 0; i < 3; i++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const sd = this.boardData[i][y][x]
          if (sd !== 0) { continue } // skip not empty pos

          let sqList = this.currentPiece.sqList
          // for each of 4 rotations
          loop1: for (let r = 0; r < 4; r++) {
            sqList = this.rotateSqList(sqList, true)
            for (let sli = 0; sli < sqList.length; sli++) {
              const id = getSteppedSqID(sqList[sli], [i, y, x])
              // out of bound || this pos is occupied? 
              if (id === null || this.boardData[id[0]][id[1]][id[2]] !== 0) { continue loop1 }
            }
            return true // if reach here then is placeable
          }
        }
      }
    }
    return false
  }

  placePiece() {
    const render = this.render

    // exit if not holding piece or not previewing hover
    if (this.currentPiece === null || this.currentPiece.hoveredSq === null) return
    const { calculatedSqs } = render.input
    // exit if not possible
    if (calculatedSqs.some(sq => sq.isOverlapped || sq.isOutOfBound)) { return }

    const bd = this.boardData

    // reset
    render.input.hoveredSquare = null
    this.remainingPieces--

    // apply placement
    for (let i = 0; i < calculatedSqs.length; i++) {
      const sq = calculatedSqs[i]
      bd[sq.id[0]][sq.id[1]][sq.id[2]] = sq.isGolden ? (this.useGold ? 2 : 3) : 1
    }

    const spreadSources: SquareID[] = []
    const newGoldenSqs: SquareID[] = []

    // add all golden sqs as spread sources
    for (let i = 0; i < 3; i++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (!bd[i][y][x]) continue
          spreadSources.push([i, y, x])
        }
      }
    }
    // apply spread
    while (spreadSources.length > 0) {
      const sid = spreadSources.shift()!
      const asids = this.getAdjacentSqIDs(sid)
      for (let ai = 0; ai < asids.length; ai++) {
        const asid = asids[ai]
        // is normal square?
        if (bd[asid[0]][asid[1]][asid[2]] === 1) {
          const aasids = this.getAdjacentSqIDs(asid)
          let goldenAdjsCount = 0

          // count adj golden and add potential new sources
          for (let aai = 0; aai < aasids.length; aai++) {
            const aasid = aasids[aai];
            const sqd = bd[aasid[0]][aasid[1]][aasid[2]]
            if (sqd === 2) { goldenAdjsCount++ }
          }
          // if has at least 2 adj golden squares, then become golden and another source
          if (goldenAdjsCount > 1) {
            bd[asid[0]][asid[1]][asid[2]] = 2
            newGoldenSqs.push(asid)
            spreadSources.push(asid)
          }
        }
      }
    }

    // apply clearing
    const clearedSqs = this.getClearableSqs()
    for (let i = 0; i < clearedSqs.length; i++) {
      const sid = clearedSqs[i].id;
      this.boardData[sid[0]][sid[1]][sid[2]] = 0
    }

    render.animatedSpreadingSqs = newGoldenSqs.map((sid, i) => ({
      id: sid, prg: -0.1 - i * 0.3 // delay between spreading squares
    }))
    render.animatedClearingSqs = clearedSqs


    this.startPlacingAnimation()

    // set currentPiece to null, reset useGold
    this.shiftPiecesInventory() // shift and create next piece
    if (!this.hasPossiblePlacement()) { this.gameOverMessage = "NO_SPACE" }
  }

  getFirstSnapID(id: SquareID, sqdirs: sqDirs): { id: SquareID, faceChanges: boolean[] } {
    const faceChanges: boolean[] = []
    for (let i = 0; i < sqdirs.length; i++) {
      switch (sqdirs[i]) {
        case "U":
          id[1]++
          break
        case "R":
          id[2]++
          break
        case "D":
          if (id[1] === 0) {
            if (faceChanges.length === 0) { faceChanges.push(true) }
            else { faceChanges.push(faceChanges[0]) }
          }
          id[1]--
          break
        case "L":
          if (id[2] === 0) {
            if (faceChanges.length === 0) { faceChanges.push(false) }
            else { faceChanges.push(faceChanges[0]) }
          }
          id[2]--
          break
      }
    }

    return { id, faceChanges }
  }

  populateSnaps(snaps: APSSnap[]) {
    const { SL, GC } = this.render.CONSTS
    const { PI, cos, sin } = Math

    // loop through each snap: add aSqVerts, startDeg, endDeg
    for (let snapIndex = 0; snapIndex < snaps.length; snapIndex++) {
      const snap = snaps[snapIndex]
      const cf = snap.id[0] // current face
      // is going to next face from last snap to current snap?
      let wasNextFace = true // first snap is default to true
      if (snapIndex > 0) {
        const pf = snaps[snapIndex - 1].id[0]
        wasNextFace = ((cf === pf + 1) || (pf === 2 && cf === 0))
      }

      let i = cf + (wasNextFace ? 0 : 1)
      const deg = PI / 180 * (i * 120 - 150)
      const deg2 = deg + PI / 180 * 120
      const _60deg = PI / 180 * (60)
      const cosDeg = cos(deg)
      const sinDeg = sin(deg)

      const getEdgeVerts = (r: number): PositionType => (
        [cosDeg * SL * r + GC.x, sinDeg * SL * r + GC.y]
      )

      // not representative for ID
      const y = wasNextFace ? snap.id[1] : snap.id[2]
      const x = wasNextFace ? snap.id[2] : snap.id[1]
      snap.aSqVerts = [
        { edgeVert: getEdgeVerts(y), distCount: x },
        { edgeVert: getEdgeVerts(y + 1), distCount: x },
        { edgeVert: getEdgeVerts(y + 1), distCount: x + 1 },
        { edgeVert: getEdgeVerts(y), distCount: x + 1 }
      ]
      if (wasNextFace) {
        snap.startDeg = deg2 - _60deg
        snap.endDeg = deg2
      } else {
        snap.startDeg = deg - _60deg
        snap.endDeg = deg - _60deg - _60deg
      }
    }

  }

  startPlacingAnimation() {
    const cp = this.currentPiece
    if (!cp || !cp.hoveredSq) { return }

    // set subphase
    this.phase = "PLACE"
    this.placingSubphase = "SLIDE"
    this.ug = 0

    let highestSnapsCount = 1
    // set up APS with only id in snaps
    const specialSqData: SquareData = this.useGold ? 2 : 3
    const animatedPlacingSqs: APS[] = [{
      sqData: cp.op.goldenSqIndex === "CENTER" ? specialSqData : 1,
      snaps: [{ id: cp.hoveredSq.slice() as SquareID }]
    }]
    // all other squares beside center square
    for (let i = 0; i < cp.sqList.length; i++) {
      const { id, faceChanges } = this.getFirstSnapID(
        cp.hoveredSq.slice() as SquareID, cp.sqList[i]
      )
      if (faceChanges.length + 1 > highestSnapsCount) {
        highestSnapsCount = faceChanges.length + 1
      }
      const snaps: APSSnap[] = [{ id }] // default face snap

      // add 2nd & 3rd snaps
      while (faceChanges.length > 0) {
        const isNextFace = faceChanges.shift()
        const lastID = snaps[snaps.length - 1].id
        if (isNextFace) {
          const faceIndex = lastID[0] === 2 ? 0 : lastID[0] + 1
          snaps.push({ id: [faceIndex, lastID[2], -lastID[1] - 1] })
        } else {
          const faceIndex = lastID[0] === 0 ? 2 : lastID[0] - 1
          snaps.push({ id: [faceIndex, -lastID[2] - 1, lastID[1]] })
        }
      }
      animatedPlacingSqs.push({
        sqData: cp.op.goldenSqIndex === i ? specialSqData : 1, snaps: snaps
      })
    }

    // add aSqVerts to all snaps
    for (let sqIndex = 0; sqIndex < 4; sqIndex++) {
      this.populateSnaps(animatedPlacingSqs[sqIndex].snaps)
    }

    this.render.animatedPlacingSqs = animatedPlacingSqs
    this.render.highestSnapsCount = highestSnapsCount
  }

  switchType() {
    this.useGold = !this.useGold
  }

}