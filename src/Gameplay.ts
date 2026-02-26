import GameClient from "./main"
import Render, { APS, APSSnap, PositionType, SquareID } from "./Render"

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type SquareData = 0 | 1 | 2 | 3 // none | normal | golden | destroyer

export type OriginalPiece = {
  sqList: sqDirs[]
  goldenSqIndex: number | "CENTER" // index of square
}

export type ClearableSquare = {
  id: SquareID
  prevState: SquareData
  prg: number
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

  trainingData: {
    isReady: boolean
    isWaitingForReward: boolean
    savedState: number[] | null
    savedAction: number
    spreadCount: number
    goldClearedCount: number
    nonGoldClearedCount: number
  } = {
    isReady: false, // false if needing new data
    isWaitingForReward: false,
    savedState: null,
    savedAction: 0,
    spreadCount: 0,
    goldClearedCount: 0,
    nonGoldClearedCount: 0,
  }

  RAW_PIECES: sqDirs[][] = [
    // not include center square
    [["R"], ["U"], ["U", "U"]], // L
    [["L"], ["U"], ["U", "U"]], // J
    [["U"], ["R"], ["R", "D"]], // S
    [["U"], ["L"], ["L", "D"]], // Z
    [["U"], ["R"], ["D"]], // T
    [["D"], ["U"], ["U", "U"]], // I
    [["D"], ["R"], ["R", "D"]], // O
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

  getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  getNewPiece(): OriginalPiece {
    // make sure new piece is not the same type as last one
    // let sqList: sqDirs[] = this.RAW_PIECES[6]
    let sqList: sqDirs[] = this.getRandomItem(this.RAW_PIECES)
    while (sqList === this.nextPieces[0]?.sqList) {
      sqList = this.getRandomItem(this.RAW_PIECES)
    }
    return {
      sqList: sqList,
      goldenSqIndex: this.getRandomItem([0, 1, 2, "CENTER"]),
    }
  }

  setUpNewGame() {
    // reset
    this.trainingData.isReady = false
    this.trainingData.isWaitingForReward = false
    this.trainingData.savedState = null
    this.render.globalHoveredSq = null
    this.remainingPieces = 30
    this.goldPoints = 0
    this.currentPiece = null
    this.gameOverMessage = null
    this.render.endModal = {
      subphase: "MESSAGE",
      score: 0,
      rating: 0,
      prg: 1,
      particles: [],
      img: null,
      imgPrg: 0,
    }
    this.phase = "CLEAR"

    // set starting nextPieces
    this.nextPieces = [this.getNewPiece(), this.getNewPiece()]
    this.shiftPiecesInventory() // set currentPiece

    // empty board data
    this.boardData = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => 0)),
    )

    // set up clearable sqs
    const clearableSqs: Required<ClearableSquare>[] = []
    for (let i = 0; i < 3; i++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          clearableSqs.push({
            id: [i, y, x],
            prevState: 1,
            prg: 1,
          })
        }
      }
    }
    // this.render.animatedClearingSqs = clearableSqs
  }

  // called after modifying remainingPieces
  shiftPiecesInventory() {
    this.lastHoveredFaceIndex = 1 // reset
    this.render.piecesMovementPrg = 1

    // set currentPiece to the next one
    const nextPiece = this.nextPieces[0]
    if (nextPiece === null) {
      this.currentPiece = null // out of pieces
      this.gameOverMessage = "NO_PIECES"
    } else {
      this.currentPiece = {
        op: nextPiece,
        sqList: nextPiece.sqList.map((item) => item.slice()),
        hoveredSq: null,
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
      if (i > 3) {
        i = 0
      }
      return DIRS[i]
    } else {
      let i = DIRS.indexOf(d) - 1
      if (i < 0) {
        i = 3
      }
      return DIRS[i]
    }
  }

  rotatePiece(clockwise: boolean) {
    const { currentPiece } = this
    if (!currentPiece) return
    currentPiece.sqList = this.rotateSqList(currentPiece.sqList, clockwise)
  }

  rotateSqList(sqList: sqDirs[], clockwise: boolean): sqDirs[] {
    return sqList.map((sq) => sq.map((d) => this.getRotatedDir(d, clockwise)))
  }

  getAdjacentSqIDs(sid: SquareID): SquareID[] {
    const asids: SquareID[] = []
    // top
    if (sid[1] < 2) {
      asids.push([sid[0], sid[1] + 1, sid[2]])
    }
    // right
    if (sid[2] < 2) {
      asids.push([sid[0], sid[1], sid[2] + 1])
    }
    // down
    if (sid[1] > 0) {
      asids.push([sid[0], sid[1] - 1, sid[2]])
    } else {
      asids.push([sid[0] === 2 ? 0 : sid[0] + 1, sid[2], 0])
    }
    // left
    if (sid[2] > 0) {
      asids.push([sid[0], sid[1], sid[2] - 1])
    } else {
      asids.push([sid[0] === 0 ? 2 : sid[0] - 1, 0, sid[1]])
    }

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
        if (bd[csq.id[0]][csq.id[1]][csq.id[2]] === 3) {
          destroyerID = csq.id
        }
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
          [i, 2, r],
          [i, 1, r],
          [i, 0, r],
          [ni, r, 0],
          [ni, r, 1],
          [ni, r, 2],
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
              if (cid[0] === sid[0] && cid[1] === sid[1] && cid[2] === sid[2]) {
                continue outer
              }
            }
            const sqData = bd[sid[0]][sid[1]][sid[2]]
            sqs.push({ id: sid, prevState: sqData })
          }
        }
      }
    }

    // add .prg
    for (let i = 0; i < sqs.length; i++) {
      sqs[i].prg = 1
    }
    return sqs as ClearableSquare[]
  }

  hasPossiblePlacement(): boolean {
    if (!this.currentPiece) {
      return true
    }
    const getSteppedSqID = this.render.getSteppedSqID.bind(this.render)

    // for each empty sq
    for (let i = 0; i < 3; i++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const sd = this.boardData[i][y][x]
          if (sd !== 0) {
            continue
          } // skip not empty pos

          let sqList = this.currentPiece.sqList
          // for each of 4 rotations
          loop1: for (let r = 0; r < 4; r++) {
            sqList = this.rotateSqList(sqList, true)
            const oPieceCheckSids: (SquareID | null)[] = []
            for (let sli = 0; sli < 3; sli++) {
              const id = getSteppedSqID(sqList[sli], [i, y, x])
              oPieceCheckSids.push(id)
              // out of bound || this pos is occupied?
              if (id === null || this.boardData[id[0]][id[1]][id[2]] !== 0) {
                continue loop1
              }
            }

            // special check for O-piece
            if (this.currentPiece.op.sqList === this.RAW_PIECES[6]) {
              const facesList: number[] = [i] // including unlisted square face (center)
              for (let si = 0; si < oPieceCheckSids.length; si++) {
                const sid = oPieceCheckSids[si]
                if (sid && !facesList.includes(sid[0])) {
                  facesList.push(sid[0])
                }
              }
              if (facesList.length === 3) {
                continue loop1
              } // overlap self
            }

            return true // if reach here then is placeable
          }
        }
      }
    }
    return false
  }

  getStateData(): number[] {
    const currentPiece = this.currentPiece
    const getSteppedSqID = this.render.getSteppedSqID.bind(this.render)
    const pms: (0 | 1)[] = []

    if (currentPiece) {
      // for each empty sq
      for (let i = 0; i < 3; i++) {
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            // FOR EACH square on board
            const sd = this.boardData[i][y][x]
            const sqID: SquareID = [i, y, x]

            // occupied? add 4 empty moves
            if (sd !== 0) {
              pms.push(0)
              pms.push(0)
              pms.push(0)
              pms.push(0)
              continue
            }

            let sqList = currentPiece.sqList
            // for each of 4 rotations
            loop1: for (let r = 0; r < 4; r++) {
              if (r > 0) {
                sqList = this.rotateSqList(sqList, true)
              }
              const oPieceCheckSids: (SquareID | null)[] = []
              for (let sli = 0; sli < 3; sli++) {
                const id = getSteppedSqID(sqList[sli], sqID)
                oPieceCheckSids.push(id)
                // out of bound || this pos is occupied? add an empty move
                if (id === null || this.boardData[id[0]][id[1]][id[2]] !== 0) {
                  pms.push(0)
                  continue loop1
                }
              }

              // special check for O-piece
              if (currentPiece.op.sqList === this.RAW_PIECES[6]) {
                const facesList: number[] = [i] // including unlisted square face (center)
                for (let si = 0; si < oPieceCheckSids.length; si++) {
                  const sid = oPieceCheckSids[si]
                  if (sid && !facesList.includes(sid[0])) {
                    facesList.push(sid[0])
                  }
                }
                if (facesList.length === 3) {
                  pms.push(0)
                  continue loop1
                }
              }

              pms.push(1) //is placeable
            }
          }
        }
      }
    } else {
      for (let i = 0; i < 108; i++) {
        pms.push(0)
      }
    }

    const stateData: number[] = []

    // possible moves
    stateData.push(...pms.flat(Infinity))

    // score & turns left
    stateData.push(this.goldPoints / 120)
    stateData.push(this.remainingPieces / 30)

    // @ts-ignore
    stateData.push(...this.boardData.flat(Infinity)) // board

    // 3 pieces
    if (currentPiece) {
      const op = currentPiece.op
      stateData.push(this.RAW_PIECES.indexOf(op.sqList) + 1)
      stateData.push(op.goldenSqIndex === "CENTER" ? 1 : op.goldenSqIndex + 2)
    } else {
      stateData.push(0)
      stateData.push(0)
    }
    if (this.nextPieces[0]) {
      const op = this.nextPieces[0]
      stateData.push(this.RAW_PIECES.indexOf(op.sqList) + 1)
      stateData.push(op.goldenSqIndex === "CENTER" ? 1 : op.goldenSqIndex + 2)
    } else {
      stateData.push(0)
      stateData.push(0)
    }
    if (this.nextPieces[1]) {
      const op = this.nextPieces[1]
      stateData.push(this.RAW_PIECES.indexOf(op.sqList) + 1)
      stateData.push(op.goldenSqIndex === "CENTER" ? 1 : op.goldenSqIndex + 2)
    } else {
      stateData.push(0)
      stateData.push(0)
    }

    return stateData
  }

  sendTrainingData(): void {
    if (!this.currentPiece) return
    if (this.trainingData.isReady) return
    if (this.trainingData.isWaitingForReward) return

    this.trainingData.isReady = true
    const stateData = this.getStateData()
    this.trainingData.savedState = stateData

    getAction(stateData).then((action) => {
      if (action === null) return
      this.trainingData.savedAction = action
      this.applyReceivedAction(action)
    })
  }

  applyReceivedAction(pickedIndex: number) {
    const useGold = pickedIndex % 2 === 0
    pickedIndex = Math.floor(pickedIndex / 2)
    const i = Math.floor(pickedIndex / 36)
    const rem1 = pickedIndex % 36
    const y = Math.floor(rem1 / 12)
    const rem2 = rem1 % 12
    const x = Math.floor(rem2 / 4)
    const r = rem2 % 4

    // move cursor to position
    this.render.globalHoveredSq = [i, y, x]
    // apply rotation
    for (let ri = 0; ri < r; ri++) {
      this.rotatePiece(true)
    }
    // apply switch
    this.useGold = useGold
  }

  placePiece() {
    const render = this.render
    // exit if not holding piece or not previewing hover
    if (this.currentPiece === null || this.currentPiece.hoveredSq === null)
      return
    const { calculatedSqs } = render.input
    // exit if not possible
    if (
      calculatedSqs.some(
        (sq) => sq.isOverlapped || sq.isOutOfBound || sq.overlapSelf,
      )
    )
      return

    const td = this.trainingData
    const bd = this.boardData
    // reset
    td.isReady = false
    render.globalHoveredSq = null
    render.hintAtHelp = false
    render.input.hoveredSquare = null
    this.remainingPieces--

    // apply placement
    for (let i = 0; i < calculatedSqs.length; i++) {
      const sq = calculatedSqs[i]
      bd[sq.id[0]][sq.id[1]][sq.id[2]] = sq.isGolden
        ? this.useGold
          ? 2
          : 3
        : 1
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
            const aasid = aasids[aai]
            const sqd = bd[aasid[0]][aasid[1]][aasid[2]]
            if (sqd === 2) {
              goldenAdjsCount++
            }
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
      const sid = clearedSqs[i].id
      this.boardData[sid[0]][sid[1]][sid[2]] = 0
      // immediately add to score
      if (clearedSqs[i].prevState === 2) {
        this.goldPoints++
        td.goldClearedCount++
      } else {
        td.nonGoldClearedCount++
      }
    }

    td.spreadCount = newGoldenSqs.length

    // render.animatedSpreadingSqs = newGoldenSqs.map((sid, i) => ({
    //   id: sid,
    //   prg: 0,
    // }))
    // render.animatedClearingSqs = clearedSqs

    this.startPlacingAnimation()

    // set currentPiece to null, reset useGold
    this.shiftPiecesInventory() // shift and create next piece
    if (!this.hasPossiblePlacement()) {
      this.gameOverMessage = "NO_SPACE"
    }

    // send to /update
    if (td.savedState) {
      td.isWaitingForReward = true
      // gold cleared + spreaded - non-gold cleared
      const gameIsOver = this.gameOverMessage !== null
      let reward: number =
        td.goldClearedCount * 0.3 +
        td.spreadCount * 0.2 +
        td.nonGoldClearedCount * -0.5
      if (gameIsOver) {
        // penalty if ran out of space, else bonus
        if (this.gameOverMessage === "NO_SPACE") reward -= 5
        else reward += 5
      }
      postUpdate({
        state: td.savedState,
        action: td.savedAction,
        reward: reward,
        next_state: this.getStateData(),
        done: gameIsOver,
      }).then((res) => {
        if (res === null) return
        td.isWaitingForReward = false
      })
    }
  }

  getFirstSnapID(
    id: SquareID,
    sqdirs: sqDirs,
  ): { id: SquareID; faceChanges: boolean[] } {
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
            if (faceChanges.length === 0) {
              faceChanges.push(true)
            } else {
              faceChanges.push(faceChanges[0])
            }
          }
          id[1]--
          break
        case "L":
          if (id[2] === 0) {
            if (faceChanges.length === 0) {
              faceChanges.push(false)
            } else {
              faceChanges.push(faceChanges[0])
            }
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
        wasNextFace = cf === pf + 1 || (pf === 2 && cf === 0)
      }

      let i = cf + (wasNextFace ? 0 : 1)
      const deg = (PI / 180) * (i * 120 - 150)
      const deg2 = deg + (PI / 180) * 120
      const _60deg = (PI / 180) * 60
      const cosDeg = cos(deg)
      const sinDeg = sin(deg)

      const getEdgeVerts = (r: number): PositionType => [
        cosDeg * SL * r + GC.x,
        sinDeg * SL * r + GC.y,
      ]

      // not representative for ID
      const y = wasNextFace ? snap.id[1] : snap.id[2]
      const x = wasNextFace ? snap.id[2] : snap.id[1]
      snap.aSqVerts = [
        { edgeVert: getEdgeVerts(y), distCount: x },
        { edgeVert: getEdgeVerts(y + 1), distCount: x },
        { edgeVert: getEdgeVerts(y + 1), distCount: x + 1 },
        { edgeVert: getEdgeVerts(y), distCount: x + 1 },
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
    if (!cp || !cp.hoveredSq) {
      return
    }

    // set subphase
    this.phase = "CLEAR"
    this.placingSubphase = "SLIDE"
    this.ug = 0

    let highestSnapsCount = 1
    // set up APS with only id in snaps
    const specialSqData: SquareData = this.useGold ? 2 : 3
    const animatedPlacingSqs: APS[] = [
      {
        sqData: cp.op.goldenSqIndex === "CENTER" ? specialSqData : 1,
        snaps: [{ id: cp.hoveredSq.slice() as SquareID }],
      },
    ]
    // all other squares beside center square
    for (let i = 0; i < cp.sqList.length; i++) {
      const { id, faceChanges } = this.getFirstSnapID(
        cp.hoveredSq.slice() as SquareID,
        cp.sqList[i],
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
        sqData: cp.op.goldenSqIndex === i ? specialSqData : 1,
        snaps: snaps,
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

async function getAction(state: number[]) {
  try {
    const response = await fetch(`http://localhost:5000/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: state }), // state is a 143-element array of floats
    })
    const data = await response.json()
    return data.action // Returns the index of the action (0-215, masked)
  } catch (error) {
    console.error("Error fetching action:", error)
    return null
  }
}

async function postUpdate(updateData: {
  state: number[]
  action: number
  reward: number
  next_state: number[]
  done: boolean
}) {
  try {
    const response = await fetch(`http://localhost:5000/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    })
    const data = await response.json()
    return data.action
  } catch (error) {
    console.error("Error updating:", error)
    return null
  }
}
