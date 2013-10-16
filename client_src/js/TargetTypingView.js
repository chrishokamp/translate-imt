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
TargetTypingView.prototype.WIDTH = 775;
TargetTypingView.prototype.EXPANDED_HEIGHT = 100;

TargetTypingView.prototype.USER_COLOR = "#4292C6";
TargetTypingView.prototype.MT_COLOR = "#4292C6";
TargetTypingView.prototype.DIM_COLOR = "#C6DBEF";

TargetTypingView.prototype.BLINK_CYCLE = 500; // Duration of a caret blink in milliseconds

TargetTypingView.prototype.ANIMATION_DURATION = 120;

TargetTypingView.prototype.initialize = function( options ) {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.canvas = this.views.container.append( "div" ).style( "position", "absolute" );
	this.views.caret = this.views.canvas.append( "div" ).style( "position", "absolute" ).attr( "class", "Caret" ).call( this.__caretRenderOnce.bind(this) );
	this.views.capture = this.views.container.append( "div" ).attr( "class", "Capture" ).call( this.__captureRenderOnce.bind(this) );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );

	this.listenTo( this.model, "modified", this.render );
};

TargetTypingView.prototype.render = function() {
	// Reset all screen coordinates
	this.model.set({
		"caretXCoord" : null,
		"caretYCoord" : null,
		"activeXCoord" : null,
		"activeYCoord" : null,
		"clickTokenIndex" : null,
		"clickCharIndex" : null
	})
	
	// Add or remove HTML elements
	var allTokens = this.model.get( "allTokens" );
	var elems = this.views.overlay.selectAll( "span.Token" ).data( allTokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__tokenRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenFirstTerm" ).call( this.__tokenFirstTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSecondTerm" ).call( this.__tokenSecondTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__tokenSepRenderOnce.bind(this) );
	elems.exit().remove();
	
	// Render all HTML elements except caret
	this.views.capture.call( this.__captureRenderAlways.bind(this) );
	this.views.overlay.call( this.__overlayRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__tokenRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenFirstTerm" ).call( this.__tokenFirstTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSecondTerm" ).call( this.__tokenSecondTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepRenderAlways.bind(this) );
	
	// Capture screen coordinates
	this.__recordFirstActiveTokenCoords();
	this.__recordCaretTokenCoords();
	
	// Render caret
	this.views.caret.call( this.__caretRenderAlways.bind(this) );
	
	// Update states that are dependent on screen coordinates
	this.model.postProcess();
};

TargetTypingView.prototype.__caretRenderOnce = function( elem ) {
	elem.style( "z-index", 100 )
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
		.style( "top", yCoord + "px" )
};

TargetTypingView.prototype.__captureRenderOnce = function( elem ) {
	var onFocus = function() {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "focus", segmentId );
	}.bind(this);
	var onBlur = function() {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "blur", segmentId );
	}.bind(this);
	elem.style( "opacity", 0 )
		.style( "width", 0 )
		.style( "height", 0 )
		.append( "textarea" )
			.on( "focus", onFocus )
			.on( "blur", onBlur )
			.on( "keydown", this.__onKeyDown.bind(this) )
			.on( "keyup", this.__onKeyUp.bind(this) );
};
TargetTypingView.prototype.__captureRenderAlways = function( elem ) {
	var hadFocus = this.model.get( "hadFocus" );
	var hasFocus = this.model.get( "hasFocus" );
	var userText = this.model.get( "userText" );
	var textarea = elem.select( "textarea" )[0][0];
	if ( hasFocus ) {
		textarea.focus();
	}
	if ( userText !== textarea.value ) {
		textarea.value = userText;
	}
};

TargetTypingView.prototype.__overlayRenderOnce = function( elem ) {
	var onMouseDown = function() {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "mouseDown:*", segmentId );
	}.bind(this);
	elem.style( "width", (this.WIDTH-75) + "px" )
		.style( "min-height", this.EXPANDED_HEIGHT + "px" )
		.style( "padding", "2.5px 60px 15px 15px" )
		.classed( "TargetLang", true )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "click", onMouseDown );
};
TargetTypingView.prototype.__overlayRenderAlways = function( elem ) {
	var hadFocus = this.model.get( "hadFocus" );
	var hasFocus = this.model.get( "hasFocus" );
	elem.style( "background", hasFocus ? "#fff" : "#eee" )
	if ( hadFocus !== hasFocus ) {
		if ( hasFocus ) {
			elem.transition().ease( "linear" ).duration( this.ANIMATION_DURATION )
				.style( "min-height", this.EXPANDED_HEIGHT + "px" )
				.style( "padding-top", "12.5px" )
				.style( "padding-bottom", "30px" )
		}
		else {
			elem.transition().ease( "linear" ).duration( this.ANIMATION_DURATION )
				.style( "min-height", 0 + "px" )
				.style( "padding-top", "2.5px" )
				.style( "padding-bottom", "15px" )
		}
	}
};

TargetTypingView.prototype.__tokenRenderOnce = function( elem ) {
	var onMouseDown = function( token, tokenIndex ) {
		var segmentId = this.model.get( "segmentId" );
		var charIndex = token.endCharIndex;
		this.trigger( "mouseDown:token", segmentId, tokenIndex, charIndex );
	}.bind(this);
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "click", onMouseDown );
};
TargetTypingView.prototype.__tokenRenderAlways = function() {};

TargetTypingView.prototype.__tokenFirstTermRenderOnce = function( elem ) {
	elem.style( "vertical-align", "top" )
		.style( "font-family", "NeutraBold" )
};
TargetTypingView.prototype.__tokenFirstTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		elem.text( function(d) { return d.firstTerm } )
			.style( "border-bottom", function(d) { return d.isActive ? "1px solid " + this.USER_COLOR : "1px solid #fff" }.bind(this) )
			.style( "color", this.USER_COLOR )
	}
	else {
		elem.text( function(d) { return d.firstTerm } )
			.style( "border-bottom", "1px solid #eee" )
			.style( "color", this.USER_COLOR )
//			.style( "color", this.DIM_COLOR )
	}
};

TargetTypingView.prototype.__tokenSecondTermRenderOnce = function( elem ) {
	elem.style( "vertical-align", "top" )
};
TargetTypingView.prototype.__tokenSecondTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		elem.text( function(d) { return d.secondTerm } )
			.style( "border-bottom", function(d) { return d.isActive ? "1px solid " + this.MT_COLOR : "1px solid #fff" }.bind(this) )
			.style( "color", this.MT_COLOR )
	}
	else {
		elem.text( function(d) { return d.secondTerm } )
			.style( "border-bottom", "1px solid #eee" )
			.style( "color", this.MT_COLOR )
//			.style( "color", this.DIM_COLOR )
	}
};

TargetTypingView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "vertical-align", "top" )
};
TargetTypingView.prototype.__tokenSepRenderAlways = function( elem ) {
	elem.text( function(d) { return d.sep } );
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

TargetTypingView.prototype.__recordFirstActiveTokenCoords = function() {
	var activeLeft = 0;
	var activeTop = 0;
	this.views.overlay.selectAll( "span.Token" )
		.filter( function(d) { return d.isFirstActive || d.hasCaret } )
			.each( function(d) {
				activeLeft = d3.select(this)[0][0].offsetLeft;
				activeTop = d3.select(this)[0][0].offsetTop;
			});
	this.model.set({
		"activeXCoord" : activeLeft,
		"activeYCoord" : activeTop
	});
};

TargetTypingView.prototype.__recordCaretTokenCoords = function( elem ) {
	var canvasLeft = this.views.canvas[0][0].offsetLeft;
	var canvasTop = this.views.canvas[0][0].offsetTop;
	var caretLeft = 0;
	var caretTop = canvasTop;
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSecondTerm" )
		.filter( function(d) { return d.hasCaret } )
			.each( function(d) {
				caretLeft = d3.select(this)[0][0].offsetLeft;
				caretTop = d3.select(this)[0][0].offsetTop;
			});
	this.model.set({
		"caretXCoord" : caretLeft - canvasLeft,
		"caretYCoord" : caretTop - canvasTop
	});
};
