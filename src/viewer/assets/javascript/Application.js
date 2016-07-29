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

