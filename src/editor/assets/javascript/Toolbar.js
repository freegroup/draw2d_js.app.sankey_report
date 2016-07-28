
sankey.Toolbar = Class.extend({
	
	init:function(elementId, view)
	{
		this.html = $("#"+elementId);
		this.view = view;
		
		// register this class as event listener for the canvas
		// CommandStack. This is required to update the state of 
		// the Undo/Redo Buttons.
		//
		view.getCommandStack().addEventListener(this);

		this.openButton  = $("<button title='Open Report' class='ion-ios-download-outline icon'></button>");
		this.html.append(this.openButton);
		this.openButton.button().click($.proxy(function(){
			app.fileOpen();
		},this));

		this.saveButton  = $("<button title='Save Report' class='ion-ios-upload-outline icon'></button>");
		this.html.append(this.saveButton);
		this.saveButton.button().click($.proxy(function(){
			app.fileSave();
		},this));


		this.newButton  = $("<button title='New Report' class='ion-ios-plus-outline icon'></button>");
		this.html.append(this.newButton);
		this.newButton.button().click($.proxy(function(){
			app.fileNew();
		},this));

		this.delimiter  = $("<span class='toolbar_delimiter'>&nbsp;</span>");
		this.html.append(this.delimiter);

		// Register a Selection listener for the state handling
		// of the Delete Button
		//
        view.on("select", $.proxy(this.onSelectionChanged,this));
		
		// Inject the UNDO Button and the callbacks
		//
		this.undoButton  = $("<button class='ion-ios-undo-outline icon'></button>");
		this.html.append(this.undoButton);
		this.undoButton.button().click($.proxy(function(){
		       this.view.getCommandStack().undo();
		},this)).prop( "disabled", true );

		// Inject the REDO Button and the callback
		//
		this.redoButton  = $("<button class='ion-ios-redo-outline icon'></button>");
		this.html.append(this.redoButton);
		this.redoButton.button().click($.proxy(function(){
		    this.view.getCommandStack().redo();
		},this)).prop("disabled", true );

		// Inject the DELETE Button
		//
		this.deleteButton  = $("<button class='ion-android-close icon'></button>");
		this.html.append(this.deleteButton);
		this.deleteButton.button().click($.proxy(function(){
			var node = this.view.getPrimarySelection();
			var command= new draw2d.command.CommandDelete(node);
			this.view.getCommandStack().execute(command);
		},this)).prop( "disabled", true );


		// Inject the DELETE Button
		//
		this.shareButton  = $("<button class='ion-android-share-alt icon'></button>");
		this.html.append(this.shareButton);
		this.shareButton.button().click($.proxy(function(){
			new sankey.dialog.FileShare().show();
		},this));

	},

	/**
	 * @method
	 * Called if the selection in the cnavas has been changed. You must register this
	 * class on the canvas to receive this event.
	 *
     * @param {draw2d.Canvas} emitter
     * @param {Object} event
     * @param {draw2d.Figure} event.figure
	 */
	onSelectionChanged : function(emitter, event){
		this.deleteButton.prop("disabled", event.figure===null );
	},
	
	/**
	 * @method
	 * Sent when an event occurs on the command stack. draw2d.command.CommandStackEvent.getDetail() 
	 * can be used to identify the type of event which has occurred.
	 * 
	 * @template
	 * 
	 * @param {draw2d.command.CommandStackEvent} event
	 **/
	stackChanged:function(event)
	{
		this.undoButton.prop("disabled", !event.getStack().canUndo() );
		this.redoButton.prop("disabled", !event.getStack().canRedo() );
	}
});