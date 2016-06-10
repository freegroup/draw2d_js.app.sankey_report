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
