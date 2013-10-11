var TargetTypingView = Backbone.View.extend({
	el : ".TargetTypingView"
});

TargetTypingView.prototype.KEY = {
	BACKSPACE : 8,
	TAB : 9,
	ENTER : 13,
	TICK : 192,
	WHITESPACE : 32,
	RIGHT_ARROW : 39,
	LEFT_ARROW : 37
};
TargetTypingView.prototype.WIDTH = 750;
TargetTypingView.prototype.HEIGHT = 100;
TargetTypingView.prototype.USER_COLOR = "#08519C";
TargetTypingView.prototype.MT_COLOR = "#4292C6";
TargetTypingView.prototype.INACIVE_COLOR = "#C6DBEF";
TargetTypingView.prototype.BLINK_CYCLE = 500; // Duration of a caret blink in milliseconds

TargetTypingView.prototype.initialize = function( options ) {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.canvas = this.views.container.append( "div" ).style( "position", "absolute" );
	this.views.capture = this.views.container.append( "div" ).attr( "class", "Capture" ).call( this.__captureRenderOnce.bind(this) );
	this.views.caret = this.views.container.append( "div" ).attr( "class", "Caret" ).call( this.__caretRenderOnce.bind(this) );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );

	this.listenTo( this.model, "modified", this.render );
};

TargetTypingView.prototype.render = function() {
	var allTokens = this.model.get( "allTokens" );
	var elems = this.views.overlay.selectAll( "span.Token" ).data( allTokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__tokenRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenFirstTerm" ).call( this.__tokenFirstTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSecondTerm" ).call( this.__tokenSecondTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__tokenSepRenderOnce.bind(this) );
	elems.exit().remove();
	
	this.views.capture.call( this.__captureRenderAlways.bind(this) );
	this.views.overlay.call( this.__overlayRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__tokenRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenFirstTerm" ).call( this.__tokenFirstTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSecondTerm" ).call( this.__tokenSecondTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__recordFirstActiveTokenCoords.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSecondTerm" ).call( this.__recordCaretTokenCoords.bind(this) );
	this.views.caret.call( this.__caretRenderAlways.bind(this) );
	
	window.setTimeout( function(f){f()}, 50, function() {
		this.model.postProcess();
	}.bind(this) );
};

TargetTypingView.prototype.__captureRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "opacity", 0 )
		.style( "z-index", 0 )
		.style( "width", this.WIDTH + "px" )
		.style( "height", this.HEIGHT + "px" )
		.append( "textarea" )
			.classed( "TargetLang", true )
			.style( "padding", 9 + "px" )
			.style( "width", (this.WIDTH-20) + "px" )
			.style( "height", (this.HEIGHT-20) + "px" )
			.style( "word-spacing", "0.1em" )
			.style( "pointer-events", "auto" )
			.on( "mousedown", this.__onCaptureMouseDown.bind(this) )
			.on( "keydown", this.__onKeyDown.bind(this) )
			.on( "keyup", this.__onKeyUp.bind(this) );
};
TargetTypingView.prototype.__captureRenderAlways = function( elem ) {
	var hadFocus = this.model.get( "hadFocus" );
	var hasFocus = this.model.get( "hasFocus" );
	var userText = this.model.get( "userText" );
	elem.style( "visibility", hasFocus ? "visible" : "hidden" );
	var textarea = elem.select( "textarea" )[0][0];
//	if ( hadFocus !== hasFocus && hasFocus ) {
	if ( hasFocus ) {
		textarea.focus();
	}
	if ( userText !== textarea.value ) {
		textarea.value = userText;
	}
};
TargetTypingView.prototype.__onCaptureMouseDown = function() {
	var segmentId = this.model.get( "segmentId" );
	this.trigger( "mouseDown:*", segmentId );
};
TargetTypingView.prototype.__onKeyDown = function() {
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
};
TargetTypingView.prototype.__onKeyUp = function() {
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
		var matchingTranslations = this.model.get( "matchingTranslations" );
		if ( matchingTranslations.length > 0 ) {
			var bestMatchingTranslation = matchingTranslations[0];
			this.trigger( "keyPress:tab", segmentId, bestMatchingTranslation );
		}
	}
	else {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "keyPress:*", segmentId, d3.event.srcElement.value, d3.event.srcElement.selectionStart );
	}
};

TargetTypingView.prototype.__overlayRenderOnce = function( elem ) {
	elem.style( "z-index", 50 )
		.style( "padding", "10px" )
		.style( "width", this.WIDTH + "px" )
		.style( "min-height", this.HEIGHT + "px" )
		.classed( "TargetLang", true )
		.style( "word-spacing", "0.1em" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mousedown", this.__onOverlayMouseDown.bind(this) );
};
TargetTypingView.prototype.__overlayRenderAlways = function( elem ) {
	var hadFocus = this.model.get( "hadFocus" );
	var hasFocus = this.model.get( "hasFocus" );
	elem.style( "background", hasFocus ? "#fff" : "#eee" )
		.style( "border", hasFocus ? "1px solid #ccc" : "1px solid #eee" )
	if ( hadFocus !== hasFocus ) {
		if ( hasFocus ) {
			elem//.transition().ease( "linear" ).duration( 125 )
				.style( "min-height", this.HEIGHT + "px" );
		}
		else {
			elem//.transition().ease( "linear" ).duration( 125 )
				.style( "min-height", 0 + "px" );
		}
	}
};
TargetTypingView.prototype.__onOverlayMouseDown = function() {
	var segmentId = this.model.get( "segmentId" );
	this.trigger( "mouseDown:*", segmentId );
};

TargetTypingView.prototype.__caretRenderOnce = function( elem ) {
	elem.style( "z-index", 100 )
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.style( "opacity", 1 )
		.append( "span" )
			.style( "display", "inline-block" )
			.style( "width", "1px" )
			.style( "height", "13px" )
			.style( "background", "#000" )
			.style( "opacity", 1 );
	window.setInterval( function(f){f()}, this.BLINK_CYCLE, function() {
		this.views.caret.select( "span" ).style( "opacity", this.views.showCaret === true ? 1 : 0 );
		this.views.showCaret = ! ( this.views.showCaret === true );
	}.bind(this) );
};
TargetTypingView.prototype.__caretRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	var xCoord = this.model.get( "caretXCoord" );
	var yCoord = this.model.get( "caretYCoord" );
	elem.style( "opacity", hasFocus ? 1 : 0 )
		.style( "left", xCoord + "px" )
		.style( "top", (yCoord+3) + "px" )
};

TargetTypingView.prototype.__tokenRenderOnce = function() {};
TargetTypingView.prototype.__tokenRenderAlways = function() {};
TargetTypingView.prototype.__recordFirstActiveTokenCoords = function( elem ) {
	var thisModel = this.model;
	elem.filter( function(d) { return d.isFirstActive } )
		.each( function(d) {
			thisModel.set({
				"activeXCoord" : d3.select(this)[0][0].offsetLeft,
				"activeYCoord" : d3.select(this)[0][0].offsetTop
			});
		});
};

TargetTypingView.prototype.__tokenFirstTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.style( "color", this.USER_COLOR )
};
TargetTypingView.prototype.__tokenFirstTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.text( function(d) { return d.firstTerm } )
		.style( "border-bottom", function(d) { return ( hasFocus && d.isActive ) ? "1px solid " + this.USER_COLOR : null }.bind(this) )
};

TargetTypingView.prototype.__tokenSecondTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
};
TargetTypingView.prototype.__tokenSecondTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.text( function(d) { return d.secondTerm } )
		.style( "border-bottom", function(d) { return ( hasFocus && d.isActive ) ? "1px solid " + this.MT_COLOR : null }.bind(this) )
		.style( "color", function() { return hasFocus ? this.MT_COLOR : this.INACIVE_COLOR }.bind(this) )
};
TargetTypingView.prototype.__recordCaretTokenCoords = function( elem ) {
	var thisModel = this.model;
	elem.filter( function(d) { return d.hasCaret } )
		.each( function(d) {
			thisModel.set({
				"caretXCoord" : d3.select(this)[0][0].offsetLeft,
				"caretYCoord" : d3.select(this)[0][0].offsetTop
			});
		});
};

TargetTypingView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
};
TargetTypingView.prototype.__tokenSepRenderAlways = function( elem ) {
	elem.text( function(d) { return d.sep } );
};
