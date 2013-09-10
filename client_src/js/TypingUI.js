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
	this.init();
	this.listenTo( this.model, "modified", this.render );
};

TypingUI.prototype.WIDTH = 800;
TypingUI.prototype.HEIGHT = 240;
TypingUI.prototype.FONT_FAMILY = "Gill Sans";
TypingUI.prototype.FONT_SIZE = 16;
TypingUI.prototype.DEBUG = false;
TypingUI.prototype.BLINK_CYCLE = 500;

TypingUI.prototype.init = function() {
	this.view = {};
	this.view.container = d3.select( this.el );
	this.view.canvas = this.view.container.append( "div" );
	this.view.capture = this.view.canvas.append( "textarea" ).attr( "class", "Capture" );
	this.view.keystrokes = this.view.canvas.append( "textarea" ).attr( "class", "Keystrokes" );
	this.view.dimensions = this.view.canvas.append( "div" ).attr( "class", "Dimensions" );
	this.view.coordinates = this.view.canvas.append( "div" ).attr( "class", "Coordinates" );
	this.view.overlay = this.view.canvas.append( "div" ).attr( "class", "Overlay" );
	this.view.suggestionBox = this.view.canvas.append( "div" ).attr( "class", "SuggestionBox" );
	this.view.suggestions = this.view.canvas.append( "div" ).attr( "class", "Suggestions" );
	this.view.caret = this.view.canvas.append( "div" ).attr( "class", "Caret" );

	this.view.container
		.style( "position", "static" );
		
	this.view.canvas
		.style( "position", "absolute" );
	
	this.view.capture
		.style( "position", "absolute" )
		.call( this.__setTextareaStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		
	this.view.keystrokes
		.style( "position", "absolute" )
		.call( this.__setTextareaStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		.on( "focus", this.__onCaptureFocus.bind(this) )
		.on( "blur", this.__onCaptureBlur.bind(this) )
		.on( "keydown", this.__onCaptureKeyDown.bind(this) )
		.on( "keyup", this.__onCaptureKeyUp.bind(this) )

	this.view.dimensions
		.style( "position", "absolute" )
		.call( this.__setOverlayStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )

	this.view.coordinates
		.style( "position", "absolute" )
		.call( this.__setOverlayStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )

	this.view.overlay
		.style( "position", "absolute" )
		.style( "border", "1px solid #ccc" )
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
		.style( "opacity", 0 )
		.style( "pointer-events", "none" )
	window.setInterval( function(f){f()}, this.BLINK_CYCLE, function() {
		this.view.caret.selectAll( "span" ).style( "opacity", this.view.showCaret === true ? 1 : 0 )
		this.view.showCaret = ! ( this.view.showCaret === true );
	}.bind(this) );
};

TypingUI.prototype.render = function() {
	var allSpanElements = this.model.getAttr( "allSpanElements" );
	var currentSpanElement = this.model.getAttr( "currentSpanElement" );
	var caretSpanSegment = this.model.getAttr( "caretSpanSegment" );
	var suggestionElements = this.model.getAttr( "suggestionElements" );
	var elems;
	
	this.view.container
		.style( "width", this.WIDTH + "px" )
		.style( "height", ( this.DEBUG ? this.HEIGHT * 5 : this.HEIGHT ) + "px" );

	this.view.capture
		.style( "top", ( this.DEBUG ? this.HEIGHT * 4 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 )
		.call( this.__setCaptureContent.bind(this) )
		
	this.view.keystrokes
		.style( "top", ( this.DEBUG ? this.HEIGHT * 3 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 )

	// Determine the width of some span elements and span segments
	elems = this.view.dimensions.selectAll( "span.word" ).data( [ currentSpanElement ].concat( suggestionElements ) );
	elems.enter().append( "span" ).attr( "class", "word" );
	elems.exit().remove();
	elems = this.view.dimensions.selectAll( "span.word" ).selectAll( "span.segment" ).data( function(d) { return d.segments } );
	elems.enter().append( "span" ).attr( "class", "segment" );
	elems.exit().remove();

	this.view.dimensions.selectAll( "span.segment" )
		.text( function(d) { return d.text } )
		.style( "position", "static" )
		.style( "vertical-align", "top" )
		.call( this.__setSpanTypeStyles.bind(this) )
		.call( this.__getSpanCoords.bind(this) )
	this.view.dimensions.selectAll( "span.word" )
		.style( "position", "static" )
		.style( "vertical-align", "top" )
		.call( this.__setSpanTypeStyles.bind(this) )
		.call( this.__getSpanCoords.bind(this) )
		.call( this.__getSpacingDims.bind(this) )
	this.view.dimensions
		.style( "top", ( this.DEBUG ? this.HEIGHT * 1 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 )
	
	// Determine the coordinates of all span elements and span segments
	elems = this.view.coordinates.selectAll( "span.word" ).data( allSpanElements );
	elems.enter().append( "span" ).attr( "class", "word" );
	elems.exit().remove();
	elems = this.view.coordinates.selectAll( "span.word" ).selectAll( "span.segment" ).data( function(d) { return d.segments } );
	elems.enter().append( "span" ).attr( "class", "segment" );
	elems.exit().remove();

	this.view.coordinates.selectAll( "span.segment" )
		.text( function(d) { return d.text } )
		.style( "position", "static" )
		.style( "vertical-align", "top" )
		.call( this.__setSpanTypeStyles.bind(this) )
		.call( this.__getSpanCoords.bind(this) )
	this.view.coordinates.selectAll( "span.word" )
		.style( "position", "static" )
		.style( "vertical-align", "top" )
		.call( this.__setSpanTypeStyles.bind(this) )
		.call( this.__getSpanCoords.bind(this) )
	this.view.coordinates
		.style( "top", ( this.DEBUG ? this.HEIGHT * 2 : 0 ) + "px" )
		.style( "opacity", this.DEBUG ? 1 : 0 )
	
	// Render all span elements
	elems = this.view.overlay.selectAll( "span" ).data( allSpanElements );
	elems.enter().append( "span" );
	elems.exit().remove();
	
	this.view.overlay.selectAll( "span" )
		.style( "position", "absolute" )
		.style( "display", "inline-block" )
		.text( function(d) { return d.text } )
		.call( this.__setSpanTypeStyles.bind(this) )
		.call( this.__setSpanCoords.bind(this) )
	this.view.overlay
		.style( "top", 0 )
	
	// Suggestion box (REVISE)
	this.view.suggestionBox
		.call( this.__setSuggestionBoxStylesAndCoords.bind(this) );

	// Entries in the suggestion box (REVISE)
	elems = this.view.suggestions.selectAll( "span" ).data( suggestionElements );
	elems.enter().append( "span" )
	elems.exit().remove();
	this.view.suggestions
		.selectAll( "span" )
			.style( "position", "absolute" )
			.style( "display", "inline-block" )
			.text( function(d) { return d.text } )
			.call( this.__setSuggestionStylesAndCoords.bind(this) )
	
	// Render caret on screen
	elems = this.view.caret.selectAll( "span" ).data( [ caretSpanSegment ] );
	elems.enter().append( "span" )
		.style( "display", "inline-block" )
		.style( "width", "1px" )
		.style( "height", this.FONT_SIZE + "px" )
		.style( "background", "#000" )
	this.view.caret
		.call( this.__setCaretCoords.bind(this) );
};

TypingUI.prototype.__setSpanTypeStyles = function( elem ) {
	var setMatchedType = function( elem ) {
		elem.style( "color", "#000" )
			.style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
			.style( "border", "none" )
			.style( "opacity", 1 )
	};
	var setCurrentType = function( elem ) {
		elem.style( "color", "#238B45" )
			.style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
			.style( "opacity", 1 )
	};
	var setFutureType = function( elem ) {
		elem.style( "color", "#999999" )
			.style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
			.style( "border", "none" )
			.style( "opacity", 1 )
	};
	var setExtraType = function( elem ) {
		elem.style( "color", "#fff" )
			.style( "background", "none" )
			.style( "border", "none" )
			.style( "opacity", 0 )
	};

	elem.filter( function(d) { return d.type === "matched" } ).call( setMatchedType.bind(this) );
	elem.filter( function(d) { return d.type === "current" } ).call( setCurrentType.bind(this) );
	elem.filter( function(d) { return d.type === "future" || d.type === "spacing" } ).call( setFutureType.bind(this) );
	elem.filter( function(d) { return d.type === "extra" } ).call( setExtraType.bind(this) );
};

TypingUI.prototype.__getSpacingDims = function( elem ) {
	var maxWidth = 0;
	elem.each( function(d) { maxWidth = Math.max( maxWidth, d3.select(this)[0][0].offsetWidth ) } );
	elem.each( function(d) { d.__spacing = maxWidth } );
};

TypingUI.prototype.__getSpanCoords = function( elem ) {
	var currentSpanElement = this.model.getAttr( "currentSpanElement" );
	elem.each( function(d) {
		var self = d3.select(this)[0][0];
		if ( d.type === "spacing" ) {
			d3.select(this).style( "display", "inline-block" ).style( "width", ( currentSpanElement.__spacing - currentSpanElement.__width ) + "px" );
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
	var currentSpanElement = this.model.getAttr( "currentSpanElement" );
	var suggestionElements = this.model.getAttr( "suggestionElements" );
	elem.style( "left", currentSpanElement.__left + "px" )
		.style( "top", ( currentSpanElement.__top + this.FONT_SIZE + 4 ) + "px" )
		.style( "width", currentSpanElement.__spacing + "px" )
		.style( "height", (this.FONT_SIZE+6) * suggestionElements.length + "px" )
		.style( "background", "#fff" )
		.style( "border", "1px solid #238B45" )
		.style( "box-shadow", "1px 1px 4px #005824" )
};

TypingUI.prototype.__setSuggestionStylesAndCoords = function( elem ) {
	var currentSpanElement = this.model.getAttr( "currentSpanElement" );
	elem.style( "left", currentSpanElement.__left + "px" )
		.style( "top", function(d,i) { return ( currentSpanElement.__top + this.FONT_SIZE + 4 + i * (this.FONT_SIZE+6) + 2 ) + "px" }.bind(this) )
		.style( "width", currentSpanElement.__spacing + "px" )
		.style( "height", (this.FONT_SIZE+6) + "px" )
		.style( "color", "#999" )
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

TypingUI.prototype.__setCaptureContent = function( elem ) {
	var allText = this.model.state.getAttr( "allText" );
	var caretCharIndex = this.model.state.getAttr( "caretCharIndex" );
	var inputSelectionStart = this.model.getAttr( "inputSelectionStart" );
	var inputSelectionEnd = this.model.getAttr( "inputSelectionEnd" );
	elem[0][0].value = allText;
	if ( elem[0][0].selectionStart !== inputSelectionStart )
		elem[0][0].selectionStart = inputSelectionStart;
	if ( elem[0][0].selectionEnd !== inputSelectionEnd )
		elem[0][0].selectionEnd = inputSelectionEnd;
};

TypingUI.prototype.__setFontStyles = function( elem ) {
	elem.style( "font-family", this.FONT_FAMILY )
		.style( "font-size", this.FONT_SIZE + "px" )
		.style( "vertical-align", "top" )
};

TypingUI.prototype.__onCaptureFocus = function() {
	this.view.overlay.style( "border-color", "#69c" );
	this.view.caret.style( "opacity", 1 );
};

TypingUI.prototype.__onCaptureBlur = function() {
	this.view.overlay.style( "border-color", "#ccc" );
	this.view.caret.style( "opacity", 0 );
};

TypingUI.prototype.KEY = {
	TAB : 9,
	RIGHT_ARROW : 39,
	LEFT_ARROW : 37,
	BACKSPACE : 8
}
TypingUI.prototype.__onCaptureKeyDown = function() {
	if ( d3.event.keyCode === this.KEY.TAB ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
	else {
		
	}
};

TypingUI.prototype.__onCaptureKeyUp = function() {
	if ( d3.event.keyCode === this.KEY.TAB ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
	else {
		console.log( this.view.keystrokes )
		this.model.state.setUserText( this.view.keystrokes[0][0].value, this.view.keystrokes[0][0].selectionEnd );
	}
};

TypingUI.prototype.__onOverlayClick = function() {
	this.view.keystrokes[0][0].focus();
};

/*
TypingUI.prototype.__getUserText = function() {
	return this.__keyboard[0][0].value;
};
TypingUI.prototype.__setUserText = function( text ) {
	this.__keyboard[0][0].value = text;
};
TypingUI.prototype.__getAutocompleteText = function() {
	return d3.select( "input.autocomplete" )[0][0].value;
};
TypingUI.prototype.__setAutocompleteText = function( text ) {
	d3.select( "input.autocomplete" )[0][0].value = text;
};
TypingUI.prototype.__getSuggestionText = function() {
	return d3.select( "input.suggestion" )[0][0].value;
};
TypingUI.prototype.__setSuggestionText = function( text ) {
	d3.select( "input.suggestion" )[0][0].value = text;
};
TypingUI.prototype.__popSuggestionText = function() {
	var tokens = this.__getSuggestionText().split( /[ ]+/g );
	if ( tokens.length > 0 ) {
		var firstWord = tokens.splice( 0, 1 )[ 0 ];
		this.__setSuggestionText( tokens.join( " " ) );
		return firstWord;
	}
	else {
		return "";
	}
};
TypingUI.prototype.__getUserSelectionStart = function() {
	return this.__keyboard[0][0].selectionStart;
};
TypingUI.prototype.__getUserSelectionEnd = function() {
	return this.__keyboard[0][0].selectionEnd;
};
TypingUI.prototype.__setUserSelection = function( startIndex, endIndex ) {
	endIndex || ( endIndex = startIndex );
	this.__keyboard[0][0].selectionStart = startIndex;
	this.__keyboard[0][0].selectionEnd = endIndex;
};
*/