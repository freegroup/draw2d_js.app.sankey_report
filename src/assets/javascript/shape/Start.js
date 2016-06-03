/*jshint evil:true */


sankey.shape.Start = draw2d.shape.node.Start.extend({
    NAME:"sankey.shape.Start",

    init:function()
    {
        this._super();
        this.add(new draw2d.shape.basic.Label({
            text:"Start",
            angle:270,
            fontColor:"#FFFFFF",
            fontSize:18,
            stroke:0,
            editor: new draw2d.ui.LabelInplaceEditor()
        }), new draw2d.layout.locator.CenterLocator());

        this.attr({
            radius:10
        });
        this.getOutputPort(0).setConnectionAnchor(new sankey.anchor.OutputConnectionAnchor());
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