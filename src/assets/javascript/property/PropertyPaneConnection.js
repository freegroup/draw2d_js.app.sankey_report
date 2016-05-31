
sankey.property.PropertyPaneConnection = Class.extend({
	
	init:function(figure)
	{
	    this.figure = figure;
	},


	injectPropertyView: function( domId)
	{
		var userData = this.figure.getUserData();
		var view = "<form class='form-horizontal'>"+
			"<div class='control-group'>"+
			"   <label class='control-label' for='jsonPath'>JSON Path</label>"+
			"   <div class='controls'>"+
			"      <input id='jsonPath' class='input-xlarge' type='text' value='{{jsonPath}}'/>"+
			"  </div>"+
			"</div>"+
			"</form>";
		var compiled = Hogan.compile(view);
		view   = $(compiled.render({jsonPath:userData.jsonPath}));
		view.submit(function(e){
			return false;
		});

		domId.append(view);

		var input = view.find("#jsonPath");

        var handler =$.proxy(function(e){
            e.preventDefault();
            this.figure.attr("userData.jsonPath", input.val());
        },this);
        input.change(handler);
        view.submit(function(e){
            return false;
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
    }
});

