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

TypingUI.prototype.WIDTH = 720;
TypingUI.prototype.HEIGHT = 240;
TypingUI.prototype.FONT_FAMILY = "Gill Sans";
TypingUI.prototype.FONT_SIZE = "12pt";
TypingUI.prototype.DEBUG = false;
TypingUI.prototype.BLINK_CYCLE = 500;

TypingUI.prototype.init = function() {
	this.view = {};
	this.view.container = d3.select( this.el );
	this.view.canvas = this.view.container.append( "div" );
	this.view.keystrokes = this.view.canvas.append( "textarea" ).attr( "class", "KeystrokeCapture" );
	this.view.spacing = this.view.canvas.append( "div" ).attr( "class", "Spacing" );
	this.view.overlay = this.view.canvas.append( "div" ).attr( "class", "Overlay" );
	this.view.caret = this.view.canvas.append( "div" ).attr( "class", "Caret" );

	this.view.container
		.style( "position", "relative" );
		
	this.view.canvas
		.style( "position", "absolute" );
		
	this.view.keystrokes
		.call( this.__setTextareaStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		.on( "focus", this.__onCaptureFocus.bind(this) )
		.on( "blur", this.__onCaptureBlur.bind(this) )
		.on( "keydown", this.__onCaptureKeyDown.bind(this) )
		.on( "keyup", this.__onCaptureKeyUp.bind(this) )
		.style( "position", "absolute" );

	this.view.spacing
		.call( this.__setOverlayStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		.style( "position", "absolute" );
	
	this.view.overlay
		.call( this.__setOverlayStyles.bind(this) )
		.call( this.__setFontStyles.bind(this) )
		.on( "click", this.__onOverlayClick.bind(this) )
		.style( "border", "1px solid #fff" )
		.style( "background", "#fff" )
		.style( "position", "absolute" );
	
	this.view.caret
		.style( "opacity", 0 )
		.style( "pointer-events", "none" )
		.style( "position", "absolute" );
	window.setInterval( function(f){f()}, this.BLINK_CYCLE, function() {
		this.view.caret.selectAll( "span" ).style( "opacity", this.view.showCaret === true ? 1 : 0 )
		this.view.showCaret = ! ( this.view.showCaret === true );
	}.bind(this) );
};

TypingUI.prototype.render = function() {
	var allSpanElements = this.model.getAttr( "allSpanElements" );
	var caretSpanElement = this.model.getAttr( "caretSpanElement" );
	var elems;
	
	this.view.container
		.style( "width", this.WIDTH + "px" )
		.style( "height", ( this.DEBUG ? this.HEIGHT * 3 : this.HEIGHT ) + "px" );
	
	this.view.keystrokes
		.style( "top", ( this.DEBUG ? this.HEIGHT * 0 : 0 ) + "px" )
		.call( this.__setTextareaContent.bind(this) )

	elems = this.view.spacing.selectAll( "span" ).data( allSpanElements );
	elems.enter().append( "span" );
	elems.exit().remove();
	this.view.spacing
		.style( "top", ( this.DEBUG ? this.HEIGHT * 1 : 0 ) + "px" )
		.selectAll( "span" )
			.style( "position", "relative" )
			.text( function(d) { return d.spacing } )
			.call( this.__setSpanType.bind(this) )
			.call( this.__getSpanCoords.bind(this) )
	
	elems = this.view.overlay.selectAll( "span" ).data( allSpanElements );
	elems.enter().append( "span" );
	elems.exit().remove();
	this.view.overlay
		.style( "top", ( this.DEBUG ? this.HEIGHT * 2 : 0 ) + "px" )
		.selectAll( "span" )
			.style( "display", "inline-block" )
			.style( "position", "absolute" )
			.text( function(d) { return d.text } )
			.call( this.__setSpanType.bind(this) )
			.call( this.__setSpanCoords.bind(this) )
	
	elems = this.view.caret.selectAll( "span" ).data( [ caretSpanElement ] )
	elems.enter().append( "span" )
		.style( "display", "inline-block" )
		.style( "width", "1px" )
		.style( "background", "#000" )
	this.view.caret
		.style( "top", ( this.DEBUG ? this.HEIGHT * 2 : 0 ) + "px" )
		.selectAll( "span" )
			.style( "display", "inline-block" )
			.style( "position", "absolute" )
			.call( this.__setCaretCoords.bind(this) )
};

TypingUI.prototype.__getSpanCoords = function( elem ) {
	elem.each( function(d) {
		var self = d3.select(this)[0][0];
		d.__left = self.offsetLeft;
		d.__top = self.offsetTop;
		d.__width = self.offsetWidth;
		d.__height = self.offsetHeight;
	});
};

TypingUI.prototype.__setSpanCoords = function( elem ) {
	elem.each( function(d) {
		d3.select(this)
			.style( "left", function(d) { return d.__left + "px" } )
			.style( "top", function(d) { return d.__top + "px" } )
			.style( "width", function(d) { return d.__width + "px" } )
			.style( "height", function(d) { return d.__height + "px " } )
	})
};

TypingUI.prototype.__setCaretCoords = function( elem ) {
	elem.each( function(d) {
		d3.select(this)
			.style( "left", function(d) { return d.__left + "px" } )
			.style( "top", function(d) { return (d.__top+1) + "px" } )
			.style( "height", function(d) { return d.__height + "px " } )
	})
};

TypingUI.prototype.__setSpanType = function( elem ) {
	var setMatchedType = function( elem ) {
		elem.style( "color", "#000" )
			.style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
			.style( "border", "none" )
			.style( "opacity", 1 )
	};
	var setCurrentType = function( elem ) {
		elem.style( "color", "#33a02c" )
			.style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
			.style( "border-bottom", "1px dotted #33a02c" )
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
	elem.filter( function(d) { return d.type === "future" } ).call( setFutureType.bind(this) );
	elem.filter( function(d) { return d.type === "extra" } ).call( setExtraType.bind(this) );
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

TypingUI.prototype.__setTextareaContent = function( elem ) {
	var inputText = this.model.getAttr( "inputText" );
	var inputSelectionStart = this.model.getAttr( "inputSelectionStart" );
	var inputSelectionEnd = this.model.getAttr( "inputSelectionEnd" );
	elem[0][0].value = inputText;
	elem[0][0].selectionStart = inputSelectionStart;
	elem[0][0].selectionEnd = inputSelectionEnd;
};

TypingUI.prototype.__setFontStyles = function( elem ) {
	elem.style( "font-family", this.FONT_FAMILY )
		.style( "font-size", this.FONT_SIZE )
		.style( "vertical-align", "top" )
};

TypingUI.prototype.__onCaptureFocus = function() {
	this.view.overlay.style( "border-color", "#69c" );
	this.view.caret.style( "opacity", 1 );
};

TypingUI.prototype.__onCaptureBlur = function() {
	this.view.overlay.style( "border-color", "#fff" );
	this.view.caret.style( "opacity", 0 );
};

TypingUI.prototype.__onCaptureKeyDown = function() {
	if ( d3.event.keyCode === 9 ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
//	this.render();
};

TypingUI.prototype.__onCaptureKeyUp = function() {
	if ( d3.event.keyCode === 9 ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
//		this.__autocomplete();
	}
//	this.render();
};

TypingUI.prototype.__onOverlayClick = function() {
	this.view.keystrokes[0][0].focus();
};

/*
TypingUI.prototype.__onModelEvents = function( events ) {
};

TypingUI.prototype.__dimensions = function( e ) {
	e.style( "width", "720px" )
	 .style( "height", "240px" );	
};

TypingUI.prototype.__initHtmlElements = function() {
	this.__container = d3.select( this.el ).append( "div" ).attr( "class", "container" ).call( this.__dimensions );
	this.__canvas = this.__container.append( "div" ).attr( "class", "canvas" );
	this.__keyboard = this.__canvas.append( "textarea" ).attr( "class", "typing keyboard" ).call( this.__dimensions );
	this.__overlay = this.__canvas.append( "div" ).attr( "class", "typing overlay" ).call( this.__dimensions );
	this.__ghost = this.__canvas.append( "div" ).attr( "class", "ghost" )
	this.__cursor = this.__canvas.append( "img" ).attr( "class", "cursor" ).attr( "src", "img/cursor.gif" );
};

TypingUI.prototype.__initLayers = function() {
	this.__keyboard
		.call( this.__textareas.bind(this) )
		.style( "opacity", 0 )
		.style( "color", "#69c" )
		.on( "focus", this.__onCaptureFocus.bind(this) )
		.on( "blur", this.__onCaptureBlur.bind(this) )
		.on( "keydown", this.__onCaptureKeyDown.bind(this) )
		.on( "keyup", this.__onCaptureKeyUp.bind(this) );
	this.__overlay
		.style( "pointer-events", "auto" )
		.style( "opacity", 1 )
		.on( "click", this.__onOverlayClick.bind(this) );
	this.__cursor
		.style( "opacity", 0 );
};
TypingUI.prototype.setup = function() {
	this.__keyboard.call( this.__typography.bind(this) );
	this.__overlay.call( this.__typography.bind(this) );
	this.__ghost.call( this.__typography.bind(this) );
};
TypingUI.prototype.render = function() {
	var allTokens = this.__getAllTokens();
	var allElems = this.__overlay.selectAll( "span.token" ).data( allTokens );
	allElems.exit().remove();
	allElems.enter().append( "span" ).attr( "class", "token" );
	allElems = this.__overlay.selectAll( "span.token" );
	allElems.filter( function(d) { return d.type === "user" } ).call( this.__foundationRenderer ).call( this.__userTokenRenderer );
	allElems.filter( function(d) { return d.type === "extra" } ).call( this.__foundationRenderer ).call( this.__extraTokenRenderer );
	allElems.filter( function(d) { return d.type === "autocomplete" } ).call( this.__foundationRenderer ).call( this.__autocompleteTokenRenderer );
	allElems.filter( function(d) { return d.type === "suggestion" } ).call( this.__foundationRenderer ).call( this.__suggestionTokenRenderer );
	this.__moveCaret();
};

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

TypingUI.prototype.__foundationRenderer = function( e ) {
	e.style( "color", "#fff" )
	 .style( "background", "none" )
	 .style( "text-decoration", "none" )
	 .style( "border", "none" )
}
TypingUI.prototype.__userTokenRenderer = function( e ) {
	e.text( function(d) { return d.text } )
	 .style( "color", "#000" )
	 .style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
};
TypingUI.prototype.__extraTokenRenderer = function( e ) {
	e.text( function(d) { return d.text } )
	 .style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
};
TypingUI.prototype.__autocompleteTokenRenderer = function( e ) {
	e.text( function(d) { return d.text } )
	 .style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
	 .style( "color", "#33a02c" )
	 .style( "border-bottom", "1px dotted #33a02c" )
	 .style( "opacity", 0.8 )
};
TypingUI.prototype.__suggestionTokenRenderer = function( e ) {
	e.text( function(d) { return d.text } )
	 .style( "background", function(d) { return d.isSelected ? "#fe9" : "none" } )
	 .style( "color", "#999999" )
	 .style( "opacity", 0.8 )
};

TypingUI.prototype.__getUserTokens = function() {
	var rawText = this.__getUserText();
	var selectionStart = this.__getUserSelectionStart();
	var selectionEnd = this.__getUserSelectionEnd();
	var firstRawText = rawText.substring( 0, selectionStart );
	var secondRawText = rawText.substring( selectionStart, selectionEnd );
	var thirdRawText = rawText.substring( selectionEnd, rawText.length );
	var firstRawTokens = _.filter( firstRawText.split( /([\n\r\f ]+)/g ), function(d) { return d.length !== 0 } );
	var secondRawTokens = _.filter( secondRawText.split( /([\n\r\f ]+)/g ), function(d) { return d.length !== 0 } );
	var thirdRawTokens = _.filter( thirdRawText.split( /([\n\r\f ]+)/g ), function(d) { return d.length !== 0 } );
	
	var userTokens = [];
	for ( var i = 0; i < firstRawTokens.length; i++ ) {
		var tokenText = firstRawTokens[i];
		var tokenType = "user";
		var isCaret = false;
		var isSelected = false;
		var isSeparator = ( tokenText.search( /([\n\r\f ]+)/ ) !== -1 );
		var token = {
			"text" : tokenText,
			"type" : tokenType,
			"isCaret" : isCaret,
			"isSelected" : isSelected,
			"isSeparator" : isSeparator
		};
		userTokens.push( token );
	}
	for ( var i = 0; i < secondRawTokens.length; i++ ) {
		var tokenText = secondRawTokens[i];
		var tokenType = "user";
		var isCaret = false;
		var isSelected = true;
		var isSeparator = ( tokenText.search( /([\n\r\f ]+)/ ) !== -1 );
		var token = {
			"text" : tokenText,
			"type" : tokenType,
			"isCaret" : isCaret,
			"isSelected" : isSelected,
			"isSeparator" : isSeparator
		};
		userTokens.push( token );
	}
	for ( var i = 0; i < thirdRawTokens.length; i++ ) {
		var tokenText = thirdRawTokens[i];
		var tokenType = "user";
		var isCaret = ( i === 0 );
		var isSelected = false;
		var isSeparator = ( tokenText.search( /([\n\r\f ]+)/ ) !== -1 );
		var token = {
			"text" : tokenText,
			"type" : tokenType,
			"isCaret" : isCaret,
			"isSelected" : isSelected,
			"isSeparator" : isSeparator
		};
		userTokens.push( token );
	}
	return userTokens;
};
TypingUI.prototype.__getAutocompleteTokens = function() {
	var rawText = this.__getAutocompleteText();
	var rawTokens = _.filter( [ rawText ], function(d) { return d.length !== 0 } );
	
	var autocompleteTokens = [];
	for ( var i = 0; i < rawTokens.length; i++ ) {
		var tokenText = rawTokens[i];
		var tokenType = "autocomplete";
		var isCaret = ( i === 0 );
		var isSelected = false;
		var token = {
			"text" : tokenText,
			"type" : tokenType,
			"isCaret" : isCaret,
			"isSelected" : isSelected,
			"isSeparator" : false
		};
		autocompleteTokens.push( token );
	}
	return autocompleteTokens;
};
TypingUI.prototype.__getSuggestionTokens = function() {
	var rawText = d3.select( "input.suggestion" )[0][0].value;
	var rawTokens = _.filter( rawText.split( /([\n\r\f ]+)/g ), function(d) { return d.length !== 0 } );
	
	var suggestionTokens = [];
	for ( var i = 0; i < rawTokens.length; i++ ) {
		var tokenText = rawTokens[i];
		var tokenType = "suggestion";
		var isCaret = ( i === 0 );
		var isSelected = false;
		var token = {
			"text" : tokenText,
			"type" : tokenType,
			"isCaret" : isCaret,
			"isSelected" : isSelected,
			"isSeparator" : false
		};
		suggestionTokens.push( token );
	}
	return suggestionTokens;
};
TypingUI.prototype.__getExtraToken = function() {
	return { 
		"text" : " ", 
		"type" : "extra",
		"isCaret" : true,
		"isSelected" : false,
		"isSeparator" : true
	};	
};
TypingUI.prototype.__getAllTokens = function() {
	var allTokens = [];
	var userTokens = this.__getUserTokens();
	var autocompleteTokens = this.__getAutocompleteTokens();
	var suggestionTokens = this.__getSuggestionTokens();
	Array.prototype.push.apply( allTokens, userTokens );
	if ( userTokens.length > 0 && ! userTokens[ userTokens.length - 1 ].isSeparator )
		allTokens.push( this.__getExtraToken() );
	Array.prototype.push.apply( allTokens, autocompleteTokens );
	if ( autocompleteTokens.length > 0 && ! autocompleteTokens[ autocompleteTokens.length - 1 ].isSeparator )
		allTokens.push( this.__getExtraToken() );
	Array.prototype.push.apply( allTokens, suggestionTokens );
	if ( suggestionTokens.length > 0 && ! suggestionTokens[ suggestionTokens.length - 1 ].isSeparator )
		allTokens.push( this.__getExtraToken() );
	if ( allTokens.length === 0 )
		allTokens.push( this.__getExtraToken() );
	return allTokens;
};
TypingUI.prototype.__moveCaret = function() {
	var allElems = this.__overlay.selectAll( "span.token" );
	var caretElems = allElems.filter( function(d) { return d.isCaret } );
	var firstCaretElem = caretElems[0][0];
	var left = firstCaretElem.offsetLeft;
	var top = firstCaretElem.offsetTop;
	var height = firstCaretElem.offsetHeight;
	this.__cursor
		.style( "left", left + "px" )
		.style( "top", ( top + 2 ) + "px" )
		.style( "width", "1px" )
		.style( "height", ( height - 2 ) + "px" );
};
TypingUI.prototype.__moveGhost = function() {
	var allElems = this.__overlay.selectAll( "span.token" );
	var ghostElems = allElems.filter( function(d) { return d.type === "autocomplete" } );
	this.__ghost.display( "none" );
};
TypingUI.prototype.__autocomplete = function() {
	var selectionIndex = this.__getUserSelectionStart();
	var userText = this.__getUserText();
	if ( selectionIndex === userText.length ) {
		var autocompleteText = this.__getAutocompleteText();
		this.__setUserText( userText.trimRight() + " " + autocompleteText );
		this.__setAutocompleteText( this.__popSuggestionText() );	
	}
	else {
		this.__setUserSelection( userText.length );
	}
};
*/