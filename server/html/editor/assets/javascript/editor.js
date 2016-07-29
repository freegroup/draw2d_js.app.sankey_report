
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
		var _this =  this;
		this.localStorage = [];
		try {
			if( 'localStorage' in window && window.localStorage !== null){
				this.localStorage = localStorage;
			}
		} catch(e) {

		}

		this.currentFileHandle= {
			title: "Untitled"+conf.fileSuffix
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
				size:120,
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
				size:120,
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

		var diagram = this.getParam("diagram");
		if(diagram){
			this.fileOpen(diagram);
		}
		this.view.centerDocument();
	},

	fileNew: function(shapeTemplate)
	{
		this.currentFileHandle = {
			title: "Untitled"+conf.fileSuffix
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


	fileOpen: function(name)
	{
        var _this = this;
        var _open = function(fileName){
                $.ajax({
                        url: conf.backend.file.get,
                        method: "POST",
                        xhrFields: {
                            withCredentials: true
                        },
                        data:{
                            id:fileName
                        }
                    }
                ).done(function(response){
                        try{
                            _this.view.clear();
                            var reader = new draw2d.io.json.Reader();
                            reader.unmarshal(_this.view, response.content.diagram);
                            _this.view.getCommandStack().markSaveLocation();
                            _this.view.centerDocument();
                            _this.updateWeights();
                            window.location.hash = "diagram="+fileName;
                            _this.currentFileHandle.title=fileName;
                        }
                        catch(e){
                            console.log(e);
                            _this.view.clear();
                        }
                    }
                );

            };

        if(name){
            _open(name);
        }
        else {
            new sankey.dialog.FileSelect().show(_open);
        }
	},

	fileShare:function()
	{
		new sankey.dialog.FileShare(this.currentFileHandle).show();
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


	flatten:function (obj, path, result)
    {
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


		this.overviewButton  = $("<button title='Back To Overview' class='ion-grid icon'></button>");
		this.html.append(this.overviewButton);
		this.overviewButton.button().click($.proxy(function(){
			window.location.href="../dashboard";
		},this));



		this.saveButton  = $("<button title='Save Report' class='ion-ios-upload-outline icon'></button>");
		this.html.append(this.saveButton);
		this.saveButton.button().click($.proxy(function(){
			app.fileSave();
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
		},this)).prop( "disabled", true );

		// Inject the REDO Button and the callback
		//
		this.redoButton  = $("<button class='ion-ios-redo-outline icon'></button>");
		this.html.append(this.redoButton);
		this.redoButton.button().click($.proxy(function(){
		    this.view.getCommandStack().redo();
		},this)).prop("disabled", true );

		// Inject the DELETE Button
		//
		this.deleteButton  = $("<button class='ion-android-close icon'></button>");
		this.html.append(this.deleteButton);
		this.deleteButton.button().click($.proxy(function(){
			var node = this.view.getPrimarySelection();
			var command= new draw2d.command.CommandDelete(node);
			this.view.getCommandStack().execute(command);
		},this)).prop( "disabled", true );


		// Inject the DELETE Button
		//
		this.shareButton  = $("<button class='ion-android-share-alt icon'></button>");
		this.html.append(this.shareButton);
		this.shareButton.button().click($.proxy(function(){
			app.fileShare();
		},this));


		this.viewButton  = $("<button class='ion-android-open icon'></button>");
		this.html.append(this.viewButton);
		this.viewButton.button().click($.proxy(function(){
			window.open(getAbsoluteUrl("../viewer#diagram="+app.currentFileHandle.title));
		},this));



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
		this.deleteButton.prop("disabled", event.figure===null );
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
		this.undoButton.prop("disabled", !event.getStack().canUndo() );
		this.redoButton.prop("disabled", !event.getStack().canRedo() );
	}
});;
/*jshint sub:true*/
/*jshint evil:true */


sankey.View = draw2d.Canvas.extend({
	
	init:function(id)
    {
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
        this.installEditPolicy(new sankey.policy.EditPolicy());
        this.coronaFeedback = new draw2d.policy.canvas.CoronaDecorationPolicy({diameterToBeVisible: 50});
        this.installEditPolicy(this.coronaFeedback);
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
    }
});

;
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
            new draw2d.io.png.Writer().marshal(app.view, function (imageDataUrl){
                var data ={
                    base64Image:imageDataUrl,
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
            }, app.view.getBoundingBox().scale(10, 10));
         });

    }

});;
sankey.dialog.FileSelect = Class.extend({

    /**
     * @constructor
     *
     */
    init:function()
    {
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
                        $('#githubFileSelectDialog').modal('hide');
                        successCallback(id);
                    });
                }
        });
    }
});;
sankey.dialog.FileShare = Class.extend({

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
    show: function()
    {
        var html = $('#fileShareDialog')[0].outerHTML;

        var compiled = Hogan.compile(html);
        var output = $(compiled.render({
            name: this.currentFileHandle.title,
            url: getAbsoluteUrl("../viewer#diagram="+this.currentFileHandle.title)
        }));

        $("body").append(output);
        output.modal('show');

        var clipboard = new Clipboard('.shareButton.clipboard');
        clipboard.on('success', function(e) {
            output.find("#copiedToClipboardMessage").text("Link copied to Clipboard");
        });

        output.on('hidden.bs.modal', function () {
          output.remove();
          clipboard.destroy();
        });
    }
});;
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

