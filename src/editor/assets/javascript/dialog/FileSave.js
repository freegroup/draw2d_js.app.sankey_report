sankey.dialog.FileSave = Class.extend({

    /**
     * @constructor
     *
     */
    init:function(fileHandler){
        this.currentFileHandle = fileHandler;
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
    show: function(json, successCallback)
    {
        var _this = this;

        $("#githubSaveFileDialog .githubFileName").val(_this.currentFileHandle.title);

        $('#githubSaveFileDialog').on('shown.bs.modal', function () {
            $(this).find('input:first').focus();
        });
        $("#githubSaveFileDialog").modal("show");

        // Button: Commit to GitHub
        //
        $("#githubSaveFileDialog .okButton").off("click").on("click", function () {
            new draw2d.io.png.Writer().marshal(app.view, function (imageDataUrl){
                var data ={
                    base64Image:imageDataUrl,
                    id:$("#githubSaveFileDialog .githubFileName").val(),
                    content:JSON.stringify(json, undefined, 2)
                };

                $.ajax({
                        url: conf.backend.file.save,
                        method: "POST",
                        xhrFields: {
                            withCredentials: true
                        },
                        data:data
                    }
                ).done(function(){
                    $('#githubSaveFileDialog').modal('hide');
                    _this.currentFileHandle.title=data.id;
                    successCallback();
                });
            }, app.view.getBoundingBox().scale(10, 10));
         });

    }

});