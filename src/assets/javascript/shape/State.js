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