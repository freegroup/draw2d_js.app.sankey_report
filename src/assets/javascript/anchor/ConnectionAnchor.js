
sankey.anchor.ConnectionAnchor = draw2d.layout.anchor.ConnectionAnchor.extend({

	NAME : "sankey.anchor.ConnectionAnchor",

	/**
	 * @constructor
	 * 
	 * @param {draw2d.Figure} [owner] the figure to use for the anchor calculation
	 */
	init: function(owner)
    {
		this._super(owner);
	},

	/**
	 * @method
	 * 
	 * Returns the location where the Connection should be anchored in
	 * absolute coordinates. The anchor may use the given reference
	 * Point to calculate this location.
	 * 
	 * @param {draw2d.geo.Point} ref The reference Point in absolute coordinates
     * @param {draw2d.Connection} [inquiringConnection] the connection who ask for the location.
     * 
	 * @return {draw2d.geo.Point} The anchor's location
	 */
	getLocation: function(ref, inquiringConnection)
    {
		var port  =  this.getOwner();
		var r     =  port.getParent().getBoundingBox();
		var conns =  port.getConnections().asArray();
		var height= r.getHeight() / conns.length;
        var indexName = "__"+port.NAME;

		var connsOrder = conns.map(function(conn){return {
			id:conn.id,
			y: conn.getSource()===port?conn.getTarget().getAbsoluteY():conn.getSource().getAbsoluteY()
		};});

		// we need stable sort order even if the difference of the "y" is zero
		// In this case we sort the connections by ID
		connsOrder.sort(function(a,b){
			var diff = a.y-b.y;
			if(diff===0){
				return a.id>b.id;
			}
			return diff;
		});

		inquiringConnection[indexName] = connsOrder.findIndex(function(conn){return conn.id===inquiringConnection.id;});


		// for a redraw of the other connections if any index calculated before has
		// changed with the new settings
		conns.forEach(function(connectionToCheck,index){
			var newIndex = connsOrder.findIndex(function(conn){return conn.id===connectionToCheck.id;});
			if(connectionToCheck[indexName]!==newIndex){
				connectionToCheck.routingRequired=true;
				if(connectionToCheck.getCanvas()!==null)
					connectionToCheck.repaint();
			}
		});
		var point = port.getAbsolutePosition();
		point.y = r.y+(height*inquiringConnection[indexName])+(height/2);
		return point;
	},

	/**
	 * Returns the bounds of this Anchor's owner. Subclasses can
	 * override this method to adjust the box. Maybe you return the box
	 * of the port parent (the parent figure)
	 * 
	 * @return {draw2d.geo.Rectangle} The bounds of this Anchor's owner
	 */
	getBox: function()
    {
		return this.getOwner().getParent().getBoundingBox();
	},

	/**
	 * @method
	 * 
	 * Returns the bounds of this Anchor's owner. Subclasses can
	 * override this method to adjust the box. Maybe you return the box
	 * of the port parent (the parent figure)
	 * 
	 * @param {draw2d.Connection} [inquiringConnection] the connection who ask for the location.
	 *
	 * @return {draw2d.geo.Point} The bounds of this Anchor's owner
	 */
	getReferencePoint: function(inquiringConnection)
    {
		return this.getBox().getCenter();
	}
});
