import GameClient from "./main"
import Render, { PositionType } from "./Render"

type SquareData = 0 | 1 | 2

export default class Gameplay {
  gc: GameClient
  render!: Render

  boardData: SquareData[][][] = [] // face > row > square

  RAW_PIECES: PositionType[][] = [
    // top face example: up = +y, right = +x
    [[0, 0], [1, 0], [0, 1], [0, 2]], // L
    [[0, 0], [1, 0], [1, 1], [1, 2]], // J
    [[1, 0], [1, 1], [0, 1], [0, 2]], // S
    [[0, 0], [0, 1], [1, 1], [1, 2]], // Z
    [[0, 0], [0, 1], [0, 2], [1, 1]], // T
    [[0, 0], [0, 1], [0, 2], [0, -1]] // I
  ]

  constructor(gameClient: GameClient) {
    this.gc = gameClient

    this.setEmptyBoardData()
  }

  setEmptyBoardData() {
    this.boardData = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => 0)
      )
    );
  }

}