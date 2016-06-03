

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

        var substringMatcher = function(strs) {
            return function findMatches(q, cb) {
                var matches, substrRegex;

                // an array that will be populated with substring matches
                matches = [];

                // regex used to determine if a string contains the substring `q`
                substrRegex = new RegExp(q, 'i');

                // iterate through the pool of strings and for any string that
                // contains the substring `q`, add it to the `matches` array
                $.each(strs, function(i, str) {
                    if (substrRegex.test(str)) {
                        matches.push(str);
                    }
                });

                cb(matches);
            };
        };

        var states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
            'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii',
            'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
            'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
            'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
            'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
            'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
            'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
            'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
        ];


        $('.typeahead').autocomplete({
            lookup: states,
            orientation:"top",
            onSelect: function (suggestion) {
             //   alert('You selected: ' + suggestion.value + ', ' + suggestion.data);
            }
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

