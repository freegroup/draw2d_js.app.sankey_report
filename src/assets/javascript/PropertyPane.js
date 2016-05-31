

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

