sankey.dialog.JSONTemplate = Class.extend({

    /**
     * @constructor
     *
     */
    init: function (fileHandler) {
        this.currentFileHandle = fileHandler;
    },

    show: function()
    {
        $('#jsonTemplateDialog').off('shown.bs.modal').on('shown.bs.modal', function () {
            var editor = ace.edit("templateEditor");
            editor.setValue(JSON.stringify(app.getTemplate(),undefined,2));
            editor.setTheme("ace/theme/chrome");
            editor.getSession().setMode("ace/mode/json");
            $("#jsonTemplateDialog .okButton").off("click").on("click", function () {
                var code = JSON.parse(editor.getValue());
                app.setTemplate(code);
                $('#jsonTemplateDialog').modal('hide');
            });
        });

        $("#jsonTemplateDialog").modal("show");
    }


});