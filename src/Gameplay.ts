import GameClient, { getRandomItem } from "./main"
import Render, { PositionType, SquareID } from "./Render"

export type SquareData = 0 | 1 | 2 // none | normal | heavy

type OriginalPiece = {
  sqList: sqDirs[]
  heavySqIndex: number | "CENTER" | null // index of square | null is no heavy square
}

type ClearableSquare = { id: SquareID, prevState: SquareData }

type CurrentPiece = {
  op: OriginalPiece
  sqList: sqDirs[] // transformed sqList, apply rotation here
  hoveredSq: SquareID | null
}

export type sqDirs = ("U" | "D" | "L" | "R")[] // for one square in a piece

export default class Gameplay {
  gc: GameClient
  render!: Render

  CONSTS = {
    TURNS_PER_LEVEL: 10
  }

  RAW_PIECES: sqDirs[][] = [
    // not include center square
    [["R"], ["U"], ["U", "U"]], // L
    [["L"], ["U"], ["U", "U"]], // J
    [["U"], ["R"], ["R", "D"]], // S
    [["U"], ["L"], ["L", "D"]], // Z
    [["U"], ["R"], ["D"]], // T
    [["D"], ["U"], ["U", "U"]], // I

    /*
    [[0, 0], [1, 0], [0, 1], [0, 2]], // L
    [[0, 0], [1, 0], [1, 1], [1, 2]], // J
    [[1, 0], [1, 1], [0, 1], [0, 2]], // S (first item is not [0,0])
    [[0, 0], [0, 1], [1, 1], [1, 2]], // Z
    [[0, 0], [0, 1], [0, 2], [1, 1]], // T
    [[0, 0], [0, 1], [0, 2], [0, -1]] // I
    */

  ]

  boardData: SquareData[][][] = [] // face > row > square

  currentPiece: CurrentPiece | null = null
  nextPieces: [OriginalPiece | null, OriginalPiece | null] = [null, null]

  currentTurn: number = 1

  lastHoveredFaceIndex: 0 | 1 | 2 = 1 // second face is default




  constructor(gameClient: GameClient) {
    this.gc = gameClient

    this.setUpNewGame()
  }

  getNewPiece(hasHeavy: boolean): OriginalPiece {
    return {
      sqList: getRandomItem(this.RAW_PIECES),
      // sqList length is always 3
      heavySqIndex: true ? getRandomItem([0, 1, 2, "CENTER"]) : null
    }
  }

  setUpNewGame() {
    // reset
    this.currentTurn = 1
    this.currentPiece = null

    // set starting nextPieces (no heavy square)
    this.nextPieces = [this.getNewPiece(false), this.getNewPiece(false)]
    this.shiftPiecesInventory() // set currentPiece

    // empty board data
    this.boardData = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => 0)
      )
    );

  }


  shiftPiecesInventory() {
    // set currentPiece to the next one
    const nextPiece = this.nextPieces[0]
    if (!nextPiece) return // failsafe for no next piece

    this.currentPiece = {
      op: nextPiece,
      sqList: nextPiece.sqList.map(item => item.slice()),
      hoveredSq: null
    }

    this.lastHoveredFaceIndex = 1 // reset
    this.rotatePiece(false) // rotate to fit default face
    this.rotatePiece(false)

    // exit if passed certain turn number (no more piece needed)
    ////

    // shift and create new 2nd piece in nextPieces
    const { nextPieces } = this
    nextPieces[0] = nextPieces[1]
    nextPieces[1] = this.getNewPiece(
      this.currentTurn >= this.CONSTS.TURNS_PER_LEVEL - 2
    )
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
    currentPiece.sqList = currentPiece.sqList.map(
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

  // clear and return list of cleared squares, or null
  clearFilledRows(): ClearableSquare[] | null {
    const sqs: ClearableSquare[] = []
    const heavySqs: ClearableSquare[] = []
    const bd = this.boardData

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
          // add to list
          for (let s = 0; s < sids.length; s++) {
            const sid = sids[s]
            const sqData = bd[sid[0]][sid[1]][sid[2]]
            if (sqData === 1) { sqs.push({ id: sid, prevState: 1 }) }
            else { heavySqs.push({ id: sid, prevState: 2 }) }
          }
        }
      }
    }

    // no clearing?
    if (heavySqs.length === 0 && sqs.length === 0) { return null }

    // add other heavy squares connected to added heavy squares
    for (let i = 0; i < heavySqs.length; i++) {
      const sid = heavySqs[i].id;
      // add to heavySqs if adjacent squares are heavy AND not already been added
      const adjSqIDs = this.getAdjacentSqIDs(sid)
      for (let adj = 0; adj < adjSqIDs.length; adj++) {
        const asid = adjSqIDs[adj];
        // this adjacent is heavy?
        if (bd[asid[0]][asid[1]][asid[2]] === 2) {
          // and not already added?
          let isNotAlreadyAdded = true
          for (let i2 = 0; i2 < heavySqs.length; i2++) {
            const sid2 = heavySqs[i2].id;
            if (sid2[0] === asid[0] && sid2[1] === asid[1] && sid2[2] === asid[2]) {
              isNotAlreadyAdded = false
              break
            }
          }
          if (isNotAlreadyAdded) { heavySqs.push({ id: asid, prevState: 2 }) }
        }
      }
    }

    // apply clearing (sqs then heavySqs)
    for (let i = 0; i < sqs.length; i++) {
      const sid = sqs[i].id;
      this.boardData[sid[0]][sid[1]][sid[2]] = 0
    }
    for (let i = 0; i < heavySqs.length; i++) {
      const sid = heavySqs[i].id;
      this.boardData[sid[0]][sid[1]][sid[2]] = 1
    }

    return [...sqs, ...heavySqs]
  }

  placePiece() {
    const { hoveredSquare, calculatedSqs } = this.render.input
    if (hoveredSquare === null) return

    // exit if not possible
    if (calculatedSqs.some(sq => sq.isOverlapped || sq.isOutOfBound)) { return }

    // reset
    this.render.input.hoveredSquare = null


    //// test immediate placement
    for (let i = 0; i < calculatedSqs.length; i++) {
      const sq = calculatedSqs[i];
      this.boardData[sq.id[0]][sq.id[1]][sq.id[2]] = sq.isHeavy ? 2 : 1
    }
    this.shiftPiecesInventory()

    //// test immediate clearing
    const clearedSqs = this.clearFilledRows()
    // run again to potentially clear a row of previously all heavy squares
    if (clearedSqs !== null) { this.clearFilledRows() }
  }

}