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
	this.init();
	this.listenTo( this.model, "modified", this.render );
};

TypingUI.prototype.WIDTH = 720;
TypingUI.prototype.HEIGHT = 240;
TypingUI.prototype.FONT_FAMILY = "Gill Sans, Helvetica Neue, sans-serif";
TypingUI.prototype.FONT_SIZE = 14;
TypingUI.prototype.BLINK_CYCLE = 500;
TypingUI.prototype.DEBUG = false;

TypingUI.prototype.init = function() {
	this.view = {};
	this.view.container = d3.select( this.el );
	this.view.canvas = this.view.container.append( "div" );
	this.view.keystrokes = this.view.canvas.append( "textarea" ).attr( "class", "Keystrokes" );
	this.view.dimensions = this.view.canvas.append( "div" ).attr( "class", "Dimensions" );
	this.view.overlay = this.view.canvas.append( "div" ).attr( "class", "Overlay" );
	this.view.suggestionBox = this.view.canvas.append( "div" ).attr( "class", "SuggestionBox" );
	this.view.suggestions = this.view.canvas.append( "div" ).attr( "class", "Suggestions" );
	this.view.caret = this.view.canvas.append( "div" ).attr( "class", "Caret" );

	this.view.container
		.style( "position", "static" );
		
	this.view.canvas
		.style( "position", "absolute" );
	
	this.view.keystrokes
		.style( "position", "absolute" )
		.call( this.__setTextareaStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		.on( "focus", this.__onCaptureFocus.bind(this) )
		.on( "blur", this.__onCaptureBlur.bind(this) )
		.on( "keydown", this.__onCaptureKeyDown.bind(this) )
		.on( "keypress", this.__onCaptureKeyPress.bind(this) )
		.on( "keyup", this.__onCaptureKeyUp.bind(this) )

	this.view.dimensions
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.call( this.__setOverlayStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )

	this.view.overlay
		.style( "position", "absolute" )
		.style( "border", "1px solid #969696" )
		.style( "background", "#fff" )
		.call( this.__setOverlayStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		.on( "click", this.__onOverlayClick.bind(this) )
		
	this.view.suggestionBox
		.style( "position", "absolute" )
		
	this.view.suggestions
		.style( "position", "absolute" )
		.call( this.__setFontStyles.bind(this) )

	this.view.caret
		.style( "position", "absolute" )
		.style( "pointer-events", "none" )
		.style( "opacity", 0 )
	window.setInterval( function(f){f()}, this.BLINK_CYCLE, function() {
		this.view.caret.selectAll( "span" ).style( "opacity", this.view.showCaret === true ? 1 : 0 )
		this.view.showCaret = ! ( this.view.showCaret === true );
	}.bind(this) );
	
	this.resize();
};

TypingUI.prototype.resize = function() {
	this.view.container
		.style( "width", this.WIDTH + "px" )
		.style( "height", ( this.DEBUG ? this.HEIGHT * 3 : this.HEIGHT ) + "px" );
	this.view.keystrokes
		.style( "top", ( this.DEBUG ? this.HEIGHT * 1 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 )
	this.view.dimensions
		.style( "top", ( this.DEBUG ? this.HEIGHT * 2 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 );
};

TypingUI.prototype.render = function() {
	var allSpanElements = this.model.get( "allSpanElements" );
	var activeSpanElement = this.model.get( "activeSpanElement" );
	var activeSuggestionElements = this.model.get( "activeSuggestionElements" );
	var caretSpanSegment = this.model.get( "caretSpanSegment" );
	var elems, enterElems, termElems, sepElems;
	
	this.view.keystrokes
		.call( this.__setKeystrokesContent.bind(this) );

	// Determine the width of active span elements
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		delete span.__left;
		delete span.__top;
		delete span.__width;
	}
	if ( activeSpanElement ) {
		elems = this.view.dimensions.selectAll( "span.word" ).data( [ activeSpanElement ].concat( activeSuggestionElements ) );
		enterElems = elems.enter().append( "span" ).attr( "class", "word" ).style( "vertical-align", "top" ).style( "color", "#d9d9d9" );
		enterElems.append( "span" ).attr( "class", "term" ).style( "vertical-align", "top" );
		enterElems.append( "span" ).attr( "class", "sep" ).style( "vertical-align", "top" );
		elems.exit().remove();
		elems = this.view.dimensions.selectAll( "span.word" );
		termElems = elems.select( "span.term" ).selectAll( "span.termSegment" ).data( function(d) { return d.termSegments } );
		termElems.enter().append( "span" ).attr( "class", "termSegment segment" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
		termElems.exit().remove();
		sepElems = elems.select( "span.sep" ).selectAll( "span.sepSegment" ).data( function(d) { return d.sepSegments } );
		sepElems.enter().append( "span" ).attr( "class", "sepSegment segment" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
		sepElems.exit().remove();

		this.view.dimensions.selectAll( "span.segment" ).text( function(d) { return d.text } )
		this.view.dimensions.selectAll( "span.word" ).call( this.__setSpanTypeStyles.bind(this) );
		this.view.dimensions.selectAll( "span.word" ).call( this.__getSpanWidths.bind(this) );
	}
	
	// Render all span elements to screen
	elems = this.view.overlay.selectAll( "span.word" ).data( allSpanElements );
	enterElems = elems.enter().append( "span" ).attr( "class", "word" ).style( "vertical-align", "top" ).style( "color", "#d9d9d9" );
	enterElems.append( "span" ).attr( "class", "term" ).style( "vertical-align", "top" );
	enterElems.append( "span" ).attr( "class", "sep" ).style( "vertical-align", "top" );
	elems.exit().remove();
	elems = this.view.overlay.selectAll( "span.word" );
	termElems = elems.select( "span.term" ).selectAll( "span.termSegment" ).data( function(d) { return d.termSegments } );
	termElems.enter().append( "span" ).attr( "class", "termSegment segment" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
	termElems.exit().remove();
	sepElems = elems.select( "span.sep" ).selectAll( "span.sepSegment" ).data( function(d) { return d.sepSegments } );
	sepElems.enter().append( "span" ).attr( "class", "sepSegment segment" ).style( "vertical-align", "top" ).style( "white-space", "pre-wrap" );
	sepElems.exit().remove();

	this.view.overlay.selectAll( "span.segment" ).text( function(d) { return d.text } );
	this.view.overlay.selectAll( "span.word" ).call( this.__setSpanTypeStyles.bind(this) );
	this.view.overlay.selectAll( "span.segment" ).call( this.__getSpanCoords.bind(this) );
	this.view.overlay.selectAll( "span.word" ).call( this.__getSpanCoords.bind(this) );
	
	// Render suggestions if available
	if ( activeSpanElement ) {
		this.view.suggestionBox.call( this.__setSuggestionBoxStylesAndCoords.bind(this) );
		elems = this.view.suggestions.selectAll( "span" ).data( activeSuggestionElements )
		elems.enter().append( "span" ).style( "position", "absolute" );
		elems.exit().remove();
		
		this.view.suggestions.selectAll( "span" ).text( function(d) { return d.term } )
		this.view.suggestions.selectAll( "span" ).call( this.__setSuggestionStylesAndCoords.bind(this) );
	}
	
	elems = this.view.caret.selectAll( "span" ).data( [ caretSpanSegment ] );
	elems.enter().append( "span" )
		.style( "display", "inline-block" )
		.style( "width", "1px" )
		.style( "height", this.FONT_SIZE + "px" )
		.style( "background", "#000" )
	this.view.caret
		.call( this.__setCaretCoords.bind(this) );
	
	this.resize();
};

TypingUI.prototype.__setSegmentStyles = function( elem ) {
	elem.style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
};

TypingUI.prototype.__setSpanTypeStyles = function( elem ) {
	var isExpired = this.state.get( "isExpired" );
	var setActiveStyles = function( elem ) {
		elem.style( "color", "#2ca02c" );
		elem.select( ".term" ).style( "border-bottom", "1px dotted #2ca02c" );
		elem.selectAll( ".segment" ).style( "background", function(d) { return d.isSelected ? "#ffee33" : null } );
	};
	var setUserStyles = function( elem ) {
		elem.style( "color", "#303030" );
		elem.select( ".term" ).style( "border", "none" );
		elem.selectAll( ".segment" ).style( "background", function(d) { return d.isSelected ? "#ffee33" : null } );
	};
	var setExpiredStyles = function( elem ) {
		elem.style( "color", "#d9d9d9" )
		elem.select( ".term" ).style( "border", "none" )
		elem.selectAll( ".segment" ).style( "background", function(d) { return d.isSelected ? "#ffee33" : null } );
	};
	var setMtStyles = function( elem ) {
		elem.transition().style( "color", "#bdbdbd" )
		elem.select( ".term" ).style( "border", "none" )
		elem.selectAll( ".segment" ).style( "background", function(d) { return d.isSelected ? "#ffee33" : null } );
	};
//	elem.filter( function(d) { return   d.isUser &&   d.isActive } ).call( setActiveStyles.bind(this) );
//	elem.filter( function(d) { return   d.isUser && ! d.isActive } ).call( setUserStyles.bind(this) );
	elem.filter( function(d) { return   d.isUser                                } ).call( setUserStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser &&   isExpired                 } ).call( setExpiredStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser && ! isExpired &&   d.isActive } ).call( setActiveStyles.bind(this) );
	elem.filter( function(d) { return ! d.isUser && ! isExpired && ! d.isActive } ).call( setMtStyles.bind(this) );
};

TypingUI.prototype.__getSpanWidths = function( elem ) {
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

TypingUI.prototype.__setCaretCoords = function( elem ) {
	var segment = this.model.get( "caretSpanSegment" );
	elem.style( "left", segment.__left + "px" )
		.style( "top", (segment.__top+3) + "px" )
};

TypingUI.prototype.__setSuggestionBoxStylesAndCoords = function( elem ) {
	var activeSpanElement = this.model.get( "activeSpanElement" );
	var activeSuggestionElements = this.model.get( "activeSuggestionElements" );
	elem.style( "left", activeSpanElement.__left + "px" )
		.style( "top", ( activeSpanElement.__top + this.FONT_SIZE + 4 ) + "px" )
		.style( "width", activeSpanElement.__width + "px" )
		.style( "height", (this.FONT_SIZE+6) * activeSuggestionElements.length + "px" )
		.style( "background", "#fff" )
		.style( "border", "1px solid #2ca02c" )
		.style( "box-shadow", "1px 1px 4px #2ca02c" )
		.style( "opacity", activeSuggestionElements.length === 0 ? 0 : 1 )
};

TypingUI.prototype.__setSuggestionStylesAndCoords = function( elem ) {
	var activeSpanElement = this.model.get( "activeSpanElement" );
	elem.style( "left", activeSpanElement.__left + "px" )
		.style( "top", function(d,i) { return ( activeSpanElement.__top + this.FONT_SIZE + 4 + i * (this.FONT_SIZE+6) + 2 ) + "px" }.bind(this) )
		.style( "width", activeSpanElement.__width + "px" )
		.style( "height", (this.FONT_SIZE+6) + "px" )
		.style( "color", "#2ca02c" )
		.style( "border-top", function(d,i) { return (i===0) ? "none" : "1px solid #ccc" } )
};

TypingUI.prototype.__setOverlayStyles = function( elem ) {
	elem.style( "padding", "10px" )
		.style( "width", (this.WIDTH-22) + "px" )
		.style( "height", (this.HEIGHT-22) + "px" )
		
		// Do no show text selections
		.style( "user-select", "none" )
		.style( "-webkit-touch-callout", "none" )
		.style( "-webkit-user-select", "none" )
		.style( "-khtml-user-select", "none" )
		.style( "-moz-user-select", "none" )
		.style( "-ms-user-select", "none" )
};

TypingUI.prototype.__setTextareaStyles = function( elem ) {
	elem.style( "width", this.WIDTH + "px" )
		.style( "height", this.HEIGHT + "px" )
		.attr( "spellcheck", false )
		.attr( "autocapitalize", "off" )
		.attr( "autocomplete", "off" )
		.attr( "autocorrect", "off" )
		.attr( "tabindex", 0 )
		.attr( "wrap", "soft" )
};

TypingUI.prototype.__setKeystrokesContent = function( elem ) {
	var self = elem[0][0];
	var userText = this.state.getUserText();
	var selectionStart = this.state.get( "selectionStartCharIndex" );
	var selectionEnd = this.state.get( "selectionEndCharIndex" );
	var selectionDirection = this.state.get( "selectionDirection" );
	self.value = userText;
	self.selectionStart = selectionStart;
	self.selectionEnd = selectionEnd;
	self.selectionDirection = selectionDirection;
};

TypingUI.prototype.__setFontStyles = function( elem ) {
	elem.style( "font-family", this.FONT_FAMILY )
		.style( "font-size", this.FONT_SIZE + "px" )
		.style( "vertical-align", "top" )
};

TypingUI.prototype.__onCaptureFocus = function() {
	this.view.overlay.style( "border-color", "#1f77b4" );
	this.view.caret.style( "opacity", 1 );
};

TypingUI.prototype.__onCaptureBlur = function() {
	this.view.overlay.style( "border-color", "#969696" );
	this.view.caret.style( "opacity", 0 );
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
		var self = this.view.keystrokes[0][0];
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
		var self = this.view.keystrokes[0][0];
		var spanStartCharIndex = activeSpanElement.startCharIndex;
		var spanEndCharIndex = activeSpanElement.endCharIndex;
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		console.log( activeSpanElement, self.value.substring( spanStartCharIndex, caretCharIndex ), activeSpanElement.mtTerm.substr( 0, caretCharIndex - spanStartCharIndex ) )
		if ( self.value.substring( spanStartCharIndex, caretCharIndex ) === activeSpanElement.mtTerm.substr( 0, caretCharIndex - spanStartCharIndex ) ) {
			var substr = activeSpanElement.mtTerm.substr( caretCharIndex - spanStartCharIndex );
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
		var self = this.view.keystrokes[0][0];
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		var selectionCharIndex = ( self.selectionDirection !== "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		this.state.updateCaret( caretCharIndex, selectionCharIndex );
		this.view.caret.selectAll( "span" ).style( "opacity", 1 )
		this.view.showCaret = false;
	}
	else {
		var self = this.view.keystrokes[0][0];
		var allText = self.value;
		var selectionStartCharIndex = self.selectionStart;
		var selectionEndCharIndex = self.selectionEnd;
		var caretCharIndex = ( self.selectionDirection === "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		var selectionCharIndex = ( self.selectionDirection !== "forward" ) ? selectionEndCharIndex : selectionStartCharIndex;
		this.state.updateUserText( allText, caretCharIndex, selectionCharIndex );
	}
};

TypingUI.prototype.__onOverlayClick = function() {
	this.view.keystrokes[0][0].focus();
};
