/*jshint sub:true*/
/*jshint evil:true */


sankey.View = draw2d.Canvas.extend({
	
	init:function(id)
    {
        var _this = this;

		this._super(id);
		
		this.setScrollArea("#"+id);

        // Override the default connection type. This is used during drag&drop operations of ports.
        this.installEditPolicy(  new draw2d.policy.connection.DragConnectionCreatePolicy({
            createConnection: function() {
                // return my special kind of connection
                var con =  new sankey.shape.Connection();
                return con;
            }
        }));


        // keep up to date if the backend changes something
        //
        socket.on("connection:change", $.proxy(this.updateWeights, this));

        this.installEditPolicy(new sankey.policy.EditPolicy());

        // show the ports of the elements only if the mouse cursor is close to the shape.
        //
        this.coronaFeedback = new draw2d.policy.canvas.CoronaDecorationPolicy({diameterToBeVisible:50});
        this.installEditPolicy(this.coronaFeedback);
    },

    updateWeights: function(weights)
    {
        var _this = this;
        this.getLines().each(function(index, conn){
            conn.setText("0");
        });
        weights.forEach(function(weight){
            var conn = _this.getLine(weight.conn);
            if(conn!==null){
                conn.setText(weight.value);
            }
        });
    },

    /**
     * @method
     * Called if the DragDrop object is moving around.<br>
     * <br>
     * Graphiti use the jQuery draggable/droppable lib. Please inspect
     * http://jqueryui.com/demos/droppable/ for further information.
     * 
     * @param {HTMLElement} droppedDomNode The dragged DOM element.
     * @param {Number} x the x coordinate of the drag
     * @param {Number} y the y coordinate of the drag
     * 
     * @template
     **/
    onDrag:function(droppedDomNode, x, y )
    {
    },
    
    /**
     * @method
     * Called if the user drop the droppedDomNode onto the canvas.<br>
     * <br>
     * Draw2D use the jQuery draggable/droppable lib. Please inspect
     * http://jqueryui.com/demos/droppable/ for further information.
     * 
     * @param {HTMLElement} droppedDomNode The dropped DOM element.
     * @param {Number} x the x coordinate of the drop
     * @param {Number} y the y coordinate of the drop
     * @param {Boolean} shiftKey true if the shift key has been pressed during this event
     * @param {Boolean} ctrlKey true if the ctrl key has been pressed during the event
     * @private
     **/
    onDrop : function(droppedDomNode, x, y, shiftKey, ctrlKey)
    {
        var type = $(droppedDomNode).data("shape");

        var figure = eval("new "+type+"();");
        // create a command for the undo/redo support
        var command = new draw2d.command.CommandAdd(this, figure, x, y);
        this.getCommandStack().execute(command);
    }
});

