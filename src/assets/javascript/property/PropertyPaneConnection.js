
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

		this._super();
    }
});

