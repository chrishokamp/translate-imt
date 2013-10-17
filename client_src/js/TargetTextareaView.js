var TargetTextareaView = Backbone.View.extend({
	el : ".TargetTextareaView"
});

TargetTextareaView.prototype.KEY = {
	TAB : 9,
	ENTER : 13
};

TargetTextareaView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" ).style( "cursor", "text" );
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

TargetTextareaView.prototype.focus = function() {
	this.textarea[0][0].focus();
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
	}.bind(this);
	var onKeyUp = function() {
		var keyCode = d3.event.keyCode;
		if ( keyCode === this.KEY.ENTER ) {
			var segmentId = this.model.get( "segmentId" );
			if ( d3.event.shiftKey ) {
				this.trigger( "keyPress:enter+shift", segmentId )
			}
			else if ( !d3.event.shiftKey && !d3.event.metaKey && !d3.event.ctrlKey && !d3.event.altKey && !d3.event.altGraphKey ) {
				this.trigger( "keyPress:enter", segmentId );
			}
		}
		else if ( keyCode === this.KEY.TAB ) {
			var segmentId = this.model.get( "segmentId" );
			this.trigger( "keyPress:tab", segmentId );
		}
		else {
			var userText = this.textarea[0][0].value;
			var caretIndex = this.textarea[0][0].selectionEnd;
			this.model.set({
				"userText" : userText,
				"caretIndex" : caretIndex
			});
		}
	}.bind(this);
	var onMouseDown = function() {
		var caretIndex = this.textarea[0][0].selectionEnd;
		this.model.set({
			"caretIndex" : caretIndex
		});
	}.bind(this);
	var onMouseOver = function() {
	}.bind(this);
	var onMouseOut = function() {
	}.bind(this);
	elem.style( "width", (this.model.WIDTH-75) + "px" )
		.style( "min-height", this.model.MIN_HEIGHT + "px" )
		.style( "padding", "2.5px 60px 15px 15px" )
		.style( "background", "#eee" )
		.style( "outline", "none" )
		.style( "border", "none" )
		.style( "resize", "none" )
		.classed( "UserText", true )
		.style( "pointer-events", "auto" )
		.on( "focus", onFocus )
		.on( "blur", onBlur )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut )
		.on( "keydown", onKeyDown )
		.on( "keyup", onKeyUp )
		.on( "click", onMouseDown )
};
TargetTextareaView.prototype.__textareaRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.style( "background", hasFocus ? "#fff" : "#eee" )
		.style( "resize", hasFocus ? "vertical" : "none" )
		.transition().duration( this.model.ANIMATION_DURATION )
			.style( "padding-top", hasFocus ? "12.5px" : "2.5px" )
			.style( "padding-bottom", hasFocus ? "20px" : "15px" );
};
