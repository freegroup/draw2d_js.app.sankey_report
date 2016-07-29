
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

