var conf= {
    fileSuffix: ".sankey",

    backend: {
        file: {
            list: "/backend/file/list",
            get : "/backend/file/get",
            save: "/backend/file/save"
        },
        hook:"/backend/hook",
        weights:"/backend/sankey/weights",
        suggestPath:"/backend/suggestPath",
        suggestValue:"/backend/suggestValue"
    }
};


var sankey ={
    shape:{
    },
    property:{
    },
    dialog:{
    },
    policy:{
    },
    anchor:{
    },
    locator:{
    }
};
;

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
;
var colors = [
    {
        "50": "#fde0dc",
        "100": "#f9bdbb",
        "200": "#f69988",
        "300": "#f36c60",
        "400": "#e84e40",
        "500": "#e51c23",
        "600": "#dd191d",
        "700": "#d01716",
        "800": "#c41411",
        "900": "#b0120a",
        "a100": "#ff7997",
        "a200": "#ff5177",
        "a400": "#ff2d6f",
        "a700": "#e00032"
    },
    {
        "50": "#fce4ec",
        "100": "#f8bbd0",
        "200": "#f48fb1",
        "300": "#f06292",
        "400": "#ec407a",
        "500": "#e91e63",
        "600": "#d81b60",
        "700": "#c2185b",
        "800": "#ad1457",
        "900": "#880e4f",
        "a100": "#ff80ab",
        "a200": "#ff4081",
        "a400": "#f50057",
        "a700": "#c51162"
    },
    {
        "50": "#f3e5f5",
        "100": "#e1bee7",
        "200": "#ce93d8",
        "300": "#ba68c8",
        "400": "#ab47bc",
        "500": "#9c27b0",
        "600": "#8e24aa",
        "700": "#7b1fa2",
        "800": "#6a1b9a",
        "900": "#4a148c",
        "a100": "#ea80fc",
        "a200": "#e040fb",
        "a400": "#d500f9",
        "a700": "#aa00ff"
    },
     {
        "50": "#ede7f6",
        "100": "#d1c4e9",
        "200": "#b39ddb",
        "300": "#9575cd",
        "400": "#7e57c2",
        "500": "#673ab7",
        "600": "#5e35b1",
        "700": "#512da8",
        "800": "#4527a0",
        "900": "#311b92",
        "a100": "#b388ff",
        "a200": "#7c4dff",
        "a400": "#651fff",
        "a700": "#6200ea"
    },
     {
        "50": "#e8eaf6",
        "100": "#c5cae9",
        "200": "#9fa8da",
        "300": "#7986cb",
        "400": "#5c6bc0",
        "500": "#3f51b5",
        "600": "#3949ab",
        "700": "#303f9f",
        "800": "#283593",
        "900": "#1a237e",
        "a100": "#8c9eff",
        "a200": "#536dfe",
        "a400": "#3d5afe",
        "a700": "#304ffe"
    },
     {
        "50": "#e7e9fd",
        "100": "#d0d9ff",
        "200": "#afbfff",
        "300": "#91a7ff",
        "400": "#738ffe",
        "500": "#5677fc",
        "600": "#4e6cef",
        "700": "#455ede",
        "800": "#3b50ce",
        "900": "#2a36b1",
        "a100": "#a6baff",
        "a200": "#6889ff",
        "a400": "#4d73ff",
        "a700": "#4d69ff"
    },
     {
        "50": "#e1f5fe",
        "100": "#b3e5fc",
        "200": "#81d4fa",
        "300": "#4fc3f7",
        "400": "#29b6f6",
        "500": "#03a9f4",
        "600": "#039be5",
        "700": "#0288d1",
        "800": "#0277bd",
        "900": "#01579b",
        "a100": "#80d8ff",
        "a200": "#40c4ff",
        "a400": "#00b0ff",
        "a700": "#0091ea"
    },
    {
        "50": "#e0f7fa",
        "100": "#b2ebf2",
        "200": "#80deea",
        "300": "#4dd0e1",
        "400": "#26c6da",
        "500": "#00bcd4",
        "600": "#00acc1",
        "700": "#0097a7",
        "800": "#00838f",
        "900": "#006064",
        "a100": "#84ffff",
        "a200": "#18ffff",
        "a400": "#00e5ff",
        "a700": "#00b8d4"
    },
     {
        "50": "#e0f2f1",
        "100": "#b2dfdb",
        "200": "#80cbc4",
        "300": "#4db6ac",
        "400": "#26a69a",
        "500": "#009688",
        "600": "#00897b",
        "700": "#00796b",
        "800": "#00695c",
        "900": "#004d40",
        "a100": "#a7ffeb",
        "a200": "#64ffda",
        "a400": "#1de9b6",
        "a700": "#00bfa5"
    },
    {
        "50": "#d0f8ce",
        "100": "#a3e9a4",
        "200": "#72d572",
        "300": "#42bd41",
        "400": "#2baf2b",
        "500": "#259b24",
        "600": "#0a8f08",
        "700": "#0a7e07",
        "800": "#056f00",
        "900": "#0d5302",
        "a100": "#a2f78d",
        "a200": "#5af158",
        "a400": "#14e715",
        "a700": "#12c700"
    },
    {
        "50": "#f1f8e9",
        "100": "#dcedc8",
        "200": "#c5e1a5",
        "300": "#aed581",
        "400": "#9ccc65",
        "500": "#8bc34a",
        "600": "#7cb342",
        "700": "#689f38",
        "800": "#558b2f",
        "900": "#33691e",
        "a100": "#ccff90",
        "a200": "#b2ff59",
        "a400": "#76ff03",
        "a700": "#64dd17"
    },
    {
        "50": "#f9fbe7",
        "100": "#f0f4c3",
        "200": "#e6ee9c",
        "300": "#dce775",
        "400": "#d4e157",
        "500": "#cddc39",
        "600": "#c0ca33",
        "700": "#afb42b",
        "800": "#9e9d24",
        "900": "#827717",
        "a100": "#f4ff81",
        "a200": "#eeff41",
        "a400": "#c6ff00",
        "a700": "#aeea00"
    },
    {
        "50": "#fffde7",
        "100": "#fff9c4",
        "200": "#fff59d",
        "300": "#fff176",
        "400": "#ffee58",
        "500": "#ffeb3b",
        "600": "#fdd835",
        "700": "#fbc02d",
        "800": "#f9a825",
        "900": "#f57f17",
        "a100": "#ffff8d",
        "a200": "#ffff00",
        "a400": "#ffea00",
        "a700": "#ffd600"
    },
   {
        "50": "#fff8e1",
        "100": "#ffecb3",
        "200": "#ffe082",
        "300": "#ffd54f",
        "400": "#ffca28",
        "500": "#ffc107",
        "600": "#ffb300",
        "700": "#ffa000",
        "800": "#ff8f00",
        "900": "#ff6f00",
        "a100": "#ffe57f",
        "a200": "#ffd740",
        "a400": "#ffc400",
        "a700": "#ffab00"
    },
   {
        "50": "#fff3e0",
        "100": "#ffe0b2",
        "200": "#ffcc80",
        "300": "#ffb74d",
        "400": "#ffa726",
        "500": "#ff9800",
        "600": "#fb8c00",
        "700": "#f57c00",
        "800": "#ef6c00",
        "900": "#e65100",
        "a100": "#ffd180",
        "a200": "#ffab40",
        "a400": "#ff9100",
        "a700": "#ff6d00"
    },
   {
        "50": "#fbe9e7",
        "100": "#ffccbc",
        "200": "#ffab91",
        "300": "#ff8a65",
        "400": "#ff7043",
        "500": "#ff5722",
        "600": "#f4511e",
        "700": "#e64a19",
        "800": "#d84315",
        "900": "#bf360c",
        "a100": "#ff9e80",
        "a200": "#ff6e40",
        "a400": "#ff3d00",
        "a700": "#dd2c00"
    },
   {
        "50": "#efebe9",
        "100": "#d7ccc8",
        "200": "#bcaaa4",
        "300": "#a1887f",
        "400": "#8d6e63",
        "500": "#795548",
        "600": "#6d4c41",
        "700": "#5d4037",
        "800": "#4e342e",
        "900": "#3e2723"
    },
    {
        "50": "#fafafa",
        "100": "#f5f5f5",
        "200": "#eeeeee",
        "300": "#e0e0e0",
        "400": "#bdbdbd",
        "500": "#9e9e9e",
        "600": "#757575",
        "700": "#616161",
        "800": "#424242",
        "900": "#212121",
        "1000": "#ffffff"
    },
    {
        "50": "#eceff1",
        "100": "#cfd8dc",
        "200": "#b0bec5",
        "300": "#90a4ae",
        "400": "#78909c",
        "500": "#607d8b",
        "600": "#546e7a",
        "700": "#455a64",
        "800": "#37474f",
        "900": "#263238"
    }
];;

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
;
if(typeof String.prototype.endsWith ==="undefined") {
    String.prototype.endsWith = function (suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}



var getAbsoluteUrl = (function() {
    var a;

    return function(url) {
        if(!a) a = document.createElement('a');
        a.href = url;

        return a.href;
    };
})();
;
/*jshint evil:true */


//var DEFAULT_ROUTER= new draw2d.layout.connection.DirectRouter();
//var DEFAULT_ROUTER= new draw2d.layout.connection.FanConnectionRouter();
//var DEFAULT_ROUTER= new draw2d.layout.connection.InteractiveManhattanConnectionRouter();
var DEFAULT_ROUTER= new draw2d.layout.connection.SplineConnectionRouter();

sankey.shape.Connection = draw2d.Connection.extend({
    NAME : "sankey.shape.Connection",

    init:function(attr, setter, getter)
    {
        this.label = new draw2d.shape.basic.Label({
            text:"-",
            bgColor:"#e91e63",
            fontColor:"#FFFFFF",
            radius:8
        });

        this._super(attr, setter, getter);

        this.add(this.label, new draw2d.layout.locator.ManhattanMidpointLocator());

        this.attr({
            router: DEFAULT_ROUTER,
            stroke:5,
            userData: {
                jsonPath:""
            }
        });
        this.setTargetDecorator(new draw2d.decoration.connection.ArrowDecorator());
    },

    setWeight:function(weight)
    {
        this.label.setText(""+weight);
    },

    getWeight:function()
    {
        return parseInt(this.label.getText());
    },

    setUserData:function( obj)
    {
        this._super(obj);
        var transitions =$.extend({},{transitions:[]},obj).transitions;
        if(transitions.length===0){
            this.setDashArray("-");
        }
        else{
            this.setDashArray("");
        }
    },


    repaint:function(attr)
    {
        this._super($.extend({},attr,{"stroke-linecap":"butt"}));
    },


    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            labelJSON.boundedCorners= e.locator.boundedCorners;
            memento.labels.push(labelJSON);
        });

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento) {
        delete memento.router;

        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //

        $.each(memento.labels, $.proxy(function (i, json) {
            // create the figure stored in the JSON
            var figure = eval("new " + json.type + "()");


            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator = eval("new " + json.locator + "()");

            // add the new figure as child to this figure
            this.add(figure, locator);

            if( locator.boundedCorners){
                $.extend(locator.boundedCorners, json.boundedCorners);
            }

            // the first label in the JSON is the Label with the weight text
            //
            if(i===0) {
                this.label = figure;
            }
        }, this));

        // just to update the dash/full line style. The line is drawn dotted if the user
        // didn't entered any constraints.
        //
        this.setUserData(this.userData);
    }
});


;
/*jshint evil:true */


sankey.shape.End = draw2d.shape.node.End.extend({
    NAME:"sankey.shape.End",

    init:function()
    {
        var _this = this;
        this.label = this.label = new draw2d.shape.basic.Label({
            text:"End",
            angle:270,
            fontColor:"#FFFFFF",
            fontSize:18,
            stroke:0,
            editor: new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
            }})
        });
        this._super();

        this.add( this.label, new draw2d.layout.locator.CenterLocator());
        this.attr({
            radius:10,
            bgColor:"#f50057"
        });
        this.getInputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());
    },

    getMinWidth: function()
    {
        return this.label.getHeight();
    },

    getMinHeight: function()
    {
        return this.label.getWidth();
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        delete memento.ports;

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        var _this = this;

        delete memento.ports;

        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //

        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");


            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);

            // the first label in the JSON is the Label in the center of the shape
            //
            if(i===0){
                this.label = figure;
                this.label.installEditor(new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                    _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
                }}));
            }
        },this));
    }
});
;
sankey.shape.Label = draw2d.shape.basic.Label.extend({
    NAME: "sankey.shape.Label",

    init: function (attr, setter, getter)
    {
        this._super(attr, setter, getter);
    }
});;
/*jshint evil:true */


/**
 * The markerFigure is the left hand side annotation for a DecoratedPort.
 *
 * It contains two children
 *
 * StateAFigure: if the mouse hover and the figure isn't permanent visible
 * StateBFigure: either the mouse is over or the user pressed the checkbox to stick the figure on the port
 *
 * This kind of decoration is usefull for defualt values on workflwos enginges or circuit diagrams
 *
 */
sankey.shape.Raft = draw2d.shape.composite.Raft.extend({

    NAME : "sankey.shape.Raft",

    init : function(attr, setter, getter)
    {
        this._super(attr, setter, getter);
    },

    calculate: function()
    {

    },

    onStart:function()
    {

    },

    onStop:function()
    {

    },

    toBack:function(figure)
    {
        if(this.canvas.getFigures().getSize()===1){
            return ; // silently
        }

        // unfortunately the shape goes behind the "canvas decoration" which could be the grid or dots.
        // this is sad and unwanted. In this case we select the first figure in th canvas and set the Raft behind of them
        // instead of "behind of ALL shapes"
        var first = this.canvas.getFigures().first();
        this._super(first);
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //
        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");

            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);
        },this));
    }

});
;
/*jshint evil:true */


sankey.shape.Start = draw2d.shape.node.Start.extend({
    NAME:"sankey.shape.Start",

    init:function()
    {
        var _this = this;
        this.label = this.label = new draw2d.shape.basic.Label({
            text:"Start",
            angle:270,
            fontColor:"#FFFFFF",
            fontSize:18,
            stroke:0,
            editor: new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
            }})
        });
        this._super();
        this.add( this.label, new draw2d.layout.locator.CenterLocator());

        this.attr({
            radius:10
        });
        this.getOutputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());
    },

    getMinWidth: function()
    {
        return this.label.getHeight();
    },

    getMinHeight: function()
    {
        return this.label.getWidth();
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        delete memento.ports;

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        var _this = this;

        delete memento.ports;

        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //
        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");

            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);

            // the first label in the JSON is the Label in the center of the shape
            //
            if(i===0){
                this.label = figure;
                this.label.installEditor(new draw2d.ui.LabelInplaceEditor({onCommit:function(){
                    _this.setHeight(Math.max(_this.getHeight(),_this.label.getWidth()));
                }}));
            }
        },this));
    }
});;
/*jshint evil:true */

sankey.shape.State = draw2d.shape.node.Between.extend({
    NAME:"sankey.shape.State",

    init:function()
    {
        this._super();
        this.getOutputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());
        this.getInputPort(0).setConnectionAnchor(new sankey.anchor.ConnectionAnchor());

        this.createPort("input", new draw2d.layout.locator.TopLocator());
        this.createPort("input", new draw2d.layout.locator.BottomLocator());
    },

    /**
     * @method
     * Return an objects with all important attributes for XML or JSON serialization
     *
     * @returns {Object}
     */
    getPersistentAttributes : function()
    {
        var memento = this._super();

        // add all decorations to the memento
        //
        memento.labels = [];
        this.children.each(function(i,e){
            var labelJSON = e.figure.getPersistentAttributes();
            labelJSON.locator=e.locator.NAME;
            memento.labels.push(labelJSON);
        });

        delete memento.ports;

        return memento;
    },

    /**
     * @method
     * Read all attributes from the serialized properties and transfer them into the shape.
     *
     * @param {Object} memento
     * @returns
     */
    setPersistentAttributes : function(memento)
    {
        delete memento.ports;
        this._super(memento);

        // remove all decorations created in the constructor of this element
        //
        this.resetChildren();

        // and add all children of the JSON document.
        //
        $.each(memento.labels, $.proxy(function(i,json){
            // create the figure stored in the JSON
            var figure =  eval("new "+json.type+"()");

            // apply all attributes
            figure.attr(json);

            // instantiate the locator
            var locator =  eval("new "+json.locator+"()");

            // add the new figure as child to this figure
            this.add(figure, locator);
        },this));
    }
});