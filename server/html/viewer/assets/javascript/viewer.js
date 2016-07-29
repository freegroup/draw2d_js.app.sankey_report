var conf= {
	fileSuffix: ".sankey",

	backend: {
		file: {
			list: "/backend/file/list",
			get : "/backend/file/get",
			save: "/backend/file/save"
		},
		hook:"/backend/hook",
		weights:"/backend/sankey/weights",
		suggestPath:"/backend/suggestPath",
		suggestValue:"/backend/suggestValue"
	}
};

/**
 * 
 */
sankey.Application = Class.extend(
{
    NAME : "Application",

    /**
     * @constructor
     * 
     * @param {String} canvasId the id of the DOM element to use as paint container
     */
    init : function()
    {
        this.view         = new sankey.View("canvas");
		this.toolbar      = new sankey.Toolbar("toolbar", this.view );

		// layout FIRST the body
		//
		this.containerLayout = $('#container').layout({
			north: {
				resizable:false,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				size:120,
				paneSelector: "#toolbar"
			},
			center: {
				resizable:false,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				paneSelector: "#draw2dCanvasWrapper"
			}
		});

		this.view.centerDocument();
	},

	getParam: function( name )
	{
		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		var regexS = "[\\?&]"+name+"=([^&#]*)";
		var regex = new RegExp( regexS );
		var results = regex.exec( window.location.href );

		// the param isn'T part of the normal URL pattern...
		//
		if( results === null ) {
			// maybe it is part in the hash.
			//
			regexS = "[\\#]"+name+"=([^&#]*)";
			regex = new RegExp( regexS );
			results = regex.exec( window.location.hash );
			if( results === null ) {
				return null;
			}
		}

		return results[1];
	},


	fileOpen: function()
	{
		new sankey.dialog.FileOpen(this.currentFileHandle).show(
			// success callback
			$.proxy(function(json){
				try{
					this.view.clear();
					var reader = new draw2d.io.json.Reader();
					reader.unmarshal(this.view, json.content.diagram);
                    this.setTemplate(json.content.jsonTemplate);
					this.view.getCommandStack().markSaveLocation();
					this.view.centerDocument();
					this.view.diagramName=this.currentFileHandle.title;
					this.updateWeights();
				}
				catch(e){
					console.log(e);
					this.view.clear();
				}
		    },this)
        );
	},

	updateWeights:function()
	{
		var _this = this;
		$.ajax({
			url: conf.backend.weights,
			method: "POST",
			data: {id:_this.currentFileHandle.title},
			success:function(response){
				_this.view.updateWeights(response);
			}
		});
	}

});

;

sankey.Toolbar = Class.extend({
	
	init:function(elementId, view)
	{
		this.html = $("#"+elementId);
		this.view = view;

		// register this class as event listener for the canvas
		// CommandStack. This is required to update the state of
		// the Undo/Redo Buttons.
		//
		view.getCommandStack().addEventListener(this);
	},

	/**
	 * @method
	 * Called if the selection in the cnavas has been changed. You must register this
	 * class on the canvas to receive this event.
	 *
     * @param {draw2d.Canvas} emitter
     * @param {Object} event
     * @param {draw2d.Figure} event.figure
	 */
	onSelectionChanged : function(emitter, event){
	},
	
	/**
	 * @method
	 * Sent when an event occurs on the command stack. draw2d.command.CommandStackEvent.getDetail() 
	 * can be used to identify the type of event which has occurred.
	 * 
	 * @template
	 * 
	 * @param {draw2d.command.CommandStackEvent} event
	 **/
	stackChanged:function(event)
	{
	}
});;
/*jshint sub:true*/
/*jshint evil:true */


sankey.View = draw2d.Canvas.extend({
	
	init:function(id)
    {
        var _this = this;

        this.diagramName = "";

		this._super(id);


        this.setScrollArea("#"+id);

        // keep up to date if the backend changes something
        //
        socket.on("connection:change", $.proxy(this.updateWeights, this));


        // show the ports of the elements only if the mouse cursor is close to the shape.
        //
        this.installEditPolicy(new draw2d.policy.canvas.ReadOnlySelectionPolicy());


        var diagram = this.getParam("diagram");
        if(diagram){
            this.diagramName = diagram;
            $.ajax({
                    url: conf.backend.file.get,
                    method: "POST",
                    xhrFields: {
                        withCredentials: true
                    },
                    data:{
                        id:diagram
                    }
                }
            ).done(function(json){
                var reader = new draw2d.io.json.Reader();
                reader.unmarshal(_this, json.content.diagram);
                _this.commonPorts.each(function(i,port){
                    port.setVisible(false);
                });
                _this.centerDocument();
                $.ajax({
                    url: conf.backend.weights,
                    method: "POST",
                    data: {id:diagram},
                    success:function(response){
                        _this.updateWeights(response);
                    }
                });

            });
        }
    },

    updateWeights: function(weights)
    {
        // no content
        //
        if(weights.length===0){
            return;
        }

        // content is not for this diagram
        //
        if(weights[0].file!==this.diagramName){
            return;
        }

        var _this = this;
        this.getLines().each(function(index, conn){
            conn.setWeight("0");
        });
        weights.forEach(function(weight){
            var conn = _this.getLine(weight.conn);
            if(conn!==null){
                conn.setWeight(weight.value);
            }
        });

        var min=Number.MAX_SAFE_INTEGER,
            max=0;
        this.getLines().each(function(index, conn){
            min = Math.min(min,conn.getWeight());
            max = Math.max(2,Math.max(max,conn.getWeight()));
        });

        var minStroke = 2;
        var maxStroke = 20;
        this.getLines().each(function(index, conn){
            // [A, B] --> [a, b]
            conn.setStroke((conn.getWeight() - min)*(maxStroke-minStroke)/Math.max(1,(max-min)) + minStroke);
        });

    },


    getBoundingBox: function()
    {
        var xCoords = [];
        var yCoords = [];
        this.getFigures().each(function(i,f){
            var b = f.getBoundingBox();
            xCoords.push(b.x, b.x+b.w);
            yCoords.push(b.y, b.y+b.h);
        });
        var minX   = Math.min.apply(Math, xCoords);
        var minY   = Math.min.apply(Math, yCoords);
        var width  = Math.max(10,Math.max.apply(Math, xCoords)-minX);
        var height = Math.max(10,Math.max.apply(Math, yCoords)-minY);

        return new draw2d.geo.Rectangle(minX,minY,width,height);
    },


    centerDocument:function()
    {
        var bb=null;
        var c = $("#draw2dCanvasWrapper");
        if(this.getFigures().getSize()>0){
            // get the bounding box of the document and translate the complete document
            // into the center of the canvas. Scroll to the top left corner after them
            //
            bb = this.getBoundingBox();

            c.scrollTop(bb.y-50);
            c.scrollLeft(bb.x-50);
        }
        else{
            bb={
                x:this.getWidth()/2,
                y:this.getHeight()/2
            };
            c.scrollTop(bb.y- c.height()/2);
            c.scrollLeft(bb.x- c.width()/2);

        }
    },

    getParam: function( name )
    {
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( window.location.href );

        // the param isn'T part of the normal URL pattern...
        //
        if( results === null ) {
            // maybe it is part in the hash.
            //
            regexS = "[\\#]"+name+"=([^&#]*)";
            regex = new RegExp( regexS );
            results = regex.exec( window.location.hash );
            if( results === null ) {
                return null;
            }
        }

        return results[1];
    }
});

;
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