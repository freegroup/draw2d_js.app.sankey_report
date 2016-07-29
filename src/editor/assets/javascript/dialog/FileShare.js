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
            name: this.currentFileHandle.title,
            url: getAbsoluteUrl("../viewer#diagram="+this.currentFileHandle.title)
        }));

        $("body").append(output);
        output.modal('show');

        var clipboard = new Clipboard('.shareButton.clipboard');
        clipboard.on('success', function(e) {
            output.find("#copiedToClipboardMessage").text("Link copied to Clipboard");
        });

        output.on('hidden.bs.modal', function () {
          output.remove();
          clipboard.destroy();
        });
    }
});