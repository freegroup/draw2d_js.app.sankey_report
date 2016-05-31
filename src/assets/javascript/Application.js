var conf= {
	fileSuffix: ".sankey",

	backend: {
		file: {
			list: "backend/file/list",
			get : "backend/file/get",
			save: "backend/file/save"
		},
		hook:"backend/hook",
		weights:"backend/sankey/weights"
	}
};

var sankey ={
	shape:{
	},
	property:{
	},
	dialog:{
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
    init : function(socket)
    {
		var _this = this;

		socket.on("connection:change", function(weights){
			weights.forEach(function(weight){
				var conn = _this.view.getLine(weight.conn);
				if(conn!==null){
					conn.setText(weight.value);
				}
			});
		});


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


        this.view    = new sankey.View("canvas");
		this.toolbar = new sankey.Toolbar("toolbar",  this.view );
		this.propertyView = new sankey.PropertyWindow("property",  this.view );


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
				paneSelector: "#property",
				onresize:$.proxy(function(){
					//this.propertyPane.onResize();
				},this)
			},
			center: {
				resizable:true,
				closable:false,
				spacing_open:5,
				spacing_closed:5,
				paneSelector: "#canvas"
			}
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
			title: "Untitled"+conf.fileSuffix
		};
		this.view.clear();
		if(shapeTemplate){
			var reader = new draw2d.io.json.Reader();
			reader.unmarshal(this.view, shapeTemplate);
		}
	},


	fileSave: function()
	{
		new sankey.dialog.FileSave(this.currentFileHandle).show(this.view);
	},


	fileOpen: function()
	{
		new sankey.dialog.FileOpen(this.currentFileHandle).show(
			// success callback
			$.proxy(function(fileData){
				try{
					this.view.clear();
					var reader = new draw2d.io.json.Reader();
					reader.unmarshal(this.view, fileData);
					this.view.getCommandStack().markSaveLocation();

				}
				catch(e){
					console.log(e);
					this.view.clear();
				}
			},this));
	}
});

