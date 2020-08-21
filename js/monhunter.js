//TODO: allow perpendicular movement if stuck on tile
//TODO: add exit/entrance
//TODO: add menu
//TODO: add items to inventory
//TODO: add initial mon selection
//TODO: add attack button
//TODO: save areas/pokemon stats
//TODO: add different tilesets
//TODO: add different sprite angles

//TODO: reduce tile size??

var map = {
    cols: 12,
    rows: 12,
    tsize: 64,
    // base layer, top layer, utility layer
    layers: [[],[],[]],
    init: function () {
        // random item spawn location
        var itemC = Math.floor(Math.random() * this.cols-2) + 1;
        var itemR = Math.floor(Math.random() * this.rows-1) + 1;
        for(c=0; c<this.cols; c++) {
            for(r=0; r<this.rows; r++) {
                 // left/right border tiles
                 var tile0 = 0, tile1 = 0, tile2 = 0;
                if(r === 0 || r === this.rows-1) {
                    tile0 = 3;
                    tile1 = 4;
                // top/bottom borders
                } else if(c === 0 || c === this.cols-1) {
                    tile0 = 3;
                    tile1 = 0;
                // treetops at bottom
                } else if(c === this.cols-2) {
                    tile0 = 1;
                    tile1 = 4;
                } else {
                    // pick either open space(grass/dirt) possibly add collision(bush)
                    tile0 = Math.floor(Math.random() * 2) + 1;
                    // TODO: prevent collision object from spawning on hero
                    tile1 = Math.random() < 0.95 ? 0 : 5;
                    // 50% chance of item spawn
                    tile2 = (Math.floor(Math.random() * 2)+1) === 1 
                        && itemC === c 
                        && itemR === r ? 1 : 0;
                }   
                this.pushTile(tile0, tile1, tile2);             
            }
        }
    },
    pushTile: function (tile0, tile1, tile2) {
        this.layers[0].push(tile0);
        this.layers[1].push(tile1);
        this.layers[2].push(tile2);
    },
    getTile: function (layer, col, row) {
        return this.layers[layer][row * map.cols + col];
    },
    replaceTile: function (layer, x, y, replacement) {
        var col = this.getCol(x);
        var row = this.getRow(y);
        this.layers[layer][row * map.cols + col] = replacement;
    },
    isSolidTileAtXY: function (x, y) {
        var col = this.getCol(x);
        var row = this.getRow(y);

        // tiles 3 and 5 are solid -- the rest are walkable
        // loop through all layers and return TRUE if any tile is solid
        return this.layers.reduce(function (res, layer, index) {
            var tile = this.getTile(index, col, row);
            var isSolid = tile === 3 || tile === 5
                || (index === 2 && tile === 1);
            return res || isSolid;
        }.bind(this), false);
    },
    isItemAtXY: function (x, y) {
        var col = this.getCol(x);
        var row = this.getRow(y);

        return this.layers.reduce(function (res, layer, index) {
            var tile = this.getTile(index, col, row);
            var isItem = index === 2 && tile === 1;
            return res || isItem;
        }.bind(this), false);
    },
    getCol: function (x) {
        return Math.floor(x / this.tsize);
    },
    getRow: function (y) {
        return Math.floor(y / this.tsize);
    },
    getX: function (col) {
        return col * this.tsize;
    },
    getY: function (row) {
        return row * this.tsize;
    }
};

function Camera(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.maxX = map.cols * map.tsize - width;
    this.maxY = map.rows * map.tsize - height;
}

Camera.prototype.follow = function (sprite) {
    this.following = sprite;
    sprite.screenX = 0;
    sprite.screenY = 0;
};

Camera.prototype.update = function () {
    // assume followed sprite should be placed at the center of the screen
    // whenever possible
    this.following.screenX = this.width / 2;
    this.following.screenY = this.height / 2;

    // make the camera follow the sprite
    this.x = this.following.x - this.width / 2;
    this.y = this.following.y - this.height / 2;
    // clamp values
    this.x = Math.max(0, Math.min(this.x, this.maxX));
    this.y = Math.max(0, Math.min(this.y, this.maxY));

    // in map corners, the sprite cannot be placed in the center of the screen
    // and we have to change its screen coordinates

    // left and right sides
    if (this.following.x < this.width / 2 ||
        this.following.x > this.maxX + this.width / 2) {
        this.following.screenX = this.following.x - this.x;
    }
    // top and bottom sides
    if (this.following.y < this.height / 2 ||
        this.following.y > this.maxY + this.height / 2) {
        this.following.screenY = this.following.y - this.y;
    }
};

function Hero(map, x, y) {
    this.map = map;
    this.x = x;
    this.y = y;
    this.width = map.tsize;
    this.height = map.tsize;

    this.image = Loader.getImage('hero');
}

Hero.SPEED = 256; // pixels per second

Hero.prototype.move = function (delta, dirx, diry) {
    // move hero
    this.x += dirx * Hero.SPEED * delta;
    this.y += diry * Hero.SPEED * delta;

    // check if we walked into a non-walkable tile
    this._collide(dirx, diry);

    // clamp values
    var maxX = this.map.cols * this.map.tsize;
    var maxY = this.map.rows * this.map.tsize;
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
};

Hero.prototype._collide = function (dirx, diry) {
    var row, col;

    // -1 in right and bottom is because image ranges from 0..63
    // and not up to 64
    var left = this.x - this.width / 2;
    var right = this.x + this.width / 2 - 1;
    var top = this.y - this.height / 2;
    var bottom = this.y + this.height / 2 - 1;

    // check for collisions on sprite sides
    var collision =
        this.map.isSolidTileAtXY(left, top)     ||
        this.map.isSolidTileAtXY(right, top)    ||
        this.map.isSolidTileAtXY(right, bottom) ||
        this.map.isSolidTileAtXY(left, bottom);

    document.onkeypress = function (e) {
        e = e || window.event;
        // if e is pressed
        if(e.keyCode === Keyboard.E) {
            // if item at current x,y replace with open space
            var x,y;
            if(map.isItemAtXY(left, top)) {
                console.log("COLLISION LEFT, TOP");
                x = left;
                y = top;
            } else if(map.isItemAtXY(right, top)) {
                console.log("COLLISION RIGHT, TOP");
                x = right;
                y = top;
            } else if(map.isItemAtXY(right, bottom)) {
                console.log("COLLISION RIGHT, BOTTOM");
                x = right;
                y = bottom;
            } else if(map.isItemAtXY(left, bottom)) {
                console.log("COLLISION LEFT, BOTTOM");
                x = left;
                y = bottom;
            } 
            if(x && y) {
                console.log("FOUND ITEM");
                map.replaceTile(2, x, y, 0);
                // TODO: add item to inventory
            }
        }
    };

    if (!collision) { return; }

    // reset position
    //TODO: allow perpendicular movement
    //TODO: fix bounce back
    if (diry > 0) {
        row = this.map.getRow(bottom);
        this.y = -this.height / 2 + this.map.getY(row);
    }
    if (diry < 0) {
        row = this.map.getRow(top);
        this.y = this.height / 2 + this.map.getY(row + 1);
    }
    if (dirx > 0) {
        col = this.map.getCol(right);
        this.x = -this.width / 2 + this.map.getX(col);
    }
    if (dirx < 0) {
        col = this.map.getCol(left);
        this.x = this.width / 2 + this.map.getX(col + 1);
    }
};

Game.load = function () {
    return [
        Loader.loadImage('tiles', '../assets/tiles.png'),
        Loader.loadImage('pokeball', '../assets/pokeball.png'),
        Loader.loadImage('hero', '../assets/character.png')
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN, Keyboard.E]);
    this.tileAtlas = Loader.getImage('tiles');
    this.utilTileAtlas = Loader.getImage('pokeball');
    this.hero = new Hero(map, 160, 160);
    this.camera = new Camera(map, 512, 512);
    this.camera.follow(this.hero);
    map.init();
};

Game.update = function (delta) {
    // handle hero movement with arrow keys
    var dirx = 0;
    var diry = 0;
    if (Keyboard.isDown(Keyboard.LEFT)) { dirx = -1; }
    if (Keyboard.isDown(Keyboard.RIGHT)) { dirx = 1; }
    if (Keyboard.isDown(Keyboard.UP)) { diry = -1; }
    if (Keyboard.isDown(Keyboard.DOWN)) { diry = 1; }

    this.hero.move(delta, dirx, diry);
    document.getElementById("coords").innerHTML=Math.floor(this.hero.x) + "/" + Math.floor(this.hero.y);
    this.camera.update();
};

Game._drawLayer = function (layer) {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile(layer, c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== 0) { // 0 => empty tile
                var image = layer === 2 ? this.utilTileAtlas : this.tileAtlas; // 2 => utility layer
                this.ctx.drawImage(
                    image, // image
                    (tile - 1) * map.tsize, // source x
                    0, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                );
            }
        }
    }
};


// Game._drawGrid = function () {
//         var width = map.cols * map.tsize;
//     var height = map.rows * map.tsize;
//     var x, y;
//     for (var r = 0; r < map.rows; r++) {
//         x = - this.camera.x;
//         y = r * map.tsize - this.camera.y;
//         this.ctx.beginPath();
//         this.ctx.moveTo(x, y);
//         this.ctx.lineTo(width, y);
//         this.ctx.stroke();
//     }
//     for (var c = 0; c < map.cols; c++) {
//         x = c * map.tsize - this.camera.x;
//         y = - this.camera.y;
//         this.ctx.beginPath();
//         this.ctx.moveTo(x, y);
//         this.ctx.lineTo(x, height);
//         this.ctx.stroke();
//     }
// };

Game.render = function () {
    // draw map background layer
    this._drawLayer(0);

    // draw main character
    this.ctx.drawImage(
        this.hero.image,
        this.hero.screenX - this.hero.width / 2,
        this.hero.screenY - this.hero.height / 2);

    // draw map top layer
    this._drawLayer(1);
    // draw map utility layer
    this._drawLayer(2);

};