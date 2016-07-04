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


