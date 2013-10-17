var TargetTextareaView = Backbone.View.extend({
	el : ".TargetTextareaView"
});

TargetTextareaView.prototype.WIDTH = 775;
TargetTextareaView.prototype.MIN_HEIGHT = 20;
TargetTextareaView.prototype.ANIMATION_DURATION = 120;
TargetTextareaView.prototype.KEY = {
	TAB : 9,
	ENTER : 13
};

TargetTextareaView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.textarea = this.container.append( "textarea" ).call( this.__renderOnce.bind(this) );

	this.listenTo( this.model, "change:userText change:hasFocus", this.render.bind(this) );
};

TargetTextareaView.prototype.render = function() {
	this.textarea.call( this.__renderAlways.bind(this) );
	var userText = this.model.get( "userText" );
	if ( userText !== this.textarea[0][0].value ) {
		this.textarea[0][0].value = userText;
	}
};

TargetTextareaView.prototype.focus = function() {
	this.textarea[0][0].focus();
};

TargetTextareaView.prototype.__renderOnce = function( elem ) {
	var setFocus = function( hasFocus ) {
		this.model.set({
			"hasFocus" : hasFocus
		})
	}.bind(this);
	var setFocusDebounced = _.debounce( setFocus, 100 ); 
	var onFocus = function() { setFocusDebounced( true ) }.bind(this);
	var onBlur = function() { setFocusDebounced( false ) }.bind(this);
	var onKeyDown = function() {
		var keyCode = d3.event.keyCode;
		if ( keyCode === this.KEY.ENTER || keyCode === this.KEY.TAB ) {
			d3.event.preventDefault();
			d3.event.cancelBubble = true;
		}
		else {
			if ( this.__isContinuousKeyPress === true ) {
				var segmentId = this.model.get( "segmentId" );
				this.trigger( "keyPress:*", segmentId, d3.event.srcElement.value, d3.event.srcElement.selectionStart );
			}
		}
		this.__isContinuousKeyPress = true;
	}.bind(this);
	var onKeyUp = function() {
		var segmentId = this.model.get( "segmentId" );
		var keyCode = d3.event.keyCode;
		this.__isContinuousKeyPress = false;
		if ( keyCode === this.KEY.ENTER ) {
			if ( d3.event.shiftKey ) {
				this.trigger( "keyPress:enter+shift", segmentId )
			}
			else if ( !d3.event.shiftKey && !d3.event.metaKey && !d3.event.ctrlKey && !d3.event.altKey && !d3.event.altGraphKey ) {
				this.trigger( "keyPress:enter", segmentId );
			}
		}
		else if ( keyCode === this.KEY.TAB ) {
			this.trigger( "keyPress:tab", segmentId );
		}
		else {
			var segmentId = this.model.get( "segmentId" );
			this.trigger( "keyPress:*", segmentId, d3.event.srcElement.value, d3.event.srcElement.selectionStart );
		}
	}.bind(this);
	var onMouseDown = function() {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "mouseDown:*", segmentId );
	}.bind(this);
	elem.style( "width", (this.WIDTH-75) + "px" )
		.style( "min-height", this.MIN_HEIGHT + "px" )
		.style( "border", "none" )
		.style( "outline", "none" )
		.style( "padding", "2.5px 60px 15px 15px" )
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
TargetTextareaView.prototype.__renderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.style( "background", hasFocus ? "#fff" : "#eee" )
		.style( "resize", hasFocus ? "vertical" : "none" )
		//.transition().duration( this.ANIMATION_DURATION )
		.style( "padding-top", hasFocus ? "12.5px" : "2.5px" )
		.style( "padding-bottom", hasFocus ? "20px" : "15px" );
};
