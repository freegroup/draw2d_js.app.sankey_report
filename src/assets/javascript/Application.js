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
					this.updateWeights();
					this.view.centerDocument();
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

    getAutosuggestSource:function()
    {
        return this.currentFileHandle.autosuggest;
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

