import type P5 from "p5"
import GameClient from "./main"
import Gameplay from "./Gameplay"

type PositionType = [number, number]

export default class Render {
  gc: GameClient
  p5!: P5
  gameplay!: Gameplay

  CONSTS = {
    SL: 60, // square length
    GC: { x: 200, y: 300 } // grid center
  }

  GRID_VERTICES: {
    verts: PositionType[],
    faces: PositionType[][][][] // 3 faces each has 3x3 squares each has 4 vertices 
  }


  constructor(gameClient: GameClient) {
    this.gc = gameClient

    this.GRID_VERTICES = {
      verts: [[this.CONSTS.GC.x, this.CONSTS.GC.y]], // starts with center vertex
      faces: []
    }

    const { SL, GC } = this.CONSTS
    const GV = this.GRID_VERTICES

    // >>> COMPUTE GRID_VERTICES.verts
    // each cube face
    for (let i = 0; i < 3; i++) {
      const deg = Math.PI / 180 * (i * 120 - 150)
      const deg2 = deg + Math.PI / 180 * 120

      // each (vertical) row (1,2,3 => index + 1)
      for (let r = 1; r < 4; r++) {
        // starts with first vertex...
        const rowVerts: PositionType[] = [
          [Math.cos(deg) * SL * r + GC.x, Math.sin(deg) * SL * r + GC.y]
        ]

        // ...then add 3 more (horizontal)
        for (let rr = 1; rr < 4; rr++) {
          const lastRV = rowVerts[rowVerts.length - 1]
          rowVerts.push([
            lastRV[0] + Math.cos(deg2) * SL,
            lastRV[1] + Math.sin(deg2) * SL
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



  draw() {
    const gp = this.gameplay
    const p5 = this.p5

    p5.background(20);



    // render outline ////
    p5.noFill();
    p5.stroke(100);
    p5.strokeWeight(5);

    p5.beginShape();
    for (let i = 0; i < 6; i++) {
      const deg = i * 60 - 150
      p5.vertex(p5.cos(deg) * 180 + 200, p5.sin(deg) * 180 + 300);
    }
    p5.endShape(p5.CLOSE);

    // render all vertices ///
    p5.stroke(200)
    p5.strokeWeight(10)
    const allVerts = this.GRID_VERTICES.verts
    for (let i = 0; i < allVerts.length; i++) {
      const vert = allVerts[i]
      p5.point(vert[0], vert[1])
    }

    // render square vertices
    p5.fill(255, 100)
    p5.noStroke()
    let cc = 0
    for (let i = 0; i < this.GRID_VERTICES.faces.length; i++) {
      const rows = this.GRID_VERTICES.faces[i]
      for (let r = 0; r < rows.length; r++) {
        const sqs = rows[r]
        for (let rr = 0; rr < sqs.length; rr++) {
          const sqVerts = sqs[rr]
          cc++
          if (p5.frameCount * 0.2 % 30 < cc) continue
          p5.beginShape();
          for (let sv = 0; sv < sqVerts.length; sv++) {
            p5.vertex(sqVerts[sv][0], sqVerts[sv][1]);
          }
          p5.endShape(p5.CLOSE);

        }
      }
    }

    console.log(cc)
  }

  click() {
    const p5 = this.p5
    const gp = this.gameplay

  }
}