// this file was used with telerik fiddler
// if you intercept thier MachineCanvas.js and replace with this one,
// it should highlight each player in a different color.


var white_list = {
    some_user: true
}; 
var MachineCanvas = function(machine, options) {

    var that = this;

    var $canvas = $("#" + options.id);
    var context = $canvas [0].getContext("2d");

    var zoomFloat = 4.0; // to track mousewheel more accurately
    var zoom = 4;
    var ZOOM_MIN = 0;
    var ZOOM_MAX = 6;
    var CANVAS_WIDTH = $canvas.width();
    var CANVAS_HEIGHT = $canvas.height();
    $canvas[0].width = CANVAS_WIDTH;
    $canvas[0].height = CANVAS_HEIGHT;
    var SIDE = 6 * (1 << (zoom - 2));
    var resolution;

    var player; // Which player are we looking at

    var state; // the state to draw

    if (machine) {
        machine.on('state-updated', function() {
            if (player) {
                that.setState(machine.state.getPlayerState(machine.username));
            }
        });
    }

    var centerOfView = {i: CANVAS_WIDTH / 2, j: CANVAS_HEIGHT / 2};

    function draw() {

        if (!state || !$canvas.is(':visible')) {
            return;
        }


        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (state.bots.length <= 0) {
            // dead
            drawDead();
            return;
        }

        //get region to draw
        var region = {
            x: {
                min: Math.floor(pxToPt({i: 0, j: CANVAS_HEIGHT}).x),
                max: Math.floor(pxToPt({i: CANVAS_WIDTH, j: 0}).x)
            },
            y: {
                min: Math.floor(pxToPt({i: CANVAS_WIDTH, j: CANVAS_HEIGHT}).y),
                max: Math.floor(pxToPt({i: 0, j: 0}).y)
            }
        };

        if (zoom <= 1) {
            // Draw only the pixel
            drawPixel(region);
        }
        else {
            drawGrid(region);
            drawFog(region);
            drawThings(region);
        }
    }

    function drawGrid(region) {

        if (zoom < 3) {
            return;
        }

        //draw grid
        context.lineWidth = 1.0;
        context.strokeStyle = '#bdc3c7';
        if (zoom <= 3) {
            context.strokeStyle = '#ecf0f1';
        }
        var px1, px2, n, m;

        for (n = region.x.min; n <= region.x.max; n++) {
            px1 = ptToPx({x: n, y: region.y.min});
            px2 = ptToPx({x: n, y: region.y.max});
            line(px1, px2);
        }
        for (m = region.y.min; m <= region.y.max; m++) {
            px1 = ptToPx({x: region.x.min, y: m});
            px2 = ptToPx({x: region.x.max, y: m});
            line(px1, px2);
        }

        //draw labels
        if (zoom > 2) {
            context.fillStyle = '#95a5a6';
            if (zoom <= 3) {
                context.fillStyle = '#bdc3c7';
            }
            var fontSize = 8 + (zoom - 2) * 2;
            context.font = ' ' + fontSize + 'px sans-serif';
            context.textBaseline = 'middle';
            context.textAlign = 'center';
            for (n = region.x.min; n <= region.x.max; n++) {
                text(ptToPx({x: n, y: 0}), '' + n);
            }
            for (m = region.y.min; m <= region.y.max; m++) {
                text(ptToPx({x: 0, y: m}), '' + m);
            }
        }
    }

    function drawFog(region) {

        // Create a second canvas, fill with the void color, and then dig holes where the bots are
        var canvas = document.createElement('canvas');
        canvas.id = "FOG";
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        var fog = canvas.getContext('2d');

        fog.fillStyle = "#2c3e50";
        fog.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        fog.globalCompositeOperation = 'destination-out';
        _.each(state.bots, function(bot) {
            var x = bot.x;
            var y = bot.y;
            var px1 = ptToPx({x: x - Bot.VISIBILITY_DISTANCE - 1 / 2, y: y - Bot.VISIBILITY_DISTANCE - 1 / 2});
            var px2 = ptToPx({x: x - Bot.VISIBILITY_DISTANCE - 1 / 2, y: y + Bot.VISIBILITY_DISTANCE + 1 / 2});
            var px3 = ptToPx({x: x + Bot.VISIBILITY_DISTANCE + 1 / 2, y: y + Bot.VISIBILITY_DISTANCE + 1 / 2});
            var px4 = ptToPx({x: x + Bot.VISIBILITY_DISTANCE + 1 / 2, y: y - Bot.VISIBILITY_DISTANCE - 1 / 2});
            fog.beginPath();
            fog.moveTo(px1.i, px1.j);
            fog.lineTo(px2.i, px2.j);
            fog.lineTo(px3.i, px3.j);
            fog.lineTo(px4.i, px4.j);
            fog.closePath();
            fog.fill();
        });
        context.drawImage(canvas, 0, 0);
    }

    function drawThings(region) {

        var things = getThingsToDraw(region);

        //sort object by deep
        things.sort(function(a, b) {
            return ((b.x + b.y) * 65535 + b.x - ((a.x + a.y) * 65535 + a.x));
        });

        //group by type
        var thingsByCoordByType = [];
        var previousCoordinates;
        var thingsByType = [];
        _.each(things, function(thing) {
            if (!previousCoordinates || Machine.distance(thing, previousCoordinates) > 0) {
                thingsByType = [];
                thingsByCoordByType.push(thingsByType);
            }
            previousCoordinates = thing;
            if (!thingsByType[thing.type]) {
                thingsByType[thing.type] = [];
            }
            thingsByType[thing.type].push(thing);

        });

        _.each(thingsByCoordByType, function(thingsByType) {
            _.each(thingsByType, function(things, type) {
                if (!things)return;
                var px = ptToPx(things[0]);
                var fontSize = 6 + 3 * zoom;
                context.font = fontSize + "px FontAwesome";
                switch (type) {
                    case Machine.Thing.BOT:
                        context.fillStyle = '#2980b9';
                        text(px, '\uf183');
                        if (things.length > 1) {
                            context.font = 'bold 12px sans-serif';
                            text({i: px.i + 10, j: px.j}, things.length);
                        }
                        break;
                    case Machine.Thing.OTHER:
                        
						if (white_list[things[0].player] !== undefined) {
							context.fillStyle = '#0077CC';
						} else {
							context.fillStyle = '#c0392b';
						}
                        text(px, '\uf183');
                        if (things.length > 1) {
                            context.font = 'bold ' + fontSize + 'px sans-serif';
                            text({i: px.i + 10, j: px.j}, things.length);
                        }
                        break;
                    case Machine.Thing.WRENCH:
                        context.fillStyle = '#7f8c8d';
                        text(px, '\uf0ad');
                        break;
                    case Machine.Thing.CASTLE:
                        context.fillStyle = '#16a085';
                        text(px, '\uf286');
                        break;
                }
            });
        });
    }

    function drawPixel() {

        // Draw background
        context.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.fillStyle = "#2c3e50";
        context.fill();

        // Draw fog
        context.fillStyle = "#ffffff";
        _.each(state.bots, function(bot) {
            var px = ptToPx(bot);
            context.fillRect(
                px.i - Bot.VISIBILITY_DISTANCE * resolution,
                px.j - Bot.VISIBILITY_DISTANCE * resolution,
                2 * Bot.VISIBILITY_DISTANCE * resolution,
                2 * Bot.VISIBILITY_DISTANCE * resolution);
        });

        var thingsByCoordByType = sortThingsByCoordAndType(getThingsToDraw());

        _.each(thingsByCoordByType, function(thingsByType) {
            _.each(thingsByType, function(things, type) {
                var color = null;
                var alpha = things.length / 3;
                if (alpha > 1)alpha = 1;
                switch (things[0].type) {

                    case Machine.Thing.BOT:
                        color = 'rgba(41, 128, 185,' + alpha + ')';
                        break;
                    case Machine.Thing.OTHER:
                        color = 'rgba(231, 76, 60,' + alpha + ')';
                        break;
                    case Machine.Thing.WRENCH:
                        color = 'rgba(149, 165, 166, 1.0)';
                        break;
                    case Machine.Thing.CASTLE:
                        color = 'rgba(39, 174, 96, 1.0)';
                        break;
                }
                if (!color)return;
                context.fillStyle = color;
                var px = ptToPx(things[0]);
                context.fillRect(px.i, px.j, resolution, resolution);
            });
        });
    }

    function getThingsToDraw(region) {

        var things = [];
        _.each(state.bots, function(bot) {
            bot.type = Machine.Thing.BOT;
            things.push(bot);
        });

        _.each(state.others, function(bots, player) {
            _.each(bots, function(bot) {
                bot.type = Machine.Thing.OTHER;
				bot.player = player;
                things.push(bot);
            });
        });

        _.each(state.wrenches, function(wrench) {
            wrench.type = Machine.Thing.WRENCH;
            things.push(wrench);
        });

        _.each(state.castles, function(castle) {
            castle.type = Machine.Thing.CASTLE;
            things.push(castle);
        });

        // TODO filter in region

        return things;
    }

    function sortThingsByCoordAndType(things) {
        //group by type
        var thingsByCoordByType = {};
        _.each(things, function(thing) {
            var coord = (thing.x + thing.y) * 65535 + thing.x;
            if (!thingsByCoordByType[coord]) {
                thingsByCoordByType[coord] = {};
            }
            if (!thingsByCoordByType[coord][thing.type]) {
                thingsByCoordByType[coord][thing.type] = []
            }
            thingsByCoordByType[coord][thing.type].push(thing);
        });
        return thingsByCoordByType;
    }


    function drawDead() {
        context.fillStyle = "#2c3e50";
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        context.fillStyle = '#ecf0f1';
        context.font = "40px FontAwesome";
        context.fillText("\uf119", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        context.font = "12px sans-serif";
        context.fillText("You died, reset to start over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }

    //DRAW TOOLS
    function ptToPx(pt) {
    }

    function pxToPt(px) {
    }

    function resetPtToPxFunctions() {
        if (zoom > 1) {
            ptToPx = function(pt) {
                return {
                    i: centerOfView.i + SIDE * (pt.x - pt.y),
                    j: centerOfView.j - SIDE * (pt.x + pt.y) / 2
                }
            };

            pxToPt = function(px) {
                return {
                    x: ((px.i - centerOfView.i) / 2 - (px.j - centerOfView.j)) / SIDE,
                    y: ((centerOfView.j - px.j) + (centerOfView.i - px.i) / 2) / SIDE
                }
            };
        }
        else {
            ptToPx = function(pt) {
                return {
                    i: Math.floor(centerOfView.i + pt.x * resolution),
                    j: Math.floor(centerOfView.j - pt.y * resolution)
                }
            };
            pxToPt = function(px) {
                return {
                    x: (px.i - centerOfView.i) / resolution,
                    y: -(px.j - centerOfView.j) / resolution
                }
            };
        }
    }

    resetPtToPxFunctions();

    function line(a, b) {
        if (a.i === b.i) {
            a.i += 0.5;
            b.i += 0.5;
        }
        if (a.j === b.j) {
            b.j += 0.5;
            a.j += 0.5;
        }
        context.beginPath();
        context.moveTo(a.i, a.j);
        context.lineTo(b.i, b.j);
        context.stroke();
    }

    function tile(x, y, transparent) {
        x = x - 0;
        y = y - 0;
        var px1 = ptToPx({x: x - 1 / 2, y: y - 1 / 2});
        var px2 = ptToPx({x: x - 1 / 2, y: y + 1 / 2});
        var px3 = ptToPx({x: x + 1 / 2, y: y + 1 / 2});
        var px4 = ptToPx({x: x + 1 / 2, y: y - 1 / 2});
        //fillPolygon([px1,px2,px3,px4]);
        if (transparent) {
            fillPolygon([px1, px2, px3, px4]);
        }
        else {
            fillPolygon([{i: px1.i, j: px1.j + .5},
                {i: px2.i - .5, j: px2.j},
                {i: px3.i, j: px3.j - .5},
                {i: px4.i + .5, j: px4.j}]);
        }
    }

    function fillPolygon(pxs) {
        context.beginPath();
        context.moveTo(pxs[0].i, pxs[0].j);
        for (var i = 1; i < pxs.length; i++) {
            context.lineTo(pxs[i].i, pxs[i].j);
        }
        context.closePath();
        context.fill();
    }

    function text(px, text) {
        context.fillText(text, px.i, px.j);
    }

    // Viewpoint manipulation

    function setZoom(newZoom, setFloat) {
        zoom = newZoom;
        if (setFloat) {
            zoomFloat = newZoom;
        }
        if (zoom > ZOOM_MAX)zoom = ZOOM_MAX;
        if (zoom < ZOOM_MIN)zoom = ZOOM_MIN;
        SIDE = 6 * (1 << (zoom - 2));
        that.scheduleRedraw();

        resolution = 1;
        if (zoom == 1) {
            resolution = 2;
        }

        // change ptToPx functions
        resetPtToPxFunctions();
    }

    function deltaCenterOfView(delta) {
        centerOfView.i += delta.i;
        centerOfView.j += delta.j;
        that.scheduleRedraw();
    }

    function resize() {
        CANVAS_WIDTH = $canvas.width();
        CANVAS_HEIGHT = $canvas.height();
        $canvas[0].width = CANVAS_WIDTH;
        $canvas[0].height = CANVAS_HEIGHT;
        that.scheduleRedraw();
    }

    $(window).resize(resize);
    $canvas.resize(resize);
    this.resize = function() {
        resize();
    };

    //handle keys to move
    $(window).keydown(function(eventObject) {
        switch (eventObject.keyCode) {
            case 37 :
                deltaCenterOfView({i: 24, j: 0});
                break;
            case 38 :
                deltaCenterOfView({i: 0, j: 24});
                break;
            case 39 :
                deltaCenterOfView({i: -24, j: 0});
                break;
            case 40 :
                deltaCenterOfView({i: 0, j: -24});
                break;
            case 107 : // +
            case 187 : // =
                setZoom(zoom + 1, true);
                break;
            case 109 :
            case 189 : // -
                setZoom(zoom - 1, true);
                break;
        }
    });
    $canvas.mousedown(function(e) {
        var previousMousePosition = {x: e.pageX, y: e.pageY};
        $(window).mousemove(function(e) {
            // And you can get the distance moved by
            deltaCenterOfView({
                i: e.pageX - previousMousePosition.x,
                j: e.pageY - previousMousePosition.y
            });
            previousMousePosition = {x: e.pageX, y: e.pageY};
            return false;
        });

        $(window).on('mouseup', function() {
            $(window).unbind('mousemove');
        });

        // Using return false prevents browser's default,
        // often unwanted mousemove actions (drag & drop)
        return false;
    });

    $canvas.on('touchstart', function(touch) {
        var e = touch.originalEvent.touches[0];
        var previousMousePosition = {x: e.pageX, y: e.pageY};
        $(window).on('touchmove', function(touch) {
            var e = touch.originalEvent.touches[0];
            // And you can get the distance moved by
            deltaCenterOfView({
                i: e.pageX - previousMousePosition.x,
                j: e.pageY - previousMousePosition.y
            });
            previousMousePosition = {x: e.pageX, y: e.pageY};
            return false;
        });

        $(window).on('touchend', function() {
            $(window).unbind('touchmove');
        });
        // Using return false prevents browser's default,
        // often unwanted mousemove actions (drag & drop)
        return false;
    });

    $canvas.mousewheel(function(event, delta, deltaX, deltaY) {
        zoomFloat = zoomFloat + delta / 4;
        var newZoom = Math.floor(zoomFloat);
        if (newZoom != zoom) {
            var cursorPx = {i: event.offsetX, j: event.offsetY};
            var previousCursorInCanvasPt = pxToPt(cursorPx);
            setZoom(newZoom);
            var newPxOfCursorPt = ptToPx(previousCursorInCanvasPt);
            deltaCenterOfView({
                i: cursorPx.i - newPxOfCursorPt.i,
                j: cursorPx.j - newPxOfCursorPt.j
            });
        }
    });

    // External accessors
    this.draw = draw;

    this.setPlayer = function(aplayer) {
        player = aplayer;
    };

    this.setState = function(astate) {
        state = astate;
        this.scheduleRedraw();
    };

    this.recenter = function() {
        centerOfView = {i: CANVAS_WIDTH / 2, j: CANVAS_HEIGHT / 2};
        that.scheduleRedraw();
    };

    // Trigger a redraw when fontawesome is loaded
    if (typeof fontSpy !== 'undefined') {
        fontSpy('FontAwesome', {
            glyphs: '\ue81a\ue82d\ue823\uF0AD',
            success: function() {
                that.scheduleRedraw();
            },
            failure: function() {
                // Nothing to do
            }
        });
    }
};

MachineCanvas.prototype.scheduleRedraw = function() {
    this.draw();
};
