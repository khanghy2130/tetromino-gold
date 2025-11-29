import GameClient, { getRandomItem } from "./main"
import Render, { PositionType, SquareID } from "./Render"

export type SquareData = 0 | 1 | 2 // none | normal | heavy

type OriginalPiece = {
  sqList: sqDirs[]
  heavySqIndex: number | "CENTER" | null // index of square | null is no heavy square
}

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
      heavySqIndex: hasHeavy ? getRandomItem([0, 1, 2, "CENTER"]) : null
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

  getRotatedDir(d: sqDirs[number], cclockwise: boolean): sqDirs[number] {
    const DIRS: sqDirs[number][] = ["U", "R", "D", "L"]
    if (cclockwise) {
      let i = DIRS.indexOf(d) + 1
      if (i > 3) { i = 0 }
      return DIRS[i]
    } else {
      let i = DIRS.indexOf(d) - 1
      if (i < 0) { i = 3 }
      return DIRS[i]
    }
  }

  rotatePiece(cclockwise: boolean) {
    const { currentPiece } = this
    if (!currentPiece) return
    currentPiece.sqList = currentPiece.sqList.map(
      sq => sq.map(d => this.getRotatedDir(d, cclockwise))
    )
  }

  placePiece() {
    const { hoveredSquare, calculatedSqs } = this.render.input
    if (hoveredSquare === null) return

    // exit if not possible
    if (calculatedSqs.some(sq => sq.isOverlapped || sq.isOutOfBound)) { return }

    //// test immediate placement
    for (let i = 0; i < calculatedSqs.length; i++) {
      const sq = calculatedSqs[i];
      this.boardData[sq.id[0]][sq.id[1]][sq.id[2]] = sq.isHeavy ? 2 : 1
    }
    this.shiftPiecesInventory()


    // reset
    this.render.input.hoveredSquare = null
  }

}