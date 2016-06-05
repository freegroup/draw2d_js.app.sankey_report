

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

