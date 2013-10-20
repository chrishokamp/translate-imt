var TargetTextareaView = Backbone.View.extend({
	el : ".TargetTextareaView"
});

TargetTextareaView.prototype.KEY = {
	TAB : 9,
	ENTER : 13
};

TargetTextareaView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.textarea = this.container.append( "textarea" ).call( this.__textareaRenderOnce.bind(this) );
	this.listenTo( this.model, "change:userText change:hasFocus", this.render.bind(this) );
};

TargetTextareaView.prototype.render = function() {
	var userText = this.model.get( "userText" );
	if ( userText !== this.textarea[0][0].value ) {
		this.textarea[0][0].value = userText;
	}
	this.textarea.call( this.__textareaRenderAlways.bind(this) );
};

TargetTextareaView.prototype.__textareaRenderOnce = function( elem ) {
	var onFocus = function() { 
		this.model.set( "hasFocus", true );
	}.bind(this);
	var onBlur = function() { 
		this.model.set( "hasFocus", false );
	}.bind(this);
	var onKeyDown = function() {
		var keyCode = d3.event.keyCode;
		if ( keyCode === this.KEY.ENTER || keyCode === this.KEY.TAB ) {
			d3.event.preventDefault();
			d3.event.cancelBubble = true;
		}
		else {
			if ( this.__continuousKeyPress ) {
				var userText = this.textarea[0][0].value;
				var caretIndex = this.textarea[0][0].selectionEnd;
				this.model.set({
					"userText" : userText,
					"caretIndex" : caretIndex
				});
			}
		}
		this.__continuousKeyPress = true;
	}.bind(this);
	var onKeyUp = function() {
		var keyCode = d3.event.keyCode;
		if ( keyCode === this.KEY.ENTER ) {
			var segmentId = this.model.get( "segmentId" );
			if ( d3.event.shiftKey ) {
				this.model.trigger( "keyPress:enter+shift", segmentId )
			}
			else if ( !d3.event.shiftKey && !d3.event.metaKey && !d3.event.ctrlKey && !d3.event.altKey && !d3.event.altGraphKey ) {
				this.model.trigger( "keyPress:enter", segmentId );
			}
		}
		else if ( keyCode === this.KEY.TAB ) {
			var segmentId = this.model.get( "segmentId" );
			this.model.trigger( "keyPress:tab", segmentId );
		}
		else {
			var userText = this.textarea[0][0].value;
			var caretIndex = this.textarea[0][0].selectionEnd;
			this.model.set({
				"userText" : userText,
				"caretIndex" : caretIndex
			});
		}
		this.__continuousKeyPress = false;
	}.bind(this);
	var onMouseDown = function() {
		var caretIndex = this.textarea[0][0].selectionEnd;
		this.model.set({
			"caretIndex" : caretIndex
		});
	}.bind(this);
	elem.style( "width", (this.model.WIDTH-75) + "px" )
		.style( "min-height", this.model.MIN_HEIGHT + "px" )
		.style( "padding", "12.5px 60px 20px 15px" )  // "2.5px 60px 15px 15px"
		.style( "border", "none" )
		.style( "outline", "none" )
		.style( "background", "#eee" )
		.style( "resize", "none" )
		.classed( "UserText", true )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "focus", onFocus )
		.on( "blur", onBlur )
		.on( "keydown", onKeyDown )
		.on( "keyup", onKeyUp )
		.on( "click", onMouseDown )
};
TargetTextareaView.prototype.__textareaRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.style( "background", hasFocus ? "#fff" : "#eee" )
		.style( "resize", hasFocus ? "vertical" : "none" )
};
