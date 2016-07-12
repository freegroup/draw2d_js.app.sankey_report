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

var sankey ={
	shape:{
	},
	property:{
	},
	dialog:{
	},
	policy:{
	},
	anchor:{
	},
    locator:{
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
		this.localStorage = [];
		try {
			if( 'localStorage' in window && window.localStorage !== null){
				this.localStorage = localStorage;
			}
		} catch(e) {

		}

		this.currentFileHandle= {
			title: "Untitled"+conf.fileSuffix,
            jsonTemplate: {}
		};

        this.view         = new sankey.View("canvas");
		this.toolbar      = new sankey.Toolbar("toolbar", this.view );
		this.propertyView = new sankey.PropertyWindow("property", this.view );

		// layout FIRST the body
		//
		this.containerLayout = $('#container').layout({
			north: {
				resizable:false,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				size:80,
				paneSelector: "#toolbar"
			},
			center: {
				resizable:false,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				paneSelector: "#content"
			}
		});

		this.contentLayout = $('#content').layout({
			center: {
				resizable:false,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				paneSelector: "#editor"
			}
		});

		this.editorLayout = $('#editor').layout({
			west: {
				resizable:false,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				size:60,
				paneSelector: "#palette"
			},
			center: {
				resizable:true,
				closable:false,
				spacing_open:0,
				spacing_closed:0,
				paneSelector: "#view"
			}
		});

		this.appLayout = $('#view').layout({
			resizeWhileDragging: true,
			south: {
				resizable:true,
				closable:false,
				spacing_open:5,
				spacing_closed:5,
				size:120,
				paneSelector: "#property"
			},
			center: {
				resizable:true,
				closable:false,
				spacing_open:5,
				spacing_closed:5,
				paneSelector: "#draw2dCanvasWrapper"
			}
		});

		this.view.centerDocument();

		$("#templateConfigurationMenu").on("click",function(){
			new sankey.dialog.JSONTemplate().show();
		});
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

	fileNew: function(shapeTemplate)
	{
		this.currentFileHandle = {
			title: "Untitled"+conf.fileSuffix,
            jsonTemplate: {}
		};
		this.view.clear();
		if(shapeTemplate){
			var reader = new draw2d.io.json.Reader();
			reader.unmarshal(this.view, shapeTemplate);
		}
		this.view.diagramName=this.currentFileHandle.title;
		this.view.centerDocument();
	},


	fileSave: function()
	{
		var _this = this;
        var writer = new draw2d.io.json.Writer();
        writer.marshal(this.view, function (json, base64) {
            var data ={
                content:{
                    diagram:json,
                    jsonTemplate: _this.currentFileHandle.jsonTemplate
                }
            };
            new sankey.dialog.FileSave(_this.currentFileHandle).show(data, function() {
				_this.view.diagramName=_this.currentFileHandle.title;
				_this.updateWeights();
            });
		});
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
	},

	getTemplate: function()
	{
		return this.currentFileHandle.jsonTemplate;
	},

	setTemplate: function(json )
	{
		this.currentFileHandle.jsonTemplate = json;
        this.currentFileHandle.autosuggest = Object.keys(this.flatten(json));
        return this;
	},


	flatten:function (obj, path, result) {
		var key, val, _path;
		path = path || [];
		result = result || {};
		for (key in obj) {
			val = obj[key];
			_path = path.concat([key]);
			if (val instanceof Object) {
				this.flatten(val, _path, result);
			} else {
				result[_path.join('.')] = val;
			}
		}
		return result;
	}

});

;


sankey.PropertyWindow = Class.extend({
	
	init:function(elementId, view)
    {
	    this.selectedFigure = null;
        this.html = $("#"+elementId);
        this.view = view;
        this.pane = null;
        view.on("select", $.proxy(this.onSelectionChanged,this));
        
        // register as listener to update the property pane if anything has been changed in the model
        //
        view.getCommandStack().addEventListener($.proxy(function(event){
            if(event.isPostChangeEvent()){
                this.onSelectionChanged(this, {figure:this.selectedFigure});
            }
        },this));
	},
	
    /**
     * @method
     * Called if the selection in the canvas has been changed. You must register this
     * class on the canvas to receive this event.
     * 
     * @param {draw2d.Figure} figure
     */
    onSelectionChanged : function(emitter, event){
        var figure = event.figure;

        this.selectedFigure = figure;
        
        if(this.pane!==null){
            this.pane.onHide();
        }
        
        this.html.html("");
        this.pane = null;

        if(figure===null){
            return;
        }

        switch(figure.NAME)
        {
            case "sankey.shape.Start":
                this.pane = new sankey.property.PropertyPaneStart(figure);
                break;
            case "sankey.shape.State":
                this.pane = new sankey.property.PropertyPaneState(figure);
                break;
            case "sankey.shape.Connection":
                this.pane = new sankey.property.PropertyPaneConnection(figure);
                break;
            default:
                break;
        }
        
        if(this.pane!==null){
            this.pane.injectPropertyView(this.html);
        }
    },
    
    onResize: function()
    {
        if(this.pane!==null){
            this.pane.onResize();
        }
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

		this.openButton  = $("<button title='Open Report' class='ion-ios-download-outline icon'></button>");
		this.html.append(this.openButton);
		this.openButton.button().click($.proxy(function(){
			app.fileOpen();
		},this));

		this.saveButton  = $("<button title='Save Report' class='ion-ios-upload-outline icon'></button>");
		this.html.append(this.saveButton);
		this.saveButton.button().click($.proxy(function(){
			app.fileSave();
		},this));


		this.newButton  = $("<button title='New Report' class='ion-ios-plus-outline icon'></button>");
		this.html.append(this.newButton);
		this.newButton.button().click($.proxy(function(){
			app.fileNew();
		},this));

		this.delimiter  = $("<span class='toolbar_delimiter'>&nbsp;</span>");
		this.html.append(this.delimiter);

		// Register a Selection listener for the state handling
		// of the Delete Button
		//
        view.on("select", $.proxy(this.onSelectionChanged,this));
		
		// Inject the UNDO Button and the callbacks
		//
		this.undoButton  = $("<button class='ion-ios-undo-outline icon'></button>");
		this.html.append(this.undoButton);
		this.undoButton.button().click($.proxy(function(){
		       this.view.getCommandStack().undo();
		},this)).button( "option", "disabled", true );

		// Inject the REDO Button and the callback
		//
		this.redoButton  = $("<button class='ion-ios-redo-outline icon'></button>");
		this.html.append(this.redoButton);
		this.redoButton.button().click($.proxy(function(){
		    this.view.getCommandStack().redo();
		},this)).button( "option", "disabled", true );

		// Inject the DELETE Button
		//
		this.deleteButton  = $("<button class='ion-android-close icon'></button>");
		this.html.append(this.deleteButton);
		this.deleteButton.button().click($.proxy(function(){
			var node = this.view.getPrimarySelection();
			var command= new draw2d.command.CommandDelete(node);
			this.view.getCommandStack().execute(command);
		},this)).button( "option", "disabled", true );
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
		this.deleteButton.button( "option", "disabled", event.figure===null );
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
		this.undoButton.button( "option", "disabled", !event.getStack().canUndo() );
		this.redoButton.button( "option", "disabled", !event.getStack().canRedo() );
	}
});;
/*jshint sub:true*/
/*jshint evil:true */


sankey.View = draw2d.Canvas.extend({
	
	init:function(id, readOnly)
    {
        var _this = this;

        this.diagramName = "";

		this._super(id);


        this.setScrollArea("#"+id);

        // Override the default connection type. This is used during drag&drop operations of ports.
        this.installEditPolicy(  new draw2d.policy.connection.DragConnectionCreatePolicy({
            createConnection: function() {
                // return my special kind of connection
                var con =  new sankey.shape.Connection();
                return con;
            }
        }));


        // keep up to date if the backend changes something
        //
        socket.on("connection:change", $.proxy(this.updateWeights, this));


        // show the ports of the elements only if the mouse cursor is close to the shape.
        //
        if(readOnly){
            this.installEditPolicy(new draw2d.policy.canvas.ReadOnlySelectionPolicy());
        }
        else {
            this.installEditPolicy(new sankey.policy.EditPolicy());
            this.coronaFeedback = new draw2d.policy.canvas.CoronaDecorationPolicy({diameterToBeVisible: 50});
            this.installEditPolicy(this.coronaFeedback);
        }


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

    /**
     * @method
     * Called if the DragDrop object is moving around.<br>
     * <br>
     * Graphiti use the jQuery draggable/droppable lib. Please inspect
     * http://jqueryui.com/demos/droppable/ for further information.
     * 
     * @param {HTMLElement} droppedDomNode The dragged DOM element.
     * @param {Number} x the x coordinate of the drag
     * @param {Number} y the y coordinate of the drag
     * 
     * @template
     **/
    onDrag:function(droppedDomNode, x, y )
    {
    },
    
    /**
     * @method
     * Called if the user drop the droppedDomNode onto the canvas.<br>
     * <br>
     * Draw2D use the jQuery draggable/droppable lib. Please inspect
     * http://jqueryui.com/demos/droppable/ for further information.
     * 
     * @param {HTMLElement} droppedDomNode The dropped DOM element.
     * @param {Number} x the x coordinate of the drop
     * @param {Number} y the y coordinate of the drop
     * @param {Boolean} shiftKey true if the shift key has been pressed during this event
     * @param {Boolean} ctrlKey true if the ctrl key has been pressed during the event
     * @private
     **/
    onDrop : function(droppedDomNode, x, y, shiftKey, ctrlKey)
    {
        var type = $(droppedDomNode).data("shape");

        var figure = eval("new "+type+"();");
        // create a command for the undo/redo support
        var command = new draw2d.command.CommandAdd(this, figure, x, y);
        this.getCommandStack().execute(command);
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

sankey.anchor.ConnectionAnchor = draw2d.layout.anchor.ConnectionAnchor.extend({

	NAME : "sankey.anchor.ConnectionAnchor",

	/**
	 * @constructor
	 * 
	 * @param {draw2d.Figure} [owner] the figure to use for the anchor calculation
	 */
	init: function(owner)
    {
		this._super(owner);
	},

	/**
	 * @method
	 * 
	 * Returns the location where the Connection should be anchored in
	 * absolute coordinates. The anchor may use the given reference
	 * Point to calculate this location.
	 * 
	 * @param {draw2d.geo.Point} ref The reference Point in absolute coordinates
     * @param {draw2d.Connection} [inquiringConnection] the connection who ask for the location.
     * 
	 * @return {draw2d.geo.Point} The anchor's location
	 */
	getLocation: function(ref, inquiringConnection)
    {
		var port  =  this.getOwner();
		var r     =  port.getParent().getBoundingBox();
		var conns =  port.getConnections().asArray();
		var height= r.getHeight() / conns.length;
        var indexName = "__"+port.NAME;

		var connsOrder = conns.map(function(conn){return {
			id:conn.id,
			y: conn.getSource()===port?conn.getTarget().getAbsoluteY():conn.getSource().getAbsoluteY()
		};});

		// we need stable sort order even if the difference of the "y" is zero
		// In this case we sort the connections by ID
		connsOrder.sort(function(a,b){
			var diff = a.y-b.y;
			if(diff===0){
				return a.id>b.id;
			}
			return diff;
		});

		inquiringConnection[indexName] = connsOrder.findIndex(function(conn){return conn.id===inquiringConnection.id;});


		// for a redraw of the other connections if any index calculated before has
		// changed with the new settings
		conns.forEach(function(connectionToCheck,index){
			var newIndex = connsOrder.findIndex(function(conn){return conn.id===connectionToCheck.id;});
			if(connectionToCheck[indexName]!==newIndex){
				connectionToCheck.routingRequired=true;
				if(connectionToCheck.getCanvas()!==null)
					connectionToCheck.repaint();
			}
		});
		var point = port.getAbsolutePosition();
		point.y = r.y+(height*inquiringConnection[indexName])+(height/2);
		return point;
	},

	/**
	 * Returns the bounds of this Anchor's owner. Subclasses can
	 * override this method to adjust the box. Maybe you return the box
	 * of the port parent (the parent figure)
	 * 
	 * @return {draw2d.geo.Rectangle} The bounds of this Anchor's owner
	 */
	getBox: function()
    {
		return this.getOwner().getParent().getBoundingBox();
	},

	/**
	 * @method
	 * 
	 * Returns the bounds of this Anchor's owner. Subclasses can
	 * override this method to adjust the box. Maybe you return the box
	 * of the port parent (the parent figure)
	 * 
	 * @param {draw2d.Connection} [inquiringConnection] the connection who ask for the location.
	 *
	 * @return {draw2d.geo.Point} The bounds of this Anchor's owner
	 */
	getReferencePoint: function(inquiringConnection)
    {
		return this.getBox().getCenter();
	}
});
;
var colors = [
    {
        "50": "#fde0dc",
        "100": "#f9bdbb",
        "200": "#f69988",
        "300": "#f36c60",
        "400": "#e84e40",
        "500": "#e51c23",
        "600": "#dd191d",
        "700": "#d01716",
        "800": "#c41411",
        "900": "#b0120a",
        "a100": "#ff7997",
        "a200": "#ff5177",
        "a400": "#ff2d6f",
        "a700": "#e00032"
    },
    {
        "50": "#fce4ec",
        "100": "#f8bbd0",
        "200": "#f48fb1",
        "300": "#f06292",
        "400": "#ec407a",
        "500": "#e91e63",
        "600": "#d81b60",
        "700": "#c2185b",
        "800": "#ad1457",
        "900": "#880e4f",
        "a100": "#ff80ab",
        "a200": "#ff4081",
        "a400": "#f50057",
        "a700": "#c51162"
    },
    {
        "50": "#f3e5f5",
        "100": "#e1bee7",
        "200": "#ce93d8",
        "300": "#ba68c8",
        "400": "#ab47bc",
        "500": "#9c27b0",
        "600": "#8e24aa",
        "700": "#7b1fa2",
        "800": "#6a1b9a",
        "900": "#4a148c",
        "a100": "#ea80fc",
        "a200": "#e040fb",
        "a400": "#d500f9",
        "a700": "#aa00ff"
    },
     {
        "50": "#ede7f6",
        "100": "#d1c4e9",
        "200": "#b39ddb",
        "300": "#9575cd",
        "400": "#7e57c2",
        "500": "#673ab7",
        "600": "#5e35b1",
        "700": "#512da8",
        "800": "#4527a0",
        "900": "#311b92",
        "a100": "#b388ff",
        "a200": "#7c4dff",
        "a400": "#651fff",
        "a700": "#6200ea"
    },
     {
        "50": "#e8eaf6",
        "100": "#c5cae9",
        "200": "#9fa8da",
        "300": "#7986cb",
        "400": "#5c6bc0",
        "500": "#3f51b5",
        "600": "#3949ab",
        "700": "#303f9f",
        "800": "#283593",
        "900": "#1a237e",
        "a100": "#8c9eff",
        "a200": "#536dfe",
        "a400": "#3d5afe",
        "a700": "#304ffe"
    },
     {
        "50": "#e7e9fd",
        "100": "#d0d9ff",
        "200": "#afbfff",
        "300": "#91a7ff",
        "400": "#738ffe",
        "500": "#5677fc",
        "600": "#4e6cef",
        "700": "#455ede",
        "800": "#3b50ce",
        "900": "#2a36b1",
        "a100": "#a6baff",
        "a200": "#6889ff",
        "a400": "#4d73ff",
        "a700": "#4d69ff"
    },
     {
        "50": "#e1f5fe",
        "100": "#b3e5fc",
        "200": "#81d4fa",
        "300": "#4fc3f7",
        "400": "#29b6f6",
        "500": "#03a9f4",
        "600": "#039be5",
        "700": "#0288d1",
        "800": "#0277bd",
        "900": "#01579b",
        "a100": "#80d8ff",
        "a200": "#40c4ff",
        "a400": "#00b0ff",
        "a700": "#0091ea"
    },
    {
        "50": "#e0f7fa",
        "100": "#b2ebf2",
        "200": "#80deea",
        "300": "#4dd0e1",
        "400": "#26c6da",
        "500": "#00bcd4",
        "600": "#00acc1",
        "700": "#0097a7",
        "800": "#00838f",
        "900": "#006064",
        "a100": "#84ffff",
        "a200": "#18ffff",
        "a400": "#00e5ff",
        "a700": "#00b8d4"
    },
     {
        "50": "#e0f2f1",
        "100": "#b2dfdb",
        "200": "#80cbc4",
        "300": "#4db6ac",
        "400": "#26a69a",
        "500": "#009688",
        "600": "#00897b",
        "700": "#00796b",
        "800": "#00695c",
        "900": "#004d40",
        "a100": "#a7ffeb",
        "a200": "#64ffda",
        "a400": "#1de9b6",
        "a700": "#00bfa5"
    },
    {
        "50": "#d0f8ce",
        "100": "#a3e9a4",
        "200": "#72d572",
        "300": "#42bd41",
        "400": "#2baf2b",
        "500": "#259b24",
        "600": "#0a8f08",
        "700": "#0a7e07",
        "800": "#056f00",
        "900": "#0d5302",
        "a100": "#a2f78d",
        "a200": "#5af158",
        "a400": "#14e715",
        "a700": "#12c700"
    },
    {
        "50": "#f1f8e9",
        "100": "#dcedc8",
        "200": "#c5e1a5",
        "300": "#aed581",
        "400": "#9ccc65",
        "500": "#8bc34a",
        "600": "#7cb342",
        "700": "#689f38",
        "800": "#558b2f",
        "900": "#33691e",
        "a100": "#ccff90",
        "a200": "#b2ff59",
        "a400": "#76ff03",
        "a700": "#64dd17"
    },
    {
        "50": "#f9fbe7",
        "100": "#f0f4c3",
        "200": "#e6ee9c",
        "300": "#dce775",
        "400": "#d4e157",
        "500": "#cddc39",
        "600": "#c0ca33",
        "700": "#afb42b",
        "800": "#9e9d24",
        "900": "#827717",
        "a100": "#f4ff81",
        "a200": "#eeff41",
        "a400": "#c6ff00",
        "a700": "#aeea00"
    },
    {
        "50": "#fffde7",
        "100": "#fff9c4",
        "200": "#fff59d",
        "300": "#fff176",
        "400": "#ffee58",
        "500": "#ffeb3b",
        "600": "#fdd835",
        "700": "#fbc02d",
        "800": "#f9a825",
        "900": "#f57f17",
        "a100": "#ffff8d",
        "a200": "#ffff00",
        "a400": "#ffea00",
        "a700": "#ffd600"
    },
   {
        "50": "#fff8e1",
        "100": "#ffecb3",
        "200": "#ffe082",
        "300": "#ffd54f",
        "400": "#ffca28",
        "500": "#ffc107",
        "600": "#ffb300",
        "700": "#ffa000",
        "800": "#ff8f00",
        "900": "#ff6f00",
        "a100": "#ffe57f",
        "a200": "#ffd740",
        "a400": "#ffc400",
        "a700": "#ffab00"
    },
   {
        "50": "#fff3e0",
        "100": "#ffe0b2",
        "200": "#ffcc80",
        "300": "#ffb74d",
        "400": "#ffa726",
        "500": "#ff9800",
        "600": "#fb8c00",
        "700": "#f57c00",
        "800": "#ef6c00",
        "900": "#e65100",
        "a100": "#ffd180",
        "a200": "#ffab40",
        "a400": "#ff9100",
        "a700": "#ff6d00"
    },
   {
        "50": "#fbe9e7",
        "100": "#ffccbc",
        "200": "#ffab91",
        "300": "#ff8a65",
        "400": "#ff7043",
        "500": "#ff5722",
        "600": "#f4511e",
        "700": "#e64a19",
        "800": "#d84315",
        "900": "#bf360c",
        "a100": "#ff9e80",
        "a200": "#ff6e40",
        "a400": "#ff3d00",
        "a700": "#dd2c00"
    },
   {
        "50": "#efebe9",
        "100": "#d7ccc8",
        "200": "#bcaaa4",
        "300": "#a1887f",
        "400": "#8d6e63",
        "500": "#795548",
        "600": "#6d4c41",
        "700": "#5d4037",
        "800": "#4e342e",
        "900": "#3e2723"
    },
    {
        "50": "#fafafa",
        "100": "#f5f5f5",
        "200": "#eeeeee",
        "300": "#e0e0e0",
        "400": "#bdbdbd",
        "500": "#9e9e9e",
        "600": "#757575",
        "700": "#616161",
        "800": "#424242",
        "900": "#212121",
        "1000": "#ffffff"
    },
    {
        "50": "#eceff1",
        "100": "#cfd8dc",
        "200": "#b0bec5",
        "300": "#90a4ae",
        "400": "#78909c",
        "500": "#607d8b",
        "600": "#546e7a",
        "700": "#455a64",
        "800": "#37474f",
        "900": "#263238"
    }
];;
sankey.dialog.FileOpen = Class.extend({

    /**
     * @constructor
     *
     */
    init:function(fileHandle)
    {
        this.currentFileHandle=fileHandle;
    },

    /**
     * @method
     *
     * Open the file picker and load the selected file.<br>
     *
     * @param {Function} successCallback callback method if the user select a file and the content is loaded
     * @param {Function} errorCallback method to call if any error happens
     *
     * @since 4.0.0
     */
    show: function(successCallback)
    {
        $('#githubFileSelectDialog').modal('show');

        this.fetchPathContent( successCallback);
    },

    fetchPathContent: function( successCallback )
    {
        var _this = this;

        $.ajax({
                url:conf.backend.file.list ,
                xhrFields: {
                    withCredentials: true
                },
                success:function(response) {
                    var files = response.files;
                    // sort the result
                    // Directories are always on top
                    //
                    files.sort(function (a, b) {
                        if (a.type === b.type) {
                            if (a.id.toLowerCase() < b.id.toLowerCase())
                                return -1;
                            if (a.id.toLowerCase() > b.id.toLowerCase())
                                return 1;
                            return 0;
                        }
                        return 1;
                    });

                    var compiled = Hogan.compile(
                        '         {{#files}}' +
                        '           <a href="#" data-draw2d="{{draw2d}}" class="list-group-item githubPath text-nowrap" data-id="{{id}}">' +
                        '              <span class="fa fa-file-o"></span>' +
                        '              {{{id}}}' +
                        '           </a>' +
                        '         {{/files}}'
                    );
                    var output = compiled.render({
                        files: files,
                        draw2d: function () {
                            return this.id.endsWith(conf.fileSuffix);
                        }
                    });

                    $("#githubFileSelectDialog .githubNavigation").html($(output));
                    $("#githubFileSelectDialog .githubNavigation").scrollTop(0);


                    $('.githubPath[data-draw2d="true"]').off("click").on("click", function () {
                        var id   = $(this).data("id");
                        $.ajax({
                                url: conf.backend.file.get,
                                method: "POST",
                                xhrFields: {
                                    withCredentials: true
                                },
                                data:{
                                    id:id
                                }
                            }
                        ).done(function(content){
                                _this.currentFileHandle.title=id;

                                successCallback(content);
                                $('#githubFileSelectDialog').modal('hide');
                            }
                        );

                    });
                }
        });
    }
});;
sankey.dialog.FileSave = Class.extend({

    /**
     * @constructor
     *
     */
    init:function(fileHandler){
        this.currentFileHandle = fileHandler;
    },

    /**
     * @method
     *
     * Open the file picker and load the selected file.<br>
     *
     * @param {Function} successCallback callback method if the user select a file and the content is loaded
     * @param {Function} errorCallback method to call if any error happens
     *
     * @since 4.0.0
     */
    show: function(json, successCallback)
    {
        var _this = this;

        $("#githubSaveFileDialog .githubFileName").val(_this.currentFileHandle.title);

        $('#githubSaveFileDialog').on('shown.bs.modal', function () {
            $(this).find('input:first').focus();
        });
        $("#githubSaveFileDialog").modal("show");

        // Button: Commit to GitHub
        //
        $("#githubSaveFileDialog .okButton").off("click").on("click", function () {
            var data ={
                id:$("#githubSaveFileDialog .githubFileName").val(),
                content:JSON.stringify(json, undefined, 2)
            };

            $.ajax({
                    url: conf.backend.file.save,
                    method: "POST",
                    xhrFields: {
                        withCredentials: true
                    },
                    data:data
                }
            ).done(function(){
                    $('#githubSaveFileDialog').modal('hide');
                    _this.currentFileHandle.title=data.id;
                    successCallback();
            });
        });

    }

});;
sankey.dialog.JSONTemplate = Class.extend({

    /**
     * @constructor
     *
     */
    init: function (fileHandler) {
        this.currentFileHandle = fileHandler;
    },

    show: function()
    {
        $('#jsonTemplateDialog').off('shown.bs.modal').on('shown.bs.modal', function () {
            var editor = ace.edit("templateEditor");
            editor.setValue(JSON.stringify(app.getTemplate(),undefined,2));
            editor.setTheme("ace/theme/chrome");
            editor.getSession().setMode("ace/mode/json");
            $("#jsonTemplateDialog .okButton").off("click").on("click", function () {
                var code = JSON.parse(editor.getValue());
                app.setTemplate(code);
                $('#jsonTemplateDialog').modal('hide');
            });
        });

        $("#jsonTemplateDialog").modal("show");
    }


});;

/**

 * @author Andreas Herz
 * @extend draw2d.layout.locator.Locator
 */
sankey.locator.SmartConnectionLocator= draw2d.layout.locator.ConnectionLocator.extend({
    NAME : "sankey.locator.SmartConnectionLocator",
    
    /**
     * @constructor
     * Constructs a locator with associated parent.
     * 
     */
    init: function( )
    {
        this._super();

        // description see "bind" method
        this.boundedCorners={
            percentage: 0,
            xOffset: 0,
            yOffset: 0
        };
    },

    bind: function(parent, child)
    {
        var _this = this;
        // determine the best corner of the parent/child node and stick to the calculated corner
        // In the example below it is R1.2 in combination with R2.0
        //
        //     Start
        //     +---------
        //              |
        //              |_______________________+ End
        //
        //              0             1
        //               +-----------+
        //               |           |
        //               |    R2     |
        //               +-----------+
        //              3             2
        //
        var calcBoundingCorner=function() {

            _this.boundedCorners={
                percentage: 0,
                xOffset: 0,
                yOffset: 0
            };

            var line = child.getParent();
            var center  = child.getBoundingBox().getCenter();
            var pos= child.getPosition();
            var projection = line.pointProjection(center);
            if(projection===null){
                var p1= line.getStartPosition();
                var p2= line.getEndPosition();
                var d1= center.distance(p1);
                var d2= center.distance(p1);
                projection=d1<d2?p1:p2;
            }
            else{
                _this.boundedCorners.percentage = projection.percentage;
            }
            _this.boundedCorners.xOffset = projection.x - pos.x;
            _this.boundedCorners.yOffset = projection.y - pos.y;
        };

        // override the parent implementation to avoid
        // that the child is "!selectable" and "!draggable"

        // Don't redirect the selection handling to the parent
        // Using the DraggableLocator provides the ability to the children
        // that they are selectable and draggable. Remove the SelectionAdapter from the parent
        // assignment.
        child.setSelectionAdapter( function(){
            return child;
        });

        child.on("dragend",calcBoundingCorner);
    },

    unbind: function(parent, child)
    {
        // use default
        child.setSelectionAdapter(null);
    },


    /**
     * @method
     * Controls the location of an I{@link draw2d.Figure}
     *
     * @param {Number} index child index of the figure
     * @param {draw2d.Figure} figure the figure to control
     *
     * @template
     **/
    relocate: function(index, figure)
    {
        this._super(index, figure);

        var line = figure.getParent();

        if(line===null){
            return;
        }
        if (figure.canvas === null) {
            return;
        }
        var point = line.lerp(this.boundedCorners.percentage);
        // restore the initial distance from the corner by adding the new offset
        // to the position of the child
        if(point) {
            figure.setPosition(point.x - this.boundedCorners.xOffset, point.y - this.boundedCorners.yOffset);
        }
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
});;
if(typeof String.prototype.endsWith ==="undefined") {
    String.prototype.endsWith = function (suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}
;


sankey.property.PropertyPane = Class.extend({

    init:function(figure)
    {
        this.figure = figure;
    },


    injectPropertyView: function( domId)
    {
        var _this = this;

        $("#transitions select").each( function(index, val){
            var $val = $(val);
            $val.find("option[value='"+$val.attr("value")+"']").attr("selected","selected");
        });

        $("#transitions input").on("keyup",function(){
            var $this= $(this);
            $this.attr("value",$this.val());
            _this.figure.setUserData(_this.getJSON());
        });
        $("#transitions select").on("change",function(){
            var $this= $(this);
            $this.attr("value",$this.find(":selected").val());
            _this.figure.setUserData(_this.getJSON());
        });

        $('.typeahead_path').autocomplete({
            lookup: function(query, doneCallback){
                _this.suggestPath(query, function(result){
                    doneCallback({suggestions:result});
                });
            },
            noCache:true,
            orientation:"top",
            onSelect: function (suggestion) {
                var $this= $(this);
                $this.attr("value",suggestion.value);
                _this.figure.setUserData(_this.getJSON());
            }
        });

        $('.typeahead_value').autocomplete({
            lookup: function(query, doneCallback){
                var active= $(document.activeElement);
                var path=active.closest("tr").find("td:first-child input");
                _this.suggestValue(path.val(), query, function(result){
                    doneCallback({suggestions:result});
                });
            },
            noCache:true,
            orientation:"top",
            onSelect: function (suggestion) {
                var $this= $(this);
                $this.attr("value",suggestion.value);
                _this.figure.setUserData(_this.getJSON());
            }
        });
    },


    /**
     * @method
     * called by the framework if the pane has been resized. This is a good moment to adjust the layout if
     * required.
     *
     */
    onResize: function()
    {
    },


    /**
     * @method
     * called by the framework before the pane will be removed from the DOM tree
     *
     */
    onHide: function()
    {
    },

    getJSON: function()
    {
        var table =$('#transitions')[0];
        var headers= [];
        var data = []; // first row needs to be headers var headers = [];
        for (var i=0; i<table.rows[0].cells.length; i++) {
            headers[i] = $(table.rows[0].cells[i]).data("path");
        }
        // go through cells
        for ( i=1; i<table.rows.length; i++) {
            var tableRow = table.rows[i]; var rowData = {};
            for (var j=0; j<tableRow.cells.length; j++) {
                rowData[ headers[j] ] = $(tableRow.cells[j].innerHTML).attr("value");
            } data.push(rowData);
        }
        // strip empty entries;
        data = data.filter(function(e){return e.jsonPath!=="";});
        data = data.filter(function(e){return e.jsonPath;});
        return {transitions:data};
    },


    suggestPath:function(query, callback)
    {
        $.ajax({
            url: conf.backend.suggestPath,
            method: "POST",
            data: {query:query},
            success:function(response){
                callback(response);
            }
        });
    },

    suggestValue:function(path,query,callback)
    {
        $.ajax({
            url: conf.backend.suggestValue,
            method: "POST",
            data: {query:query, path:path},
            success:function(response){
                callback(response);
            }
        });
    }
});

;

sankey.property.PropertyPaneConnection = sankey.property.PropertyPane.extend({
	
	init:function(figure)
	{
	    this._super(figure);
	},


	injectPropertyView: function( domId)
	{
		var compile = Hogan.compile($("#template_connection").text());

		var dom = compile.render(this.figure.getUserData());
		domId.append(dom);

		this._super(domId);
    }
});

;


sankey.property.PropertyPaneStart = sankey.property.PropertyPane.extend({

	init:function(figure)
	{
		this._super(figure);
	},

	injectPropertyView: function( domId)
	{
	    var compile = Hogan.compile($("#template_startNode").text());

		var dom = compile.render(this.figure.getUserData());
	    domId.append(dom);

		this._super(domId);
	}
});

;


sankey.property.PropertyPaneState  = sankey.property.PropertyPane.extend({

	init:function(figure)
	{
		this._super(figure);
	},


	injectPropertyView: function( domId)
	{
		var view = $(
			"<div class='control-group'>"+
			"   <label class='control-label'>State Node </label>"+
			"</div>"
		);

		domId.append(view);

		this._super(domId);
	}
});

;
/*jshint evil:true */


//var DEFAULT_ROUTER= new draw2d.layout.connection.DirectRouter();
//var DEFAULT_ROUTER= new draw2d.layout.connection.FanConnectionRouter();
//var DEFAULT_ROUTER= new draw2d.layout.connection.InteractiveManhattanConnectionRouter();
var DEFAULT_ROUTER= new draw2d.layout.connection.SplineConnectionRouter();

sankey.shape.Connection = draw2d.Connection.extend({
    NAME : "sankey.shape.Connection",

    init:function(attr, setter, getter)
    {
        this.label = new draw2d.shape.basic.Label({
            text:"-",
            bgColor:"#e91e63",
            fontColor:"#FFFFFF",
            radius:8
        });

        this._super(attr, setter, getter);

        this.add(this.label, new draw2d.layout.locator.ManhattanMidpointLocator());

        this.attr({
            router: DEFAULT_ROUTER,
            stroke:5,
            userData: {
                jsonPath:""
            }
        });
        this.setTargetDecorator(new draw2d.decoration.connection.ArrowDecorator());
    },

    setWeight:function(weight)
    {
        this.label.setText(""+weight);
    },

    getWeight:function()
    {
        return parseInt(this.label.getText());
    },

    setUserData:function( obj)
    {
        this._super(obj);
        var transitions =$.extend({},{transitions:[]},obj).transitions;
        if(transitions.length===0){
            this.setDashArray("-");
        }
        else{
            this.setDashArray("");
        }
    },


    repaint:function(attr)
    {
        this._super($.extend({},attr,{"stroke-linecap":"butt"}));
    },


    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            labelJSON.boundedCorners= e.locator.boundedCorners;
            memento.labels.push(labelJSON);
        });

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento) {
        delete memento.router;

        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //

        $.each(memento.labels, $.proxy(function (i, json) {
            // create the figure stored in the JSON
            var figure = eval("new " + json.type + "()");


            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator = eval("new " + json.locator + "()");

            // add the new figure as child to this figure
            this.add(figure, locator);

            if( locator.boundedCorners){
                $.extend(locator.boundedCorners, json.boundedCorners);
            }

            // the first label in the JSON is the Label with the weight text
            //
            if(i===0) {
                this.label = figure;
            }
        }, this));

        // just to update the dash/full line style. The line is drawn dotted if the user
        // didn't entered any constraints.
        //
        this.setUserData(this.userData);
    }
});


;
/*jshint evil:true */


sankey.shape.End = draw2d.shape.node.End.extend({
    NAME:"sankey.shape.End",

    init:function()
    {
        var _this = this;
        this.label = this.label = new draw2d.shape.basic.Label({
            text:"End",
            angle:270,
            fontColor:"#FFFFFF",
            fontSize:18,
            stroke:0,
            editor: new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
            }})
        });
        this._super();

        this.add( this.label, new draw2d.layout.locator.CenterLocator());
        this.attr({
            radius:10,
            bgColor:"#f50057"
        });
        this.getInputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());
    },

    getMinWidth: function()
    {
        return this.label.getHeight();
    },

    getMinHeight: function()
    {
        return this.label.getWidth();
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        delete memento.ports;

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        var _this = this;

        delete memento.ports;

        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //

        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");


            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);

            // the first label in the JSON is the Label in the center of the shape
            //
            if(i===0){
                this.label = figure;
                this.label.installEditor(new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                    _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
                }}));
            }
        },this));
    }
});
;
sankey.shape.Label = draw2d.shape.basic.Label.extend({
    NAME: "sankey.shape.Label",

    init: function (attr, setter, getter)
    {
        this._super(attr, setter, getter);
    }
});;
/*jshint evil:true */


/**
 * The markerFigure is the left hand side annotation for a DecoratedPort.
 *
 * It contains two children
 *
 * StateAFigure: if the mouse hover and the figure isn't permanent visible
 * StateBFigure: either the mouse is over or the user pressed the checkbox to stick the figure on the port
 *
 * This kind of decoration is usefull for defualt values on workflwos enginges or circuit diagrams
 *
 */
sankey.shape.Raft = draw2d.shape.composite.Raft.extend({

    NAME : "sankey.shape.Raft",

    init : function(attr, setter, getter)
    {
        this._super(attr, setter, getter);
    },

    calculate: function()
    {

    },

    onStart:function()
    {

    },

    onStop:function()
    {

    },

    toBack:function(figure)
    {
        if(this.canvas.getFigures().getSize()===1){
            return ; // silently
        }

        // unfortunately the shape goes behind the "canvas decoration" which could be the grid or dots.
        // this is sad and unwanted. In this case we select the first figure in th canvas and set the Raft behind of them
        // instead of "behind of ALL shapes"
        var first = this.canvas.getFigures().first();
        this._super(first);
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //
        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");

            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);
        },this));
    }

});
;
/*jshint evil:true */


sankey.shape.Start = draw2d.shape.node.Start.extend({
    NAME:"sankey.shape.Start",

    init:function()
    {
        var _this = this;
        this.label = this.label = new draw2d.shape.basic.Label({
            text:"Start",
            angle:270,
            fontColor:"#FFFFFF",
            fontSize:18,
            stroke:0,
            editor: new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
            }})
        });
        this._super();
        this.add( this.label, new draw2d.layout.locator.CenterLocator());

        this.attr({
            radius:10
        });
        this.getOutputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());
    },

    getMinWidth: function()
    {
        return this.label.getHeight();
    },

    getMinHeight: function()
    {
        return this.label.getWidth();
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        delete memento.ports;

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        var _this = this;

        delete memento.ports;

        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //
        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");

            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);

            // the first label in the JSON is the Label in the center of the shape
            //
            if(i===0){
                this.label = figure;
                this.label.installEditor(new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                    _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
                }}));
            }
        },this));
    }
});;
/*jshint evil:true */

sankey.shape.State = draw2d.shape.node.Between.extend({
    NAME:"sankey.shape.State",

    init:function()
    {
        this._super();
        this.getOutputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());
        this.getInputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());

        this.createPort("input", new draw2d.layout.locator.TopLocator());
        this.createPort("input", new draw2d.layout.locator.BottomLocator());
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        delete memento.ports;

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        delete memento.ports;
        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //
        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");

            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);
        },this));
    }
});