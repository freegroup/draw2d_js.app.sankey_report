sankey.shape.Connection = draw2d.Connection.extend({
    NAME : "sankey.shape.Connection",

    init:function(attr, setter, getter)
    {
        this._super(attr, setter, getter);

        this.label = new draw2d.shape.basic.Label({
            text:"-",
            bgColor:"#FFFFFF",
            radius:3
        });
        this.add(this.label, new draw2d.layout.locator.ManhattanMidpointLocator());
    },

    setText:function(text)
    {
        this.label.setText(text);
    }
});