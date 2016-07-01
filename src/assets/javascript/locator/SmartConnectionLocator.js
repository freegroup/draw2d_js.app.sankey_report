
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
            percentage: 0,
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
                percentage: 0,
                xOffset: 0,
                yOffset: 0
            };

            var line = child.getParent();
            var center  = child.getBoundingBox().getCenter();
            var pos= child.getPosition();
            var projection = line.pointProjection(center);
            if(projection===null){
                var p1= line.getStartPosition();
                var p2= line.getEndPosition();
                var d1= center.distance(p1);
                var d2= center.distance(p1);
                projection=d1<d2?p1:p2;
            }
            else{
                _this.boundedCorners.percentage = projection.percentage;
            }
            _this.boundedCorners.xOffset = projection.x - pos.x;
            _this.boundedCorners.yOffset = projection.y - pos.y;
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

        var line = figure.getParent();

        if(line===null){
            return;
        }
        if (figure.canvas === null) {
            return;
        }
        var point = line.lerp(this.boundedCorners.percentage);
        // restore the initial distance from the corner by adding the new offset
        // to the position of the child
        if(point) {
            figure.setPosition(point.x - this.boundedCorners.xOffset, point.y - this.boundedCorners.yOffset);
        }
    }
});
