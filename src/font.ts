import type P5 from "p5"

type drawCharParams = {
  char: string, x: number, y: number, ag: P5,
  obj: { tx: number, ty: number }, s: number, c: P5.Color
}

export let customFont = {
  render: function (message: string, x: number, y: number, s: number, c: P5.Color, ag: P5) {
    const obj = { tx: 0, ty: 0 }
    ag.fill(c);
    for (let i = 0; i < message.length; i++) {
      this.drawChar({
        char: message[i], ag,
        x: x + obj.tx, y: y + obj.ty,
        c, obj, s
      });
    }
    return obj.tx - (10 * s) / 50;
  },

  drawChar: function ({ char, ag, s, x, y, obj, c }: drawCharParams) {
    ag.push(); ///KA
    ag.translate(x, y);
    ag.scale(s / 50);

    switch (char) {
      case "a":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 30, -50, 40, -50, 10, 0);
          ag.quad(30, -50, 40, -50, 50, 0, 40, 0);
          ag.quad(15, -25, 45, -25, 47, -15, 12, -15);

          obj.tx += (60 * s) / 50;
        }
        break;
      case "b":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);

          ag.stroke(c);
          ag.noFill();
          ag.strokeWeight(10);
          ag.bezier(15, -45, 40, -45, 35, -25, 11, -25);
          ag.bezier(11, -25, 39, -25, 35, -5, 10, -5);
          ag.strokeWeight(1);
          ag.noStroke();

          obj.tx += (40 * s) / 50;
        }
        break;
      case "c":
        {
          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(35, -8, -15, 10, 5, -60, 35, -40);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "d":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);

          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(15, -45, 50, -45, 50, -5, 8, -5);

          ag.strokeWeight(1);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "e":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(6, -30, 30, -30, 28, -20, 4, -20);
          ag.quad(2, -10, 32, -10, 30, 0, 0, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "f":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(6, -30, 30, -30, 28, -20, 4, -20);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "g":
        {
          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(40, -20, 10, 30, -20, -50, 40, -45);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          ag.noStroke();
          ag.fill(c);
          ag.quad(46, -28, 44, -18, 20, -18, 22, -28);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "h":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(30, 0, 40, -50, 50, -50, 40, 0);
          ag.quad(6, -30, 46, -30, 44, -20, 4, -20);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "i":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(20, -50, 30, -50, 20, 0, 10, 0);
          ag.quad(0, 0, 2, -10, 32, -10, 30, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "j":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);

          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(25, -50, 25, -25, 15, 15, 2, -15);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "k":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(5, -25, 37, -50, 50, -50, 15, -22);
          ag.quad(5, -25, 27, 0, 40, 0, 15, -28);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "l":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(0, 0, 2, -10, 32, -10, 30, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "m":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(10, -50, 20, 0, 30, 0, 20, -50);
          ag.quad(20, 0, 30, 0, 60, -50, 50, -50);
          ag.quad(40, 0, 50, -50, 60, -50, 50, 0);

          obj.tx += (60 * s) / 50;
        }
        break;
      case "n":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);
          ag.quad(10, -50, 20, 0, 30, 0, 20, -50);
          ag.quad(20, 0, 30, -50, 40, -50, 30, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "o":
        {
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(30, -45, 10, -50, 0, 0, 20, -5);
          ag.bezier(25, -45, 55, -50, 40, 0, 15, -5);

          ag.strokeWeight(1);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "p":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);

          ag.stroke(c);
          ag.noFill();
          ag.strokeWeight(10);

          ag.bezier(15, -45, 40, -45, 35, -25, 11, -20);

          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "q":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(20, -20, 30, -20, 40, 0, 30, 0);

          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(30, -45, 10, -50, 0, 0, 20, -5);
          ag.bezier(25, -45, 55, -50, 40, 0, 15, -5);

          ag.strokeWeight(1);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "r":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 10, -50, 20, -50, 10, 0);

          ag.stroke(c);
          ag.noFill();
          ag.strokeWeight(10);

          ag.bezier(15, -45, 40, -45, 35, -25, 11, -20);

          ag.strokeWeight(1);

          ag.noStroke();
          ag.fill(c);
          ag.quad(5, -25, 16, -25, 35, 0, 24, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "s":
        {
          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(40, -40, 20, -55, 0, -35, 20, -25);
          ag.bezier(20, -25, 40, -15, 20, 10, 0, -10);
          ag.point(20, -25);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "t":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(20, -50, 30, -50, 20, 0, 10, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "u":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 5, -25, 15, -25, 20, -50);
          ag.quad(40, -50, 35, -25, 45, -25, 50, -50);

          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(10, -25, 5, 4, 35, 4, 40, -25);

          ag.strokeWeight(1);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "v":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 20, -50, 20, 0, 10, 0);
          ag.quad(10, 0, 40, -50, 50, -50, 20, 0);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "w":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 20, -50, 20, 0, 10, 0);
          ag.quad(10, 0, 30, -50, 40, -50, 20, 0);
          ag.quad(30, -50, 40, -50, 40, 0, 30, 0);
          ag.quad(30, 0, 50, -50, 60, -50, 40, 0);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "x":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 40, -50, 50, -50, 10, 0);
          ag.quad(10, -50, 20, -50, 40, 0, 30, 0);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "y":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 20, -50, 25, -25, 15, -25);
          ag.quad(25, -25, 15, -25, 30, -50, 40, -50);
          ag.quad(15, -25, 25, -25, 20, 0, 10, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "z":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 2, -10, 42, -10, 40, 0);
          ag.quad(10, -50, 50, -50, 48, -40, 8, -40);
          ag.quad(2, -10, 15, -10, 48, -40, 35, -40);

          obj.tx += (50 * s) / 50;
        }
        break;

      case " ":
        {
          obj.tx += (35 * s) / 50;
        }
        break;
      case "\n":
        {
          obj.tx = 0;
          obj.ty += (100 * s) / 50;
        }
        break;

      case "1":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 2, -10, 32, -10, 30, 0);
          ag.quad(12, -10, 22, -10, 30, -50, 20, -50);
          ag.triangle(20, -50, 7, -35, 18, -35);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "2":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 30, 0, 32, -10, 2, -10);

          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(4, -5, 40, -25, 40, -60, 13, -40);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "3":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(4, -20, 6, -30, 40, -50, 38, -40);
          ag.quad(6, -30, 16, -30, 14, -20, 4, -20);

          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(7, -25, 40, -30, 35, 0, 0, -5);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "4":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(20, 0, 30, 0, 40, -50, 30, -50);
          ag.quad(30, -50, 4, -22, 2, -10, 28, -38);
          ag.quad(4, -20, 2, -10, 42, -10, 44, -20);

          obj.tx += (50 * s) / 50;
        }
        break;
      case "5":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(8, -40, 18, -40, 14, -20, 4, -20);

          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(7, -25, 40, -30, 35, 0, 0, -5);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "6":
        {
          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(35, -45, 10, -50, 0, 0, 20, -5);
          ag.bezier(15, -5, 40, 0, 30, -40, 10, -20);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "7":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 40, -50, 38, -40, 8, -40);
          ag.quad(28, -40, 38, -40, 10, 0, 0, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "8":
        {
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.ellipse(18, -15, 23, 23);
          ag.ellipse(21, -37, 17, 17);

          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "9":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(23, -22, 33, -22, 15, 0, 5, 0);

          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.ellipse(18, -32, 25, 25);

          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "0":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(19, -20, 29, -20, 31, -30, 21, -30);

          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(30, -45, 10, -50, 0, 0, 20, -5);
          ag.bezier(25, -45, 55, -50, 40, 0, 15, -5);

          ag.strokeWeight(1);

          obj.tx += (50 * s) / 50;
        }
        break;

      case ":":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 2, -10, 12, -10, 10, 0);
          ag.quad(5, -25, 7, -35, 17, -35, 15, -25);

          obj.tx += (20 * s) / 50;
        }
        break;
      case "+":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(4, -20, 6, -30, 36, -30, 34, -20);
          ag.quad(12, -10, 22, -10, 28, -40, 18, -40);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "-":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(4, -20, 6, -30, 36, -30, 34, -20);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "*":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(2, -10, 12, -10, 38, -40, 28, -40);
          ag.quad(22, -10, 32, -10, 18, -40, 8, -40);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "/":
        {
          ag.noStroke();
          ag.fill(c);

          ag.quad(0, 0, 30, -50, 40, -50, 10, 0);

          obj.tx += (50 * s) / 50;
        }
        break;
      case ".":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 2, -10, 12, -10, 10, 0);

          obj.tx += (20 * s) / 50;
        }
        break;
      case ",":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 2, -10, 12, -10, 10, 0);
          ag.triangle(2, 10, 4, 0, 10, 0);

          obj.tx += (20 * s) / 50;
        }
        break;
      case '"':
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(8, -40, 18, -40, 16, -30, 6, -30);
          ag.triangle(16, -50, 14, -40, 8, -40);

          ag.quad(23, -40, 33, -40, 31, -30, 21, -30);
          ag.triangle(31, -50, 29, -40, 23, -40);

          obj.tx += (30 * s) / 50;
        }
        break;
      case "'":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, -50, 20, -50, 18, -40, 8, -40);
          ag.triangle(10, -30, 12, -40, 18, -40);

          obj.tx += (15 * s) / 50;
        }
        break;
      case "!":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(0, 0, 2, -10, 12, -10, 10, 0);
          ag.quad(6, -20, 12, -20, 20, -50, 10, -50);

          obj.tx += (20 * s) / 50;
        }
        break;
      case "?":
        {
          ag.noStroke();
          ag.fill(c);
          ag.quad(10, 0, 12, -10, 22, -10, 20, 0);

          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(18, -15, 18, -35, 50, -50, 10, -45);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "$":
        {
          ag.strokeCap(ag.SQUARE);
          ag.strokeWeight(10);
          ag.stroke(c);
          ag.noFill();

          ag.bezier(40, -40, 20, -55, 0, -35, 20, -25);
          ag.bezier(20, -25, 40, -15, 20, 10, 0, -10);
          ag.point(20, -25);

          ag.strokeCap(ag.ROUND);
          ag.strokeWeight(1);

          ag.noStroke();
          ag.fill(c);
          ag.quad(10, 0, 20, -50, 30, -50, 20, 0);

          obj.tx += (40 * s) / 50;
        }
        break;
      case "%":
        {
          ag.noStroke();
          ag.fill(c);

          ag.quad(0, 0, 40, -50, 50, -50, 10, 0);

          ag.strokeWeight(8);
          ag.stroke(c);
          ag.noFill();

          ag.ellipse(15, -40, 12, 12);
          ag.ellipse(35, -10, 12, 12);

          ag.strokeWeight(1);

          obj.tx += (50 * s) / 50;
        }
        break;
    }

    ag.pop(); ///KA
  }

}

