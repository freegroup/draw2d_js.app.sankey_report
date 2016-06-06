
/**

 * @author Andreas Herz
 * @extend draw2d.layout.locator.Locator
 */
sankey.locator.SmartConnectionLocator= draw2d.layout.locator.ConnectionLocator.extend({
    NAME : "sankey.locator.SmartConnectionLocator",
    
    /**
     * @constructor
     * Constructs a locator with associated parent.
     * 
     */
    init: function( )
    {
        this._super();

        // description see "bind" method
        this.boundedCorners={
            init:false,
            parent:0,
            child:0,
            dist: Number.MAX_SAFE_INTEGER,
            xOffset: 0,
            yOffset: 0
        };
    },

    bind: function(parent, child)
    {
        var _this = this;
        // determine the best corner of the parent/child node and stick to the calculated corner
        // In the example below it is R1.2 in combination with R2.0
        //
        //     Start
        //     +---------
        //              |
        //              |_______________________+ End
        //
        //              0             1
        //               +-----------+
        //               |           |
        //               |    R2     |
        //               +-----------+
        //              3             2
        //
        var calcBoundingCorner=function() {

            _this.boundedCorners={
                init:false,
                parent:0,
                child:0,
                dist: Number.MAX_SAFE_INTEGER,
                xOffset: 0,
                yOffset: 0
            };
            var parentVertices = child.getParent().getVertices();
            parentVertices = new draw2d.util.ArrayList([parentVertices.first(),parentVertices.last()]);

            var childVertices  = child.getBoundingBox().getVertices();
            var i_parent, i_child;
            var p1, p2, distance;
            for (i_parent = 0; i_parent < parentVertices.getSize(); i_parent++) {
                for (i_child = 0; i_child < childVertices.getSize(); i_child++) {
                    p1 = parentVertices.get(i_parent);
                    p2 = childVertices.get(i_child);
                    distance = Math.abs(p1.distance(p2));
                    if (distance < _this.boundedCorners.dist) {
                        _this.boundedCorners = {
                            parent: i_parent,
                            child: i_child,
                            dist: distance,
                            xOffset:p1.x-p2.x,
                            yOffset:p1.y-p2.y
                        };
                    }
                }
            }
            _this.boundedCorners.init=true;
        };

        // override the parent implementation to avoid
        // that the child is "!selectable" and "!draggable"

        // Don't redirect the selection handling to the parent
        // Using the DraggableLocator provides the ability to the children
        // that they are selectable and draggable. Remove the SelectionAdapter from the parent
        // assignment.
        child.setSelectionAdapter( function(){
            return child;
        });

        child.getParent().on("added",calcBoundingCorner);
        child.on("dragend",calcBoundingCorner);
    },

    unbind: function(parent, child)
    {
        // use default
        child.setSelectionAdapter(null);
    },


    /**
     * @method
     * Controls the location of an I{@link draw2d.Figure}
     *
     * @param {Number} index child index of the figure
     * @param {draw2d.Figure} figure the figure to control
     *
     * @template
     **/
    relocate: function(index, figure)
    {
        this._super(index, figure);

        if(this.boundedCorners.init===true) {
            var parentVertices = figure.getParent().getVertices();
            parentVertices = new draw2d.util.ArrayList([parentVertices.first(),parentVertices.last()]);
            var childVertices = figure.getBoundingBox().getVertices();
            var p1 = parentVertices.get(this.boundedCorners.parent);
            var p2 = childVertices.get(this.boundedCorners.child);

            var xOffset = p1.x - p2.x;
            var yOffset = p1.y - p2.y;
            // restore the initial distance from the corner by adding the new offset
            // to the position of the child
            figure.translate(xOffset - this.boundedCorners.xOffset, yOffset - this.boundedCorners.yOffset);
        }
    }
});
