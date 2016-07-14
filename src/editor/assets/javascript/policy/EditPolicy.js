sankey.policy.EditPolicy = draw2d.policy.canvas.BoundingboxSelectionPolicy.extend({


    init:function()
    {
      this._super();
      this.mouseMoveProxy = $.proxy(this._onMouseMoveCallback, this);
      this.configIcon=null;
    },

    /**
     * @method
     * Called by the canvas if the user click on a figure.
     *
     * @param {draw2d.Figure} the figure under the click event. Can be null
     * @param {Number} mouseX the x coordinate of the mouse during the click event
     * @param {Number} mouseY the y coordinate of the mouse during the click event
     * @param {Boolean} shiftKey true if the shift key has been pressed during this event
     * @param {Boolean} ctrlKey true if the ctrl key has been pressed during the event
     *
     * @since 3.0.0
     */
    onClick: function(figure, mouseX, mouseY, shiftKey, ctrlKey)
    {
    },

    onRightMouseDown:function(figure,x,y)
    {
        if(figure===null){
            return;
        }
      //  var x = event.x;
      //  var y = event.y;

        var items = {
            color: {name: "Line Color"  , icon :"x ion-android-color-palette"  }
        };

        if(figure instanceof draw2d.shape.basic.Label){
            items.fontcolor=  {name: "Font Color"  , icon :"x ion-android-color-palette" };
        }

        if(!(figure instanceof draw2d.Connection)){
            items.bgcolor=  {name: "Background Color"  , icon :"x ion-android-color-palette" };
        }

        if( (figure instanceof sankey.shape.Start)||
            (figure instanceof sankey.shape.End)||
            (figure instanceof sankey.shape.State)||
            (figure instanceof sankey.shape.Connection)){
            items.label={name: "Add Label" , icon :"x ion-ios-pricetag-outline" };
            items.del=  {name: "Delete"    , icon :"x ion-ios-close-outline" };
        }


        $.contextMenu({
            selector: 'body',
            events:{
                hide:function(){ $.contextMenu( 'destroy' ); }
            },
            callback: $.proxy(function(key, options){
                switch(key){
                    case "color":
                        this._setColor(figure,"color");
                        break;
                    case "bgcolor":
                        this._setColor(figure,"bgColor");
                        break;
                    case "fontcolor":
                        this._setColor(figure,"fontColor");
                        break;
                    case "del":
                        var cmd = new draw2d.command.CommandDelete(figure);
                        this.canvas.getCommandStack().execute(cmd);
                        break;
                    case "label":
                        this._attachLabel(figure);
                        break;
                    default:
                        break;
                }
            },this),
            x:x,
            y:y,
            items:items
        });
    },

    onInstall:function(canvas)
    {
        this._super(canvas);
        var _this = this;

        // provide configuration menu if the mouse is close to a shape
        //
        canvas.on("mousemove", this.mouseMoveProxy);

        $("#figureConfigDialog .figureAddLabel").on("click",function(){
            _this._attachLabel(_this.configFigure);
        });

        $("#figureConfigDialog .figureSetColor").on("click",function(){
            _this._setColor(_this.configFigure, "bgColor");
        });
    },


    onUninstall:function(canvas)
    {
        this._super(canvas);

        canvas.off(this.mouseMoveProxy);
        $("#figureConfigDialog .figureAddLabel").off("click");
        $("#figureConfigDialog .figureSetColor").off("click");
    },


    onMouseUp: function(canvas, x,y, shiftKey, ctrlKey)
    {
        if(shiftKey ===true && this.mouseDownElement===null){
            var rx = Math.min(x, this.x);
            var ry = Math.min(y, this.y);
            var rh = Math.abs(y-this.y);
            var rw = Math.abs(x-this.x);
            var raftFigure = new sankey.shape.Raft();
            raftFigure.attr({
                x:rx,
                y:ry,
                width:rw,
                height:rh,
                color:"#1c9bab"
            });
            canvas.add(raftFigure);
            this.boundingBoxFigure1.setCanvas(null);
            this.boundingBoxFigure1 = null;
            this.boundingBoxFigure2.setCanvas(null);
            this.boundingBoxFigure2 = null;
        }
        else{
            this._super(canvas, x, y, shiftKey, ctrlKey);
        }
    },

    _onMouseMoveCallback:function(emitter, event)
    {
        // there is no benefit to show decorations during Drag&Drop of an shape
        //
        if(this.mouseMovedDuringMouseDown===true){
            if(this.configIcon!==null) {
                this.configIcon.remove();
                this.configIcon = null;
            }
            return;
        }

        var hit = null;
        var _this = this;

        emitter.getFigures().each(function(index, figure){
            if(figure.hitTest(event.x,event.y, 30)){
                hit = figure;
                return false;
            }
        });

        if(hit!==null){
            var pos = hit.getBoundingBox().getTopLeft();
            pos = emitter.fromCanvasToDocumentCoordinate(pos.x, pos.y);
            pos.y -=30;

            if(_this.configIcon===null) {
                _this.configIcon = $("<div class='ion-gear-a' id='configMenuIcon'></div>");
                $("body").append(_this.configIcon);
                $("#figureConfigDialog").hide();
                _this.configIcon.on("click",function(){
                    $("#figureConfigDialog").show().css({top: pos.y, left: pos.x, position:'absolute'});
                    _this.configFigure = hit;
                    if(_this.configIcon!==null) {
                        _this.configIcon.remove();
                        _this.configIcon = null;
                    }
                });
            }
            _this.configIcon.css({top: pos.y, left: pos.x, position:'absolute'});
        }
        else{
            if(_this.configIcon!==null) {
                var x=_this.configIcon;
                _this.configIcon = null;
                x.fadeOut(500, function(){ x.remove(); });
            }
        }
    },


    _attachLabel:function(figure)
    {
        var text = prompt("Label");
        var locator;
        var label = new sankey.shape.Label({text:text, stroke:0, x:-20, y:-40});
        if(figure instanceof draw2d.Connection){
            locator =new sankey.locator.SmartConnectionLocator();
            label.setPosition(figure.getStartPosition());
        }
        else {
            locator = new draw2d.layout.locator.SmartDraggableLocator();
        }
        if(text) {
            label.installEditor(new draw2d.ui.LabelInplaceEditor());
            figure.add(label,locator);
        }
        $("#figureConfigDialog").hide();
    },

    _setColor:function(figure, attr)
    {
        var colorString = [];
        colors.forEach(function(c){
            colorString.push("<tr>");
            for(var entry in c){
                colorString.push("<td data-color='"+c[entry]+"' style='width:25px;height:15px;background-color:"+c[entry]+"'></td>");
            }
            colorString.push("</tr>");
        });


        $("#figureConfigDialog").hide();

        var pos = figure.getBoundingBox().getTopLeft();
        pos = figure.getCanvas().fromCanvasToDocumentCoordinate(pos.x, pos.y);
        pos.y -=30;

        var configIcon = $("<div id='colorDialog'><table>"+colorString.join("")+"</table></div>");
        $("body").append(configIcon);
        configIcon.css({top: pos.y, left: pos.x, position:'absolute'});
        $("#colorDialog td").on("click",function(){
            figure.attr(attr, $(this).data("color"));
            $("#colorDialog").remove();
        });
    }
});