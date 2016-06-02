

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

		this._super();
	}
});

