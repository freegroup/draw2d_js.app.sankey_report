

sankey.property.PropertyPane = Class.extend({

    init:function(figure)
    {
        this.figure = figure;
    },


    injectPropertyView: function( domId)
    {
        var _this = this;

        $("#transitions select").each( function(index, val){
            var $val = $(val);
            $val.find("option[value='"+$val.attr("value")+"']").attr("selected","selected");
        });

        $("#transitions input").on("keyup",function(){
            var $this= $(this);
            $this.attr("value",$this.val());
            _this.figure.setUserData(_this.getJSON());
        });
        $("#transitions select").on("change",function(){
            var $this= $(this);
            $this.attr("value",$this.find(":selected").val());
            _this.figure.setUserData(_this.getJSON());
        });
    },


    /**
     * @method
     * called by the framework if the pane has been resized. This is a good moment to adjust the layout if
     * required.
     *
     */
    onResize: function()
    {
    },


    /**
     * @method
     * called by the framework before the pane will be removed from the DOM tree
     *
     */
    onHide: function()
    {
    },

    getJSON: function()
    {
        var table =$('#transitions')[0];
        var headers= [];
        var data = []; // first row needs to be headers var headers = [];
        for (var i=0; i<table.rows[0].cells.length; i++) {
            headers[i] = $(table.rows[0].cells[i]).data("path");
        }
        // go through cells
        for ( i=1; i<table.rows.length; i++) {
            var tableRow = table.rows[i]; var rowData = {};
            for (var j=0; j<tableRow.cells.length; j++) {
                rowData[ headers[j] ] = $(tableRow.cells[j].innerHTML).attr("value");
            } data.push(rowData);
        }
        // strip empty entries;
        data = data.filter(function(e){return e.jsonPath!=="";});
        return {transitions:data};
    }


});

