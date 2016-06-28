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
            conn.setWeight("0");
        });
        weights.forEach(function(weight){
            var conn = _this.getLine(weight.conn);
            if(conn!==null){
                conn.setWeight( Math.max(2,weight.value));
            }
        });

        var min=Number.MAX_SAFE_INTEGER,
            max=0;
        this.getLines().each(function(index, conn){
            min = Math.min(min,conn.getWeight());
            max = Math.max(2,Math.max(max,conn.getWeight()));
        });

        var minStroke = 2;
        var maxStroke = 20;
        this.getLines().each(function(index, conn){
            // [A, B] --> [a, b]

            conn.setStroke((conn.getWeight() - min)*(maxStroke-minStroke)/(max-min) + minStroke);
            console.log(conn.getStroke());
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
    },

    getBoundingBox: function()
    {
        var xCoords = [];
        var yCoords = [];
        this.getFigures().each(function(i,f){
            var b = f.getBoundingBox();
            xCoords.push(b.x, b.x+b.w);
            yCoords.push(b.y, b.y+b.h);
        });
        var minX   = Math.min.apply(Math, xCoords);
        var minY   = Math.min.apply(Math, yCoords);
        var width  = Math.max(10,Math.max.apply(Math, xCoords)-minX);
        var height = Math.max(10,Math.max.apply(Math, yCoords)-minY);

        return new draw2d.geo.Rectangle(minX,minY,width,height);
    },


    centerDocument:function()
    {
        var bb=null;
        var c = $("#draw2dCanvasWrapper");
        if(this.getFigures().getSize()>0){
            // get the bounding box of the document and translate the complete document
            // into the center of the canvas. Scroll to the top left corner after them
            //
            bb = this.getBoundingBox();

            c.scrollTop(bb.y- c.height()/2);
            c.scrollLeft(bb.x- c.width()/2);
        }
        else{
            bb={
                x:this.getWidth()/2,
                y:this.getHeight()/2
            };
            c.scrollTop(bb.y- c.height()/2);
            c.scrollLeft(bb.x- c.width()/2);

        }
    }
});

