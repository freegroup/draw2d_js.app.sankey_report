/*jshint sub:true*/
/*jshint evil:true */


sankey.View = draw2d.Canvas.extend({
	
	init:function(id)
    {
        var _this = this;

        this.diagramName = "";

		this._super(id);


        this.setScrollArea("#"+id);

        // keep up to date if the backend changes something
        //
        socket.on("connection:change", $.proxy(this.updateWeights, this));


        // show the ports of the elements only if the mouse cursor is close to the shape.
        //
        this.installEditPolicy(new draw2d.policy.canvas.ReadOnlySelectionPolicy());


        var diagram = this.getParam("diagram");
        if(diagram){
            this.diagramName = diagram;
            $.ajax({
                    url: conf.backend.file.get,
                    method: "POST",
                    xhrFields: {
                        withCredentials: true
                    },
                    data:{
                        id:diagram
                    }
                }
            ).done(function(json){
                var reader = new draw2d.io.json.Reader();
                reader.unmarshal(_this, json.content.diagram);
                _this.commonPorts.each(function(i,port){
                    port.setVisible(false);
                });
                _this.centerDocument();
                $.ajax({
                    url: conf.backend.weights,
                    method: "POST",
                    data: {id:diagram},
                    success:function(response){
                        _this.updateWeights(response);
                    }
                });

            });
        }
    },

    updateWeights: function(weights)
    {
        // no content
        //
        if(weights.length===0){
            return;
        }

        // content is not for this diagram
        //
        if(weights[0].file!==this.diagramName){
            return;
        }

        var _this = this;
        this.getLines().each(function(index, conn){
            conn.setWeight("0");
        });
        weights.forEach(function(weight){
            var conn = _this.getLine(weight.conn);
            if(conn!==null){
                conn.setWeight(weight.value);
            }
        });

        var min=Number.MAX_SAFE_INTEGER,
            max=0;
        this.getLines().each(function(index, conn){
            min = Math.min(min,conn.getWeight());
            max = Math.max(2,Math.max(max,conn.getWeight()));
        });

        var minStroke = 2;
        var maxStroke = 20;
        this.getLines().each(function(index, conn){
            // [A, B] --> [a, b]
            conn.setStroke((conn.getWeight() - min)*(maxStroke-minStroke)/Math.max(1,(max-min)) + minStroke);
        });

    },


    getBoundingBox: function()
    {
        var xCoords = [];
        var yCoords = [];
        this.getFigures().each(function(i,f){
            var b = f.getBoundingBox();
            xCoords.push(b.x, b.x+b.w);
            yCoords.push(b.y, b.y+b.h);
        });
        var minX   = Math.min.apply(Math, xCoords);
        var minY   = Math.min.apply(Math, yCoords);
        var width  = Math.max(10,Math.max.apply(Math, xCoords)-minX);
        var height = Math.max(10,Math.max.apply(Math, yCoords)-minY);

        return new draw2d.geo.Rectangle(minX,minY,width,height);
    },


    centerDocument:function()
    {
        var bb=null;
        var c = $("#draw2dCanvasWrapper");
        if(this.getFigures().getSize()>0){
            // get the bounding box of the document and translate the complete document
            // into the center of the canvas. Scroll to the top left corner after them
            //
            bb = this.getBoundingBox();

            c.scrollTop(bb.y-50);
            c.scrollLeft(bb.x-50);
        }
        else{
            bb={
                x:this.getWidth()/2,
                y:this.getHeight()/2
            };
            c.scrollTop(bb.y- c.height()/2);
            c.scrollLeft(bb.x- c.width()/2);

        }
    },

    getParam: function( name )
    {
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( window.location.href );

        // the param isn'T part of the normal URL pattern...
        //
        if( results === null ) {
            // maybe it is part in the hash.
            //
            regexS = "[\\#]"+name+"=([^&#]*)";
            regex = new RegExp( regexS );
            results = regex.exec( window.location.hash );
            if( results === null ) {
                return null;
            }
        }

        return results[1];
    }
});

