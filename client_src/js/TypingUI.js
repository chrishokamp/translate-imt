/**
 * By default, the visualization will be rendered in HTML element "div.TypingUI"
 * Pass a selector as the first argument, i.e. { "el" : selector }, to change the default behavior.
 * @param {Object} options Backbone view options.
 * @constructor
 **/
var TypingUI = Backbone.View.extend({
	el : "div.TypingUI"
});

TypingUI.prototype.initialize = function( options ) {
	this.model = options.model;
	this.state = this.model.state;
	this.__width = 720;
	this.__height = 80;
	this.__initViews();
	this.__setViewAttributes();
	this.__setViewDimensions();
	this.listenTo( this.model, "modified", this.render );
};

TypingUI.prototype.FONT_FAMILY = "Gill Sans, Helvetica Neue, sans-serif";
TypingUI.prototype.FONT_SIZE = 14;    // Font height in pixels
TypingUI.prototype.DEFAULT_COLOR = "#333";
TypingUI.prototype.DEFAULT_BACKGROUND = "#fff";
TypingUI.prototype.ACTIVE_COLOR = "#1f77b4";   // Dark blue
TypingUI.prototype.MT_COLOR = "#aec7e8";       // Light blue
TypingUI.prototype.EXPIRED_COLOR = "#d9d9d9";  // Grey
TypingUI.prototype.SELECTION_BACKGROUND = "#ffbb78";
TypingUI.prototype.BLINK_CYCLE = 500; // Duration of a caret blink in milliseconds

TypingUI.prototype.TAB_ICON = "icon-angle-up";
TypingUI.prototype.TAB_ACTIVE_ICON = "icon-caret-up";

/** @private **/
TypingUI.prototype.DEBUG = false;

/**
 * Generate debugging message to javascript console.
 * @private
 **/
TypingUI.prototype.CONSOLE_LOGS = false;

/**
 * Generate user interaction log events
 * @private
 **/
TypingUI.prototype.UI_LOGS = false;

TypingUI.prototype.__initViews = function() {
	this.view = {};
	this.view.container = d3.select( this.el );
	this.view.canvas = this.view.container.append( "div" );
	this.view.capture = this.view.canvas.append( "textarea" ).attr( "class", "Capture" );
	this.view.dimensions = this.view.canvas.append( "div" ).attr( "class", "Dimensions" );
	this.view.overlay = this.view.canvas.append( "div" ).attr( "class", "Overlay" );
	this.view.tabs = this.view.canvas.append( "div" ).attr( "class", "TabIndicators" );
	this.view.suggestionBox = this.view.canvas.append( "div" ).attr( "class", "SuggestionBox" );
	this.view.suggestions = this.view.canvas.append( "div" ).attr( "class", "Suggestions" );
	this.view.caret = this.view.canvas.append( "div" ).attr( "class", "Caret" );
};

TypingUI.prototype.__setViewAttributes = function() {
	this.view.container
		.style( "position", "static" );
	this.view.canvas
		.style( "position", "absolute" );
	this.view.capture
		.style( "position", "absolute" )
		.style( "resize", "none" )
		.call( this.__setFontStyles.bind(this) )
		.on( "focus", this.__onCaptureFocus.bind(this) )
		.on( "blur", this.__onCaptureBlur.bind(this) )
//		.on( "resize", this.__onCaptureResize.bind(this) )      // Not supported in Chrome, Safari, Firefox
		.on( "keydown", this.__onCaptureKeyDown.bind(this) )
		.on( "keypress", this.__onCaptureKeyPress.bind(this) )
		.on( "keyup", this.__onCaptureKeyUp.bind(this) );
	this.view.dimensions
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.call( this.__setFontStyles.bind(this) );
	this.view.overlay
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.call( this.__setFontStyles.bind(this) );
	this.view.tabs
		.style( "position", "absolute" )
		.style( "pointer-events", "none" );
	this.view.suggestionBox
		.style( "position", "absolute" )
		.style( "pointer-events", "none" );
	this.view.suggestions
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.call( this.__setFontStyles.bind(this) );
	this.view.caret
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.style( "opacity", 0 )
	window.setInterval( function(f){f()}, this.BLINK_CYCLE, function() {
		this.view.caret.selectAll( "span" ).style( "opacity", this.view.showCaret === true ? 1 : 0 )
		this.view.showCaret = ! ( this.view.showCaret === true );
	}.bind(this) );
};

TypingUI.prototype.__setFontStyles = function( elem ) {
	elem.style( "font-family", this.FONT_FAMILY )
		.style( "font-size", this.FONT_SIZE + "px" )
		.style( "vertical-align", "top" )
};

TypingUI.prototype.__getViewDimensions = function() {
	this.__width = this.view.capture[0][0].offsetWidth + 6;
	this.__height = this.view.capture[0][0].offsetHeight + 6;
};

TypingUI.prototype.__setViewDimensions = function() {
	var overlayDimensions = function( elem ) {
		elem.style( "padding", "10px" )
			.style( "width", ( this.__width - 22 ) + "px" )
			.style( "height", ( this.__height - 22 ) + "px" )
			.style( "user-select", "none" )
			.style( "-webkit-touch-callout", "none" )
			.style( "-webkit-user-select", "none" )
			.style( "-khtml-user-select", "none" )
			.style( "-moz-user-select", "none" )
			.style( "-ms-user-select", "none" );
	}.bind(this);
	
	this.view.container
		.style( "width", this.__width + "px" )
		.style( "height", ( this.DEBUG ? this.__height * 3 : this.__height ) + "px" );
	this.view.capture
		.style( "top", ( this.DEBUG ? this.__height * 1 : 0 ) + "px" )
		.style( "width", ( this.__width - 6 ) + "px" )
		.style( "height", ( this.__height - 6 ) + "px" )
		.style( "background", this.DEFAULT_BACKGROUND )
		.style( "color", this.DEBUG ? this.DEFAULT_COLOR : this.DEFAULT_BACKGROUND )
		.attr( "spellcheck", false )
		.attr( "autocapitalize", "off" )
		.attr( "autocomplete", "off" )
		.attr( "autocorrect", "off" )
		.attr( "tabindex", 0 )
		.attr( "wrap", "soft" );
	this.view.dimensions
		.call( overlayDimensions )
		.style( "top", ( this.DEBUG ? this.__height * 2 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 );
	this.view.overlay
		.call( overlayDimensions );
	this.view.tabs
		.call( overlayDimensions );
};

TypingUI.prototype.__onCaptureFocus = function() {
	this.view.caret.style( "opacity", 1 );
};

TypingUI.prototype.__onCaptureBlur = function() {
	this.view.caret.style( "opacity", 0 );
};

TypingUI.prototype.__onCaptureResize = function() {
	this.view.__getViewDimensions();
	this.view.__setViewDimensions();
};

TypingUI.prototype.resize = function( debug ) {
	if ( debug === undefined ) { debug = false }
	this.DEBUG = debug;
	this.__setViewDimensions();
};

TypingUI.prototype.render = function() {
	this.__renderCapture();
	this.__renderDimensions();
	this.__renderOverlay();
	this.__renderTabIndicators();
	this.__renderSuggestions();
	this.__renderCaret();
};

TypingUI.prototype.__renderCapture = function() {
	var userText = this.state.getUserText();
	var selectionStart = this.state.get( "selectionStartCharIndex" );
	var selectionEnd = this.state.get( "selectionEndCharIndex" );
	var selectionDirection = this.state.get( "selectionDirection" );
	var self = this.view.capture[0][0];
	if ( self.value !== userText ) {
		self.value = userText;
	}
	if ( self.selectionStart !== selectionStart ) {
		self.selectionStart = selectionStart;
	}
	if ( self.selectionEnd !== selectionEnd ) {
		self.selectionEnd = selectionEnd;
	}
	if ( self.selectionDirection !== selectionDirection ) {
		self.selectionDirection = selectionDirection;
	}
};

TypingUI.prototype.__renderDimensions = function() {
	var allSpanElements = this.model.get( "allSpanElements" );
	var activeSpanElement = this.model.get( "activeSpanElement" );
	var activeSuggestionElements = this.model.get( "activeSuggestionElements" );
	
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		delete span.__left;
		delete span.__top;
		delete span.__width;
	}
	// Render active span element and all translation suggetions
	if ( activeSpanElement ) {
		// Duplicate code from below -->
		var elems = this.view.dimensions.selectAll( "span.wordSpan" ).data( [ activeSpanElement ].concat( activeSuggestionElements ) );
		var enterElems = elems.enter().append( "span" ).attr( "class", "wordSpan" ).style( "vertical-align", "top" ).style( "color", "#d9d9d9" );
		enterElems.append( "span" ).attr( "class", "termSpan" ).style( "vertical-align", "top" );
		enterElems.append( "span" ).attr( "class", "sepSpan" ).style( "vertical-align", "top" );
		elems.exit().remove();
		elems = this.view.dimensions.selectAll( "span.wordSpan" );
		
		var termElems = elems.select( "span.termSpan" ).selectAll( "span.termSegment" ).data( function(d) { return d.termSegments } );
		termElems.enter().append( "span" ).attr( "class", "termSegment segmentSpan" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
		termElems.exit().remove();
		var sepElems = elems.select( "span.sepSpan" ).selectAll( "span.sepSegment" ).data( function(d) { return d.sepSegments } );
		sepElems.enter().append( "span" ).attr( "class", "sepSegment segmentSpan" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
		sepElems.exit().remove();
		
		this.view.dimensions.selectAll( "span.segmentSpan" ).text( function(d) { return d.text } );
		this.view.dimensions.selectAll( "span.segmentSpan" ).call( this.__setSegmentStyles.bind(this) );
		this.view.dimensions.selectAll( "span.wordSpan" ).call( this.__setWordStyles.bind(this) );
		// <-- Duplicate code from below
		this.view.dimensions.selectAll( "span.wordSpan" ).call( this.__getActiveSpanWidth.bind(this) );
	}
};

TypingUI.prototype.__renderOverlay = function() {
	var allSpanElements = this.model.get( "allSpanElements" );

	// Duplicate code above (dimensions:overlay, activeSpanElement:allSpanElements) -->
	var elems = this.view.overlay.selectAll( "span.wordSpan" ).data( allSpanElements );
	var enterElems = elems.enter().append( "span" ).attr( "class", "wordSpan" ).style( "vertical-align", "top" ).style( "color", "#d9d9d9" );
	enterElems.append( "span" ).attr( "class", "termSpan" ).style( "vertical-align", "top" );
	enterElems.append( "span" ).attr( "class", "sepSpan" ).style( "vertical-align", "top" );
	elems.exit().remove();
	elems = this.view.overlay.selectAll( "span.wordSpan" );
	
	var termElems = elems.select( "span.termSpan" ).selectAll( "span.termSegment" ).data( function(d) { return d.termSegments } );
	termElems.enter().append( "span" ).attr( "class", "termSegment segmentSpan" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
	termElems.exit().remove();
	var sepElems = elems.select( "span.sepSpan" ).selectAll( "span.sepSegment" ).data( function(d) { return d.sepSegments } );
	sepElems.enter().append( "span" ).attr( "class", "sepSegment segmentSpan" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
	sepElems.exit().remove();
	this.view.overlay.selectAll( "span.segmentSpan" ).text( function(d) { return d.text } );
	this.view.overlay.selectAll( "span.segmentSpan" ).call( this.__setSegmentStyles.bind(this) );
	this.view.overlay.selectAll( "span.wordSpan" ).call( this.__setWordStyles.bind(this) );
	// <-- Duplicate code above
	this.view.overlay.selectAll( "span.segmentSpan" ).call( this.__getSpanCoords.bind(this) );
	this.view.overlay.selectAll( "span.wordSpan" ).call( this.__getSpanCoords.bind(this) );
};

TypingUI.prototype.__renderTabIndicators = function() {
	var allSpanElements = this.model.get( "allSpanElements" );
	var isExpired = this.state.get( "isExpired" );
	
	var elems = this.view.tabs.selectAll( "span" ).data( allSpanElements );
	elems.enter().append( "span" ).style( "display", "inline-block" ).append( "i" );
	elems.exit().remove();
	elems = this.view.tabs.selectAll( "span" );
	
	var tabElems = this.view.tabs.selectAll( "span" ).filter( function(d) { return d.nextToken !== null } );
	var nonTabElems = this.view.tabs.selectAll( "span" ).filter( function(d) { return d.nextToken === null } );
	tabElems
		.style( "position", "absolute" )
		.style( "left", function(d) { return ( d.nextToken.__left - 2 ) + "px" } )
		.style( "top", function(d) { return ( d.nextToken.__top + 10 ) + "px" } )
		.style( "width", function(d) { return d.nextToken.__width + "px" } )
		.style( "height", this.FONT_SIZE + "px" )
		.style( "opacity", function(d) { return d.atOrAfterCaret ? 1 : 0 } )
		.style( "font-size", "10px" )
		.style( "color", "#333" )
		.selectAll( "i" )
			.attr( "class", function(d) { return d.isActive ? this.TAB_ACTIVE_ICON : this.TAB_ICON }.bind(this) )
			.style( "color", function(d) { return isExpired ? this.EXPIRED_COLOR : ( d.isActive ? this.ACTIVE_COLOR : this.MT_COLOR ) }.bind(this) );
	nonTabElems
		.style( "opacity", 0 )
};

TypingUI.prototype.__renderSuggestions = function() {
	var activeSpanElement = this.model.get( "activeSpanElement" );
	var activeSuggestionElements = this.model.get( "activeSuggestionElements" );
	var suggestionOffset = this.FONT_SIZE + 8;
	var suggestionSpacing = this.FONT_SIZE + 6;

	if ( activeSpanElement ) {
		this.view.suggestionBox
			.style( "left", activeSpanElement.__left + "px" )
			.style( "top", ( activeSpanElement.__top + suggestionOffset ) + "px" )
			.style( "width", activeSpanElement.__width + "px" )
			.style( "height", suggestionSpacing * activeSuggestionElements.length + "px" )
			.style( "background", "#fff" )
			.style( "border-width", "1px" )
			.style( "border-style", "solid" )
			.style( "border-color", this.MT_COLOR )
//			.style( "box-shadow", "1px 1px 4px #2ca02c" )
			.style( "opacity", activeSuggestionElements.length === 0 ? 0 : 1 )
		
		var elems = this.view.suggestions.selectAll( "span" ).data( activeSuggestionElements )
		elems.enter().append( "span" );
		elems.exit().remove();
		
		this.view.suggestions.selectAll( "span" )
			.text( function(d) { return d.term } )
			.style( "position", "absolute" )
			.style( "display", "inline-block" )
			.style( "left", activeSpanElement.__left + "px" )
			.style( "top", function(d,i) { return ( activeSpanElement.__top + suggestionOffset + i * suggestionSpacing + 2 ) + "px" }.bind(this) )
			.style( "width", activeSpanElement.__width + "px" )
			.style( "height", suggestionSpacing + "px" )
			.style( "color", this.MT_COLOR )
			.style( "border-top", function(d,i) { return (i===0) ? "none" : "1px solid #ccc" } )
	}
};

TypingUI.prototype.__renderCaret = function() {
	var caretSpanSegment = this.model.get( "caretSpanSegment" );

	var elems = this.view.caret.selectAll( "span" ).data( [ caretSpanSegment ] );
	elems.enter().append( "span" );
	elems.exit().remove();
	
	this.view.caret
		.style( "position", "absolute" )
		.style( "display", "inline-block" )
		.style( "width", "1px" )
		.style( "height", this.FONT_SIZE + "px" )
		.style( "background", "#000" )
		.style( "left", caretSpanSegment.__left + "px" )
		.style( "top", ( caretSpanSegment.__top + 3 ) + "px" )
};

TypingUI.prototype.__setSegmentStyles = function( elem ) {
	var isExpired = this.state.get( "isExpired" );
	var setUserStyles = function( elem ) {
		elem.style( "color", this.DEFAULT_COLOR )
			.style( "background", function(d) { return d.isSelected ? this.SELECTION_BACKGROUND : null }.bind(this) );
	};
	var setActiveMtStyles = function( elem ) {
		elem.style( "color", this.ACTIVE_COLOR )
			.style( "background", function(d) { return d.isSelected ? this.SELECTION_BACKGROUND : null }.bind(this) );
	};
	var setMtStyles = function( elem ) {
		elem.transition().style( "color", this.MT_COLOR )
			.style( "background", function(d) { return d.isSelected ? this.SELECTION_BACKGROUND : null }.bind(this) );
	};
	var setExpiredMtStyles = function( elem ) {
		elem.style( "color", this.EXPIRED_COLOR )
			.style( "background", function(d) { return d.isSelected ? this.SELECTION_BACKGROUND : null }.bind(this) );
	};
	elem.filter( function(d) { return   d.isUser                                } ).call( setUserStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser &&   isExpired                 } ).call( setExpiredMtStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser && ! isExpired &&   d.isActive } ).call( setActiveMtStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser && ! isExpired && ! d.isActive } ).call( setMtStyles.bind(this) );
};

TypingUI.prototype.__setWordStyles = function( elem ) {
	var isExpired = this.state.get( "isExpired" );
	var setActiveStyles = function( elem ) {
		elem.select( ".term" )
			.style( "border-bottom-width", "1px" )
			.style( "border-bottom-style", "dotted" )
			.style( "border-bottom-color", this.ACTIVE_COLOR );
	};
	var setUserStyles = function( elem ) {
		elem.select( ".term" ).style( "border", "none" );
	};
	var setExpiredStyles = function( elem ) {
		elem.select( ".term" ).style( "border", "none" )
	};
	var setMtStyles = function( elem ) {
		elem.select( ".term" ).style( "border", "none" )
	};
	elem.filter( function(d) { return   d.isUser                                } ).call( setUserStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser &&   isExpired                 } ).call( setExpiredStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser && ! isExpired &&   d.isActive } ).call( setActiveStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser && ! isExpired && ! d.isActive } ).call( setMtStyles.bind(this) );
};

TypingUI.prototype.__getActiveSpanWidth = function( elem ) {
	var widths = [];
	elem.each( function(d) {
		var self = d3.select(this)[0][0];
		widths.push( self.offsetWidth );
	});
	elem.each( function(d) {
		d.__width = Math.max.apply( Math, widths );
	});
};

TypingUI.prototype.__getSpanCoords = function( elem ) {
	elem.each( function(d) {
		var self = d3.select(this)[0][0];
		if ( d.hasOwnProperty( "__width" ) ) {
			d3.select(this).style( "display", "inline-block" ).style( "width", d.__width + "px" );
			d.__left = self.offsetLeft;
			d.__top = self.offsetTop;
		}
		else {
			d3.select(this).style( "display", null ).style( "width", null );
			d.__left = self.offsetLeft;
			d.__top = self.offsetTop;
			d.__width = self.offsetWidth;
		}
	});
};

TypingUI.prototype.__setSpanCoords = function( elem ) {
	var height = this.FONT_SIZE;
	elem.style( "left", function(d) { return d.__left + "px" } )
		.style( "top", function(d) { return d.__top + "px" } )
		.style( "width", function(d) { return d.__width + "px" } )
		.style( "height", height + "px" )
};

TypingUI.prototype.KEY = {
	TICK : 192,
	TAB : 9,
	WHITESPACE : 32,
	RIGHT_ARROW : 39,
	LEFT_ARROW : 37,
	BACKSPACE : 8
};

TypingUI.prototype.__onCaptureKeyDown = function() {
	if ( d3.event.keyCode === this.KEY.TAB ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
	else if ( d3.event.keyCode === this.KEY.TICK ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
/*
	else if ( d3.event.keyCode === this.KEY.RIGHT_ARROW || d3.event.keyCode === this.KEY.LEFT_ARROW ) {
		var self = this.view.capture[0][0];
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		var selectionCharIndex = ( self.selectionDirection !== "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		this.state.updateCaret( caretCharIndex, selectionCharIndex );
		this.view.caret.selectAll( "span" ).style( "opacity", 1 )
		this.view.showCaret = false;
	}
*/
};

TypingUI.prototype.__onCaptureKeyPress = function() {
	if ( d3.event.keyCode === this.KEY.TAB ) {
	}
	else if ( d3.event.keyCode === this.KEY.TICK ) {
	}
};

TypingUI.prototype.__onCaptureKeyUp = function() {
	if ( d3.event.keyCode === this.KEY.TAB ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;

		var activeSpanElement = this.model.get( "activeSpanElement" );
		var self = this.view.capture[0][0];
		var spanStartCharIndex = activeSpanElement.startCharIndex;
		var spanEndCharIndex = activeSpanElement.endCharIndex;
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		if ( self.value.substring( spanStartCharIndex, caretCharIndex ) === activeSpanElement.mtTerm.substr( 0, caretCharIndex - spanStartCharIndex ) ) {
			var substr = activeSpanElement.mtTerm.substr( caretCharIndex - spanStartCharIndex ) + activeSpanElement.mtSep;
			if ( substr.length > 0 ) {
				this.state.updateUserText( self.value + substr, caretCharIndex + substr.length );
			}
			else {
				if ( activeSpanElement.nextToken !== null ) {
					this.state.updateUserText( self.value + activeSpanElement.mtSep + activeSpanElement.nextToken.mtTerm, caretCharIndex + activeSpanElement.mtSep.length + activeSpanElement.nextToken.mtTerm.length );
				}
			}
		}
	}
	else if ( d3.event.keyCode === this.KEY.TICK ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
	else if ( d3.event.keyCode === this.KEY.RIGHT_ARROW || d3.event.keyCode === this.KEY.LEFT_ARROW ) {
		var self = this.view.capture[0][0];
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		var selectionCharIndex = ( self.selectionDirection !== "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		this.state.updateCaret( caretCharIndex, selectionCharIndex );
		this.view.caret.selectAll( "span" ).style( "opacity", 1 )
		this.view.showCaret = false;
	}
	else {
		var self = this.view.capture[0][0];
		var allText = self.value;
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		var selectionCharIndex = ( self.selectionDirection !== "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		this.state.updateUserText( allText, caretCharIndex, selectionCharIndex );
	}
};
