sankey.dialog.FileShare = Class.extend({

    /**
     * @constructor
     *
     */
    init:function(fileHandle)
    {
        this.currentFileHandle=fileHandle;
    },

    /**
     * @method
     *
     * Open the file picker and load the selected file.<br>
     *
     * @param {Function} successCallback callback method if the user select a file and the content is loaded
     * @param {Function} errorCallback method to call if any error happens
     *
     * @since 4.0.0
     */
    show: function()
    {
        var html = $('#fileShareDialog')[0].outerHTML;

        var compiled = Hogan.compile(html);
        var output = $(compiled.render({
            files: this.currentFileHandle,
            url: getAbsoluteUrl("viewer.html")
        }));

      //  output.attr("id","");
        $("body").append(output);
        output.modal('show');

        output.on('hidden.bs.modal', function () {
          output.remove();
        });
    }
});